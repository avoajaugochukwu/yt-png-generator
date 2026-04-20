'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GridTemplate, GridCellData, GridderState, GridderStep } from '@/lib/types';
import { BUILT_IN_TEMPLATES, createCells } from '@/lib/grid-templates';
import {
  saveGridderSession,
  getGridderSession,
  clearGridderSession,
  getSharedAnalysis,
  type GridderSession,
} from '@/lib/idb';
import { useBridge } from '@/app/hooks/useBridge';
import { useClipboardPaste } from '@/app/hooks/useClipboardPaste';
import EntryModeSelector from './EntryModeSelector';
import TemplatePicker from './TemplatePicker';
import GridCanvas from './GridCanvas';
import KeywordSidebar, { extractKeyword } from './KeywordSidebar';
import GridHistory from './GridHistory';

const DEFAULT_TEMPLATE = BUILT_IN_TEMPLATES[2]; // 3x2

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
  // Proxy external URLs to avoid CORS
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

export default function GridderForm() {
  const [step, setStep] = useState<GridderStep>('setup');
  const [gridderState, setGridderState] = useState<GridderState>({
    template: DEFAULT_TEMPLATE,
    cells: createCells(DEFAULT_TEMPLATE),
    gap: 8,
    borderRadius: 0,
    backgroundColor: '#000000',
  });
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Restore session on mount
  useEffect(() => {
    Promise.all([getGridderSession(), getSharedAnalysis()]).then(
      ([session, analysis]) => {
        if (session) {
          const restored = session.gridderState as GridderState;
          setGridderState(restored);
          setKeywords(session.analysisKeywords || []);
          setStep(session.step as GridderStep);
        }
        if (analysis?.elements) {
          setHasAnalysis(true);
        }
        setMounted(true);
      },
    ).catch(() => setMounted(true));
  }, []);

  // Persist session on state changes
  useEffect(() => {
    if (!mounted) return;
    const session: GridderSession = {
      gridderState,
      step,
      analysisKeywords: keywords,
    };
    saveGridderSession(session).catch(() => {});
  }, [gridderState, step, keywords, mounted]);

  // Cleanup export URL
  useEffect(() => {
    return () => {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    };
  }, [exportUrl]);

  // Image handler for bridge/clipboard
  const handleIncomingImage = useCallback(
    async (urlOrDataUri: string) => {
      if (!selectedCellId) return;
      setError('');

      try {
        let dataUri = urlOrDataUri;
        if (urlOrDataUri.startsWith('http')) {
          dataUri = await urlToDataUri(urlOrDataUri);
        }
        dataUri = await resizeImage(dataUri);

        setGridderState((prev) => ({
          ...prev,
          cells: prev.cells.map((c) =>
            c.id === selectedCellId ? { ...c, imageUrl: dataUri } : c,
          ),
        }));

        // Auto-advance to next empty cell
        setSelectedCellId((prev) => {
          const idx = gridderState.cells.findIndex((c) => c.id === prev);
          const next = gridderState.cells.find((c, i) => i > idx && !c.imageUrl);
          return next?.id ?? prev;
        });
      } catch {
        setError('Failed to load image');
      }
    },
    [selectedCellId, gridderState.cells],
  );

  const bridgeOnImage = selectedCellId ? handleIncomingImage : null;
  const onError = useCallback((msg: string) => setError(msg), []);

  useBridge(bridgeOnImage, onError);
  useClipboardPaste(bridgeOnImage, onError);

  // Entry mode handlers
  async function handleUseAnalysis() {
    const analysis = await getSharedAnalysis();
    if (!analysis?.elements) return;

    const kws = analysis.elements
      .filter((el) => el.type === 'listicle-heading')
      .map((el) => extractKeyword(el.text));

    const mainTitle = analysis.elements.find((el) => el.type === 'main-title');
    setTitle((analysis as unknown as { suggestedTitle?: string }).suggestedTitle || mainTitle?.text || '');
    setKeywords(kws);

    // Pick a template that fits the keyword count
    const count = kws.length;
    let tpl = BUILT_IN_TEMPLATES.find(
      (t) => t.cols * t.rows >= count && t.cols * t.rows <= count + 2,
    ) ?? DEFAULT_TEMPLATE;

    if (count > 10) {
      tpl = { id: `${Math.ceil(count / 2)}x2`, label: `${Math.ceil(count / 2)} x 2`, cols: Math.ceil(count / 2), rows: 2 };
    }

    setGridderState((prev) => ({
      ...prev,
      template: tpl,
      cells: createCells(tpl, kws),
    }));
    setStep('filling');
  }

  async function handleUploadAudio(file: File) {
    setError('');
    setIsLoading(true);

    try {
      // Transcribe
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('mode', 'fast');
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      if (!transcribeRes.ok) {
        const data = await transcribeRes.json();
        throw new Error(data.error || 'Transcription failed');
      }
      const transcription = await transcribeRes.json();

      // Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: transcription.fullText, segments: transcription.segments }),
      });
      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || 'Analysis failed');
      }
      const data = await analyzeRes.json();

      const kws = data.elements
        .filter((el: { type: string }) => el.type === 'listicle-heading')
        .map((el: { text: string }) => extractKeyword(el.text));

      setTitle(data.suggestedTitle || '');
      setKeywords(kws);
      const count = kws.length;
      let tpl = BUILT_IN_TEMPLATES.find(
        (t) => t.cols * t.rows >= count && t.cols * t.rows <= count + 2,
      ) ?? DEFAULT_TEMPLATE;

      if (count > 10) {
        tpl = { id: `${Math.ceil(count / 2)}x2`, label: `${Math.ceil(count / 2)} x 2`, cols: Math.ceil(count / 2), rows: 2 };
      }

      setGridderState((prev) => ({
        ...prev,
        template: tpl,
        cells: createCells(tpl, kws),
      }));
      setStep('filling');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleYouTubeUrl(url: string) {
    setError('');
    setIsLoading(true);

    try {
      // Fetch transcript from external API
      const transcriptRes = await fetch(
        'https://youtube-transcript-production-18aa.up.railway.app/api/transcript',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        },
      );
      if (!transcriptRes.ok) {
        const data = await transcriptRes.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Failed to fetch transcript');
      }
      const transcript = await transcriptRes.json();

      // The transcript response may be a string or have a text/transcript field
      const scriptText =
        typeof transcript === 'string'
          ? transcript
          : transcript.transcript || transcript.text || transcript.fullText || JSON.stringify(transcript);

      // Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptText }),
      });
      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || 'Analysis failed');
      }
      const data = await analyzeRes.json();

      const kws = data.elements
        .filter((el: { type: string }) => el.type === 'listicle-heading')
        .map((el: { text: string }) => extractKeyword(el.text));

      setTitle(data.suggestedTitle || '');
      setKeywords(kws);
      const count = kws.length;
      let tpl = BUILT_IN_TEMPLATES.find(
        (t) => t.cols * t.rows >= count && t.cols * t.rows <= count + 2,
      ) ?? DEFAULT_TEMPLATE;

      if (count > 10) {
        tpl = { id: `${Math.ceil(count / 2)}x2`, label: `${Math.ceil(count / 2)} x 2`, cols: Math.ceil(count / 2), rows: 2 };
      }

      setGridderState((prev) => ({
        ...prev,
        template: tpl,
        cells: createCells(tpl, kws),
      }));
      setStep('filling');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process YouTube URL');
    } finally {
      setIsLoading(false);
    }
  }

  function handleRestoreHistory(entry: {
    title: string;
    keywords: string[];
    template: { cols: number; rows: number; colWeights?: number[] };
    gap: number;
    borderRadius: number;
    backgroundColor: string;
    cells?: { row: number; col: number; colSpan: number; rowSpan: number; imageBase64: string; cropOffsetX: number; cropOffsetY: number; zoom: number }[];
  }) {
    const count = entry.keywords.length;
    let tpl: GridTemplate;

    // If saved template fits the keywords, use it; otherwise pick a better one
    if (count > 0 && entry.template.cols * entry.template.rows < count) {
      const found = BUILT_IN_TEMPLATES.find(
        (t) => t.cols * t.rows >= count && t.cols * t.rows <= count + 2,
      );
      if (found) {
        tpl = found;
      } else if (count > 10) {
        tpl = { id: `${Math.ceil(count / 2)}x2`, label: `${Math.ceil(count / 2)} x 2`, cols: Math.ceil(count / 2), rows: 2 };
      } else {
        tpl = { id: `${entry.template.cols}x${entry.template.rows}`, label: `${entry.template.cols} x ${entry.template.rows}`, cols: entry.template.cols, rows: entry.template.rows, colWeights: entry.template.colWeights };
      }
    } else {
      tpl = { id: `${entry.template.cols}x${entry.template.rows}`, label: `${entry.template.cols} x ${entry.template.rows}`, cols: entry.template.cols, rows: entry.template.rows, colWeights: entry.template.colWeights };
    }

    setTitle(entry.title);
    setKeywords(entry.keywords);

    const newCells = createCells(tpl, entry.keywords);

    // Restore images from saved cells by matching row/col position
    if (entry.cells?.length) {
      for (const saved of entry.cells) {
        const match = newCells.find((c) => c.row === saved.row && c.col === saved.col);
        if (match) {
          match.imageUrl = saved.imageBase64;
          match.cropOffsetX = saved.cropOffsetX;
          match.cropOffsetY = saved.cropOffsetY;
          match.zoom = saved.zoom;
        }
      }
    }

    setGridderState({
      template: tpl,
      cells: newCells,
      gap: entry.gap,
      borderRadius: entry.borderRadius,
      backgroundColor: entry.backgroundColor,
    });
    setStep('filling');
  }

  function handleStartFresh() {
    setKeywords([]);
    setGridderState((prev) => ({
      ...prev,
      template: DEFAULT_TEMPLATE,
      cells: createCells(DEFAULT_TEMPLATE),
    }));
    setStep('filling');
  }

  // Template change — carry over images from old cells by index
  function handleTemplateChange(tpl: GridTemplate) {
    setGridderState((prev) => {
      const newCells = createCells(tpl, keywords);
      for (let i = 0; i < newCells.length && i < prev.cells.length; i++) {
        newCells[i].imageUrl = prev.cells[i].imageUrl;
        newCells[i].cropOffsetX = prev.cells[i].cropOffsetX;
        newCells[i].cropOffsetY = prev.cells[i].cropOffsetY;
        newCells[i].zoom = prev.cells[i].zoom;
      }
      return { ...prev, template: tpl, cells: newCells };
    });
    setSelectedCellId(null);
  }

  // Drop image on cell
  function handleDropImage(cellId: string, dataUri: string) {
    resizeImage(dataUri).then((resized) => {
      setGridderState((prev) => ({
        ...prev,
        cells: prev.cells.map((c) =>
          c.id === cellId ? { ...c, imageUrl: resized } : c,
        ),
      }));
    });
  }

  // Remove image from cell
  function handleRemoveImage(cellId: string) {
    setGridderState((prev) => ({
      ...prev,
      cells: prev.cells.map((c) =>
        c.id === cellId ? { ...c, imageUrl: null } : c,
      ),
    }));
  }

  // Export
  async function handleExport() {
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        template: { cols: gridderState.template.cols, rows: gridderState.template.rows, colWeights: gridderState.template.colWeights },
        cells: gridderState.cells
          .filter((c) => c.imageUrl)
          .map((c) => ({
            row: c.row,
            col: c.col,
            colSpan: c.colSpan,
            rowSpan: c.rowSpan,
            imageBase64: c.imageUrl!,
            cropOffsetX: c.cropOffsetX,
            cropOffsetY: c.cropOffsetY,
            zoom: c.zoom,
          })),
        gap: gridderState.gap,
        borderRadius: gridderState.borderRadius,
        backgroundColor: gridderState.backgroundColor,
        title: title || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
      };

      const res = await fetch('/api/gridder/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }

      const data = await res.json();
      const byteString = atob(data.png);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      setExportUrl(URL.createObjectURL(blob));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    setStep('setup');
    setGridderState({
      template: DEFAULT_TEMPLATE,
      cells: createCells(DEFAULT_TEMPLATE),
      gap: 8,
      borderRadius: 0,
      backgroundColor: '#000000',
    });
    setKeywords([]);
    setTitle('');
    setSelectedCellId(null);
    setError('');
    setExportUrl(null);
    clearGridderSession().catch(() => {});
  }

  const filledCount = useMemo(
    () => gridderState.cells.filter((c) => c.imageUrl).length,
    [gridderState.cells],
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Step bar + reset */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-card-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {(['setup', 'filling', 'done'] as GridderStep[]).map((s, i) => {
            const labels = ['Setup', 'Fill Grid', 'Export'];
            const current = ['setup', 'filling', 'done'].indexOf(step);
            const isComplete = i < current;
            const isCurrent = i === current;
            return (
              <div key={s} className="flex items-center gap-1 sm:gap-2">
                {i > 0 && (
                  <div className={`hidden sm:block h-px w-6 transition-colors duration-300 ${isComplete ? 'bg-accent' : 'bg-card-border'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                    isComplete ? 'bg-accent text-white'
                    : isCurrent ? 'bg-accent text-white shadow-md shadow-accent-glow animate-pulse-glow'
                    : 'bg-surface text-muted-light'
                  }`}>
                    {isComplete ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`hidden sm:inline text-xs font-medium transition-colors ${
                    isCurrent ? 'text-accent' : isComplete ? 'text-foreground' : 'text-muted-light'
                  }`}>{labels[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
        {title && step !== 'setup' && (
          <span className="text-xs text-muted truncate max-w-[200px] hidden sm:inline">{title}</span>
        )}
        {step !== 'setup' && (
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

      {/* Setup step */}
      {step === 'setup' && (
        <>
          <EntryModeSelector
            hasAnalysis={hasAnalysis}
            onUseAnalysis={handleUseAnalysis}
            onUploadAudio={handleUploadAudio}
            onYouTubeUrl={handleYouTubeUrl}
            onStartFresh={handleStartFresh}
            isLoading={isLoading}
          />
          <GridHistory onRestore={handleRestoreHistory} />
        </>
      )}

      {/* Filling step */}
      {step === 'filling' && (
        <>
          <TemplatePicker
            selected={gridderState.template}
            onSelect={handleTemplateChange}
          />

          <div className={`grid gap-6 ${keywords.length > 0 ? 'lg:grid-cols-[1fr_280px]' : ''}`}>
            <div className="space-y-4">
              <GridCanvas
                template={gridderState.template}
                cells={gridderState.cells}
                gap={gridderState.gap}
                borderRadius={gridderState.borderRadius}
                backgroundColor={gridderState.backgroundColor}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
                onDropImage={handleDropImage}
                onRemoveImage={handleRemoveImage}
              />

              {/* Style controls */}
              <div className="rounded-xl border border-card-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Style</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">Gap</span>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={gridderState.gap}
                      onChange={(e) =>
                        setGridderState((prev) => ({ ...prev, gap: +e.target.value }))
                      }
                      className="w-24"
                    />
                    <span className="text-xs text-muted-light w-6">{gridderState.gap}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">Radius</span>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      value={gridderState.borderRadius}
                      onChange={(e) =>
                        setGridderState((prev) => ({
                          ...prev,
                          borderRadius: +e.target.value,
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-xs text-muted-light w-6">{gridderState.borderRadius}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">Background</span>
                    <input
                      type="color"
                      value={gridderState.backgroundColor}
                      onChange={(e) =>
                        setGridderState((prev) => ({
                          ...prev,
                          backgroundColor: e.target.value,
                        }))
                      }
                      className="h-7 w-7 rounded border border-card-border cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={isLoading || filledCount === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-glow hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-glow/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Composing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Export PNG ({filledCount}/{gridderState.cells.length} cells)
                  </>
                )}
              </button>
            </div>

            {/* Keyword sidebar */}
            {keywords.length > 0 && (
              <KeywordSidebar
                keywords={keywords}
                cells={gridderState.cells}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
              />
            )}
          </div>
        </>
      )}

      {/* Done step */}
      {step === 'done' && exportUrl && (
        <div className="animate-fade-in space-y-5">
          <div className="rounded-xl border border-success/20 bg-success-light p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-success">Thumbnail Ready</h3>
                <p className="mt-1 text-sm text-success/80">
                  Your 1920x1080 composite image has been generated.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <a
                    href={exportUrl}
                    download="thumbnail-grid.png"
                    className="inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-success/20 hover:bg-success-hover hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PNG
                  </a>
                  <button
                    onClick={() => setStep('filling')}
                    className="rounded-xl border border-card-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
                  >
                    Edit Grid
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-card-border bg-surface">
              <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Preview</h3>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-card-border overflow-hidden bg-surface p-3">
                <img
                  src={exportUrl}
                  alt="Thumbnail grid preview"
                  className="w-full h-auto rounded-lg"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
