#!/usr/bin/env python3
"""Build the web audio for the Eisenerz sounding futures archive.

For every source WAV listed in SOURCES this script

  1. measures integrated loudness and true peak (ffmpeg ebur128),
  2. applies one plain gain so every track sits near TARGET_LUFS without its
     true peak passing CEILING_DBTP (no compression, no limiting),
  3. encodes an MP3 into ../audio/,
  4. writes a loudness envelope and waveform peaks into ../assets/audio-data.js.

Loop tracks (the 64-second sound worlds) are encoded with PAD_SECONDS of
circular padding on both sides. The player loops the middle section, so the
loop stays seamless whatever encoder delay a browser's MP3 decoder leaves in.

The original WAV files are only read, never changed.

Usage:  python3 tools/build_audio.py              rebuild every track
        python3 tools/build_audio.py <id> ...     rebuild only these tracks
Needs:  ffmpeg (with libmp3lame) and numpy.
Set ESF_SOURCE_DIR to point at another copy of "rendered-audio-2026-09-30".
"""

import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
# By default the sources sit next to the site folder, in
# "Summer School/rendered-audio-2026-09-30".
SOURCE_DIR = Path(os.environ.get(
    "ESF_SOURCE_DIR",
    ROOT.parent / "Summer School" / "rendered-audio-2026-09-30",
))
AUDIO_DIR = ROOT / "audio"
DATA_FILE = ROOT / "assets" / "audio-data.js"

TARGET_LUFS = -18.0   # common listening level
CEILING_DBTP = -1.5   # true-peak ceiling before encoding
PAD_SECONDS = 1       # circular padding around loop tracks
ENV_RATE = 12         # envelope frames per second
ENV_FLOOR_DB = -50.0  # envelope value 0
ENV_TOP_DB = -8.0     # envelope value 1
PEAK_BINS = 120       # bars in the waveform scrubber
MP3_QUALITY = "2"     # LAME VBR quality, about 190 kbps

# id, source file relative to SOURCE_DIR, loop
SOURCES = [
    ("present", "with-rhythm/01-present-neutral.wav", True),
    ("moss", "sound-worlds/02-moss-green-return.wav", True),
    ("stone", "with-rhythm/03-stone-empty-city.wav", True),
    ("iron-stone", "sound-worlds/04-iron-stone-industrial-development.wav", True),
    ("metal", "sound-worlds/05-metal-ai-future.wav", True),
    ("threads", "sound-worlds/06-threads-community-development.wav", True),
    ("distortion-morse", "Eisenerz/distortion morse eisenerz.wav", False),
    ("synth-1", "Eisenerz/synth 1 eisenerz.wav", False),
    ("synth-2", "Eisenerz/synth 2 eisenerz.wav", False),
    ("synth-3", "Eisenerz/synth 3 eisenerz.wav", False),
    ("synth-4", "Eisenerz/synth 4 eisenerz.wav", False),
    ("synth-guitar", "Eisenerz/synth guitar eisenerz.wav", False),
    ("violin-looped", "Eisenerz/violin looped eisenerz.wav", False),
    ("whale-guitar-train", "Eisenerz/whale guitar train eisenerz.wav", False),
    ("eisenzukkkkmosserzz", "Eisenerz/eisenzukkkkmosserzz.wav", False),
]

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


def run(cmd, data=None):
    result = subprocess.run(cmd, input=data, capture_output=True)
    if result.returncode != 0:
        sys.exit(f"command failed: {' '.join(map(str, cmd))}\n{result.stderr.decode()[-2000:]}")
    return result


def measure(path):
    """Integrated loudness (LUFS) and true peak (dBTP) of an audio file."""
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
               "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.decode()
    summary = err[err.rfind("Summary:"):]
    lufs = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary).group(1))
    peak = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", summary).group(1))
    return lufs, peak


def sample_rate(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "a:0",
               "-show_entries", "stream=sample_rate", "-of", "csv=p=0", str(path)])
    return int(out.stdout.decode().strip())


def decode(path, rate):
    """Decode to a float32 array of shape (frames, 2)."""
    out = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
               "-f", "f32le", "-ac", "2", "-ar", str(rate), "-"])
    return np.frombuffer(out.stdout, dtype="<f4").reshape(-1, 2)


