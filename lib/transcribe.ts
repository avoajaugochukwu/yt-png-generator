import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { toFile } from 'openai';
import openai from '@/lib/openai';
import type { TranscribeResponse, TranscriptSegment } from '@/lib/types';

const WHISPER_BASE_URL = (
  process.env.WHISPER_TRANSCRIBE_URL || 'https://avoajaugochukwu--whisper-transcribe-web.modal.run'
).replace(/\/+$/, '');

const OPENAI_WHISPER_MODEL = process.env.OPENAI_WHISPER_MODEL || 'whisper-1';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const OPENAI_WHISPER_MAX_BYTES = 25 * 1024 * 1024;

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

/**
 * Re-encode arbitrary audio/video to opus mono 16kHz 24kbps so it fits under
 * OpenAI's 25 MB Whisper cap. ~10 MB / hour for typical speech.
 */
async function reencodeForOpenAI(buffer: Buffer, originalFilename: string): Promise<{ buffer: Buffer; filename: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'whisper-'));
  const inputExt = path.extname(originalFilename) || '.bin';
  const inputPath = path.join(dir, `in${inputExt}`);
  const outputPath = path.join(dir, 'out.ogg');

  try {
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-i', inputPath,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'libopus',
        '-b:a', '24k',
        '-application', 'voip',
        '-threads', '0',
        outputPath,
      ];
      const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (b: Buffer) => { stderr += b.toString(); });
      proc.on('error', (err) => {
        const msg = (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'ffmpeg binary not found — install ffmpeg (the production Dockerfile already does)'
          : `ffmpeg failed to start: ${err.message}`;
        reject(new Error(msg));
      });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`));
      });
    });

    const stats = await stat(outputPath);
    if (stats.size > OPENAI_WHISPER_MAX_BYTES) {
      throw new Error(
        `Re-encoded audio (${(stats.size / 1024 / 1024).toFixed(1)}MB) still exceeds OpenAI's 25MB limit — try a shorter clip or use the precise (Modal) transcriber.`,
      );
    }

    const out = await readFile(outputPath);
    return { buffer: out, filename: 'audio.ogg' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function transcribeAudioOpenAI(
  fileBuffer: Buffer,
  fileName: string,
): Promise<TranscribeResponse> {
  const inputMb = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[transcribe-openai] Re-encoding ${fileName} (${inputMb}MB) for OpenAI Whisper`);

  const { buffer, filename } = await reencodeForOpenAI(fileBuffer, fileName);
  const outMb = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`[transcribe-openai] Re-encoded → ${outMb}MB; sending to ${OPENAI_WHISPER_MODEL}`);

  const file = await toFile(buffer, filename, { type: 'audio/ogg' });
  const result = await openai.audio.transcriptions.create({
    file,
    model: OPENAI_WHISPER_MODEL,
    response_format: 'verbose_json',
  });

  const segments: TranscriptSegment[] = (result.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: tidy(s.text),
  }));

  return {
    segments,
    fullText: tidy(result.text),
  };
}
