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

## Project layout

- `app/` — Next.js App Router entry (`api/` routes + UI pages).
- `lib/audio-chunker.ts` — Modal Whisper client (submit job + poll + word→segment grouping).
- `lib/types.ts` — shared request/response types.
- `app/gridder/` — Gridder tool (image-grid composer).

## Deploy

Any host that supports Next.js 16 and Node 20+ works. Make sure `WHISPER_TRANSCRIBE_URL` points to a reachable Modal deployment and `OPENAI_API_KEY` is set.
