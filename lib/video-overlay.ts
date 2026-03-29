import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const execFile = promisify(execFileCb);

const FFMPEG = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

export interface OverlayInput {
  pngBase64: string;
  startTime: number;
  endTime: number;
  width: number;
  height: number;
}

interface VideoDimensions {
  width: number;
  height: number;
}

async function getVideoDimensions(videoPath: string): Promise<VideoDimensions> {
  const { stdout } = await execFile(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x',
    videoPath,
  ]);
  const [w, h] = stdout.trim().split('x').map(Number);
  if (!w || !h) throw new Error('Could not determine video dimensions');
  return { width: w, height: h };
}

async function downloadVideo(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    if (!res.body) throw new Error('No response body');

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('video/') && !contentType.startsWith('application/octet-stream') && !url.match(/\.(mp4|mov|webm|mkv)(\?|$)/i)) {
      throw new Error(`URL does not appear to be a video file (content-type: ${contentType})`);
    }

    const nodeStream = Readable.fromWeb(res.body as import('stream/web').ReadableStream);
    const fileHandle = await fs.open(destPath, 'w');
    try {
      await pipeline(nodeStream, fileHandle.createWriteStream());
    } finally {
      await fileHandle.close();
    }
  } finally {
    clearTimeout(timeout);
  }
}

interface PositionedOverlay {
  pngPath: string;
  x: number;
  y: number;
  start: number;
  end: number;
}

function buildFilterComplex(
  overlays: Array<{ inputIndex: number; x: number; y: number; start: number; end: number }>
): string {
  const filters: string[] = [];
  let prevLabel = '0:v';

  for (let i = 0; i < overlays.length; i++) {
    const o = overlays[i];
    const fmtLabel = `ov${i}`;
    const outLabel = i === overlays.length - 1 ? 'out' : `v${i}`;
    // Explicitly convert PNG from rgba to yuva420p to prevent ffmpeg from
    // inserting auto_scale filters which exhaust resources when chained.
    filters.push(`[${o.inputIndex}:v]format=yuva420p[${fmtLabel}]`);
    filters.push(
      `[${prevLabel}][${fmtLabel}]overlay=${o.x}:${o.y}:enable='between(t,${o.start},${o.end})'[${outLabel}]`
    );
    prevLabel = outLabel;
  }

  return filters.join(';');
}

export async function overlayPngsOnVideo(
  videoUrl: string,
  overlays: OverlayInput[]
): Promise<{ outputPath: string; tempDir: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-overlay-'));

  try {
    // Download video
    const videoPath = path.join(tempDir, 'input.mp4');
    await downloadVideo(videoUrl, videoPath);

    // Get video dimensions
    const video = await getVideoDimensions(videoPath);

    // Write PNG files and compute overlay positions
    const pngPaths: string[] = [];
    const filterOverlays: Array<{ inputIndex: number; x: number; y: number; start: number; end: number }> = [];

    for (let i = 0; i < overlays.length; i++) {
      const o = overlays[i];
      const pngPath = path.join(tempDir, `overlay_${i}.png`);
      await fs.writeFile(pngPath, Buffer.from(o.pngBase64, 'base64'));
      pngPaths.push(pngPath);

      const x = Math.max(0, Math.round((video.width - o.width) / 2));
      const y = Math.max(0, Math.round((video.height - o.height) / 2));

      filterOverlays.push({
        inputIndex: i + 1,
        x,
        y,
        start: o.startTime,
        end: o.endTime,
      });
    }

    const filterComplex = buildFilterComplex(filterOverlays);
    const outputPath = path.join(tempDir, 'output.mp4');

    // Write filter to a script file to avoid command-line length limits
    const scriptPath = path.join(tempDir, 'filter.txt');
    await fs.writeFile(scriptPath, filterComplex);

    const args = [
      '-i', videoPath,
      ...pngPaths.flatMap(p => ['-i', p]),
      '-filter_complex_script', scriptPath,
      '-map', '[out]',
      '-map', '0:a?',
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ];

    await execFile(FFMPEG, args, { timeout: 600_000, maxBuffer: 10 * 1024 * 1024 });

    return { outputPath, tempDir };
  } catch (err) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
