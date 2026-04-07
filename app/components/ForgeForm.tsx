'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AppStep,
  VisualElement,
  CustomizationOptions,
  TimelineEntry,
} from '@/lib/types';
import {
  saveCurrentSession,
  getCurrentSession,
  clearCurrentSession,
  saveSharedAnalysis,
  type CurrentSession,
} from '@/lib/idb';
import InputSection from './InputSection';
import CustomizationPanel from './CustomizationPanel';
import GenerateButton from './GenerateButton';
import DownloadArea from './DownloadArea';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'input', label: 'Script' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'customizing', label: 'Customize' },
  { key: 'generating', label: 'Generate' },
  { key: 'done', label: 'Download' },
];

function stepIndex(step: AppStep): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx >= 0 ? idx : 0;
}

function StepIndicator({ currentStep }: { currentStep: AppStep }) {
  const current = stepIndex(currentStep);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((s, i) => {
        const isComplete = i < current;
        const isCurrent = i === current;

        return (
          <div key={s.key} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div
                className={`hidden sm:block h-px w-6 transition-colors duration-300 ${
                  isComplete ? 'bg-accent' : 'bg-card-border'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  isComplete
                    ? 'bg-accent text-white'
                    : isCurrent
                      ? 'bg-accent text-white shadow-md shadow-accent-glow animate-pulse-glow'
                      : 'bg-surface text-muted-light'
                }`}
              >
                {isComplete ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden sm:inline text-xs font-medium transition-colors ${
                  isCurrent ? 'text-accent' : isComplete ? 'text-foreground' : 'text-muted-light'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ForgeForm() {
  const [step, setStep] = useState<AppStep>('input');
  const [scriptText, setScriptText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [elements, setElements] = useState<VisualElement[] | null>(null);
  const [customization, setCustomization] = useState<CustomizationOptions>({
    textColor: '#000000',
    backgroundColor: '#ffffff',
    barColor: '#60B5F6',
    fontFamily: 'Anton',
  });
  const [customInstructions, setCustomInstructions] = useState('');
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Restore current session from IndexedDB on mount
  useEffect(() => {
    getCurrentSession().then((session) => {
      if (!session) return;
      setScriptText(session.scriptText);
      setElements(session.elements as VisualElement[] | null);
      setTimeline(session.timeline as TimelineEntry[] | null);
      setCustomization(session.customization);
      setCustomInstructions(session.customInstructions);
      setStep(session.step as AppStep);

      if (session.zipBase64) {
        setZipBase64(session.zipBase64);
        const byteString = atob(session.zipBase64);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          bytes[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/zip' });
        setZipUrl(URL.createObjectURL(blob));
      }
    }).catch(() => {});
  }, []);

  // Persist current session to IndexedDB on state changes
  useEffect(() => {
    const session: CurrentSession = {
      scriptText,
      elements,
      timeline,
      zipBase64,
      customization,
      customInstructions,
      step,
    };
    saveCurrentSession(session).catch(() => {});
  }, [scriptText, elements, timeline, zipBase64, customization, customInstructions, step]);

  // Cleanup blob URL on unmount or new generation
  useEffect(() => {
    return () => {
      if (zipUrl) URL.revokeObjectURL(zipUrl);
    };
  }, [zipUrl]);

  const handleAnalyze = useCallback(async () => {
    setError('');
    setIsLoading(true);
    setStep('analyzing');

    try {
      let script = scriptText;
      let segments;

      // Transcribe audio first if provided and no script text
      if (audioFile && !script.trim()) {
        const formData = new FormData();
        formData.append('audio', audioFile);

        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!transcribeRes.ok) {
          const data = await transcribeRes.json();
          throw new Error(data.error || 'Transcription failed');
        }

        const transcription = await transcribeRes.json();
        script = transcription.fullText;
        segments = transcription.segments;
        setScriptText(script);
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          customInstructions: customInstructions || undefined,
          segments: segments || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();
      setElements(data.elements);
      setStep('customizing');

      // Persist analysis for Gridder module
      saveSharedAnalysis({
        elements: data.elements,
        scriptText: script,
        savedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  }, [scriptText, customInstructions, audioFile]);

  const handleGenerate = useCallback(async () => {
    if (!elements) return;

    setError('');
    setIsLoading(true);
    setStep('generating');

    // Cleanup previous blob
    if (zipUrl) {
      URL.revokeObjectURL(zipUrl);
      setZipUrl(null);
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements,
          customization,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      setTimeline(data.timeline);
      setZipBase64(data.zip);

      const byteString = atob(data.zip);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      setZipUrl(url);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep('customizing');
    } finally {
      setIsLoading(false);
    }
  }, [elements, customization, zipUrl]);

  const previewElement = useMemo(() => {
    if (!elements) return null;
    return elements.find((e) => e.type !== 'main-title') || elements[0] || null;
  }, [elements]);

  function handleReset() {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setStep('input');
    setScriptText('');
    setAudioFile(null);
    setElements(null);
    setZipUrl(null);
    setZipBase64(null);
    setTimeline(null);
    setError('');
    setCustomInstructions('');
    clearCurrentSession().catch(() => {});
  }

  return (
    <div className="space-y-6">
      {/* Progress bar + reset */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-card-border px-4 py-3 sm:px-6">
        <StepIndicator currentStep={step} />
        {step !== 'input' && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="animate-slide-down flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-light px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10">
            <svg className="h-4 w-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button
            onClick={() => setError('')}
            className="shrink-0 rounded-lg p-1 text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <InputSection
        scriptText={scriptText}
        onScriptChange={setScriptText}
        audioFile={audioFile}
        onAudioFileChange={setAudioFile}
        isLoading={isLoading}
      />

      {/* Customization */}
      <CustomizationPanel
        customization={customization}
        onCustomizationChange={setCustomization}
        customInstructions={customInstructions}
        onCustomInstructionsChange={setCustomInstructions}
        previewElement={previewElement}
      />

      {/* Identified elements */}
      {elements && (
        <div className="animate-fade-in rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
              <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Identified Elements
            </h3>
            <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
              {elements.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {elements.map((el) => (
              <div
                key={el.id}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface transition-colors"
              >
                <span
                  className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    el.type === 'main-title'
                      ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400'
                      : el.type === 'listicle-heading'
                        ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {el.type === 'main-title' ? 'Title' : el.type === 'listicle-heading' ? 'Heading' : 'POI'}
                </span>
                <span className="text-foreground truncate">
                  {el.text}
                </span>
                {el.timestamp != null && (
                  <span className="ml-auto shrink-0 font-mono text-xs text-muted-light tabular-nums">
                    {Math.floor(el.timestamp / 60)}:{(el.timestamp % 60).toFixed(1).padStart(4, '0')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <GenerateButton
          step={step}
          hasScript={scriptText.trim().length > 0 || !!audioFile}
          hasElements={!!elements?.length}
          isLoading={isLoading}
          onAnalyze={handleAnalyze}
          onGenerate={handleGenerate}
        />
      </div>

      {/* Download */}
      <DownloadArea zipUrl={zipUrl} elements={elements} scriptText={scriptText} timeline={timeline} />

    </div>
  );
}
