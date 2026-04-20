import { NextRequest } from 'next/server';
import { transcribeAudio } from '@/lib/transcribe';

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

function isYouTubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return YOUTUBE_HOSTS.has(host);
  } catch {
    return false;
  }
}

async function fetchAudioFromYouTube(rawUrl: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const base = process.env.YT_AUDIO_SERVICE_URL?.replace(/\/+$/, '');
  if (!base) {
    throw new Error('YT_AUDIO_SERVICE_URL is not configured — deploy services/yt-dlp and set the env var');
  }
  if (!isYouTubeUrl(rawUrl)) {
    throw new Error('Provide a youtube.com or youtu.be URL');
  }

  const apiKey = process.env.YT_AUDIO_SERVICE_KEY;
  const res = await fetch(`${base}/audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ url: rawUrl }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`yt-dlp service failed (${res.status}): ${text || res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_URL_BYTES) {
    throw new Error('Downloaded YouTube audio is too large');
  }

  const headerType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'audio/mp4';
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? 'youtube.m4a';
  const contentType = ALLOWED_TYPES.has(headerType) ? headerType : 'audio/mp4';

  return { buffer: Buffer.from(arrayBuffer), filename, contentType };
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

    const youtubeUrl = formData.get('youtubeUrl');
    if (typeof youtubeUrl === 'string' && youtubeUrl.trim()) {
      const { buffer, filename, contentType } = await fetchAudioFromYouTube(youtubeUrl.trim());
      const result = await transcribeAudio(buffer, filename, contentType);
      return Response.json(result);
    }

    const audioUrl = formData.get('audioUrl');
    if (typeof audioUrl === 'string' && audioUrl.trim()) {
      const { buffer, filename, contentType } = await fetchAudioFromUrl(audioUrl.trim());
      const result = await transcribeAudio(buffer, filename, contentType);
      return Response.json(result);
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
    const result = await transcribeAudio(buffer, audioFile.name, audioFile.type);
    return Response.json(result);
  } catch (error) {
    console.error('[/api/transcribe]', error);
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