def encode(samples, rate, out_path, title):
    tags = ["-metadata", f"title={title}",
            "-metadata", "album=Eisenerz sounding futures",
            "-metadata", "date=2026"]
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "f32le", "-ar", str(rate), "-ac", "2", "-i", "-",
         "-c:a", "libmp3lame", "-q:a", MP3_QUALITY, *tags, str(out_path)],
        data=np.ascontiguousarray(samples, dtype="<f4").tobytes())


def pack(values):
    """0..1 floats -> compact string, one character per value (64 steps)."""
    idx = np.clip(np.rint(np.asarray(values) * 63), 0, 63).astype(int)
    return "".join(ALPHABET[i] for i in idx)


def envelope(samples, rate):
    mono = samples.mean(axis=1)
    hop = rate / ENV_RATE
    frames = math.ceil(len(mono) / hop)
    values = []
    for i in range(frames):
        chunk = mono[int(i * hop):int((i + 1) * hop)]
        rms = float(np.sqrt(np.mean(chunk.astype(np.float64) ** 2))) if len(chunk) else 0.0
        db = 20 * math.log10(rms + 1e-9)
        values.append((db - ENV_FLOOR_DB) / (ENV_TOP_DB - ENV_FLOOR_DB))
    return pack(np.clip(values, 0, 1))


def peaks(samples):
    level = np.abs(samples).max(axis=1)
    bins = np.array_split(level, PEAK_BINS)
    values = np.array([b.max() if len(b) else 0.0 for b in bins])
    values = (values / max(values.max(), 1e-9)) ** 0.7
    return pack(values)


def load_existing():
    """Entries already in audio-data.js, kept when only some tracks are rebuilt."""
    if not DATA_FILE.exists():
        return {}
    text = DATA_FILE.read_text(encoding="utf-8")
    return json.loads(text.split("window.ESF_AUDIO =", 1)[1].strip().rstrip(";"))


def main():
    only = set(sys.argv[1:])
    unknown = only - {track_id for track_id, _, _ in SOURCES}
    if unknown:
        sys.exit("unknown track id: " + ", ".join(sorted(unknown)))
    AUDIO_DIR.mkdir(exist_ok=True)
    existing = load_existing() if only else {}
    data = {}
    print(f"{'track':<20} {'source':>13} {'gain':>8} {'result':>13}   file")
    for track_id, rel, loop in SOURCES:
        if only and track_id not in only:
            if track_id in existing:
                data[track_id] = existing[track_id]
            continue
        src = SOURCE_DIR / rel
        if not src.exists():
            sys.exit(f"missing source: {src}")
        lufs, peak = measure(src)
        gain_db = min(TARGET_LUFS - lufs, CEILING_DBTP - peak)
        rate = sample_rate(src)
        x = decode(src, rate) * (10 ** (gain_db / 20))
        duration = len(x) / rate

        if loop:
            pad = PAD_SECONDS * rate
            body = np.concatenate([x[-pad:], x, x[:pad]])
        else:
            body = x
        out_name = f"{track_id}.mp3"
        encode(body, rate, AUDIO_DIR / out_name, track_id.replace("-", " "))

        out_lufs, out_peak = measure(AUDIO_DIR / out_name)
        entry = {
            "file": f"audio/{out_name}",
            "duration": round(duration, 3),
            "envRate": ENV_RATE,
            "env": envelope(x, rate),
            "peaks": peaks(x),
        }
        if loop:
            entry["loop"] = {"start": PAD_SECONDS, "end": round(PAD_SECONDS + duration, 6)}
        data[track_id] = entry
        size = (AUDIO_DIR / out_name).stat().st_size / 1e6
        print(f"{track_id:<20} {lufs:>6.1f} LUFS {gain_db:>+6.1f} dB "
              f"{out_lufs:>6.1f} LUFS {out_peak:>5.1f} dBTP  {out_name} ({size:.1f} MB)")

    DATA_FILE.write_text(
        "/* Generated by tools/build_audio.py. Do not edit by hand. */\n"
        "window.ESF_AUDIO = " + json.dumps(data, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
