'use client';

import { useState, useEffect, useRef } from 'react';
import type { CustomizationOptions, VisualElement } from '@/lib/types';

const AVAILABLE_FONTS = ['Anton', 'Inter', 'Merriweather', 'JetBrains Mono'] as const;

interface CustomizationPanelProps {
  customization: CustomizationOptions;
  onCustomizationChange: (options: CustomizationOptions) => void;
  customInstructions: string;
  onCustomInstructionsChange: (instructions: string) => void;
  previewElement: VisualElement | null;
}

export default function CustomizationPanel({
  customization,
  onCustomizationChange,
  customInstructions,
  onCustomInstructionsChange,
  previewElement,
}: CustomizationPanelProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function update(key: keyof CustomizationOptions, value: string) {
    onCustomizationChange({ ...customization, [key]: value });
  }

  useEffect(() => {
    if (!previewElement) {
      setPreviewSrc(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ element: previewElement, customization }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setPreviewSrc(`data:image/png;base64,${data.png}`);
      } catch {
        // aborted or failed — ignore
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [previewElement, customization]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Customization
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customization.textColor}
              onChange={(e) => update('textColor', e.target.value)}
              className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            />
            <input
              type="text"
              value={customization.textColor}
              onChange={(e) => update('textColor', e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-mono"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customization.backgroundColor}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            />
            <input
              type="text"
              value={customization.backgroundColor}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-mono"
              placeholder="#1a1a2e"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Bar Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customization.barColor}
              onChange={(e) => update('barColor', e.target.value)}
              className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            />
            <input
              type="text"
              value={customization.barColor}
              onChange={(e) => update('barColor', e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm font-mono"
              placeholder="#60B5F6"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Font</label>
          <select
            value={customization.fontFamily}
            onChange={(e) => update('fontFamily', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          >
            {AVAILABLE_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
      </div>

      {previewSrc && (
        <div className="space-y-1.5">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-900 p-2">
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-auto rounded"
            />
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Preview does not include the title, which is always white.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Custom Instructions (optional)
        </label>
        <textarea
          className="w-full h-20 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder='e.g., "make all product names red", "use a larger font for headings", "focus on statistics"'
          value={customInstructions}
          onChange={(e) => onCustomInstructionsChange(e.target.value)}
        />
      </div>
    </div>
  );
}
