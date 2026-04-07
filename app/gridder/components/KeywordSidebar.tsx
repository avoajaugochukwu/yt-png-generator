'use client';

import type { GridCellData } from '@/lib/types';

interface KeywordSidebarProps {
  keywords: string[];
  cells: GridCellData[];
  selectedCellId: string | null;
  onSelectCell: (id: string) => void;
}

function extractKeyword(text: string): string {
  // Strip "#N " prefix from listicle headings
  return text.replace(/^#\d+\s+/i, '').trim();
}

export { extractKeyword };

export default function KeywordSidebar({
  keywords,
  cells,
  selectedCellId,
  onSelectCell,
}: KeywordSidebarProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Keywords</h3>
        <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
          {keywords.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {keywords.map((kw, i) => {
          const cell = cells[i];
          const isSelected = cell && cell.id === selectedCellId;
          const hasImage = cell?.imageUrl != null;

          return (
            <div
              key={i}
              onClick={() => cell && onSelectCell(cell.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-accent-light border border-accent/30'
                  : 'hover:bg-surface border border-transparent'
              }`}
            >
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-muted">
                {i + 1}
              </span>
              <span className="text-foreground truncate flex-1">{kw}</span>
              {hasImage && (
                <svg className="h-3.5 w-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(kw)}`,
                    '_blank',
                  );
                }}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/10 transition-colors"
                title="Search Google Images"
              >
                Search
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
