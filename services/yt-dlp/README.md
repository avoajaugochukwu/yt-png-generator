# yt-dlp audio service

Tiny FastAPI wrapper around `yt-dlp` that downloads a YouTube video's bestaudio and streams it back. The Next.js `/api/transcribe` route calls this service when the user pastes a YouTube URL in `/package`, then forwards the audio to the Modal Whisper service.

## Endpoints

- `POST /audio` — JSON body `{ "url": "https://youtu.be/…" }`. Returns `audio/mp4` (m4a) or `audio/webm` stream. Auth: `Authorization: Bearer $API_KEY` if `API_KEY` is set on the service.
- `GET /healthz` — liveness probe.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `API_KEY` | Shared bearer token. Leave unset to disable auth (not recommended). | — |
| `MAX_FILESIZE_MB` | Reject downloads larger than this. | `1024` |
| `PORT` | Bound port. Railway sets this automatically. | `8080` |

## Deploy on Railway

1. Push this repo. In Railway, **New Project → Deploy from GitHub** and pick this repo.
2. Set the **Root Directory** for the service to `services/yt-dlp` so Railway uses this Dockerfile.
3. Add env vars: `API_KEY=<long random string>` (and optionally `MAX_FILESIZE_MB`).
4. Wait for build (~2 min for the Python + ffmpeg image), then copy the public URL.
5. In the Next.js app's environment, set:
   - `YT_AUDIO_SERVICE_URL=https://<your-railway-app>.up.railway.app`
   - `YT_AUDIO_SERVICE_KEY=<same value as API_KEY>`

## Local dev

```bash
cd services/yt-dlp
docker build -t yt-dlp-service .
docker run --rm -p 8080:8080 -e API_KEY=devkey yt-dlp-service
curl -X POST http://localhost:8080/audio \
  -H 'Authorization: Bearer devkey' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --output out.m4a
```

## Maintenance

`yt-dlp` breaks every few weeks when YouTube ships extractor changes — bump the pinned version in `requirements.txt` and redeploy. Watch <https://github.com/yt-dlp/yt-dlp/releases>.
