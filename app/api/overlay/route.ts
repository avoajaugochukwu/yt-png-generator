import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { overlayPngsOnVideo, type OverlayInput } from '@/lib/video-overlay';

interface OverlayRequestBody {
  videoUrl: string;
  overlays: OverlayInput[];
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const body: OverlayRequestBody = await request.json();

    if (!body.videoUrl || typeof body.videoUrl !== 'string') {
      return Response.json({ error: 'Video URL is required' }, { status: 400 });
    }

    try {
      new URL(body.videoUrl);
    } catch {
      return Response.json({ error: 'Invalid video URL' }, { status: 400 });
    }

    if (!Array.isArray(body.overlays) || body.overlays.length === 0) {
      return Response.json({ error: 'At least one overlay is required' }, { status: 400 });
    }

    for (const o of body.overlays) {
      if (typeof o.startTime !== 'number' || typeof o.endTime !== 'number') {
        return Response.json({ error: 'Each overlay must have numeric startTime and endTime' }, { status: 400 });
      }
      if (o.startTime >= o.endTime) {
        return Response.json({ error: 'startTime must be less than endTime' }, { status: 400 });
      }
      if (!o.pngBase64 || typeof o.pngBase64 !== 'string') {
        return Response.json({ error: 'Each overlay must have pngBase64 data' }, { status: 400 });
      }
    }

    const result = await overlayPngsOnVideo(body.videoUrl, body.overlays);
    tempDir = result.tempDir;

    const stat = await fsPromises.stat(result.outputPath);
    const fileStream = fs.createReadStream(result.outputPath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream;

    // Schedule cleanup after stream is consumed
    fileStream.on('close', () => {
      if (tempDir) {
        fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="overlaid-video.mp4"',
        'Content-Length': String(stat.size),
      },
    });
  } catch (error) {
    // Clean up if we haven't set up streaming yet
    if (tempDir) {
      await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    console.error('[/api/overlay]', error);
    const message = error instanceof Error ? error.message : 'Overlay processing failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
