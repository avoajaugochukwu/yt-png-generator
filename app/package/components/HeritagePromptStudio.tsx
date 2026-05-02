'use client';

import { useState } from 'react';
import type { HeritagePromptResponse, HeritageCenterSubMode } from '@/lib/types';

interface Props {
  data: HeritagePromptResponse | null;
  centerSubMode: HeritageCenterSubMode;
  supportedSubModes: HeritageCenterSubMode[];
  onSubModeChange: (mode: HeritageCenterSubMode) => void;
  onRegenerate: () => void;
  onThumbnailTitleChange: (title: string) => void;
  isLoading: boolean;
  isSeeding: boolean;
}

const SUB_MODE_LABELS: Record<HeritageCenterSubMode, { label: string; hint: string }> = {
  object: { label: 'Object', hint: 'A single old-time artifact in focus' },
  job: { label: 'Job', hint: 'A faceless worker mid-action' },
  food: { label: 'Food', hint: 'A hero food shot, no people' },
};

const SECTION_META: Record<
  'leftFigure' | 'center' | 'rightFigure',
  { label: string; subtitle: string; tone: 'sepia' | 'color' }
> = {
  leftFigure: { label: 'Left figure', subtitle: 'Sepia · 1800s flanking person', tone: 'sepia' },
  center: { label: 'Center subject', subtitle: 'Modern colors · dramatic single focus', tone: 'color' },
  rightFigure: { label: 'Right figure', subtitle: 'Sepia · 1800s flanking person', tone: 'sepia' },
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
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
          <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
          {label}
        </>
      )}
    </button>
  );
}

export default function HeritagePromptStudio({
  data,
  centerSubMode,
  supportedSubModes,
  onSubModeChange,
  onRegenerate,
  onThumbnailTitleChange,
  isLoading,
  isSeeding,
}: Props) {
  const sections: Array<'leftFigure' | 'center' | 'rightFigure'> = ['leftFigure', 'center', 'rightFigure'];
  const allPromptsText = data
    ? sections
        .map((key) => {
          const g = data.prompts[key];
          return `=== ${SECTION_META[key].label} ===\n${g.description}\n\n${g.variations
            .map((v, i) => `Variation ${i + 1}:\n${v}`)
            .join('\n\n')}`;
        })
        .join('\n\n')
    : '';

  return (
    <div className="space-y-5">
      {/* Top bar: thumbnail title + center sub-mode + regenerate */}
      <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
              <svg
                className="h-3.5 w-3.5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-foreground">Heritage prompt studio</h3>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              AI · 3 prompts × 3 variations
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data && allPromptsText && <CopyButton text={allPromptsText} label="Copy all" />}
            <button
              onClick={onRegenerate}
              disabled={isLoading || isSeeding}
              className="text-xs font-medium text-accent hover:bg-accent-light px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading || isSeeding ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
              Thumbnail title
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={data?.thumbnailTitle ?? ''}
                onChange={(e) => onThumbnailTitleChange(e.target.value.toUpperCase())}
                disabled={isSeeding}
                placeholder={isSeeding ? 'Generating…' : 'FORGOTTEN FARM TRICKS'}
                className="flex-1 rounded-lg border border-card-border bg-surface px-3 py-2 text-sm font-bold uppercase tracking-wide text-foreground placeholder:text-muted-light placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50"
              />
              {data?.thumbnailTitle && <CopyButton text={data.thumbnailTitle} />}
            </div>
            <p className="mt-1 text-[11px] text-muted-light">
              The bold top-bar headline. 2-4 words. Editable.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
              Center sub-mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {supportedSubModes.map((mode) => {
                const meta = SUB_MODE_LABELS[mode];
                const isActive = centerSubMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => onSubModeChange(mode)}
                    disabled={isSeeding}
                    className={`rounded-lg border px-2 py-1.5 text-left transition-all disabled:opacity-50 ${
                      isActive
                        ? 'border-accent bg-accent-light'
                        : 'border-card-border hover:border-accent/50 hover:bg-surface'
                    }`}
                  >
                    <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                    <div className="text-[10px] text-muted-light leading-tight mt-0.5">{meta.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          The thumbnail is composed from <strong>3 separate AI generations</strong> — left figure, center subject, right figure. Pick a variation from each, generate the images in your image-gen tool of choice, then assemble. Center stays in modern color; flanks stay in sepia.
        </p>
      </div>

      {/* Three prompt sections */}
      {data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {sections.map((key) => {
            const meta = SECTION_META[key];
            const group = data.prompts[key];
            return (
              <div key={key} className="rounded-xl border border-card-border bg-card overflow-hidden flex flex-col">
                <div
                  className={`px-4 py-3 border-b border-card-border ${
                    meta.tone === 'sepia' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                      <p className="text-[11px] text-muted">{meta.subtitle}</p>
                    </div>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        meta.tone === 'sepia'
                          ? 'bg-amber-200/60 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300'
                          : 'bg-accent-light text-accent'
                      }`}
                    >
                      {meta.tone === 'sepia' ? 'Sepia' : 'Color'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="mt-2 text-xs text-foreground/80 leading-snug">{group.description}</p>
                  )}
                </div>
                <div className="p-3 space-y-2.5 flex-1">
                  {group.variations.map((variation, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-card-border bg-surface overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-card-border bg-card">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          Variation {i + 1}
                        </span>
                        {variation && <CopyButton text={variation} />}
                      </div>
                      <textarea
                        readOnly
                        value={variation}
                        rows={6}
                        className="w-full px-3 py-2 text-[12px] leading-relaxed text-foreground bg-transparent resize-y focus:outline-none focus:bg-accent-light/30 font-mono"
                        placeholder="(empty)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            {isSeeding ? 'Generating prompts…' : 'No prompts yet. Click Regenerate above.'}
          </p>
        </div>
      )}
    </div>
  );
}
