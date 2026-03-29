'use client';

import { useState, useEffect, useRef } from 'react';
import type { TimelineEntry } from '@/lib/types';

interface VideoOverlaySectionProps {
  timeline: TimelineEntry[];
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(':');
  const h = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  return h * 3600 + m * 60 + s;
}

const POLL_INTERVAL = 5000;

export default function VideoOverlaySection({ timeline }: VideoOverlaySectionProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasTimestamps = timeline.some((e) => e.start_time && e.end_time);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [downloadUrl]);

  if (!hasTimestamps) return null;

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollJobStatus(jobId: string) {
    try {
      const res = await fetch(`/api/overlay?jobId=${jobId}&action=status`);
      if (!res.ok) {
        stopPolling();
        setError('Failed to check job status');
        setIsProcessing(false);
        return;
      }

      const data = await res.json();

      if (data.status === 'done') {
        stopPolling();
        setStatus('Downloading result...');

        const downloadRes = await fetch(`/api/overlay?jobId=${jobId}&action=download`);
        if (!downloadRes.ok) {
          throw new Error('Failed to download result');
        }

        const blob = await downloadRes.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus('');
        setIsProcessing(false);
      } else if (data.status === 'error') {
        stopPolling();
        setError(data.error || 'Processing failed');
        setStatus('');
        setIsProcessing(false);
      }
      // else still processing — keep polling
    } catch (err) {
      stopPolling();
      setError(err instanceof Error ? err.message : 'Failed to check job status');
      setStatus('');
      setIsProcessing(false);
    }
  }

  async function handleOverlay() {
    if (!videoUrl.trim()) return;

    setError('');
    setIsProcessing(true);
    setStatus('Starting overlay processing...');

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    try {
      const overlays = timeline
        .filter((e) => e.start_time && e.end_time && e.pngBase64)
        .map((e) => ({
          pngBase64: e.pngBase64!,
          startTime: parseTimestamp(e.start_time!),
          endTime: parseTimestamp(e.end_time!),
          width: e.width,
          height: e.height,
        }));

      if (overlays.length === 0) {
        throw new Error('No overlays with timestamps and PNG data available');
      }

      const res = await fetch('/api/overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), overlays }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start overlay job');
      }

      const { jobId } = await res.json();
      setStatus('Processing video — this may take several minutes...');

      // Start polling
      pollRef.current = setInterval(() => pollJobStatus(jobId), POLL_INTERVAL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Overlay processing failed');
      setStatus('');
      setIsProcessing(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
        Apply Overlays to Video
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Paste a direct video file URL to overlay the generated PNGs at their timeline positions.
      </p>

      <div className="flex gap-3">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          disabled={isProcessing}
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleOverlay}
          disabled={isProcessing || !videoUrl.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isProcessing ? 'Processing...' : 'Apply Overlays'}
        </button>
      </div>

      {status && (
        <p className="text-sm text-blue-600 dark:text-blue-400">{status}</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-3 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {downloadUrl && (
        <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            Video ready with overlays applied.
          </p>
          <a
            href={downloadUrl}
            download="overlaid-video.mp4"
            className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}
