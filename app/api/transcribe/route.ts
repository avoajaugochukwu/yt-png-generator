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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
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
