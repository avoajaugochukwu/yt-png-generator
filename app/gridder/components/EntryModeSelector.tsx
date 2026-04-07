'use client';

import { useRef } from 'react';

interface EntryModeSelectorProps {
  hasAnalysis: boolean;
  onUseAnalysis: () => void;
  onUploadAudio: (file: File) => void;
  onStartFresh: () => void;
  isLoading: boolean;
}

export default function EntryModeSelector({
  hasAnalysis,
  onUseAnalysis,
  onUploadAudio,
  onStartFresh,
  isLoading,
}: EntryModeSelectorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="animate-fade-in rounded-xl border border-card-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground mb-1">
        How would you like to start?
      </h2>
      <p className="text-sm text-muted mb-5">
        Choose an entry point for your thumbnail grid.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Use analysis */}
        {hasAnalysis && (
          <button
            onClick={onUseAnalysis}
            disabled={isLoading}
            className="flex flex-col items-start gap-2 rounded-xl border border-accent/30 bg-accent-light p-4 text-left hover:border-accent hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">Use Analysis Keywords</span>
            <span className="text-xs text-muted">Pre-populate cells with keywords from your script analysis.</span>
          </button>
        )}

        {/* Upload audio */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          className="flex flex-col items-start gap-2 rounded-xl border border-card-border p-4 text-left hover:border-accent/50 hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">Upload Audio</span>
          <span className="text-xs text-muted">Transcribe & analyze to generate keyword suggestions.</span>
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadAudio(f);
              e.target.value = '';
            }}
          />
        </button>

        {/* Start fresh */}
        <button
          onClick={onStartFresh}
          disabled={isLoading}
          className="flex flex-col items-start gap-2 rounded-xl border border-card-border p-4 text-left hover:border-accent/50 hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">Start Fresh</span>
          <span className="text-xs text-muted">Jump straight to selecting a grid template.</span>
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-accent">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing audio...
        </div>
      )}
    </div>
  );
}
