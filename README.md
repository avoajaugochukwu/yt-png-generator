# yt-png-generator

Next.js app that turns a YouTube script (plus optional audio/video) into timestamped PNG overlay assets for video editing. A companion **Gridder** tool composes image grids.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pipeline

1. **Input** — the user provides a script, or uploads an audio/video file, or pastes an audio URL.
2. **Transcription** (`POST /api/transcribe`) — if audio is provided, the raw buffer is forwarded to the [Modal Whisper service](https://avoajaugochukwu--whisper-transcribe-web.modal.run/docs). The service is called via its async job endpoints (`POST /v1/jobs` + poll `GET /v1/jobs/{job_id}`). Word-level timestamps are returned and grouped into segments (pause > 0.7s or segment duration > 8s starts a new segment). The response shape is `{ segments: [{start, end, text}], fullText }`.
3. **Analysis** (`POST /api/analyze`) — GPT-4o receives the script and the segments and emits `VisualElement`s (main-title, listicle-heading, point-of-interest, subscribe) each with `timestamp` / `timestampEnd`. Post-processing anchors the main-title at 5s and enforces a **4-second** minimum gap between consecutive timestamped elements (without pushing a POI past the next heading).
4. **Generation** (`POST /api/generate`) — renders each element to a PNG via `@napi-rs/canvas` and returns a timeline JSON that downstream editors can consume.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Required — used by `/api/analyze` (GPT-4o). | — |
| `WHISPER_TRANSCRIBE_URL` | Base URL of the Modal Whisper service. | `https://avoajaugochukwu--whisper-transcribe-web.modal.run` |

No local ffmpeg/ffprobe install is required — audio decoding happens inside the Modal service.

## Package wizard

`/package` is a 3-step wizard that produces a complete YouTube video package (overlay PNGs + thumbnail) for a given **channel**. Channels are configured in `lib/channels.ts` and bind a script type to a thumbnail spec (grid template, gap colour, text overlay style).

Currently configured: **Garden / listicle** — 3×1 grid, gray gap, 6 px line-gap on a black text bar (white top line + yellow bottom line). Garden uses **deterministic** image sourcing (subject names extracted from the script), so the cells are filled by clicking _Search_ to open Google Images and pasting the chosen image into the selected cell.

Steps:

1. **Script** — pick a channel, paste audio URL or script text.
2. **Overlays** — analyze + customize, then generate the same overlay PNG ZIP that `/` produces.
3. **Titles + Thumbnail** — `POST /api/package/seo` seeds **5 CTR-optimized title options** (each using a different psychological principle: loss aversion, curiosity gap, FOMO, etc.) plus the per-cell **image keywords** plus **15-20 YouTube SEO tags** (broad topics + script subjects + long-tail discovery phrases). Each title carries its own `primaryText`/`secondaryText` pair; clicking a title pre-fills the thumbnail's top + bottom lines. You then fill the cells (Search opens Google Images, paste/upload), tweak text if needed, and `POST /api/package/thumbnail-compose` renders the final 1920×1080 thumbnail. Tags are shown in a copy-to-clipboard panel (comma-separated or one-per-line).

This app does **not** generate the YouTube description — that comes from a separate pipeline.

Adding a new channel = adding an entry to `CHANNELS` in `lib/channels.ts` with its `voice` profile (audience, signature moves, avoid patterns, example titles) and one `ThumbnailSpec` per supported `scriptType`. The voice profile is injected into the SEO prompt so titles match the channel's tone.

## Project layout

- `app/` — Next.js App Router entry (`api/` routes + UI pages).
- `lib/audio-chunker.ts` — Modal Whisper client (submit job + poll + word→segment grouping).
- `lib/types.ts` — shared request/response types.
- `lib/channels.ts` — channel registry (per-channel thumbnail specs).
- `app/gridder/` — Gridder tool (image-grid composer).
- `app/package/` — Package wizard (overlays + thumbnail per channel).

## Deploy

Any host that supports Next.js 16 and Node 20+ works. Make sure `WHISPER_TRANSCRIBE_URL` points to a reachable Modal deployment and `OPENAI_API_KEY` is set.
