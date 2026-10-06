#!/usr/bin/env python3
"""Trace the Sounding Futures logo (raster) into vector layers for the site.

Usage:  python3 tools/trace_logo.py [image] [output]
        defaults: tools/logo.webp -> assets/logo-data.js
Needs:  pip install numpy pillow scikit-image potracer

The bar and wordmark positions below are measured on tools/logo.webp; a
different drawing needs them measured again.

Outputs a JS data file with:
  ink   - black drawing (lines + the two bars), filled outlines
  beige - the beige echo lines, filled outlines
  word  - the "Sounding Futures" wordmark, filled outlines
  bars  - rectangles of the two bars (for the intro wipe)
  strokes - centrelines of every drawn line, for the intro mask
"""
import json
import math
import sys
import time
from pathlib import Path

import numpy as np
import potrace
from PIL import Image
from scipy import ndimage as ndi
from skimage.measure import label, regionprops
from skimage.morphology import skeletonize, remove_small_objects

ROOT = Path(__file__).resolve().parent.parent
SRC = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "tools" / "logo.webp")
OUT = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / "assets" / "logo-data.js")
UP = 2  # trace at 2x for sub-pixel edges

img = Image.open(SRC).convert("RGB")
W, H = img.size
im = np.asarray(img).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
warm = r - b

BAR_TOP = (498, 300, 1013, 441)      # x0, y0, x1, y1 (inverted window, incl. its hairline)
BAR_BOTTOM = (593, 856, 1246, 997)
TEXT_BOX = (850, 585, 1250, 775)

ink = lum < 128
lab = label(ink, connectivity=2)
word = np.zeros_like(ink)
for p in regionprops(lab):
    y0, x0, y1, x1 = p.bbox
    if x0 >= TEXT_BOX[0] and y0 >= TEXT_BOX[1] and x1 <= TEXT_BOX[2] and y1 <= TEXT_BOX[3]:
        word[lab == p.label] = True
art = ink & ~word

band = np.zeros_like(ink)
band[515:852, 40:860] = True
beige = band & ~ink & (warm > 9) & (lum < 228)
beige = remove_small_objects(beige, max_size=12)


def upsampled(mask_fn):
    """Threshold on a smooth 2x-upsampled field so edges land between pixels."""
    big = img.resize((W * UP, H * UP), Image.LANCZOS)
    a = np.asarray(big).astype(np.float32)
    return mask_fn(a)


def trace(mask, scale):
    t = time.time()
    bm = potrace.Bitmap(~mask)  # potracer treats True as white
    plist = bm.trace(turdsize=6, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=1.0, opticurve=True, opttolerance=0.25)
    parts = []
    f = lambda v: f"{v / scale:.1f}".rstrip("0").rstrip(".")
    for curve in plist:
        s = curve.start_point
        d = [f"M{f(s.x)} {f(s.y)}"]
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{f(seg.c.x)} {f(seg.c.y)}L{f(seg.end_point.x)} {f(seg.end_point.y)}")
            else:
                d.append(f"C{f(seg.c1.x)} {f(seg.c1.y)} {f(seg.c2.x)} {f(seg.c2.y)} {f(seg.end_point.x)} {f(seg.end_point.y)}")
        d.append("Z")
        parts.append("".join(d))
    print(f"  traced {len(plist)} curves in {time.time() - t:.1f}s", file=sys.stderr)
    return "".join(parts)


def up_mask(base_mask, layer_fn):
    """2x mask: smooth threshold inside the (dilated) region of a 1x mask."""
    region = ndi.binary_dilation(base_mask, iterations=2)
    region = np.kron(region, np.ones((UP, UP), dtype=bool))
    return region & upsampled(layer_fn)


def lum_of(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


print("ink", file=sys.stderr)
ink_d = trace(up_mask(art, lambda a: lum_of(a) < 128), UP)
print("word", file=sys.stderr)
word_d = trace(up_mask(word, lambda a: lum_of(a) < 128), UP)
print("beige", file=sys.stderr)
beige_d = trace(up_mask(beige, lambda a: (lum_of(a) >= 128) & ((a[..., 0] - a[..., 2]) > 9) & (lum_of(a) < 226)), UP)

# ---------- centrelines for the intro ----------

OFF = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]  # ring order


