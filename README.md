# Eisenerz sounding futures

Live at https://safronovges.github.io/eisenerz-sounding-futures/

Archive website for **Sounding Futures** (Rostfest 2026, Eisenerz): six sound worlds and eight pieces, with texts in English and German. Plain HTML, CSS and JavaScript with no build step.

## Look at it

Double-clicking `index.html` works. For the smoothest playback, serve the folder instead:

```bash
python3 tools/serve.py
```

Then open http://localhost:8173. This server tells the browser to recheck files on every load, so edits show up on a normal reload. Served over http(s), the 64-second sound worlds loop without any gap. Opened as a local file, they loop with a tiny skip at the loop point, because browsers block the seamless method for local files.

## Change the words

Every text lives in `assets/content.js`, in English (`en`) and German (`de`):

- the two text windows, "the performance" and "the background", including the credits
- each sound's label, title, subtitle, description (`text`), author (`credit`, shown under the description) and the small technical line. A `draft` is a suggested description that is not shown; rename it to `text` to use it.
- the order of the files on the page (`files`)
- each sound's colours (`palette`, darkest to lightest), used for its window and for its file's waveform while it plays

## Add or replace a sound

1. Add the source WAV to `SOURCES` in `tools/build_audio.py`. Set `loop` to `True` only for files built as seamless loops.
2. Run `python3 tools/build_audio.py <id>` (needs ffmpeg and numpy). It writes `audio/<id>.mp3` and adds its waveform data to `assets/audio-data.js`. Without an id it rebuilds every track.
3. Add an entry with the same id to `tracks` in `assets/content.js` and add the id to `files`.

## Put it online

The site is published with GitHub Pages from the `main` branch of this repository. Every push to `main` updates the live site within a minute or two:

```bash
git add -A && git commit -m "Update texts" && git push
```

It also runs on any other static host, such as Netlify or a university web server: upload `index.html`, `assets/` and `audio/`.

## Notes on the audio

- All tracks are gain-matched to about −18 LUFS with plain gain: no compression or limiting. The sources had ranged from −27 to −4 LUFS. The original WAVs in `Summer School/rendered-audio-2026-09-30` are untouched.
- The sound worlds are encoded with one second of circular padding on each side. The player loops the middle 64 seconds, so the loop stays seamless whatever encoder delay a browser's decoder leaves in.
- Only one sound plays at a time. Starting another one crossfades, much like the installation did in the café.
