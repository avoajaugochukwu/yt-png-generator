'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  VisualElement,
  ScriptType,
  TitleOption,
  HeritagePromptResponse,
  HeritageCenterSubMode,
} from '@/lib/types';
import {
  CHANNELS,
  getThumbnailSpec,
  getAiThumbnailSpec,
  hasThumbnailSupport,
  type Channel,
} from '@/lib/channels';
import {
  savePackageSession,
  getPackageSession,
  clearPackageSession,
  type PackageSession,
} from '@/lib/idb';
import { useBridge } from '@/app/hooks/useBridge';
import { useClipboardPaste } from '@/app/hooks/useClipboardPaste';
import InputSection from '@/app/components/InputSection';
import ChannelPicker from './ChannelPicker';
import TitlePicker from './TitlePicker';
import TagsPanel from './TagsPanel';
import KeywordChips from './KeywordChips';
import ThumbnailEditor, { type ThumbnailCell } from './ThumbnailEditor';
import HeritagePromptStudio from './HeritagePromptStudio';

type PackageStep = 'script' | 'thumbnail' | 'done';

const STEPS_DETERMINISTIC: { key: PackageStep; label: string }[] = [
  { key: 'script', label: 'Script' },
  { key: 'thumbnail', label: 'Thumbnail' },
  { key: 'done', label: 'Done' },
];

const STEPS_AI: { key: PackageStep; label: string }[] = [
  { key: 'script', label: 'Script' },
  { key: 'thumbnail', label: 'Prompts' },
  { key: 'done', label: 'Done' },
];

