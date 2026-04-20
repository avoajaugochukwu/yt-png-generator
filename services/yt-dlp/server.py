"""
Tiny Railway-friendly service that downloads a YouTube video's bestaudio with
yt-dlp and streams it back as m4a/webm. Used by /api/transcribe in the Next.js
app to feed Whisper without the user having to find an audio URL first.
"""
import os
import shutil
import tempfile
from pathlib import Path
from typing import Annotated, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from yt_dlp import YoutubeDL

API_KEY = os.environ.get("API_KEY", "")
MAX_FILESIZE_BYTES = int(os.environ.get("MAX_FILESIZE_MB", "1024")) * 1024 * 1024

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "music.youtube.com",
}

app = FastAPI(title="yt-dlp audio service")


class AudioRequest(BaseModel):
    url: str


def is_youtube_url(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return host in YOUTUBE_HOSTS


def require_auth(authorization: Optional[str]) -> None:
    if not API_KEY:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if authorization[len("Bearer "):] != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.post("/audio")
def fetch_audio(
    body: AudioRequest,
    authorization: Annotated[Optional[str], Header()] = None,
):
    require_auth(authorization)

    if not is_youtube_url(body.url):
        raise HTTPException(status_code=400, detail="Only YouTube URLs are supported")

    tmpdir = tempfile.mkdtemp(prefix="ytdlp-")
    try:
        outtmpl = os.path.join(tmpdir, "%(id)s.%(ext)s")
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": outtmpl,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "max_filesize": MAX_FILESIZE_BYTES,
            "retries": 2,
            "fragment_retries": 2,
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(body.url, download=True)
            filepath = ydl.prepare_filename(info)

        path = Path(filepath)
        if not path.exists():
            raise HTTPException(status_code=502, detail="yt-dlp produced no file")

        size = path.stat().st_size
        ext = path.suffix.lstrip(".").lower()
        content_type = {
            "m4a": "audio/mp4",
            "mp4": "audio/mp4",
            "webm": "audio/webm",
            "opus": "audio/opus",
            "ogg": "audio/ogg",
            "mp3": "audio/mpeg",
        }.get(ext, "application/octet-stream")

        def iterfile():
            try:
                with open(path, "rb") as f:
                    while True:
                        chunk = f.read(64 * 1024)
                        if not chunk:
                            break
                        yield chunk
            finally:
                shutil.rmtree(tmpdir, ignore_errors=True)

        return StreamingResponse(
            iterfile(),
            media_type=content_type,
            headers={
                "Content-Length": str(size),
                "Content-Disposition": f'attachment; filename="{path.name}"',
            },
        )
    except HTTPException:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=502, detail=f"yt-dlp failed: {exc}")