def strokes_of(mask, min_len=10):
    mask = ndi.binary_closing(mask, iterations=1)
    mask = remove_small_objects(mask, max_size=20)
    dt = ndi.distance_transform_edt(mask)
    sk = skeletonize(mask)
    S = set(zip(*[a.tolist() for a in np.nonzero(sk)]))

    def nb(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in OFF if (p[0] + dy, p[1] + dx) in S]

    def crossings(p):
        ring = [((p[0] + dy, p[1] + dx) in S) for dy, dx in OFF]
        return sum(1 for i in range(8) if ring[i] and not ring[(i + 1) % 8])

    kind = {}
    for p in S:
        n = len(nb(p))
        if n == 0:
            kind[p] = "iso"
        elif n == 1 or crossings(p) == 1:
            kind[p] = "end"
        elif crossings(p) >= 3:
            kind[p] = "junc"
        else:
            kind[p] = "mid"

    # cluster adjacent junction pixels into one node
    node_of = {}
    nodes = []
    for p in S:
        if kind[p] in ("end", "junc") and p not in node_of:
            stack = [p]
            node_of[p] = len(nodes)
            members = []
            while stack:
                q = stack.pop()
                members.append(q)
                if kind[q] != "junc":
                    continue
                for r_ in nb(q):
                    if r_ not in node_of and kind[r_] == "junc":
                        node_of[r_] = node_of[p]
                        stack.append(r_)
            nodes.append(members)

    visited = set()
    edges = []  # (nodeA, nodeB, [pixels])
    seen_direct = set()
    for ni, members in enumerate(nodes):
        for p in members:
            for q in nb(p):
                if q in node_of:
                    if node_of[q] != ni:
                        key = tuple(sorted((p, q)))
                        if key not in seen_direct:
                            seen_direct.add(key)
                            edges.append((ni, node_of[q], [p, q]))
                    continue
                if q in visited:
                    continue
                path = [p, q]
                pset = {p, q}
                visited.add(q)
                prev, cur = p, q
                end = None
                while True:
                    cands = [c for c in nb(cur) if c != prev and c not in pset]
                    nodes_c = [c for c in cands if c in node_of and not (node_of[c] == ni and len(path) < 3)]
                    if nodes_c:
                        nxt = nodes_c[0]
                        path.append(nxt)
                        end = node_of[nxt]
                        break
                    cands = [c for c in cands if c not in visited]
                    if not cands:
                        break
                    if len(cands) > 1:
                        far = [c for c in cands if max(abs(c[0] - prev[0]), abs(c[1] - prev[1])) > 1]
                        cands = far or cands
                        cands.sort(key=lambda c: abs(c[0] - cur[0]) + abs(c[1] - cur[1]))
                    nxt = cands[0]
                    visited.add(nxt)
                    path.append(nxt)
                    pset.add(nxt)
                    prev, cur = cur, nxt
                edges.append((ni, end, path))
    # plain loops with no node
    for p in S:
        if kind[p] == "mid" and p not in visited:
            path = [p]
            visited.add(p)
            cur = p
            while True:
                cands = [c for c in nb(cur) if c not in visited and kind[c] == "mid"]
                if not cands:
                    break
                cur = cands[0]
                visited.add(cur)
                path.append(cur)
            if len(path) > 3:
                edges.append((None, None, path + [p]))

    # prune short spurs hanging off junctions
    def degree(n):
        return sum((a == n) + (b_ == n) for a, b_, _ in edges)

    for _ in range(2):
        keep = []
        degs = {}
        for a, b_, _ in edges:
            for n in (a, b_):
                if n is not None:
                    degs[n] = degs.get(n, 0) + 1
        for e in edges:
            a, b_, path = e
            ends = [n for n in (a, b_) if n is not None]
            is_spur = any(degs.get(n, 0) == 1 for n in ends) and any(degs.get(n, 0) >= 3 for n in ends)
            if is_spur:
                thick = max(dt[pp] for pp in path)
                if len(path) < max(8, 2.2 * thick):
                    continue
            keep.append(e)
        edges = keep

    # pair edges through nodes by direction
    def leave_dir(path, from_start):
        pts = path if from_start else path[::-1]
        k = min(len(pts) - 1, 14)
        dy = pts[k][0] - pts[0][0]
        dx = pts[k][1] - pts[0][1]
        n = math.hypot(dx, dy) or 1
        return dx / n, dy / n

    ends_at = {}
    for ei, (a, b_, path) in enumerate(edges):
        if a is not None:
            ends_at.setdefault(a, []).append((ei, 0))
        if b_ is not None:
            ends_at.setdefault(b_, []).append((ei, 1))
    partner = {}
    for n, lst in ends_at.items():
        if len(lst) < 2:
            continue
        dirs = {e: leave_dir(edges[e[0]][2], e[1] == 0) for e in lst}
        pairs = []
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                if lst[i][0] == lst[j][0]:
                    continue
                d1, d2 = dirs[lst[i]], dirs[lst[j]]
                pairs.append((d1[0] * d2[0] + d1[1] * d2[1], lst[i], lst[j]))
        pairs.sort()
        used = set()
        for dot, e1, e2 in pairs:
            if e1 in used or e2 in used:
                continue
            if dot > -0.35 and len(lst) > 2:
                continue
            partner[e1] = e2
            partner[e2] = e1
            used.add(e1)
            used.add(e2)

    used_edges = set()
    strokes = []

    def walk(ei, start_end):
        pts = []
        while ei is not None and ei not in used_edges:
            used_edges.add(ei)
            path = edges[ei][2]
            seq = path if start_end == 0 else path[::-1]
            pts.extend(seq if not pts else seq[1:])
            other = (ei, 1 - start_end)
            nxt = partner.get(other)
            if nxt is None:
                break
            ei, start_end = nxt
        return pts

    starts = []
    for ei in range(len(edges)):
        for end in (0, 1):
            if (ei, end) not in partner:
                starts.append((ei, end))
    for ei, end in starts:
        if ei in used_edges:
            continue
        pts = walk(ei, end)
        if pts:
            strokes.append(pts)
    for ei in range(len(edges)):
        if ei not in used_edges:
            strokes.append(walk(ei, 0))

    out = []
    for pts in strokes:
        if len(pts) < min_len:
            continue
        arr = np.array(pts, dtype=np.float32)[:, ::-1] + 0.5  # x, y at pixel centres
        # light smoothing
        if len(arr) > 5:
            k = np.ones(5) / 5
            sm = np.vstack([np.convolve(np.pad(arr[:, i], 2, mode="edge"), k, mode="valid") for i in range(2)]).T
            sm[0], sm[-1] = arr[0], arr[-1]
            arr = sm
        thick = np.array([dt[p] for p in pts])
        width = float(2 * np.percentile(thick, 92) + 3.5)
        out.append((arr, min(width, 40.0)))
    return out


