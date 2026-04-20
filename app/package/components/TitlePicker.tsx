'use client';

import type { TitleOption } from '@/lib/types';

interface Props {
  titles: TitleOption[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

export default function TitlePicker({ titles, selectedIdx, onSelect, onRegenerate, isLoading }: Props) {
  if (titles.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.075 9.10c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.518-4.674z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Title options</h3>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
            {titles.length}
          </span>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="text-xs font-medium text-accent hover:bg-accent-light px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        Click a title to load its thumbnail text below. You can still edit the text after picking.
      </p>

      <div className="space-y-2">
        {titles.map((t, i) => {
          const isSelected = selectedIdx === i;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                isSelected
                  ? 'border-accent bg-accent-light shadow-sm'
                  : 'border-card-border hover:border-accent/40 hover:bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-accent text-white' : 'bg-surface text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{t.title}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        t.estimatedCTR === 'high'
                          ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                          : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {t.estimatedCTR} CTR
                    </span>
                    <span className="text-[11px] text-muted">{t.principle}</span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-muted-light truncate">
                    <span className="text-foreground/70">{t.primaryText}</span>
                    {' / '}
                    <span style={{ color: '#ca8a04' }}>{t.secondaryText}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
