'use client';

import { useState } from 'react';

interface Props {
  tags: string[];
}

export default function TagsPanel({ tags }: Props) {
  const [copied, setCopied] = useState<'csv' | 'lines' | null>(null);

  if (tags.length === 0) return null;

  const csv = tags.join(', ');
  const lines = tags.join('\n');

  function copy(text: string, kind: 'csv' | 'lines') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">YouTube tags</h3>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
            {tags.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => copy(csv, 'csv')}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-light transition-colors"
          >
            {copied === 'csv' ? 'Copied' : 'Copy comma-separated'}
          </button>
          <button
            onClick={() => copy(lines, 'lines')}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-light transition-colors"
          >
            {copied === 'lines' ? 'Copied' : 'Copy one-per-line'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md bg-surface px-2 py-1 text-xs font-medium text-foreground border border-card-border"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
