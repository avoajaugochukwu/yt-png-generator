import { NextRequest } from 'next/server';
import { transcribeLargeAudio } from '@/lib/audio-chunker';

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
    const audioUrl = formData.get('audioUrl');

    if (typeof audioUrl === 'string' && audioUrl.trim()) {
      const { buffer, filename, contentType } = await fetchAudioFromUrl(audioUrl.trim());
      const result = await transcribeLargeAudio(buffer, filename, contentType);
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
    const result = await transcribeLargeAudio(buffer, audioFile.name, audioFile.type);
    return Response.json(result);
  } catch (error) {
    console.error('[/api/transcribe]', error);
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
