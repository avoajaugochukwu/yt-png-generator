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
    <div className="space-y-4">
      <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950 p-5">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
          Assets Ready
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
          Generated {elements.length} PNG{elements.length !== 1 ? 's' : ''}.
        </p>

        <div className="flex gap-3">
          <a
            href={zipUrl}
            download={`${slug}.zip`}
            className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Download ZIP
          </a>

        </div>
      </div>

      {timeline && timeline.length > 0 && (() => {
        const preview = timeline.find((e) => e.pngBase64 && e.type !== 'main-title') || timeline.find((e) => e.pngBase64);
        if (!preview) return null;
        return (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
              Preview
            </h3>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                    preview.type === 'main-title'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : preview.type === 'listicle-heading'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {preview.type === 'main-title' ? 'Title' : preview.type === 'listicle-heading' ? 'Heading' : 'POI'}
                </span>
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {preview.filename}
                </span>
              </div>
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-900 p-2">
                <img
                  src={`data:image/png;base64,${preview.pngBase64}`}
                  alt={preview.text}
                  className="w-full h-auto rounded"
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
