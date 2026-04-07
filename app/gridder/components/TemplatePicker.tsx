'use client';

import { useState } from 'react';
import type { GridTemplate } from '@/lib/types';
import { BUILT_IN_TEMPLATES } from '@/lib/grid-templates';

interface TemplatePickerProps {
  selected: GridTemplate;
  onSelect: (template: GridTemplate) => void;
}

export default function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  const [customCols, setCustomCols] = useState(3);
  const [customRows, setCustomRows] = useState(2);

  return (
    <div className="animate-fade-in rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Grid Template</h3>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {BUILT_IN_TEMPLATES.map((tpl) => {
          const isSelected = selected.id === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                isSelected
                  ? 'border-accent bg-accent-light shadow-sm'
                  : 'border-card-border hover:border-accent/40 hover:bg-surface'
              }`}
            >
              {/* Mini grid preview */}
              <div
                className="w-full aspect-video rounded-md overflow-hidden"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${tpl.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${tpl.rows}, 1fr)`,
                  gap: '2px',
                  padding: '2px',
                  backgroundColor: isSelected ? 'var(--accent)' : 'var(--muted-light)',
                }}
              >
                {Array.from({ length: tpl.cols * tpl.rows }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[2px]"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface)',
                    }}
                  />
                ))}
              </div>
              <span
                className={`text-xs font-medium ${
                  isSelected ? 'text-accent' : 'text-muted'
                }`}
              >
                {tpl.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom template */}
      <div className="flex items-center gap-3 pt-3 border-t border-card-border">
        <span className="text-xs font-medium text-muted">Custom:</span>
        <input
          type="number"
          min={1}
          max={10}
          value={customCols}
          onChange={(e) => setCustomCols(Math.max(1, Math.min(10, +e.target.value || 1)))}
          className="w-14 rounded-lg border border-card-border bg-surface px-2 py-1 text-sm text-foreground text-center"
        />
        <span className="text-xs text-muted">x</span>
        <input
          type="number"
          min={1}
          max={5}
          value={customRows}
          onChange={(e) => setCustomRows(Math.max(1, Math.min(5, +e.target.value || 1)))}
          className="w-14 rounded-lg border border-card-border bg-surface px-2 py-1 text-sm text-foreground text-center"
        />
        <button
          onClick={() => {
            const tpl: GridTemplate = {
              id: `${customCols}x${customRows}`,
              label: `${customCols} x ${customRows}`,
              cols: customCols,
              rows: customRows,
            };
            onSelect(tpl);
          }}
          className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
