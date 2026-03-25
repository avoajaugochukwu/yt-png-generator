import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import { transcribeLargeAudio } from '@/lib/audio-chunker';
import type { TranscribeResponse } from '@/lib/types';

export const maxDuration = 300;

const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
]);

const CHUNK_THRESHOLD = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(audioFile.type)) {
      return Response.json(
        { error: 'Invalid file type. Accepted: mp3, wav, m4a' },
        { status: 400 }
      );
    }

    if (audioFile.size > CHUNK_THRESHOLD) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await transcribeLargeAudio(buffer, audioFile.name, audioFile.type);
      return Response.json(result);
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const segments = (transcription.segments || []).map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    }));

    const result: TranscribeResponse = {
      segments,
      fullText: transcription.text,
    };

    return Response.json(result);
  } catch (error) {
    console.error('[/api/transcribe]', error);
    return Response.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
