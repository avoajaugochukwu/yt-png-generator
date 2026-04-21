'use client';

import { useState } from 'react';

interface Props {
  keywords: string[];
}

export default function KeywordChips({ keywords }: Props) {
  const [copied, setCopied] = useState(false);

  if (keywords.length === 0) return null;

  const csv = keywords.join(', ');

  function copy() {
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function search(kw: string) {
    window.open(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(kw)}`,
      '_blank',
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Image keywords</h3>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
            {keywords.length}
          </span>
        </div>
        <button
          onClick={copy}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-light transition-colors"
        >
          {copied ? 'Copied' : 'Copy comma-separated'}
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        Click any keyword to open it in Google Images. Use these when you need more subject options than the 3 cells above.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <button
            key={`${kw}-${i}`}
            onClick={() => search(kw)}
            className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs font-medium text-foreground border border-card-border hover:border-accent hover:bg-accent-light hover:text-accent transition-colors"
            title={`Search Google Images for "${kw}"`}
          >
            <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {kw}
          </button>
        ))}
      </div>
    </div>
  );
}