function StepIndicator({ currentStep, mode }: { currentStep: PackageStep; mode: 'deterministic' | 'ai' }) {
  const STEPS = mode === 'ai' ? STEPS_AI : STEPS_DETERMINISTIC;
  const current = STEPS.findIndex((s) => s.key === currentStep);

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

function extractListicleNames(elements: VisualElement[]): string[] {
  return elements
    .filter((el) => el.type === 'listicle-heading')
    .map((el) => el.text.replace(/^#\d+\s+/i, '').trim());
}

async function resizeImage(dataUri: string, maxDim = 1920): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= maxDim && img.naturalHeight <= maxDim) {
        resolve(dataUri);
        return;
      }
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}

async function urlToDataUri(url: string): Promise<string> {
  const proxied = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error('Failed to proxy image');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function PackageForm() {
  const [step, setStep] = useState<PackageStep>('script');
  const [channel, setChannel] = useState<Channel>('garden');
  const [scriptText, setScriptText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType | null>(null);
  const [elements, setElements] = useState<VisualElement[] | null>(null);
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [thumbnailCells, setThumbnailCells] = useState<ThumbnailCell[]>([]);
  const [thumbnailText, setThumbnailText] = useState<{ top: string; bottom: string }>({ top: '', bottom: '' });
  const [thumbnailPngBase64, setThumbnailPngBase64] = useState<string | null>(null);
  const [thumbnailPngUrl, setThumbnailPngUrl] = useState<string | null>(null);
  const [selectedCellIdx, setSelectedCellIdx] = useState<number | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const channelConfig = CHANNELS[channel];
  const thumbnailSpec = useMemo(
    () => (scriptType ? getThumbnailSpec(channel, scriptType) : null),
    [channel, scriptType],
  );
  const aiThumbnailSpec = useMemo(
    () => (scriptType ? getAiThumbnailSpec(channel, scriptType) : null),
    [channel, scriptType],
  );
  const isAiChannel = channelConfig.imageMode === 'ai';

  // Heritage / AI-image studio state
  const [heritagePrompts, setHeritagePrompts] = useState<HeritagePromptResponse | null>(null);
  const [heritageSubMode, setHeritageSubMode] = useState<HeritageCenterSubMode>('auto');
  const [heritageLoading, setHeritageLoading] = useState(false);

  /** Subtitle for flanking-figure cards in the prompt studio — channel-specific. */
  const flankSubtitle = useMemo(() => {
    if (channel === 'heritage') return 'Sepia · 1800s flanking person';
    if (channel === 's1950s') return 'Muted Kodachrome · 1950s flanking person';
    return 'Channel-styled flanking person';
  }, [channel]);

  // When the channel changes, snap the sub-mode to whatever the new channel actually supports.
  useEffect(() => {
    if (!aiThumbnailSpec) return;
    if (!aiThumbnailSpec.centerSubModes.includes(heritageSubMode)) {
      setHeritageSubMode(aiThumbnailSpec.centerSubModes[0]);
    }
  }, [aiThumbnailSpec, heritageSubMode]);

  // Restore session
  useEffect(() => {
    getPackageSession()
      .then((s) => {
        if (!s) {
          setMounted(true);
          return;
        }
        setChannel((s.channel as Channel) || 'garden');
        setScriptText(s.scriptText || '');
        setAudioUrl(s.audioUrl || '');
        setYoutubeUrl(s.youtubeUrl || '');
        setCustomInstructions(s.customInstructions || '');
        setScriptType((s.scriptType as ScriptType | null) ?? null);
        setElements(s.elements as VisualElement[] | null);
        // Legacy sessions may have step === 'overlays'; collapse to the nearest valid step.
        const restoredStep = (s.step as string) || 'script';
        setStep(restoredStep === 'overlays' ? 'thumbnail' : (restoredStep as PackageStep));

        setTitles((s.titles as TitleOption[]) || []);
        setSelectedTitleIdx(s.selectedTitleIdx ?? null);
        setTags(s.tags || []);
        setAllKeywords(s.allKeywords || []);

        if (s.thumbnail) {
          setThumbnailCells((s.thumbnail.cells as ThumbnailCell[]) || []);
          setThumbnailText(s.thumbnail.text || { top: '', bottom: '' });
          if (s.thumbnail.pngBase64) {
            setThumbnailPngBase64(s.thumbnail.pngBase64);
            const bytes = Uint8Array.from(atob(s.thumbnail.pngBase64), (c) => c.charCodeAt(0));
            setThumbnailPngUrl(URL.createObjectURL(new Blob([bytes], { type: 'image/png' })));
          }
        }
        if (s.heritage) {
          setHeritagePrompts({
            thumbnailTitle: s.heritage.thumbnailTitle,
            centerSubMode: s.heritage.centerSubMode as HeritageCenterSubMode,
            prompts: s.heritage.prompts,
          });
          setHeritageSubMode(s.heritage.centerSubMode as HeritageCenterSubMode);
        }
        setMounted(true);
      })
      .catch(() => setMounted(true));
  }, []);

  // Persist session
  useEffect(() => {
    if (!mounted) return;
    const session: PackageSession = {
      channel,
      scriptText,
      audioUrl,
      youtubeUrl,
      customInstructions,
      scriptType,
      elements,
      titles,
      selectedTitleIdx,
      tags,
      allKeywords,
      thumbnail: {
        cells: thumbnailCells,
        text: thumbnailText,
        pngBase64: thumbnailPngBase64,
      },
      heritage: heritagePrompts
        ? {
            thumbnailTitle: heritagePrompts.thumbnailTitle,
            centerSubMode: heritagePrompts.centerSubMode,
            prompts: heritagePrompts.prompts,
          }
        : null,
      step,
    };
    savePackageSession(session).catch(() => {});
  }, [
    mounted,
    channel,
    scriptText,
    audioUrl,
    youtubeUrl,
    customInstructions,
    scriptType,
    elements,
    titles,
    selectedTitleIdx,
    tags,
    allKeywords,
    thumbnailCells,
    thumbnailText,
    thumbnailPngBase64,
    heritagePrompts,
    step,
  ]);

  useEffect(() => {
    return () => {
      if (thumbnailPngUrl) URL.revokeObjectURL(thumbnailPngUrl);
    };
  }, [thumbnailPngUrl]);

  // Image handler for paste/bridge → currently selected cell
  const handleIncomingImage = useCallback(
    async (urlOrDataUri: string) => {
      if (selectedCellIdx == null) return;
      setError('');
      try {
        let dataUri = urlOrDataUri;
        if (urlOrDataUri.startsWith('http')) {
          dataUri = await urlToDataUri(urlOrDataUri);
        }
        dataUri = await resizeImage(dataUri);
        setThumbnailCells((prev) =>
          prev.map((c, i) => (i === selectedCellIdx ? { ...c, imageUrl: dataUri } : c)),
        );
        setSelectedCellIdx((prev) => {
          if (prev == null) return prev;
          const next = thumbnailCells.findIndex((c, i) => i > prev && !c.imageUrl);
          return next >= 0 ? next : prev;
        });
      } catch {
        setError('Failed to load image');
      }
    },
    [selectedCellIdx, thumbnailCells],
  );

  const bridgeOnImage = step === 'thumbnail' && selectedCellIdx != null ? handleIncomingImage : null;
  const onError = useCallback((msg: string) => setError(msg), []);
  useBridge(bridgeOnImage, onError);
  useClipboardPaste(bridgeOnImage, onError);

  const handleAnalyze = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      let script = scriptText;
      let segments;
      const trimmedAudioUrl = audioUrl.trim();
      const trimmedYoutubeUrl = youtubeUrl.trim();
      const hasAudioInput = !!audioFile || !!trimmedAudioUrl || !!trimmedYoutubeUrl;
      if (hasAudioInput && !script.trim()) {
        const formData = new FormData();
        if (trimmedYoutubeUrl) formData.append('youtubeUrl', trimmedYoutubeUrl);
        else if (audioFile) formData.append('audio', audioFile);
        else formData.append('audioUrl', trimmedAudioUrl);
        formData.append('mode', 'fast');
        const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
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

      // Channel guard: ensure scriptType is supported
      if (!channelConfig.supportedScriptTypes.includes(data.scriptType)) {
        throw new Error(
          `${channelConfig.label} channel does not yet support "${data.scriptType}" scripts. Supported: ${channelConfig.supportedScriptTypes.join(', ')}.`,
        );
      }
      if (!hasThumbnailSupport(channel, data.scriptType)) {
        throw new Error(
          `${channelConfig.label} channel: thumbnail spec for "${data.scriptType}" is not configured yet.`,
        );
      }

      setScriptType(data.scriptType);
      setElements(data.elements);
      setStep('thumbnail');
      await runSeo({
        scriptType: data.scriptType,
        elements: data.elements,
        script,
        preserveCells: false,
      });
      if (channelConfig.imageMode === 'ai') {
        await runHeritagePrompts({
          scriptType: data.scriptType,
          elements: data.elements,
          script,
          subMode: heritageSubMode,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
    // runSeo is stable via closure over state setters; deps cover the inputs it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptText, audioFile, audioUrl, youtubeUrl, customInstructions, channel, channelConfig]);

  const runSeo = useCallback(
    async (opts?: {
      scriptType?: ScriptType;
      elements?: VisualElement[] | null;
      script?: string;
      preserveCells?: boolean;
    }) => {
      const stArg = opts?.scriptType ?? scriptType;
      const elsArg = opts?.elements ?? elements;
      const scriptArg = opts?.script ?? scriptText;
      if (!stArg) return;
      if (!hasThumbnailSupport(channel, stArg)) return;
      const spec = getThumbnailSpec(channel, stArg);

      setSeoLoading(true);
      try {
        const itemNames = elsArg ? extractListicleNames(elsArg) : [];
        const res = await fetch('/api/package/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            scriptType: stArg,
            script: scriptArg,
            itemNames,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'SEO generation failed');
        }
        const data = await res.json();
        if (spec) {
          const cells: ThumbnailCell[] = (data.imageKeywords as string[]).map((kw) => ({
            keyword: kw,
            imageUrl: null,
            cropOffsetX: 0.5,
            cropOffsetY: 0.5,
            zoom: 1,
          }));
          setThumbnailCells((prev) =>
            opts?.preserveCells !== false && prev.length === cells.length
              ? prev.map((p, i) => ({ ...p, keyword: cells[i].keyword }))
              : cells,
          );
          setSelectedCellIdx(0);
        } else {
          // AI channels do not use deterministic cells; clear any stale ones.
          setThumbnailCells([]);
          setSelectedCellIdx(null);
        }
        setTitles(data.titles);
        setSelectedTitleIdx(0);
        setTags(data.tags || []);
        setAllKeywords(Array.isArray(data.allKeywords) ? data.allKeywords : []);
        const first = data.titles[0];
        if (first) {
          setThumbnailText({ top: first.primaryText, bottom: first.secondaryText });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SEO seed failed');
      } finally {
        setSeoLoading(false);
      }
    },
    [channel, scriptType, scriptText, elements],
  );

  const runHeritagePrompts = useCallback(
    async (opts?: {
      scriptType?: ScriptType;
      elements?: VisualElement[] | null;
      script?: string;
      videoTitle?: string;
      subMode?: HeritageCenterSubMode;
    }) => {
      const stArg = opts?.scriptType ?? scriptType;
      const elsArg = opts?.elements ?? elements;
      const scriptArg = opts?.script ?? scriptText;
      const subModeArg = opts?.subMode ?? heritageSubMode;
      if (!stArg) return;
      const aiSpec = getAiThumbnailSpec(channel, stArg);
      if (!aiSpec) return;

      setHeritageLoading(true);
      try {
        const itemNames = elsArg ? extractListicleNames(elsArg) : [];
        const topic = elsArg?.find((el) => el.type === 'main-title')?.text || '';
        const res = await fetch('/api/package/heritage-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            scriptType: stArg,
            videoTitle: opts?.videoTitle,
            topic: topic || scriptArg.slice(0, 1500),
            itemNames,
            centerSubMode: subModeArg,
            script: scriptArg,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Heritage prompt generation failed');
        }
        const data = (await res.json()) as HeritagePromptResponse;
        setHeritagePrompts(data);
        setHeritageSubMode(data.centerSubMode);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Heritage prompt generation failed');
      } finally {
        setHeritageLoading(false);
      }
    },
    [channel, scriptType, scriptText, elements, heritageSubMode],
  );

  const handleRegenerateSeo = useCallback(async () => {
    setError('');
    await runSeo();
    if (isAiChannel) {
      await runHeritagePrompts();
    }
  }, [runSeo, runHeritagePrompts, isAiChannel]);

  const handleRegenerateHeritage = useCallback(async () => {
    setError('');
    await runHeritagePrompts();
  }, [runHeritagePrompts]);

  const handleHeritageSubModeChange = useCallback(
    async (mode: HeritageCenterSubMode) => {
      setHeritageSubMode(mode);
      setError('');
      await runHeritagePrompts({ subMode: mode });
    },
    [runHeritagePrompts],
  );

  const handleHeritageTitleChange = useCallback((title: string) => {
    setHeritagePrompts((prev) => (prev ? { ...prev, thumbnailTitle: title } : prev));
  }, []);

  const handleSelectTitle = useCallback(
    (idx: number) => {
      setSelectedTitleIdx(idx);
      const t = titles[idx];
      if (t) {
        setThumbnailText({ top: t.primaryText, bottom: t.secondaryText });
      }
    },
    [titles],
  );

  const handleComposeThumbnail = useCallback(async () => {
    if (!thumbnailSpec) return;
    setError('');
    setIsLoading(true);
    if (thumbnailPngUrl) {
      URL.revokeObjectURL(thumbnailPngUrl);
      setThumbnailPngUrl(null);
    }

    try {
      const cells = thumbnailCells
        .map((c, idx) => ({ cell: c, idx }))
        .filter(({ cell }) => cell.imageUrl)
        .map(({ cell, idx }) => ({
          row: 0,
          col: idx,
          colSpan: 1,
          rowSpan: 1,
          imageBase64: cell.imageUrl!,
          cropOffsetX: cell.cropOffsetX,
          cropOffsetY: cell.cropOffsetY,
          zoom: cell.zoom,
        }));

      const res = await fetch('/api/package/thumbnail-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { cols: thumbnailSpec.template.cols, rows: thumbnailSpec.template.rows },
          cells,
          gap: thumbnailSpec.gap,
          borderRadius: thumbnailSpec.borderRadius,
          backgroundColor: thumbnailSpec.backgroundColor,
          text: {
            top: thumbnailText.top,
            bottom: thumbnailText.bottom,
            style: thumbnailSpec.text,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Compose failed');
      }
      const data = await res.json();
      setThumbnailPngBase64(data.png);
      const bytes = Uint8Array.from(atob(data.png), (c) => c.charCodeAt(0));
      setThumbnailPngUrl(URL.createObjectURL(new Blob([bytes], { type: 'image/png' })));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compose failed');
    } finally {
      setIsLoading(false);
    }
  }, [thumbnailCells, thumbnailText, thumbnailSpec, thumbnailPngUrl]);

  const handleSetCellImage = useCallback(async (idx: number, dataUri: string) => {
    const resized = await resizeImage(dataUri);
    setThumbnailCells((prev) => prev.map((c, i) => (i === idx ? { ...c, imageUrl: resized } : c)));
  }, []);

  const handleClearCellImage = useCallback((idx: number) => {
    setThumbnailCells((prev) => prev.map((c, i) => (i === idx ? { ...c, imageUrl: null } : c)));
  }, []);

  function handleReset() {
    if (thumbnailPngUrl) URL.revokeObjectURL(thumbnailPngUrl);
    setStep('script');
    setScriptText('');
    setAudioFile(null);
    setAudioUrl('');
    setYoutubeUrl('');
    setCustomInstructions('');
    setScriptType(null);
    setElements(null);
    setTitles([]);
    setSelectedTitleIdx(null);
    setTags([]);
    setAllKeywords([]);
    setThumbnailCells([]);
    setThumbnailText({ top: '', bottom: '' });
    setThumbnailPngBase64(null);
    setThumbnailPngUrl(null);
    setSelectedCellIdx(null);
    setHeritagePrompts(null);
    setHeritageSubMode('auto');
    setError('');
    clearPackageSession().catch(() => {});
  }

  const hasInput =
    scriptText.trim().length > 0 ||
    !!audioFile ||
    audioUrl.trim().length > 0 ||
    youtubeUrl.trim().length > 0;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-card-border px-4 py-3 sm:px-6">
        <StepIndicator currentStep={step} mode={channelConfig.imageMode} />
        {step !== 'script' && (
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

      {error && (
        <div className="animate-slide-down flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-light px-4 py-3">
          <svg className="h-4 w-4 mt-0.5 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button onClick={() => setError('')} className="text-danger/60 hover:text-danger">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Step 1: Script */}
      {step === 'script' && (
        <>
          <ChannelPicker channel={channel} onChange={setChannel} />

          <div className="rounded-xl border border-accent/30 bg-accent-light/40 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="youtube-url-input" className="block text-sm font-semibold text-foreground">
                Paste YouTube URL
              </label>
              <span className="text-[11px] font-medium uppercase tracking-wider text-accent">
                Recommended for published videos
              </span>
            </div>
            <input
              id="youtube-url-input"
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                if (e.target.value) {
                  if (audioFile) setAudioFile(null);
                  if (audioUrl) setAudioUrl('');
                }
              }}
              disabled={isLoading || !!audioFile || audioUrl.trim().length > 0}
              className="w-full rounded-lg border border-card-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 transition-shadow"
            />
            <p className="text-xs text-muted-light">
              Pulls the captions track for this video — free and instant. Requires the video to have captions (auto or human). Otherwise, upload the audio file below.
            </p>
          </div>

          <InputSection
            scriptText={scriptText}
            onScriptChange={setScriptText}
            audioFile={audioFile}
            onAudioFileChange={setAudioFile}
            audioUrl={audioUrl}
            onAudioUrlChange={setAudioUrl}
            isLoading={isLoading}
          />
          <div className="rounded-xl border border-card-border bg-card p-4">
            <label htmlFor="custom-instructions" className="block text-xs font-medium text-muted mb-1.5">
              Custom instructions (optional)
            </label>
            <textarea
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Anything specific the analyzer should know about this script..."
              disabled={isLoading}
              className="w-full h-16 rounded-lg border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 resize-y"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !hasInput}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-glow hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-glow/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              'Analyze Script'
            )}
          </button>
        </>
      )}

      {/* Step 2: Titles + Thumbnail (deterministic) */}
      {step === 'thumbnail' && !isAiChannel && thumbnailSpec && (
        <>
          <TitlePicker
            titles={titles}
            selectedIdx={selectedTitleIdx}
            onSelect={handleSelectTitle}
            onRegenerate={handleRegenerateSeo}
            isLoading={isLoading || seoLoading}
          />
          <ThumbnailEditor
            spec={thumbnailSpec}
            cells={thumbnailCells}
            text={thumbnailText}
            selectedIdx={selectedCellIdx}
            allKeywords={allKeywords}
            onSelectCell={setSelectedCellIdx}
            onSetCellImage={handleSetCellImage}
            onClearCellImage={handleClearCellImage}
            onTextChange={setThumbnailText}
            onCompose={handleComposeThumbnail}
            onRegenerateText={handleRegenerateSeo}
            isLoading={isLoading}
            isSeeding={seoLoading}
          />
          <TagsPanel tags={tags} />
        </>
      )}

      {/* Step 2: Titles + Heritage prompt studio (AI channels) */}
      {step === 'thumbnail' && isAiChannel && aiThumbnailSpec && (
        <>
          <TitlePicker
            titles={titles}
            selectedIdx={selectedTitleIdx}
            onSelect={handleSelectTitle}
            onRegenerate={handleRegenerateSeo}
            isLoading={isLoading || seoLoading || heritageLoading}
          />
          <HeritagePromptStudio
            channelLabel={channelConfig.label}
            flankSubtitle={flankSubtitle}
            data={heritagePrompts}
            centerSubMode={heritageSubMode}
            supportedSubModes={aiThumbnailSpec.centerSubModes}
            onSubModeChange={handleHeritageSubModeChange}
            onRegenerate={handleRegenerateHeritage}
            onThumbnailTitleChange={handleHeritageTitleChange}
            isLoading={isLoading}
            isSeeding={heritageLoading || seoLoading}
          />
          <KeywordChips keywords={allKeywords} />
          <TagsPanel tags={tags} />
        </>
      )}

      {/* Step 3: Done */}
      {step === 'done' && thumbnailPngUrl && (
        <div className="space-y-5">
          <div className="rounded-xl border border-success/20 bg-success-light p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-success">Thumbnail Ready</h3>
                <p className="mt-1 text-sm text-success/80">Composed at 1920×1080.</p>
                {selectedTitleIdx != null && titles[selectedTitleIdx] && (
                  <div className="mt-3 rounded-lg bg-white/60 dark:bg-black/20 border border-success/20 px-3 py-2">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-success/70">
                      Selected title · {titles[selectedTitleIdx].principle}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {titles[selectedTitleIdx].title}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={thumbnailPngUrl}
                    download="thumbnail.png"
                    className="inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-success/20 hover:bg-success-hover hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Thumbnail
                  </a>
                  <button
                    onClick={() => setStep('thumbnail')}
                    className="rounded-xl border border-card-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
                  >
                    Edit Thumbnail
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-card-border bg-surface">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Thumbnail Preview</h3>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-card-border overflow-hidden bg-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailPngUrl}
                  alt="Thumbnail preview"
                  className="w-full h-auto rounded-lg"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </div>
          </div>

          <KeywordChips keywords={allKeywords} />
          <TagsPanel tags={tags} />
        </div>
      )}
    </div>
  );
}
