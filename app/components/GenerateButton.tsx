'use client';

import type { AppStep } from '@/lib/types';

interface GenerateButtonProps {
  step: AppStep;
  hasScript: boolean;
  hasElements: boolean;
  isLoading: boolean;
  onAnalyze: () => void;
  onGenerate: () => void;
}

export default function GenerateButton({
  step,
  hasScript,
  hasElements,
  isLoading,
  onAnalyze,
  onGenerate,
}: GenerateButtonProps) {
  if (step === 'done') return null;

  return (
    <div className="flex gap-3">
      {!hasElements && (
        <button
          onClick={onAnalyze}
          disabled={!hasScript || isLoading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {step === 'analyzing' ? (
            <span className="flex items-center gap-2">
              <Spinner /> Analyzing...
            </span>
          ) : (
            'Analyze Script'
          )}
        </button>
      )}

      {hasElements && (
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {step === 'generating' ? (
            <span className="flex items-center gap-2">
              <Spinner /> Generating...
            </span>
          ) : (
            'Generate Assets'
          )}
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
