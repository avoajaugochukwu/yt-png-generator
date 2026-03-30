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

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
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
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {step === 'analyzing' ? (
            <>
              <Spinner />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analyze Script
            </>
          )}
        </button>
      )}

      {hasElements && (
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-success/20 hover:bg-success-hover hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {step === 'generating' ? (
            <>
              <Spinner />
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generate Assets
            </>
          )}
        </button>
      )}
    </div>
  );
}
