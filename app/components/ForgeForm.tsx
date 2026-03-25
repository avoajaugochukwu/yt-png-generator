'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AppStep,
  VisualElement,
  CustomizationOptions,
  TimelineEntry,
} from '@/lib/types';
import {
  saveSession,
  getAllSessions,
  deleteSession,
  type SavedSession,
} from '@/lib/idb';
import InputSection from './InputSection';
import CustomizationPanel from './CustomizationPanel';
import GenerateButton from './GenerateButton';
import DownloadArea from './DownloadArea';

export default function ForgeForm() {
  const [step, setStep] = useState<AppStep>('input');
  const [scriptText, setScriptText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [elements, setElements] = useState<VisualElement[] | null>(null);
  const [customization, setCustomization] = useState<CustomizationOptions>({
    textColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'Anton',
  });
  const [customInstructions, setCustomInstructions] = useState('');
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  // Load past sessions on mount
  useEffect(() => {
    getAllSessions().then(setSessions).catch(() => {});
  }, []);

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

      // Save to IndexedDB
      const session: SavedSession = {
        id: crypto.randomUUID(),
        scriptText,
        elements,
        timeline: data.timeline,
        zipBase64: data.zip,
        customization,
        customInstructions,
        createdAt: Date.now(),
      };
      await saveSession(session);
      setSessions(await getAllSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep('customizing');
    } finally {
      setIsLoading(false);
    }
  }, [elements, customization, zipUrl, scriptText, customInstructions]);

  function loadSession(session: SavedSession) {
    if (zipUrl) URL.revokeObjectURL(zipUrl);

    setScriptText(session.scriptText);
    setElements(session.elements as VisualElement[]);
    setTimeline(session.timeline as TimelineEntry[] | null);
    setCustomization(session.customization);
    setCustomInstructions(session.customInstructions);

    if (session.zipBase64) {
      const byteString = atob(session.zipBase64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/zip' });
      setZipUrl(URL.createObjectURL(blob));
      setZipBase64(session.zipBase64);
    } else {
      setZipUrl(null);
      setZipBase64(null);
    }

    setStep('done');
    setError('');
  }

  async function handleDeleteSession(id: string) {
    await deleteSession(id);
    setSessions(await getAllSessions());
  }

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
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-3 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <InputSection
        scriptText={scriptText}
        onScriptChange={setScriptText}
        audioFile={audioFile}
        onAudioFileChange={setAudioFile}
        isLoading={isLoading}
      />

      <CustomizationPanel
        customization={customization}
        onCustomizationChange={setCustomization}
        customInstructions={customInstructions}
        onCustomInstructionsChange={setCustomInstructions}
      />

      {elements && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            Identified Elements ({elements.length})
          </h3>
          <div className="space-y-1.5">
            {elements.map((el) => (
              <div key={el.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`shrink-0 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                    el.type === 'main-title'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : el.type === 'listicle-heading'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {el.type === 'main-title' ? 'Title' : el.type === 'listicle-heading' ? 'Heading' : 'POI'}
                </span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {el.text}
                </span>
                {el.timestamp != null && (
                  <span className="text-xs text-neutral-400 ml-auto shrink-0">
                    {el.timestamp.toFixed(1)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <GenerateButton
          step={step}
          hasScript={scriptText.trim().length > 0 || !!audioFile}
          hasElements={!!elements?.length}
          isLoading={isLoading}
          onAnalyze={handleAnalyze}
          onGenerate={handleGenerate}
        />

        {step !== 'input' && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Start Over
          </button>
        )}
      </div>

      <DownloadArea zipUrl={zipUrl} elements={elements} scriptText={scriptText} timeline={timeline} />

      {sessions.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            Past Sessions
          </h3>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {s.scriptText.split(/[\n.!?]/, 1)[0].trim().slice(0, 80) || 'Untitled'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()} &middot;{' '}
                    {(s.elements as unknown[]).length} elements
                  </p>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => loadSession(s)}
                    className="rounded px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="rounded px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
