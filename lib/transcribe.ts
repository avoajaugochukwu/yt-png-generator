import type { TranscribeResponse, TranscriptSegment } from '@/lib/types';

const WHISPER_BASE_URL = (
  process.env.WHISPER_TRANSCRIBE_URL || 'https://avoajaugochukwu--whisper-transcribe-web.modal.run'
).replace(/\/+$/, '');

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 55 * 60 * 1000;
const PAUSE_THRESHOLD_SEC = 0.7;
const MAX_SEGMENT_DURATION_SEC = 8;

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface JobSubmittedResponse {
  job_id: string;
}

interface JobStatusResponse {
  job_id: string;
  status: string;
  result?: { words: WordTimestamp[] } | null;
  error?: string | null;
}

async function submitJob(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType || 'application/octet-stream' });
  form.append('file', blob, filename);

  const res = await fetch(`${WHISPER_BASE_URL}/v1/jobs`, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to submit transcription job (${res.status}): ${text}`);
  }
  const data = (await res.json()) as JobSubmittedResponse;
  if (!data.job_id) throw new Error('Transcription job response missing job_id');
  return data.job_id;
}

async function pollJob(jobId: string): Promise<WordTimestamp[]> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${WHISPER_BASE_URL}/v1/jobs/${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to poll job ${jobId} (${res.status}): ${text}`);
    }
    const data = (await res.json()) as JobStatusResponse;
    const status = (data.status || '').toLowerCase();

    if (status === 'completed' || status === 'succeeded' || status === 'success' || status === 'done') {
      if (!data.result) throw new Error('Transcription finished without a result');
      return data.result.words ?? [];
    }
    if (status === 'failed' || status === 'error' || status === 'errored') {
      throw new Error(data.error || `Transcription job ${jobId} failed`);
    }
  }
  throw new Error(`Transcription job ${jobId} timed out after ${MAX_POLL_MS / 1000}s`);
}

function tidy(text: string): string {
  return text.replace(/\s+([,.!?;:])/g, '$1').trim();
}

function wordsToSegments(words: WordTimestamp[]): TranscriptSegment[] {
  if (!words.length) return [];

  const segments: TranscriptSegment[] = [];
  let current: WordTimestamp[] = [];
  let segmentStart = words[0].start;

  const flush = () => {
    if (!current.length) return;
    segments.push({
      start: segmentStart,
      end: current[current.length - 1].end,
      text: tidy(current.map((w) => w.word).join(' ')),
    });
    current = [];
  };

  for (const word of words) {
    if (!current.length) {
      segmentStart = word.start;
      current.push(word);
      continue;
    }
    const prev = current[current.length - 1];
    const pause = word.start - prev.end;
    const spanIfAdded = word.end - segmentStart;
    if (pause > PAUSE_THRESHOLD_SEC || spanIfAdded > MAX_SEGMENT_DURATION_SEC) {
      flush();
      segmentStart = word.start;
    }
    current.push(word);
  }
  flush();
  return segments;
}

export async function transcribeAudio(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<TranscribeResponse> {
  const sizeMb = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[transcribe] Submitting ${fileName} (${sizeMb}MB) to ${WHISPER_BASE_URL}`);

  const jobId = await submitJob(fileBuffer, fileName, mimeType);
  console.log(`[transcribe] Job ${jobId} submitted, polling every ${POLL_INTERVAL_MS}ms`);

  const words = await pollJob(jobId);
  console.log(`[transcribe] Job ${jobId} completed: ${words.length} words`);

  const segments = wordsToSegments(words);
  const fullText = tidy(words.map((w) => w.word).join(' '));
  return { segments, fullText };
}
