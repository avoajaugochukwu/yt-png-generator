'use client';

import type { VisualElement, TimelineEntry } from '@/lib/types';

interface DownloadAreaProps {
  zipUrl: string | null;
  elements: VisualElement[] | null;
  scriptText: string;
  timeline: TimelineEntry[] | null;
}

function deriveSlug(script: string): string {
  return script
    .trim()
    .split(/[\n.!?]/, 1)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'video-assets';
}

export default function DownloadArea({ zipUrl, elements, scriptText, timeline }: DownloadAreaProps) {
  if (!zipUrl || !elements) return null;

  const slug = deriveSlug(scriptText);

  return (
    <div className="animate-fade-in space-y-5">
      {/* Success download card */}
      <div className="rounded-xl border border-success/20 bg-success-light p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-success">
              Assets Ready
            </h3>
            <p className="mt-1 text-sm text-success/80">
              Generated {elements.length} PNG{elements.length !== 1 ? 's' : ''} successfully.
            </p>
            <a
              href={zipUrl}
              download={`${slug}.zip`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-success/20 hover:bg-success-hover hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </a>
          </div>
        </div>
      </div>

      {/* Preview */}
      {timeline && timeline.length > 0 && (() => {
        const preview = timeline.find((e) => e.pngBase64 && e.type !== 'main-title') || timeline.find((e) => e.pngBase64);
        if (!preview) return null;
        return (
          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-card-border bg-surface">
              <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Preview
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    preview.type === 'main-title'
                      ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400'
                      : preview.type === 'listicle-heading'
                        ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {preview.type === 'main-title' ? 'Title' : preview.type === 'listicle-heading' ? 'Heading' : 'POI'}
                </span>
                <span className="font-mono text-xs text-muted-light">
                  {preview.filename}
                </span>
              </div>
              <div className="rounded-xl border border-card-border overflow-hidden bg-surface p-3">
                <img
                  src={`data:image/png;base64,${preview.pngBase64}`}
                  alt={preview.text}
                  className="w-full h-auto rounded-lg"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
