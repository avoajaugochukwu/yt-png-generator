# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- **Transcription** now uses the Modal-hosted Whisper service (`whisper-transcribe-web.modal.run`) instead of OpenAI Whisper with local ffmpeg/ffprobe chunking. The new service returns word-level timestamps (`{word, start, end}`) which are grouped into segments using a 0.7s pause threshold and an 8s max-segment cap. This produces tighter segment boundaries and more accurate PNG overlay placement.
- **`/api/analyze` minimum gap** between consecutive timestamped elements reduced from **20s → 4s** (both the system prompt and the post-processing enforcement in `app/api/analyze/route.ts`). Combined with finer-grained segments from the new transcription service, visual overlays can now land closer to the words that cue them.

### Added
- `WHISPER_TRANSCRIBE_URL` environment variable — override the Modal endpoint used by `lib/audio-chunker.ts`. Defaults to `https://avoajaugochukwu--whisper-transcribe-web.modal.run`.

### Removed
- Local ffmpeg/ffprobe audio chunking, silence detection, and parallel OpenAI Whisper chunk-transcription in `lib/audio-chunker.ts`. The Modal service handles the full pipeline end-to-end.
- `FFMPEG_PATH` / `FFPROBE_PATH` environment variables are no longer read by the transcription path.
