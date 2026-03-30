'use client';

import type { CustomizationOptions } from '@/lib/types';

const AVAILABLE_FONTS = ['Anton', 'Inter', 'Merriweather', 'JetBrains Mono'] as const;

interface CustomizationPanelProps {
  customization: CustomizationOptions;
  onCustomizationChange: (options: CustomizationOptions) => void;
  customInstructions: string;
  onCustomInstructionsChange: (instructions: string) => void;
}

export default function CustomizationPanel({
  customization,
  onCustomizationChange,
  customInstructions,
  onCustomInstructionsChange,
}: CustomizationPanelProps) {
  function update(key: keyof CustomizationOptions, value: string) {
    onCustomizationChange({ ...customization, [key]: value });
  }

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
