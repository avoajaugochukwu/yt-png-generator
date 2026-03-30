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

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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

      pollRef.current = setInterval(() => pollJobStatus(jobId), POLL_INTERVAL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Overlay processing failed');
      setStatus('');
      setIsProcessing(false);
    }
  }

  return (
    <div className="animate-fade-in rounded-xl border border-card-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Apply Overlays to Video
          </h3>
          <p className="text-xs text-muted-light">
            Paste a direct video file URL to overlay PNGs at their timeline positions
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          disabled={isProcessing}
          className="flex-1 rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 transition-shadow"
        />
        <button
          onClick={handleOverlay}
          disabled={isProcessing || !videoUrl.trim()}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {isProcessing ? (
            <>
              <Spinner />
              Processing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Apply Overlays
            </>
          )}
        </button>
      </div>

      {status && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-light px-4 py-2.5">
          <Spinner />
          <p className="text-sm text-accent">{status}</p>
        </div>
      )}

      {error && (
        <div className="animate-slide-down flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-light px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button
            onClick={() => setError('')}
            className="shrink-0 rounded-lg p-1 text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {downloadUrl && (
        <div className="rounded-xl border border-success/20 bg-success-light p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-success">
                Video ready with overlays applied.
              </p>
              <a
                href={downloadUrl}
                download="overlaid-video.mp4"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-success/20 hover:bg-success-hover hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
