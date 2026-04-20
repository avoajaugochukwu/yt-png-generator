import { NextRequest } from 'next/server';
import { transcribeAudio, transcribeAudioOpenAI } from '@/lib/transcribe';

export const maxDuration = 3600;

const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
  'video/x-matroska',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const EXT_TO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/m4a',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

const MAX_URL_BYTES = 2 * 1024 * 1024 * 1024;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com',
]);

const YT_TRANSCRIPT_API_URL = (
  process.env.YT_TRANSCRIPT_API_URL || 'https://youtube-transcript-production-18aa.up.railway.app/api'
).replace(/\/+$/, '');

function isYouTubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return YOUTUBE_HOSTS.has(host);
  } catch {
    return false;
  }
}

async function fetchYouTubeTranscript(rawUrl: string): Promise<{ fullText: string; segments: [] }> {
  if (!isYouTubeUrl(rawUrl)) {
    throw new Error('Provide a youtube.com or youtu.be URL');
  }

  const res = await fetch(`${YT_TRANSCRIPT_API_URL}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: rawUrl }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.message || data.error || `YouTube transcript service failed (${res.status})`,
    );
  }
  const data: unknown = await res.json();
  const fullText =
    typeof data === 'string'
      ? data
      : typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>).transcript ||
          (data as Record<string, unknown>).text ||
          (data as Record<string, unknown>).fullText ||
          ''
        : '';
  if (typeof fullText !== 'string' || !fullText.trim()) {
    throw new Error('YouTube transcript service returned no text — the video may have no captions');
  }
  return { fullText: fullText.trim(), segments: [] };
}

async function fetchAudioFromUrl(rawUrl: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid audio URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Audio URL must be http(s)');
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch audio URL (${res.status})`);
  }

  const pathname = url.pathname;
  const filename = decodeURIComponent(pathname.split('/').pop() || 'audio');
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const headerType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  const contentType = ALLOWED_TYPES.has(headerType) ? headerType : EXT_TO_MIME[ext] ?? headerType;

  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error('URL does not point to a supported audio/video file (mp3, wav, m4a, mp4, mkv, webm, mov, avi)');
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_URL_BYTES) {
    throw new Error('Remote audio file is too large');
  }

  return { buffer: Buffer.from(arrayBuffer), filename, contentType };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const useFast = formData.get('mode') === 'fast';
    const run = (buf: Buffer, name: string, type: string) =>
      useFast ? transcribeAudioOpenAI(buf, name) : transcribeAudio(buf, name, type);

    // YouTube URLs always go through the captions-based transcript service.
    // No yt-dlp, no audio download, no Whisper. Fails clearly when the video
    // has no captions — caller should fall back to uploading the audio file.
    const youtubeUrl = formData.get('youtubeUrl');
    if (typeof youtubeUrl === 'string' && youtubeUrl.trim()) {
      return Response.json(await fetchYouTubeTranscript(youtubeUrl.trim()));
    }

    const audioUrl = formData.get('audioUrl');
    if (typeof audioUrl === 'string' && audioUrl.trim()) {
      const { buffer, filename, contentType } = await fetchAudioFromUrl(audioUrl.trim());
      return Response.json(await run(buffer, filename, contentType));
    }

    const audioFile = formData.get('audio');
    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json({ error: 'No audio file or URL provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(audioFile.type)) {
      return Response.json(
        { error: 'Invalid file type. Accepted: mp3, wav, m4a, mp4, mkv, webm, mov, avi' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    return Response.json(await run(buffer, audioFile.name, audioFile.type));
  } catch (error) {
    console.error('[/api/transcribe]', error);
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
