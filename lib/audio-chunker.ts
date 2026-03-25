import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import openai from '@/lib/openai';
import type { TranscribeResponse, TranscriptSegment } from '@/lib/types';

const execFile = promisify(execFileCb);

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB safety margin
const MAX_CONCURRENT = 3;

interface SilenceInterval {
  start: number;
  end: number;
}

interface ChunkInfo {
  path: string;
  startTime: number;
}

interface ChunkResult {
  segments: TranscriptSegment[];
  text: string;
  startTime: number;
}

async function getDuration(inputPath: string): Promise<number> {
  const { stdout } = await execFile(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    inputPath,
  ]);
  return parseFloat(stdout.trim());
}

async function detectSilences(inputPath: string): Promise<SilenceInterval[]> {
  try {
    await execFile(FFMPEG, [
      '-i', inputPath,
      '-af', 'silencedetect=noise=-30dB:d=0.5',
      '-f', 'null',
      '-',
    ], { maxBuffer: 10 * 1024 * 1024 });
    return [];
  } catch (err: unknown) {
    // ffmpeg writes detection info to stderr and may exit with non-zero
    const stderr = (err as { stderr?: string }).stderr || '';
    const starts: number[] = [];
    const ends: number[] = [];

    for (const match of stderr.matchAll(/silence_start:\s*([\d.]+)/g)) {
      starts.push(parseFloat(match[1]));
    }
    for (const match of stderr.matchAll(/silence_end:\s*([\d.]+)/g)) {
      ends.push(parseFloat(match[1]));
    }

    const silences: SilenceInterval[] = [];
    for (let i = 0; i < starts.length; i++) {
      silences.push({
        start: starts[i],
        end: i < ends.length ? ends[i] : starts[i] + 0.5,
      });
    }
    return silences;
  }
}

function computeSplitPoints(
  silences: SilenceInterval[],
  duration: number,
  fileSize: number
): number[] {
  const bytesPerSecond = fileSize / duration;
  const maxChunkDuration = MAX_CHUNK_SIZE / bytesPerSecond;
  const splitPoints: number[] = [];
  let currentStart = 0;

  while (currentStart + maxChunkDuration < duration) {
    const targetSplit = currentStart + maxChunkDuration;

    // Find the nearest silence midpoint to the target split
    let bestSplit = targetSplit;
    let bestDistance = Infinity;

    for (const s of silences) {
      const mid = (s.start + s.end) / 2;
      // Only consider silences within the current chunk window
      if (mid <= currentStart) continue;
      if (mid >= duration) break;

      const distance = Math.abs(mid - targetSplit);
      // Accept silence points within 30% of the chunk duration from the target
      if (distance < bestDistance && distance < maxChunkDuration * 0.3) {
        bestDistance = distance;
        bestSplit = mid;
      }
    }

    splitPoints.push(bestSplit);
    currentStart = bestSplit;
  }

  return splitPoints;
}

async function splitAudio(
  inputPath: string,
  splitPoints: number[],
  duration: number,
  tempDir: string
): Promise<ChunkInfo[]> {
  const boundaries = [0, ...splitPoints, duration];
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const ext = path.extname(inputPath) || '.mp3';
    const chunkPath = path.join(tempDir, `chunk_${i}${ext}`);

    await execFile(FFMPEG, [
      '-i', inputPath,
      '-ss', String(start),
      '-to', String(end),
      '-c', 'copy',
      '-y',
      chunkPath,
    ]);

    // Verify chunk size; re-encode if too large
    const stat = await fs.stat(chunkPath);
    if (stat.size > 25 * 1024 * 1024) {
      const reEncodedPath = path.join(tempDir, `chunk_${i}_re.mp3`);
      await execFile(FFMPEG, [
        '-i', inputPath,
        '-ss', String(start),
        '-to', String(end),
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-y',
        reEncodedPath,
      ]);
      await fs.unlink(chunkPath);
      chunks.push({ path: reEncodedPath, startTime: start });
    } else {
      chunks.push({ path: chunkPath, startTime: start });
    }
  }

  return chunks;
}

async function transcribeChunk(
  chunkPath: string
): Promise<{ segments: TranscriptSegment[]; text: string }> {
  const buffer = await fs.readFile(chunkPath);
  const ext = path.extname(chunkPath).slice(1) || 'mp3';
  const file = new File([buffer], `chunk.${ext}`, {
    type: ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/m4a' : 'audio/mpeg',
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const segments = (transcription.segments || []).map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  return { segments, text: transcription.text };
}

function mergeResults(chunkResults: ChunkResult[]): TranscribeResponse {
  const allSegments: TranscriptSegment[] = [];
  const allTexts: string[] = [];

  for (const result of chunkResults) {
    for (const seg of result.segments) {
      allSegments.push({
        start: seg.start + result.startTime,
        end: seg.end + result.startTime,
        text: seg.text,
      });
    }
    allTexts.push(result.text);
  }

  return {
    segments: allSegments,
    fullText: allTexts.join(' '),
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function transcribeLargeAudio(
  fileBuffer: Buffer,
  fileName: string,
  _mimeType: string
): Promise<TranscribeResponse> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-transcribe-'));

  try {
    const ext = path.extname(fileName) || '.mp3';
    const inputPath = path.join(tempDir, `input${ext}`);
    await fs.writeFile(inputPath, fileBuffer);

    const duration = await getDuration(inputPath);
    const fileSize = fileBuffer.length;

    console.log(`[audio-chunker] File: ${fileName}, size: ${(fileSize / 1024 / 1024).toFixed(1)}MB, duration: ${duration.toFixed(1)}s`);

    const silences = await detectSilences(inputPath);
    console.log(`[audio-chunker] Found ${silences.length} silence intervals`);

    const splitPoints = computeSplitPoints(silences, duration, fileSize);
    console.log(`[audio-chunker] Splitting into ${splitPoints.length + 1} chunks at: ${splitPoints.map(s => s.toFixed(1)).join(', ')}s`);

    const chunks = await splitAudio(inputPath, splitPoints, duration, tempDir);

    const chunkResults = await runWithConcurrency(
      chunks,
      async (chunk) => {
        const result = await transcribeChunk(chunk.path);
        return { ...result, startTime: chunk.startTime };
      },
      MAX_CONCURRENT
    );

    return mergeResults(chunkResults);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