def rdp(points, eps):
    if len(points) < 3:
        return points
    a, b_ = points[0], points[-1]
    ab = b_ - a
    n = math.hypot(*ab)
    if n == 0:
        d = np.hypot(*(points - a).T)
    else:
        d = np.abs(ab[0] * (points[:, 1] - a[1]) - ab[1] * (points[:, 0] - a[0])) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        left = rdp(points[: i + 1], eps)
        right = rdp(points[i:], eps)
        return np.vstack([left[:-1], right])
    return np.vstack([a, b_])


def pack(strokes):
    res = []
    for arr, width in strokes:
        # orient top to bottom: the drawing grows down the mountain
        if arr[0][1] > arr[-1][1]:
            arr = arr[::-1]
        length = float(np.sum(np.hypot(*np.diff(arr, axis=0).T)))
        simp = rdp(arr, 0.6)
        d = f"M{simp[0][0]:.1f} {simp[0][1]:.1f}L" + " ".join(f"{x:.1f} {y:.1f}" for x, y in simp[1:])
        res.append([round(width, 1), round(length), round(float(arr[0][1])), round(float(arr[0][0])), d])
    res.sort(key=lambda s: s[2])
    return res


def rect_mask(shape, rect, pad=0):
    m = np.zeros(shape, dtype=bool)
    x0, y0, x1, y1 = rect
    m[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
    return m


bars = rect_mask(ink.shape, BAR_TOP, 1) | rect_mask(ink.shape, BAR_BOTTOM, 1)
print("strokes", file=sys.stderr)
ink_strokes = pack(strokes_of(art & ~bars))
beige_strokes = pack(strokes_of(beige, min_len=14))
print(f"  ink {len(ink_strokes)} strokes, beige {len(beige_strokes)} strokes", file=sys.stderr)

ys, xs = np.nonzero(art | beige)
box = [int(xs.min()) - 4, int(ys.min()) - 4, int(xs.max() - xs.min()) + 8, int(ys.max() - ys.min()) + 8]
ys, xs = np.nonzero(ink | beige)
full = [int(xs.min()) - 4, int(ys.min()) - 4, int(xs.max() - xs.min()) + 8, int(ys.max() - ys.min()) + 8]

data = {
    "size": [W, H],
    "box": box,
    "full": full,
    "bars": [[BAR_TOP[0], BAR_TOP[1], BAR_TOP[2] - BAR_TOP[0], BAR_TOP[3] - BAR_TOP[1]],
             [BAR_BOTTOM[0], BAR_BOTTOM[1], BAR_BOTTOM[2] - BAR_BOTTOM[0], BAR_BOTTOM[3] - BAR_BOTTOM[1]]],
    "ink": ink_d,
    "beige": beige_d,
    "word": word_d,
    "inkStrokes": ink_strokes,
    "beigeStrokes": beige_strokes,
}

header = """/* The Sounding Futures logo, traced from the team's drawing (topographic
   lines of Eisenerz) by tools/trace_logo.py. Coordinates are in the
   drawing's own pixels.
   box: the drawing without the wordmark. full: with it.
   ink, beige, word: filled outlines. bars: the two cut-out rectangles.
   inkStrokes, beigeStrokes: centrelines for the intro, as
   [width, length, top y, top x, path], sorted from the top down. */
"""
with open(OUT, "w") as fh:
    fh.write(header)
    fh.write("window.ESF_LOGO = ")
    fh.write(json.dumps(data, separators=(",", ":")))
    fh.write(";\n")
print("wrote", OUT, file=sys.stderr)
