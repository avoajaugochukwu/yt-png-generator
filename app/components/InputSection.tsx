'use client';

import { useRef } from 'react';

interface InputSectionProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  isLoading: boolean;
}

export default function InputSection({
  scriptText,
  onScriptChange,
  audioFile,
  onAudioFileChange,
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
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith('.txt')) {
      file.text().then(onScriptChange);
    } else if (/\.(mp3|wav|m4a)$/i.test(file.name)) {
      onAudioFileChange(file);
    }
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Script Input</h3>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          className="w-full h-44 rounded-xl border border-card-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y transition-shadow"
          placeholder="Paste your video script here..."
          value={scriptText}
          onChange={(e) => onScriptChange(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* File upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {/* Script file */}
        <button
          type="button"
          onClick={() => scriptFileRef.current?.click()}
          disabled={isLoading}
          className="group flex items-center gap-3 rounded-xl border border-dashed border-card-border hover:border-accent/40 hover:bg-accent-light p-4 transition-all disabled:opacity-50 disabled:pointer-events-none text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface group-hover:bg-accent/10 transition-colors">
            <svg className="h-5 w-5 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Upload script file</p>
            <p className="text-xs text-muted-light">.txt files accepted</p>
          </div>
          <input
            ref={scriptFileRef}
            type="file"
            accept=".txt"
            onChange={handleScriptFile}
            className="hidden"
          />
        </button>

        {/* Audio file */}
        <button
          type="button"
          onClick={() => audioFileRef.current?.click()}
          disabled={isLoading}
          className="group flex items-center gap-3 rounded-xl border border-dashed border-card-border hover:border-accent/40 hover:bg-accent-light p-4 transition-all disabled:opacity-50 disabled:pointer-events-none text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface group-hover:bg-accent/10 transition-colors">
            <svg className="h-5 w-5 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {audioFile ? audioFile.name : 'Upload audio for transcription'}
            </p>
            <p className="text-xs text-muted-light">
              {audioFile ? 'Click to change file' : '.mp3, .wav, .m4a'}
            </p>
          </div>
          <input
            ref={audioFileRef}
            type="file"
            accept=".mp3,.wav,.m4a"
            onChange={handleAudioFile}
            className="hidden"
          />
        </button>
      </div>
    </div>
  );
}
