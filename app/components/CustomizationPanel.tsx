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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-card-border bg-surface px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent transition-shadow">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-light"
          placeholder="#000000"
        />
      </div>
    </div>
  );
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
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Customization</h3>
      </div>

      {/* Color & font controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ColorField
          label="Text Color"
          value={customization.textColor}
          onChange={(v) => update('textColor', v)}
        />
        <ColorField
          label="Background"
          value={customization.backgroundColor}
          onChange={(v) => update('backgroundColor', v)}
        />
        <ColorField
          label="Bar Color"
          value={customization.barColor}
          onChange={(v) => update('barColor', v)}
        />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted">Font</label>
          <select
            value={customization.fontFamily}
            onChange={(e) => update('fontFamily', e.target.value)}
            className="w-full rounded-lg border border-card-border bg-surface px-3 py-[9px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-shadow"
          >
            {AVAILABLE_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live preview */}
      {previewSrc && (
        <div className="animate-fade-in space-y-2">
          <div className="rounded-xl border border-card-border overflow-hidden bg-surface p-3">
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <p className="text-[11px] text-muted-light">
            Preview does not include the title, which is always white.
          </p>
        </div>
      )}

      {/* Custom instructions */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">
          Custom Instructions (optional)
        </label>
        <textarea
          className="w-full h-20 rounded-xl border border-card-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y transition-shadow"
          placeholder='e.g., "make all product names red", "use a larger font for headings"'
          value={customInstructions}
          onChange={(e) => onCustomInstructionsChange(e.target.value)}
        />
      </div>
    </div>
  );
}
