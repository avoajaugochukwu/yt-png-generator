import { NextRequest } from 'next/server';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

function isYouTubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return YOUTUBE_HOSTS.has(host);
  } catch {
    return false;
  }
}

const YT_DLP_BIN = process.env.YT_DLP_PATH || 'yt-dlp';

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    case 'webm':
      return 'audio/webm';
    case 'opus':
      return 'audio/opus';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    default:
      return 'application/octet-stream';
  }
}

async function fetchAudioFromYouTube(rawUrl: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  if (!isYouTubeUrl(rawUrl)) {
    throw new Error('Provide a youtube.com or youtu.be URL');
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'ytdlp-'));
  try {
    let cookiesPath: string | null = null;
    const cookiesB64 = process.env.YT_DLP_COOKIES_B64;
    if (cookiesB64) {
      cookiesPath = path.join(dir, 'cookies.txt');
      await writeFile(cookiesPath, Buffer.from(cookiesB64, 'base64'));
    }

    const filePath = await new Promise<string>((resolve, reject) => {
      const args = [
        '-f', 'bestaudio[ext=m4a]/bestaudio/best',
        '-o', path.join(dir, '%(id)s.%(ext)s'),
        '--no-playlist',
        '--no-warnings',
        '--quiet',
        '--max-filesize', '1G',
        '--print', 'after_move:filepath',
        // Bot-check workarounds for server IPs:
        '--extractor-args', 'youtube:player_client=mweb,android,web_safari',
        '--user-agent', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        ...(cookiesPath ? ['--cookies', cookiesPath] : []),
        rawUrl,
      ];
      const proc = spawn(YT_DLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (b: Buffer) => { stdout += b.toString(); });
      proc.stderr.on('data', (b: Buffer) => { stderr += b.toString(); });
      proc.on('error', (err) => {
        const msg = (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'yt-dlp binary not found — install it on this host (the production Dockerfile already does)'
          : `yt-dlp failed to start: ${err.message}`;
        reject(new Error(msg));
      });
      proc.on('close', (code) => {
        if (code !== 0) {
          const raw = stderr.trim() || stdout.trim() || 'unknown error';
          const hint = /sign in to confirm.+not a bot|cookies/i.test(raw) && !cookiesPath
            ? ' — YouTube is blocking this IP. Export cookies from a logged-in browser, base64-encode the cookies.txt, and set YT_DLP_COOKIES_B64.'
            : '';
          reject(new Error(`yt-dlp exited with ${code}: ${raw}${hint}`));
          return;
        }
        const fp = stdout.trim().split('\n').filter(Boolean).pop();
        if (!fp) {
          reject(new Error('yt-dlp did not report an output filepath'));
          return;
        }
        resolve(fp);
      });
    });

    const stats = await stat(filePath);
    if (stats.size > MAX_URL_BYTES) {
      throw new Error('Downloaded YouTube audio is too large');
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = contentTypeForExt(ext);
    return {
      buffer,
      filename: path.basename(filePath),
      contentType: ALLOWED_TYPES.has(contentType) ? contentType : 'audio/mp4',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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

    const youtubeUrl = formData.get('youtubeUrl');
    if (typeof youtubeUrl === 'string' && youtubeUrl.trim()) {
      const { buffer, filename, contentType } = await fetchAudioFromYouTube(youtubeUrl.trim());
      return Response.json(await run(buffer, filename, contentType));
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
