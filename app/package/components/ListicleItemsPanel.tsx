'use client';

import { useState } from 'react';

interface Props {
  items: string[];
}

export default function ListicleItemsPanel({ items }: Props) {
  const [copied, setCopied] = useState(false);
  if (items.length === 0) return null;

  const allText = items.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
            <svg
              className="h-3.5 w-3.5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Listicle items</h3>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
            {items.length}
          </span>
        </div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(allText);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {
              // ignore
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-accent/50 hover:bg-accent-light transition-colors"
        >
          {copied ? (
            <>
              <svg
                className="h-3 w-3 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy all
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        Items extracted from the script — these seed the prompt generator and can be pasted elsewhere.
      </p>

      <ol className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-lg border border-card-border bg-surface px-3 py-1.5"
          >
            <span className="shrink-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-light text-[10px] font-bold text-accent">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-foreground leading-snug">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
