import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import type { OverlayInput } from '@/lib/video-overlay';
import { startOverlayJob, getJob, deleteJob } from '@/lib/overlay-jobs';

interface OverlayRequestBody {
  videoUrl: string;
  overlays: OverlayInput[];
}

// POST: start a new overlay job
export async function POST(request: NextRequest) {
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

    const jobId = startOverlayJob(body.videoUrl, body.overlays);
    return Response.json({ jobId });
  } catch (error) {
    console.error('[/api/overlay POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to start overlay job';
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET: poll job status or download result
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const action = request.nextUrl.searchParams.get('action'); // 'status' or 'download'

  if (!jobId) {
    return Response.json({ error: 'jobId is required' }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  if (action === 'download') {
    if (job.status !== 'done' || !job.outputPath) {
      return Response.json({ error: 'Job is not ready for download' }, { status: 400 });
    }

    try {
      const stat = await fsPromises.stat(job.outputPath);
      const fileStream = fs.createReadStream(job.outputPath);
      const webStream = Readable.toWeb(fileStream) as ReadableStream;

      // Cleanup after stream is consumed
      fileStream.on('close', () => {
        deleteJob(jobId);
      });

      return new Response(webStream, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="overlaid-video.mp4"',
          'Content-Length': String(stat.size),
        },
      });
    } catch (error) {
      console.error('[/api/overlay GET download]', error);
      deleteJob(jobId);
      return Response.json({ error: 'Failed to read output file' }, { status: 500 });
    }
  }

  // Default: return status
  return Response.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
  });
}
