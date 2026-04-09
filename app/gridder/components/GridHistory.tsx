'use client';

import { useState, useEffect } from 'react';
import { relativeTime } from '@/lib/relative-time';

interface HistoryCellData {
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  imageBase64: string;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
}

interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  user: { name: string | null; email: string | null };
  keywords: string[];
  template: { cols: number; rows: number; colWeights?: number[] };
  cellCount: number;
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  thumbnail: string | null;
}

interface GridHistoryProps {
  onRestore: (entry: {
    title: string;
    keywords: string[];
    template: { cols: number; rows: number; colWeights?: number[] };
    gap: number;
    borderRadius: number;
    backgroundColor: string;
    cells?: HistoryCellData[];
  }) => void;
}

export default function GridHistory({ onRestore }: GridHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gridder/history')
      .then((r) => r.json())
      .then(setHistory)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRestore(entry: HistoryEntry) {
    setRestoringId(entry.id);
    try {
      const res = await fetch(`/api/gridder/history/${entry.id}`);
      if (!res.ok) throw new Error('Failed to load session');
      const full = await res.json();
      onRestore({
        title: full.title,
        keywords: full.keywords,
        template: full.template,
        gap: full.gap,
        borderRadius: full.borderRadius,
        backgroundColor: full.backgroundColor,
        cells: full.cells,
      });
    } catch (err) {
      // Fallback: restore without images
      onRestore(entry);
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-card-border bg-surface">
        <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Recent Exports</h3>
        <span className="ml-auto text-xs text-muted-light">{history.length} total</span>
      </div>
      {error && (
        <div className="px-5 py-3 text-xs text-danger">Error: {error}</div>
      )}
      {history.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-muted-light">
          No exports yet. Your exported grids will appear here.
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => handleRestore(entry)}
            disabled={restoringId !== null}
            className="group rounded-lg border border-card-border bg-surface overflow-hidden hover:border-accent/40 hover:shadow-md hover:shadow-accent-glow/10 transition-all text-left disabled:opacity-60"
          >
            {entry.thumbnail && (
              <div className="aspect-video bg-black relative">
                <img
                  src={entry.thumbnail}
                  alt={entry.title}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
                {restoringId === entry.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
            )}
            <div className="p-2 space-y-1">
              <p className="text-[11px] font-medium text-foreground truncate">
                {entry.title || 'Untitled'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-light">
                  {entry.template.cols}x{entry.template.rows}
                </span>
                <span className="text-[10px] text-muted-light">
                  {entry.keywords?.length || 0} keywords
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted truncate max-w-[60%]">
                  {entry.user.name || entry.user.email || 'Anonymous'}
                </p>
                <p className="text-[10px] text-muted-light">
                  {relativeTime(entry.date)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
