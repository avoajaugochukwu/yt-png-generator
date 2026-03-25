'use client';

import type { VisualElement, TimelineEntry } from '@/lib/types';

interface DownloadAreaProps {
  zipUrl: string | null;
  elements: VisualElement[] | null;
  scriptText: string;
  timeline: TimelineEntry[] | null;
}

function deriveFilename(script: string): string {
  const slug = script
    .trim()
    .split(/[\n.!?]/, 1)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${slug || 'video-assets'}.zip`;
}

export default function DownloadArea({ zipUrl, elements, scriptText, timeline }: DownloadAreaProps) {
  if (!zipUrl || !elements) return null;

  const filename = deriveFilename(scriptText);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950 p-5">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
          Assets Ready
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
          Generated {elements.length} PNG{elements.length !== 1 ? 's' : ''}.
        </p>

        <a
          href={zipUrl}
          download={filename}
          className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Download ZIP
        </a>
      </div>

      {timeline && timeline.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            Timeline
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Text</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Start</th>
                <th className="px-4 py-2">End</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((entry) => (
                <tr
                  key={entry.filename}
                  className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {entry.filename}
                  </td>
                  <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">
                    {entry.text}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        entry.type === 'main-title'
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                          : entry.type === 'listicle-heading'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {entry.type === 'main-title' ? 'Title' : entry.type === 'listicle-heading' ? 'Heading' : 'POI'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">
                    {entry.start_time ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">
                    {entry.end_time ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
