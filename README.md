# yt-png-generator

Next.js app that turns a YouTube script (plus optional audio/video) into timestamped PNG overlay assets for video editing. A companion **Gridder** tool composes image grids.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pipeline

1. **Input** — the user provides a script, or uploads an audio/video file, or pastes an audio URL.
2. **Transcription** (`POST /api/transcribe`) — two modes selected via the `mode` form field:
   - **`precise` (default — used by `/forge`)** — forwards the audio buffer to the [Modal Whisper service](https://avoajaugochukwu--whisper-transcribe-web.modal.run/docs) (async job pattern: `POST /v1/jobs` + poll `GET /v1/jobs/{job_id}`). Returns word-level timestamps grouped into segments (pause > 0.7 s or segment duration > 8 s). Best for PNG overlay placement which needs sub-second accuracy.
   - **`fast` (used by `/gridder` and `/package`)** — re-encodes the audio to opus mono 16 kHz / 24 kbps via local `ffmpeg` (~10 MB / hour), then sends it to OpenAI's Whisper API (`whisper-1` by default) with `verbose_json`. Cheaper but only segment-level timestamps. Cannot exceed OpenAI's 25 MB upload cap — re-encoding usually stays well under it; we throw a clear error if it doesn't.

   Either mode returns `{ segments: [{start, end, text}], fullText }`.
3. **Analysis** (`POST /api/analyze`) — GPT-4o receives the script and the segments and emits `VisualElement`s (main-title, listicle-heading, point-of-interest, subscribe) each with `timestamp` / `timestampEnd`. Post-processing anchors the main-title at 5s and enforces a **4-second** minimum gap between consecutive timestamped elements (without pushing a POI past the next heading).
4. **Generation** (`POST /api/generate`) — renders each element to a PNG via `@napi-rs/canvas` and returns a timeline JSON that downstream editors can consume.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Required — used by `/api/analyze` (GPT-4o). | — |
| `WHISPER_TRANSCRIBE_URL` | Base URL of the Modal Whisper service (precise word-level timestamps, used by `/forge`). | `https://avoajaugochukwu--whisper-transcribe-web.modal.run` |
| `OPENAI_WHISPER_MODEL` | OpenAI Whisper model used by `/api/transcribe?mode=fast` (cheap path for `/gridder` and `/package`). | `whisper-1` |
| `FFMPEG_PATH` | Path to the `ffmpeg` binary (used to re-encode audio to opus 24 kbps mono before sending to OpenAI Whisper, keeping it under the 25 MB cap). | `ffmpeg` |
| `YT_DLP_PATH` | Path to the `yt-dlp` binary (used by `/api/transcribe` when a YouTube URL is pasted). The production Dockerfile installs it on `PATH`. | `yt-dlp` |

No local ffmpeg/ffprobe install is required — audio decoding happens inside the Modal service.

## Package wizard

`/package` is a 3-step wizard that produces a complete YouTube video package (overlay PNGs + thumbnail) for a given **channel**. Channels are configured in `lib/channels.ts` and bind a script type to a thumbnail spec (grid template, gap colour, text overlay style).

Currently configured: **Garden / listicle** — 3×1 grid, gray gap, 6 px line-gap on a black text bar (white top line + yellow bottom line). Garden uses **deterministic** image sourcing (subject names extracted from the script), so the cells are filled by clicking _Search_ to open Google Images and pasting the chosen image into the selected cell.

Steps:

1. **Script** — pick a channel, then provide the source. For already-published videos, paste the **YouTube URL** (the server shells out to `yt-dlp` — installed in the Dockerfile alongside ffmpeg — to grab bestaudio, then forwards it to Whisper). Otherwise: audio URL, audio file, or pasted script text.
2. **Overlays** — analyze + customize, then generate the same overlay PNG ZIP that `/` produces.
3. **Titles + Thumbnail** — `POST /api/package/seo` seeds **5 CTR-optimized title options** (each using a different psychological principle: loss aversion, curiosity gap, FOMO, etc.) plus the per-cell **image keywords** plus **15-20 YouTube SEO tags** (broad topics + script subjects + long-tail discovery phrases). Each title carries its own `primaryText`/`secondaryText` pair; clicking a title pre-fills the thumbnail's top + bottom lines. You then fill the cells (Search opens Google Images, paste/upload), tweak text if needed, and `POST /api/package/thumbnail-compose` renders the final 1920×1080 thumbnail. Tags are shown in a copy-to-clipboard panel (comma-separated or one-per-line).

This app does **not** generate the YouTube description — that comes from a separate pipeline.

Adding a new channel = adding an entry to `CHANNELS` in `lib/channels.ts` with its `voice` profile (audience, signature moves, avoid patterns, example titles) and one `ThumbnailSpec` per supported `scriptType`. The voice profile is injected into the SEO prompt so titles match the channel's tone.

## Project layout

- `app/` — Next.js App Router entry (`api/` routes + UI pages).
- `lib/transcribe.ts` — Modal Whisper client (submit job + poll + word→segment grouping).
- `lib/types.ts` — shared request/response types.
- `lib/channels.ts` — channel registry (per-channel thumbnail specs).
- `app/gridder/` — Gridder tool (image-grid composer).
- `app/package/` — Package wizard (overlays + thumbnail per channel).

## Deploy

Any host that supports Next.js 16 and Node 20+ works. Make sure `WHISPER_TRANSCRIBE_URL` points to a reachable Modal deployment and `OPENAI_API_KEY` is set.
