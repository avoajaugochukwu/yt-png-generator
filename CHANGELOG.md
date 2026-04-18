# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- **Transcription** now uses the Modal-hosted Whisper service (`whisper-transcribe-web.modal.run`) instead of OpenAI Whisper with local ffmpeg/ffprobe chunking. The new service returns word-level timestamps (`{word, start, end}`) which are grouped into segments using a 0.7s pause threshold and an 8s max-segment cap. This produces tighter segment boundaries and more accurate PNG overlay placement.
- **`/api/analyze` minimum gap** between consecutive timestamped elements reduced from **20s → 4s** (both the system prompt and the post-processing enforcement in `app/api/analyze/route.ts`). Combined with finer-grained segments from the new transcription service, visual overlays can now land closer to the words that cue them.

### Added
- **Script-type classification** in `/api/analyze`. GPT-4o now classifies each script as `listicle | tutorial | explainer | essay | narrative | commentary | other` and returns the result as `scriptType` on `AnalyzeResponse`. Listicle-specific rules (extract every numbered item, `#N ITEM NAME` formatting, `listicle-heading` element type) now apply **only** when `scriptType === "listicle"`. All other types emit `main-title` + `point-of-interest` + `subscribe` only. The server also strips stray `listicle-heading` elements from non-listicle responses as a safety net.
- **Heart drawn as canvas path** for `subscribe` overlays in `lib/canvas.ts`. Replaces the `\u2764` glyph rendered in `serif`, which showed as a tofu box on hosts without an emoji font. No repo font-shipping required.
- `WHISPER_TRANSCRIBE_URL` environment variable — override the Modal endpoint used by `lib/audio-chunker.ts`. Defaults to `https://avoajaugochukwu--whisper-transcribe-web.modal.run`.

### UI
- **Input section** reorganized (`app/components/InputSection.tsx`): audio URL paste is now the primary, highlighted input; audio/script file uploads live inside a collapsed "Other input methods" disclosure; the script-paste textarea is nested inside a second, further-collapsed disclosure.
- Type labels spelled out in element lists: `POI` → `Point of Interest`, and the `subscribe` type now renders as `Subscribe` instead of falling through to `POI` (`app/components/ForgeForm.tsx`, `app/components/DownloadArea.tsx`).

### Removed
- Local ffmpeg/ffprobe audio chunking, silence detection, and parallel OpenAI Whisper chunk-transcription in `lib/audio-chunker.ts`. The Modal service handles the full pipeline end-to-end.
- `FFMPEG_PATH` / `FFPROBE_PATH` environment variables are no longer read by the transcription path.
