import * as crypto from 'crypto';
import * as fsPromises from 'fs/promises';
import { overlayPngsOnVideo, type OverlayInput } from './video-overlay';

export interface OverlayJob {
  id: string;
  status: 'processing' | 'done' | 'error';
  error?: string;
  outputPath?: string;
  tempDir?: string;
  createdAt: number;
}

const jobs = new Map<string, OverlayJob>();

// Clean up stale jobs (older than 30 minutes)
const STALE_MS = 30 * 60 * 1000;

function cleanupStaleJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > STALE_MS) {
      if (job.tempDir) {
        fsPromises.rm(job.tempDir, { recursive: true, force: true }).catch(() => {});
      }
      jobs.delete(id);
    }
  }
}

export function getJob(id: string): OverlayJob | undefined {
  return jobs.get(id);
}

export function startOverlayJob(videoUrl: string, overlays: OverlayInput[]): string {
  cleanupStaleJobs();

  const id = crypto.randomUUID();
  const job: OverlayJob = { id, status: 'processing', createdAt: Date.now() };
  jobs.set(id, job);

  // Run in background — don't await
  overlayPngsOnVideo(videoUrl, overlays)
    .then((result) => {
      job.status = 'done';
      job.outputPath = result.outputPath;
      job.tempDir = result.tempDir;
    })
    .catch((err) => {
      job.status = 'error';
      job.error = err instanceof Error ? err.message : 'Processing failed';
    });

  return id;
}

export function deleteJob(id: string) {
  const job = jobs.get(id);
  if (job?.tempDir) {
    fsPromises.rm(job.tempDir, { recursive: true, force: true }).catch(() => {});
  }
  jobs.delete(id);
}
