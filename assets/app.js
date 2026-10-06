/* Eisenerz sounding futures: icons, windows and the one-voice player.
   Plain script with no build step. It runs from any static host and also
   from a double-clicked index.html (then loops use a simpler fallback). */
(() => {
  "use strict";

  const C = window.ESF_CONTENT;
  const AUDIO = window.ESF_AUDIO || {};
  const root = document.documentElement;
  const field = document.getElementById("field");
  const layer = document.getElementById("windows");
  const desk = document.getElementById("desk");

  const isLocalFile = location.protocol === "file:";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = window.matchMedia("(max-width: 640px)");
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const SVGNS = "http://www.w3.org/2000/svg";
  const CROSSFADE = 0.9;

  /* ---------- helpers ---------- */

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      el.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children) {
      if (child == null) continue;
      el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function fmt(seconds) {
    const s = Math.max(0, Math.floor(seconds + 1e-4));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function unpack(str) {
    const out = new Float32Array(str ? str.length : 0);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, ALPHABET.indexOf(str[i])) / 63;
    return out;
  }

  function seeded(text) {
    let a = 2166136261;
    for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  };

  /* ---------- language ---------- */

  let lang = (() => {
    const saved = storage.get("esf-lang");
    if (saved === "en" || saved === "de") return saved;
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    return langs.some((l) => /^de\b/i.test(l)) ? "de" : "en";
  })();

  const tr = (obj) => (obj == null ? "" : typeof obj === "string" ? obj : obj[lang] ?? obj.en ?? "");
  const ui = (key) => (C.ui[lang] && C.ui[lang][key]) ?? C.ui.en[key] ?? key;

  /* ---------- grain and palettes ---------- */

  function makeGrain() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(128 * dpr);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d");
    if (!g) return;
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = ((Math.random() + Math.random() + Math.random()) / 3) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    root.style.setProperty("--grain", `url(${canvas.toDataURL("image/png")})`);
  }

  function paint(el, id) {
    const p = C.tracks[id].palette;
    const rand = seeded(id);
    el.style.setProperty("--c1", p[0]);
    el.style.setProperty("--c2", p[1]);
    el.style.setProperty("--c3", p[2]);
    el.style.setProperty("--c4", p[3]);
    el.style.setProperty("--x1", `${Math.round(22 + rand() * 56)}%`);
    el.style.setProperty("--y1", `${Math.round(12 + rand() * 40)}%`);
    el.style.setProperty("--x2", `${Math.round(18 + rand() * 64)}%`);
    el.style.setProperty("--y2", `${Math.round(48 + rand() * 40)}%`);
  }

  /* ---------- audio ---------- */

  let actx = null;

  // Creates or resumes the shared AudioContext. Call it inside a click.
  function audioContext() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC({ latencyHint: "playback" }); } catch (e) {
        try { actx = new AC(); } catch (e2) { return null; }
      }
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* not supported */ }
    }
    if (actx.state === "suspended") actx.resume().catch(() => {});
    return actx;
  }

  // Seamless loops for the 64-second sound worlds. The MP3 carries one second of
  // circular padding on both sides; the buffer loops between loop.start and loop.end.
  class LoopEngine {
    constructor(id, loop) {
      const a = AUDIO[id];
      this.file = a.file;
      this.duration = a.duration;
      this.loopStart = a.loop.start;
      this.loopEnd = a.loop.end;
      this.loop = loop;
      this.buffer = null;
      this.loader = null;
      this.src = null;
      this.gain = null;
      this.offset = 0;
      this.startedAt = 0;
      this.playing = false;
      this.loading = false;
      this.failed = false;
      this.onchange = null;
    }

    emit() { if (this.onchange) this.onchange(); }

    load() {
      if (!this.loader) {
        const ctx = audioContext();
        this.loader = fetch(this.file)
          .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); })
          .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
          .then((buffer) => (this.buffer = buffer));
        this.loader.catch(() => { this.loader = null; });
      }
      return this.loader;
    }

    async play(fade = CROSSFADE) {
      if (this.playing) return;
      if (!audioContext()) throw new Error("Web Audio is not available");
      this.playing = true;
      this.failed = false;
      if (!this.buffer) {
        this.loading = true;
        this.emit();
        try {
          await this.load();
        } catch (err) {
          this.playing = false;
          this.loading = false;
          this.failed = true;
          this.emit();
          throw err;
        }
        this.loading = false;
        if (!this.playing) { this.emit(); return; }
      }
      this.start(fade);
      this.emit();
    }

    start(fade) {
      const ctx = actx;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = this.loop;
      src.loopStart = this.loopStart;
      src.loopEnd = this.loopEnd;
      src.connect(gain);
      if (this.offset >= this.duration - 0.05) this.offset = 0;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + Math.max(fade, 0.01));
      src.start(now, this.loopStart + this.offset);
      if (!this.loop) {
        const remain = this.duration - this.offset;
        const end = now + remain;
        if (remain > fade + 0.1) {
          gain.gain.setValueAtTime(1, end - 0.06);
          gain.gain.linearRampToValueAtTime(0, end);
        }
        src.stop(end + 0.02);
      }
      src.onended = () => {
        if (this.src !== src) return;
        this.src = null;
        this.gain = null;
        this.playing = false;
        this.offset = 0;
        this.emit();
      };
      this.src = src;
      this.gain = gain;
      this.startedAt = now - this.offset;
    }

    stopSource(fade) {
      const { src, gain } = this;
      if (!src) return;
      this.src = null;
      this.gain = null;
      const now = actx.currentTime;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
        src.stop(now + fade + 0.05);
      } catch (e) {
        try { src.stop(); } catch (e2) { /* already stopped */ }
      }
      setTimeout(() => { try { gain.disconnect(); } catch (e) { /* gone */ } }, (fade + 0.4) * 1000);
    }

    pause(fade = 0.5) {
      if (!this.playing) return;
      this.offset = this.position();
      this.playing = false;
      this.stopSource(fade);
      this.emit();
    }

    position() {
      if (!this.src) return this.offset;
      const p = actx.currentTime - this.startedAt;
      if (this.loop) return ((p % this.duration) + this.duration) % this.duration;
      return clamp(p, 0, this.duration);
    }

    seek(t) {
      this.offset = clamp(t, 0, Math.max(0, this.duration - 0.05));
      if (this.src) { this.stopSource(0.04); this.start(0.04); }
      this.emit();
    }

    setLoop(on) {
      if (this.loop === on) return;
      const pos = this.position();
      this.loop = on;
      if (this.src) { this.offset = pos; this.stopSource(0.04); this.start(0.04); }
      this.emit();
    }

    tick() {}

    destroy() {
      this.pause(0.35);
      this.onchange = null;
      this.buffer = null;
      this.loader = null;
    }
  }

  // Streams through an <audio> element: the long recordings, and the sound
  // worlds when the page is opened from a local file (fetch is blocked there).
  class StreamEngine {
    constructor(id, loop) {
      const a = AUDIO[id];
      this.file = a.file;
      this.duration = a.duration;
      this.region = a.loop ? { start: a.loop.start, end: a.loop.end } : null;
      this.loop = loop;
      this.playing = false;
      this.loading = false;
      this.failed = false;
      this.onchange = null;
      this.fadeTimer = 0;

      const el = (this.el = new Audio());
      el.preload = "metadata";
      el.src = this.file;
      el.loop = !this.region && loop;
      el.addEventListener("loadedmetadata", () => {
        if (this.region && el.currentTime < this.region.start) el.currentTime = this.region.start;
      });
      el.addEventListener("waiting", () => this.setLoading(true));
      el.addEventListener("playing", () => this.setLoading(false));
      el.addEventListener("canplay", () => this.setLoading(false));
      el.addEventListener("timeupdate", () => this.tick());
      el.addEventListener("ended", () => {
        this.playing = false;
        this.loading = false;
        this.emit();
      });
      el.addEventListener("error", () => {
        if (!el.getAttribute("src")) return;
        this.playing = false;
        this.loading = false;
        this.failed = true;
        this.emit();
      });
    }

    emit() { if (this.onchange) this.onchange(); }

    setLoading(value) {
      if (this.loading === value) return;
      this.loading = value;
      this.emit();
    }

    play(fade = CROSSFADE) {
      if (this.playing) return Promise.resolve();
      const el = this.el;
      this.playing = true;
      this.failed = false;
      if (this.region && el.readyState >= 1 &&
          (el.currentTime < this.region.start || el.currentTime >= this.region.end)) {
        el.currentTime = this.region.start;
      }
      if (el.ended) el.currentTime = this.region ? this.region.start : 0;
      try { el.volume = 0; } catch (e) { /* iOS: fixed volume */ }
      this.fade(1, fade);
      let started;
      try { started = el.play(); } catch (err) { started = Promise.reject(err); }
      if (el.readyState < 3) this.setLoading(true);
      this.emit();
      return Promise.resolve(started).catch((err) => {
        this.playing = false;
        this.loading = false;
        if (!err || err.name !== "AbortError") this.failed = true;
        this.emit();
        throw err;
      });
    }

    pause(fade = 0.5) {
      if (!this.playing) return;
      this.playing = false;
      this.loading = false;
      this.emit();
      this.fade(0, fade, () => { if (!this.playing) this.el.pause(); });
    }

    // Timer-based so a fade also finishes in a background tab.
    fade(to, seconds, done) {
      clearInterval(this.fadeTimer);
      const el = this.el;
      const from = el.volume;
      const t0 = performance.now();
      const span = Math.max(seconds, 0.01) * 1000;
      this.fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / span);
        try { el.volume = from + (to - from) * k; } catch (e) { /* iOS */ }
        if (k >= 1) {
          clearInterval(this.fadeTimer);
          if (done) done();
        }
      }, 20);
    }

    position() {
      const t = this.el.currentTime || 0;
      return this.region ? clamp(t - this.region.start, 0, this.duration) : clamp(t, 0, this.duration);
    }

    seek(t) {
      const el = this.el;
      const target = (this.region ? this.region.start : 0) + clamp(t, 0, Math.max(0, this.duration - 0.05));
      if (el.readyState >= 1) el.currentTime = target;
      else el.addEventListener("loadedmetadata", () => { el.currentTime = target; }, { once: true });
      this.emit();
    }

    setLoop(on) {
      this.loop = on;
      if (!this.region) this.el.loop = on;
      this.emit();
    }

    tick() {
      if (!this.region || !this.playing) return;
      const el = this.el;
      if (el.currentTime >= this.region.end - 0.02) {
        if (this.loop) {
          el.currentTime -= this.duration;
        } else {
          this.playing = false;
          el.pause();
          el.currentTime = this.region.start;
          this.emit();
        }
      }
    }

    destroy() {
      this.onchange = null;
      this.playing = false;
      const el = this.el;
      this.fade(0, 0.35, () => {
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
    }
  }

  function createEngine(id) {
    const a = AUDIO[id];
    const track = C.tracks[id];
    const loop = track.loop != null ? Boolean(track.loop) : Boolean(a.loop);
    const webAudio = Boolean(window.AudioContext || window.webkitAudioContext) && Boolean(window.fetch);
    if (a.loop && webAudio && !isLocalFile) return new LoopEngine(id, loop);
    return new StreamEngine(id, loop);
  }

  /* ---------- windows ---------- */

  const wins = new Map();
  let zTop = 20;

  const iconFor = (id) => document.getElementById("icon-" + id);
  const pageButton = (id) => document.querySelector(`.bar__link[data-page="${id}"]`);

  function topWindow(kind) {
    let best = null;
    for (const w of wins.values()) {
      if (kind && w.kind !== kind) continue;
      if (!best || Number(w.el.style.zIndex) > Number(best.el.style.zIndex)) best = w;
    }
    return best;
  }

  function raise(w) {
    if (Number(w.el.style.zIndex) !== zTop) w.el.style.zIndex = String(++zTop);
  }

  function frame(w, barTitle) {
    const close = h("button", { class: "win__close", type: "button", "aria-label": ui("close") });
    const cross = document.createElementNS(SVGNS, "svg");
    cross.setAttribute("viewBox", "0 0 6 6");
    cross.setAttribute("aria-hidden", "true");
    cross.innerHTML = '<path d="M.8.8l4.4 4.4M5.2.8L.8 5.2"/>';
    close.append(cross);
    close.addEventListener("click", () => closeWindow(w));
    const title = h("p", { class: "win__bartitle" }, barTitle);
    const bar = h("header", { class: "win__bar" },
      h("div", { class: "win__lights" }, close, h("span", { "aria-hidden": "true" }), h("span", { "aria-hidden": "true" })),
      title);
    const el = h("section", {
      class: `win win--${w.kind}`,
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": `w-${w.id}-title`,
      "data-id": w.id
    });
    el.addEventListener("pointerdown", () => raise(w), true);
    enableDrag(w, bar);
    Object.assign(w, { el, bar, closeButton: close, barTitle: title });
    return el;
  }

  function enableDrag(w, handle) {
    handle.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 || phone.matches || ev.target.closest("button")) return;
      ev.preventDefault();
      const sx = ev.clientX;
      const sy = ev.clientY;
      const x0 = w.x;
      const y0 = w.y;
      handle.setPointerCapture(ev.pointerId);
      w.el.setAttribute("data-dragging", "");
      const move = (e) => {
        w.x = clamp(x0 + e.clientX - sx, 80 - w.el.offsetWidth, window.innerWidth - 80);
        w.y = clamp(y0 + e.clientY - sy, 0, window.innerHeight - 40);
        place(w);
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        w.el.removeAttribute("data-dragging");
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }

  function place(w) {
    w.el.style.left = `${Math.round(w.x)}px`;
    w.el.style.top = `${Math.round(w.y)}px`;
  }

  function position(w, origin) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = w.el.getBoundingClientRect();
    const m = 12;
    let x;
    let y;
    if (w.id === "performance") {
      x = 24;
      y = 58;
    } else if (w.id === "background") {
      x = vw - r.width - 24;
      y = 58;
    } else {
      // Sound windows open over the light in the middle, so the files stay reachable.
      const others = [...wins.values()].filter((o) => o.kind === "sound" && o !== w).length;
      x = (vw - r.width) / 2 + (others % 5) * 24;
      y = (vh - r.height) / 2 + (others % 5) * 24;
    }
    w.x = clamp(x, m, Math.max(m, vw - r.width - m));
    w.y = clamp(y, m, Math.max(m, vh - r.height - m));
    place(w);
  }

  function animateIn(w, origin) {
    const el = w.el;
    if (!el.animate) return;
    if (reducedMotion.matches) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
      return;
    }
    let from = "translateY(14px) scale(.97)";
    if (phone.matches) {
      from = "translateY(48px)";
    } else if (origin) {
      const r = el.getBoundingClientRect();
      const dx = origin.left + origin.width / 2 - (r.left + r.width / 2);
      const dy = origin.top + origin.height / 2 - (r.top + r.height / 2);
      from = `translate(${dx}px, ${dy}px) scale(.16)`;
    }
    el.animate(
      [{ transform: from, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 420, easing: "cubic-bezier(.2, .8, .2, 1)" }
    );
  }

  function mount(w, origin, focus) {
    w.el.style.zIndex = String(++zTop);
    w.el.style.visibility = "hidden";
    layer.append(w.el);
    if (!phone.matches) position(w, origin);
    w.el.style.visibility = "";
    animateIn(w, origin);
    if (focus) w.focusTarget.focus({ preventScroll: true });
    setHash(w.id);
  }

  function closeWindow(w) {
    if (wins.get(w.id) !== w) return;
    wins.delete(w.id);
    const el = w.el;
    const hadFocus = el.contains(document.activeElement);

    if (w.kind === "sound") {
      w.engine.destroy();
      const icon = iconFor(w.id);
      if (icon) {
        icon.removeAttribute("data-open");
        icon.removeAttribute("data-playing");
      }
      updateTint();
    } else {
      const button = pageButton(w.id);
      if (button) button.setAttribute("aria-expanded", "false");
    }

    let to = "scale(.97)";
    const icon = w.kind === "sound" && iconFor(w.id);
    if (icon && !phone.matches) {
      const a = el.getBoundingClientRect();
      const b = icon.querySelector(".icon__tile").getBoundingClientRect();
      to = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.16)`;
    } else if (phone.matches) {
      to = "translateY(48px)";
    }
    el.style.pointerEvents = "none";
    if (el.animate && !reducedMotion.matches) {
      el.animate([{ transform: "none", opacity: 1 }, { transform: to, opacity: 0 }],
        { duration: 260, easing: "cubic-bezier(.4, 0, .8, .4)" }).onfinish = () => el.remove();
    } else {
      el.remove();
    }

    if (hadFocus) {
      const next = w.opener && document.contains(w.opener) ? w.opener : topWindow() && topWindow().focusTarget;
      if (next) next.focus({ preventScroll: true });
    }
    clearHash(w.id);
  }

  /* ---------- sound windows ---------- */

  function waveSvg(peaks, cls) {
    const n = peaks.length || 120;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${n} 30`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", cls);
    svg.setAttribute("aria-hidden", "true");
    let d = "";
    for (let i = 0; i < n; i++) {
      const height = Math.max(1.4, (peaks.length ? peaks[i] : 0.25) * 28);
      d += `M${i + 0.18} ${((30 - height) / 2).toFixed(2)}h.64v${height.toFixed(2)}h-.64z`;
    }
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", d);
    svg.append(path);
    return svg;
  }

  function playIcon() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<path class="i-play" d="M3.5 1.6v10.8L12 7z"/>' +
      '<path class="i-pause" d="M3 1.8h2.8v10.4H3zM8.2 1.8H11v10.4H8.2z"/>';
    return svg;
  }

  function openSound(id, { play = true, origin = null, opener = null, focus = true } = {}) {
    const track = C.tracks[id];
    const audio = AUDIO[id];
    if (!track || !audio) return null;

    let w = wins.get(id);
    if (w) {
      raise(w);
      if (play && !w.engine.playing) soloPlay(w);
      if (focus) w.focusTarget.focus({ preventScroll: true });
      return w;
    }

    w = {
      id,
      kind: "sound",
      opener,
      engine: createEngine(id),
      env: unpack(audio.env),
      envRate: audio.envRate || 12,
      drag: null,
      lastPos: -1,
      lastSec: -1,
      levelOn: false
    };
    const el = frame(w, tr(track.label));
    paint(el, id);

    const art = h("div", { class: "win__art", "aria-hidden": "true" },
      h("div", { class: "win__blob win__blob--b" }, h("i")),
      h("div", { class: "win__blob win__blob--a" }, h("i")),
      h("div", { class: "win__shade" }),
      h("div", { class: "win__grain" }));

    w.eyebrow = h("p", { class: "win__eyebrow" });
    w.title = h("h2", { class: "win__title", id: `w-${id}-title` });
    w.subtitle = h("p", { class: "win__subtitle" });
    w.text = h("p", { class: "win__text" });
    w.toggle = h("button", { class: "player__toggle", type: "button" }, playIcon());
    w.wave = h("div", {
      class: "player__wave",
      role: "slider",
      tabindex: "0",
      "aria-valuemin": "0",
      "aria-valuemax": String(Math.round(audio.duration))
    }, waveSvg(unpack(audio.peaks), "wave--dim"), waveSvg(unpack(audio.peaks), "wave--lit"));
    w.timeNow = h("span", {}, "0:00");
    w.meta = h("p", { class: "win__meta" });
    w.loopButton = h("button", { class: "win__loop", type: "button" });
    w.error = h("p", { class: "win__error", role: "status", hidden: true });
    w.focusTarget = w.toggle;

    el.append(art, w.bar, h("div", { class: "win__body" },
      h("div", { class: "win__head" }, w.eyebrow, w.title, w.subtitle),
      w.text,
      h("div", { class: "player" }, w.toggle, w.wave,
        h("p", { class: "player__time" }, w.timeNow, " / ", fmt(audio.duration))),
      w.error,
      h("div", { class: "win__foot" }, w.meta, w.loopButton)));

    w.toggle.addEventListener("click", () => togglePlay(w));
    w.loopButton.addEventListener("click", () => w.engine.setLoop(!w.engine.loop));
    bindWave(w);
    attachEngine(w);
    renderSoundText(w);

    wins.set(id, w);
    const icon = iconFor(id);
    if (icon) icon.setAttribute("data-open", "");
    mount(w, origin, focus);
    if (play) soloPlay(w);
    return w;
  }

  function attachEngine(w) {
    w.engine.onchange = () => renderSoundState(w);
    renderSoundState(w);
  }

  function renderSoundText(w) {
    const t = C.tracks[w.id];
    w.barTitle.textContent = tr(t.label);
    w.eyebrow.textContent = tr(t.eyebrow);
    w.title.textContent = tr(t.title);
    w.subtitle.textContent = tr(t.subtitle);
    w.subtitle.hidden = !tr(t.subtitle);
    // A description shows wherever one exists; without German, the English original is used.
    w.text.textContent = tr(t.text);
    w.text.hidden = !w.text.textContent;
    if (w.text.textContent && lang !== "en" && !(t.text && t.text[lang])) w.text.lang = "en";
    else w.text.removeAttribute("lang");
    w.meta.textContent = tr(t.meta);
    w.loopButton.textContent = ui("loop");
    w.wave.setAttribute("aria-label", ui("position"));
    w.closeButton.setAttribute("aria-label", ui("close"));
    w.error.textContent = ui("loadError");
    w.lastSec = -1;
    renderSoundState(w);
  }

  function renderSoundState(w) {
    const e = w.engine;
    w.toggle.dataset.state = e.playing ? "playing" : "paused";
    w.toggle.setAttribute("aria-label", e.playing ? ui("pause") : ui("play"));
    w.toggle.toggleAttribute("data-loading", Boolean(e.playing && e.loading));
    w.loopButton.setAttribute("aria-pressed", String(e.loop));
    w.error.hidden = !e.failed;
    const icon = iconFor(w.id);
    if (icon) icon.toggleAttribute("data-playing", e.playing);
    updateTint();
  }

  function togglePlay(w) {
    audioContext();
    if (w.engine.playing) w.engine.pause();
    else soloPlay(w);
  }

  // One voice at a time: starting a sound fades every other sound out.
  function soloPlay(w) {
    for (const other of wins.values()) {
      if (other !== w && other.kind === "sound" && other.engine.playing) other.engine.pause(CROSSFADE);
    }
    const engine = w.engine;
    return Promise.resolve(engine.play(CROSSFADE)).catch(() => {
      // Web Audio could not load the loop: retry once with a plain <audio> stream.
      if (engine instanceof LoopEngine && wins.get(w.id) === w && w.engine === engine) {
        const fallback = new StreamEngine(w.id, engine.loop);
        fallback.seek(engine.offset);
        engine.onchange = null;
        w.engine = fallback;
        attachEngine(w);
        fallback.play(CROSSFADE).catch(() => {});
      }
    });
  }

  function bindWave(w) {
    const wave = w.wave;
    const at = (ev) => {
      const r = wave.getBoundingClientRect();
      return clamp((ev.clientX - r.left) / r.width, 0, 1) * w.engine.duration;
    };
    wave.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      wave.setPointerCapture(ev.pointerId);
      w.drag = at(ev);
      const move = (e) => { w.drag = at(e); };
      const up = (e) => {
        wave.removeEventListener("pointermove", move);
        wave.removeEventListener("pointerup", up);
        wave.removeEventListener("pointercancel", up);
        const target = e.type === "pointercancel" ? null : at(e);
        w.drag = null;
        if (target != null) w.engine.seek(target);
      };
      wave.addEventListener("pointermove", move);
      wave.addEventListener("pointerup", up);
      wave.addEventListener("pointercancel", up);
    });
    wave.addEventListener("keydown", (ev) => {
      const d = w.engine.duration;
      const pos = w.engine.position();
      const step = ev.shiftKey ? 15 : 5;
      let next = null;
      if (ev.key === "ArrowRight" || ev.key === "ArrowUp") next = pos + step;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") next = pos - step;
      else if (ev.key === "PageUp") next = pos + d / 10;
      else if (ev.key === "PageDown") next = pos - d / 10;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = d - 1;
      if (next == null) return;
      ev.preventDefault();
      w.engine.seek(clamp(next, 0, d));
    });
  }

  function updateProgress(w) {
    const d = w.engine.duration;
    const pos = w.drag != null ? w.drag : w.engine.position();
    if (Math.abs(pos - w.lastPos) < 0.02) return;
    w.lastPos = pos;
    w.wave.style.setProperty("--p", `${((pos / d) * 100).toFixed(2)}%`);
    const sec = Math.floor(pos);
    if (sec !== w.lastSec) {
      w.lastSec = sec;
      w.timeNow.textContent = fmt(pos);
      w.wave.setAttribute("aria-valuenow", String(sec));
      w.wave.setAttribute("aria-valuetext", `${fmt(pos)} ${ui("of")} ${fmt(d)}`);
    }
  }

  function envelopeAt(w, t) {
    const env = w.env;
    if (!env.length) return 0.5;
    const i = t * w.envRate;
    const i0 = Math.floor(i) % env.length;
    const i1 = (i0 + 1) % env.length;
    const f = i - Math.floor(i);
    return env[i0] * (1 - f) + env[i1] * f;
  }

  /* ---------- text windows ---------- */

  function openPage(id, { origin = null, opener = null, focus = true } = {}) {
    const page = C.pages[id];
    if (!page) return null;
    let w = wins.get(id);
    if (w) {
      raise(w);
      if (focus) w.focusTarget.focus({ preventScroll: true });
      return w;
    }
    w = { id, kind: "text", opener };
    const el = frame(w, ui(id));
    w.article = h("article", { class: "doc" });
    w.scroll = h("div", { class: "win__scroll", tabindex: "0" }, w.article);
    w.focusTarget = w.scroll;
    el.append(h("div", { class: "win__grain win__grain--text", "aria-hidden": "true" }), w.bar, w.scroll);
    renderPage(w);
    wins.set(id, w);
    const button = pageButton(id);
    if (button) button.setAttribute("aria-expanded", "true");
    mount(w, origin, focus);
    return w;
  }

  function renderPage(w) {
    const page = C.pages[w.id];
    w.barTitle.textContent = ui(w.id);
    w.closeButton.setAttribute("aria-label", ui("close"));
    w.scroll.setAttribute("aria-label", tr(page.title));
    const art = w.article;
    art.textContent = "";
    art.append(h("h2", { class: "doc__title", id: `w-${w.id}-title` }, tr(page.title)));
    for (const block of page.blocks[lang] || page.blocks.en) {
      if (typeof block === "string") art.append(h("p", {}, block));
      else if (block.futures) art.append(renderFutures(block.futures));
      else if (block.credits) art.append(renderCredits(block.credits));
    }
  }

  function renderFutures(list) {
    const ul = h("ul", { class: "doc__futures" });
    for (const [trackId, name] of list) {
      const t = C.tracks[trackId];
      if (!t) continue;
      const swatch = h("i", { class: "doc__swatch", "aria-hidden": "true" });
      swatch.style.background = t.palette[2];
      const button = h("button", { class: "doc__future", type: "button", "data-track": trackId },
        h("span", { class: "doc__future-name" }, name),
        h("span", { class: "doc__future-world" }, swatch, tr(t.label)));
      button.addEventListener("click", () => {
        audioContext();
        const icon = iconFor(trackId);
        openSound(trackId, {
          play: true,
          origin: button.getBoundingClientRect(),
          opener: icon || button
        });
      });
      ul.append(h("li", {}, button));
    }
    return ul;
  }

  function renderCredits(rows) {
    const dl = h("dl", { class: "doc__credits" });
    for (const [label, value, href] of rows) {
      const content = href ? h("a", { href, target: "_blank", rel: "noopener" }, value) : value;
      dl.append(h("div", {}, h("dt", {}, label), h("dd", {}, content)));
    }
    return dl;
  }

  /* ---------- the field ---------- */

  let level = 0;
  let shownLevel = -1;
  let pulsingIcon = null;

  function updateTint() {
    let active = null;
    for (const w of wins.values()) if (w.kind === "sound" && w.engine.playing) active = w;
    field.style.setProperty("--tint", active ? C.tracks[active.id].palette[2] : "rgba(244, 236, 226, 0)");
  }

  function tick() {
    requestAnimationFrame(tick);
    let active = null;
    for (const w of wins.values()) {
      if (w.kind !== "sound") continue;
      w.engine.tick();
      updateProgress(w);
      if (w.engine.playing && !w.engine.loading) active = w;
      else if (w.levelOn) {
        w.el.style.setProperty("--level", "0");
        w.levelOn = false;
      }
    }
    let target = 0;
    if (active && !reducedMotion.matches) {
      target = clamp((envelopeAt(active, active.engine.position()) - 0.3) / 0.6, 0, 1);
    }
    level += (target - level) * (target > level ? 0.22 : 0.06);
    if (Math.abs(level - shownLevel) > 0.003) {
      shownLevel = level;
      field.style.setProperty("--level", level.toFixed(3));
    }
    if (active) {
      active.el.style.setProperty("--level", level.toFixed(3));
      active.levelOn = true;
    }

    // The playing file's little waveform breathes with the sound.
    const icon = active ? iconFor(active.id) : null;
    if (pulsingIcon && pulsingIcon !== icon) pulsingIcon.style.removeProperty("--lvl");
    if (icon) icon.style.setProperty("--lvl", level.toFixed(3));
    pulsingIcon = icon;
  }

  /* ---------- page chrome ---------- */

  // One shared paper gradient for every file icon.
  function paperGradient() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.innerHTML = '<defs><linearGradient id="esf-paper" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fdfdfb"/><stop offset="1" stop-color="#e2e5dc"/></linearGradient></defs>';
    document.body.prepend(svg);
  }

  // A plain sound-file icon. The glyph is a seven-bar summary of the track's
  // own waveform, stretched so that even a steady drone shows a shape.
  function fileIcon(id) {
    const peaks = unpack(AUDIO[id].peaks);
    const count = 7;
    const bars = [];
    for (let i = 0; i < count; i++) {
      const from = Math.floor((i * peaks.length) / count);
      const to = Math.max(from + 1, Math.floor(((i + 1) * peaks.length) / count));
      let sum = 0;
      for (let j = from; j < to; j++) sum += peaks[j] || 0;
      bars.push(sum / (to - from));
    }
    const lo = Math.min(...bars);
    const span = Math.max(...bars) - lo;
    const rects = bars.map((v, i) => {
      const k = span > 0.02 ? (v - lo) / span : 0.6;
      const height = 3.5 + k * 9;
      return `<rect x="${(10.2 + i * 3).toFixed(1)}" y="${(25.6 - height / 2).toFixed(2)}" width="1.6" height="${height.toFixed(2)}" rx=".8"/>`;
    }).join("");
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "file");
    svg.setAttribute("viewBox", "0 0 40 50");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path class="file__sheet" d="M7 1H27L37 11V45A4 4 0 0 1 33 49H7A4 4 0 0 1 3 45V5A4 4 0 0 1 7 1Z"/>' +
      '<path class="file__fold-shade" d="M26.4 1.6V8.6A3 3 0 0 0 29.4 11.6H36.4Z"/>' +
      '<path class="file__fold" d="M27 1V8A3 3 0 0 0 30 11H37Z"/>' +
      `<g class="file__wave">${rects}</g>` +
      '<text class="file__ext" x="20" y="43.6" text-anchor="middle">WAV</text>';
    return svg;
  }

  function renderFiles() {
    paperGradient();
    const grid = document.getElementById("files");
    grid.textContent = "";
    for (const id of C.files) {
      const t = C.tracks[id];
      if (!t || !AUDIO[id]) continue;
      const button = h("button", { class: "icon", type: "button", id: "icon-" + id, "data-track": id },
        h("span", { class: "icon__tile" }, fileIcon(id)),
        h("span", { class: "icon__label" }, h("span", {}, tr(t.label))));
      button.style.setProperty("--accent", t.palette[2]);
      grid.append(h("li", {}, button));
    }
  }

  function applyLanguage() {
    root.lang = lang;
    for (const button of document.querySelectorAll(".bar__link")) button.textContent = ui(button.dataset.page);
    document.getElementById("files").setAttribute("aria-label", ui("sounds"));
    for (const id of Object.keys(C.tracks)) {
      const icon = iconFor(id);
      if (icon) icon.querySelector(".icon__label span").textContent = tr(C.tracks[id].label);
    }
    document.getElementById("note").textContent = ui("note");
    const group = document.getElementById("lang");
    group.setAttribute("aria-label", ui("language"));
    for (const b of group.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    for (const w of wins.values()) {
      if (w.kind === "sound") renderSoundText(w);
      else renderPage(w);
    }
  }

  function setHash(id) {
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* sandboxed */ }
  }

  function clearHash(id) {
    if (location.hash !== "#" + id) return;
    const next = topWindow();
    try { history.replaceState(null, "", next ? "#" + next.id : location.pathname + location.search); } catch (e) { /* sandboxed */ }
  }

  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    if (C.tracks[id] && AUDIO[id]) openSound(id, { play: false, focus: false, opener: iconFor(id) });
    else if (C.pages[id]) openPage(id, { focus: false, opener: pageButton(id) });
  }

  function bind() {
    desk.addEventListener("click", (ev) => {
      const button = ev.target.closest(".icon");
      if (!button) return;
      audioContext();
      openSound(button.dataset.track, {
        play: true,
        origin: button.querySelector(".icon__tile").getBoundingClientRect(),
        opener: button
      });
    });

    for (const button of document.querySelectorAll(".bar__link")) {
      button.addEventListener("click", () => {
        const id = button.dataset.page;
        const w = wins.get(id);
        if (w && topWindow() === w) closeWindow(w);
        else openPage(id, { origin: button.getBoundingClientRect(), opener: button });
      });
    }

    document.getElementById("lang").addEventListener("click", (ev) => {
      const button = ev.target.closest("button[data-lang]");
      if (!button || button.dataset.lang === lang) return;
      lang = button.dataset.lang;
      storage.set("esf-lang", lang);
      applyLanguage();
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        const w = topWindow();
        if (w) {
          ev.preventDefault();
          closeWindow(w);
        }
      } else if (ev.key === " " && (ev.target === document.body || ev.target === root)) {
        const w = topWindow("sound");
        if (w) {
          ev.preventDefault();
          togglePlay(w);
        }
      }
    });

    window.addEventListener("resize", () => {
      if (phone.matches) return;
      for (const w of wins.values()) {
        const r = w.el.getBoundingClientRect();
        w.x = clamp(w.x, 12, Math.max(12, window.innerWidth - r.width - 12));
        w.y = clamp(w.y, 12, Math.max(12, window.innerHeight - r.height - 12));
        place(w);
      }
    });

    window.addEventListener("hashchange", openFromHash);
  }

  /* ---------- start ---------- */

  makeGrain();
  renderFiles();
  applyLanguage();
  bind();
  openFromHash();
  requestAnimationFrame(tick);
})();
