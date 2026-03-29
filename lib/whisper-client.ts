import type { TranscribeResponse, TranscriptSegment } from '@/lib/types';

const WHISPER_API_URL = 'https://whisper-stable-production.up.railway.app';
const POLL_INTERVAL_MS = 20_000; // 20 seconds
const MAX_POLL_ATTEMPTS = 180; // 180 * 20s = 1 hour

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result: { words: WhisperWord[] } | null;
  error: string | null;
}

async function submitJob(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${WHISPER_API_URL}/v1/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to submit transcription job: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.job_id;
}

async function pollJob(jobId: string): Promise<WhisperWord[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await fetch(`${WHISPER_API_URL}/v1/jobs/${jobId}`);

    if (!res.ok) {
      throw new Error(`Failed to poll job ${jobId}: ${res.status}`);
    }

    const data: WhisperJobResponse = await res.json();

    if (data.status === 'completed') {
      if (!data.result?.words) {
        throw new Error('Transcription completed but no words returned');
      }
      return data.result.words;
    }

    if (data.status === 'failed') {
      throw new Error(`Transcription failed: ${data.error || 'unknown error'}`);
    }

    // queued or processing — wait and retry
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Transcription timed out after 1 hour');
}

function wordsToSegments(words: WhisperWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let buffer: WhisperWord[] = [];

  for (const word of words) {
    buffer.push(word);

    const isSentenceEnd = /[.?!:]$/.test(word.word.trim());
    const atWordCap = buffer.length >= 25;

    if (isSentenceEnd || atWordCap) {
      segments.push({
        start: buffer[0].start,
        end: buffer[buffer.length - 1].end,
        text: buffer.map((w) => w.word).join(' ').trim(),
      });
      buffer = [];
    }
  }

  // Flush remaining words
  if (buffer.length > 0) {
    segments.push({
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end,
      text: buffer.map((w) => w.word).join(' ').trim(),
    });
  }

  return segments;
}

export async function transcribeAudio(file: File): Promise<TranscribeResponse> {
  console.log(`[whisper-client] Submitting job for ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

  const jobId = await submitJob(file);
  console.log(`[whisper-client] Job submitted: ${jobId}`);

  const words = await pollJob(jobId);
  console.log(`[whisper-client] Transcription complete: ${words.length} words`);

  const segments = wordsToSegments(words);
  const fullText = segments.map((s) => s.text).join(' ');

  return { segments, fullText };
}
