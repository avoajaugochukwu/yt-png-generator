'use client';

import { useRef } from 'react';

interface InputSectionProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  audioUrl: string;
  onAudioUrlChange: (url: string) => void;
  isLoading: boolean;
}

export default function InputSection({
  scriptText,
  onScriptChange,
  audioFile,
  onAudioFileChange,
  audioUrl,
  onAudioUrlChange,
  isLoading,
}: InputSectionProps) {
  const scriptFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  async function handleScriptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onScriptChange(text);
  }

  function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onAudioFileChange(file);
    if (file) onAudioUrlChange('');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith('.txt')) {
      file.text().then(onScriptChange);
    } else if (/\.(mp3|wav|m4a)$/i.test(file.name)) {
      onAudioFileChange(file);
      onAudioUrlChange('');
    }
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Input</h3>
      </div>

      {/* Primary: paste audio URL */}
      <div className="rounded-xl border border-accent/30 bg-accent-light/40 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="audio-url-input" className="block text-sm font-semibold text-foreground">
            Paste audio URL
          </label>
          <span className="text-[11px] font-medium uppercase tracking-wider text-accent">Recommended</span>
        </div>
        <input
          id="audio-url-input"
          type="url"
          inputMode="url"
          placeholder="https://bucket.s3.amazonaws.com/episode.mp3"
          value={audioUrl}
          onChange={(e) => {
            onAudioUrlChange(e.target.value);
            if (e.target.value && audioFile) onAudioFileChange(null);
          }}
          disabled={isLoading || !!audioFile}
          className="w-full rounded-lg border border-card-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 transition-shadow"
        />
        <p className="text-xs text-muted-light">S3 or any public https URL pointing to .mp3 / .wav / .m4a</p>
      </div>

      {/* Secondary: collapsed alternate inputs */}
      <details className="group rounded-xl border border-card-border bg-surface/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground">
          <span>Other input methods</span>
          <svg
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </summary>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="px-4 pb-4 pt-1 space-y-3"
        >
          {/* File upload row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => audioFileRef.current?.click()}
              disabled={isLoading}
              className="group/btn flex items-center gap-2 rounded-lg border border-dashed border-card-border hover:border-accent/40 hover:bg-accent-light px-3 py-2 transition-all disabled:opacity-50 disabled:pointer-events-none text-left"
            >
              <svg className="h-4 w-4 shrink-0 text-muted group-hover/btn:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {audioFile ? audioFile.name : 'Upload audio file'}
                </p>
                <p className="text-[11px] text-muted-light">.mp3, .wav, .m4a</p>
              </div>
              <input
                ref={audioFileRef}
                type="file"
                accept=".mp3,.wav,.m4a"
                onChange={handleAudioFile}
                className="hidden"
              />
            </button>

            <button
              type="button"
              onClick={() => scriptFileRef.current?.click()}
              disabled={isLoading}
              className="group/btn flex items-center gap-2 rounded-lg border border-dashed border-card-border hover:border-accent/40 hover:bg-accent-light px-3 py-2 transition-all disabled:opacity-50 disabled:pointer-events-none text-left"
            >
              <svg className="h-4 w-4 shrink-0 text-muted group-hover/btn:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">Upload script .txt</p>
                <p className="text-[11px] text-muted-light">plain text</p>
              </div>
              <input
                ref={scriptFileRef}
                type="file"
                accept=".txt"
                onChange={handleScriptFile}
                className="hidden"
              />
            </button>
          </div>

          {/* Most collapsed: paste script text */}
          <details className="group/script rounded-lg border border-card-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-light hover:text-foreground">
              <span>Paste script text</span>
              <svg
                className="h-3 w-3 transition-transform group-open/script:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div className="px-3 pb-3">
              <textarea
                className="w-full h-20 rounded-lg border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y transition-shadow"
                placeholder="Paste your video script here..."
                value={scriptText}
                onChange={(e) => onScriptChange(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
