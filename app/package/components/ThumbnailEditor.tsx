'use client';

import { useRef } from 'react';
import type { ThumbnailSpec } from '@/lib/channels';

export interface ThumbnailCell {
  keyword: string;
  imageUrl: string | null;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
}

interface Props {
  spec: ThumbnailSpec;
  cells: ThumbnailCell[];
  text: { top: string; bottom: string };
  selectedIdx: number | null;
  onSelectCell: (idx: number) => void;
  onSetCellImage: (idx: number, dataUri: string) => void;
  onClearCellImage: (idx: number) => void;
  onTextChange: (text: { top: string; bottom: string }) => void;
  onCompose: () => void;
  onRegenerateText: () => void;
  isLoading: boolean;
  isSeeding: boolean;
}

export default function ThumbnailEditor({
  spec,
  cells,
  text,
  selectedIdx,
  onSelectCell,
  onSetCellImage,
  onClearCellImage,
  onTextChange,
  onCompose,
  onRegenerateText,
  isLoading,
  isSeeding,
}: Props) {
  const filledCount = cells.filter((c) => c.imageUrl).length;
  const canCompose = filledCount === cells.length && text.top.trim() && text.bottom.trim();

  // Shadow expressed as a fraction of the top-line font size so it scales with the responsive preview.
  // Canvas renders at TEXT_FONT_SIZE = 144px, so shadowOffset / 144 is the em equivalent.
  const shadowAngleRad = (spec.text.shadowAngle ?? 45) * (Math.PI / 180);
  const shadowEm = (spec.text.shadowOffset || 0) / 144;
  const shadowDxEm = shadowEm * Math.cos(shadowAngleRad);
  const shadowDyEm = shadowEm * Math.sin(shadowAngleRad);
  const shadowFilter =
    shadowEm > 0
      ? `drop-shadow(${shadowDxEm.toFixed(3)}em ${shadowDyEm.toFixed(3)}em 0 ${spec.text.shadowColor})`
      : undefined;

  return (
    <div className="space-y-5">
      {/* Top info bar */}
      <div className="rounded-xl border border-card-border bg-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">Layout:</span>
          <span className="font-semibold text-foreground">
            {spec.template.cols}×{spec.template.rows}
          </span>
          <span className="text-muted">·</span>
          <span className="text-muted">Background:</span>
          <span
            className="inline-block h-4 w-4 rounded border border-card-border"
            style={{ backgroundColor: spec.backgroundColor }}
            title={spec.backgroundColor}
          />
          <span className="text-muted">·</span>
          <span className="text-muted">Line gap: {spec.text.lineGap}px</span>
        </div>
        <button
          onClick={onRegenerateText}
          disabled={isLoading || isSeeding}
          className="text-xs font-medium text-accent hover:bg-accent-light px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSeeding ? 'Generating…' : 'Regenerate text & keywords'}
        </button>
      </div>

      {/* Image cells */}
      <div className="rounded-xl border border-card-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Images</h3>
        <p className="text-xs text-muted mb-3">
          Click <strong>Search</strong> to open Google Images, then paste the image (Cmd/Ctrl+V) into the selected cell.
          You can also drag-and-drop or click <strong>Upload</strong>.
        </p>

        {isSeeding && cells.length === 0 ? (
          <div className="rounded-lg border border-dashed border-card-border bg-surface p-8 text-center text-sm text-muted">
            Generating image keywords and thumbnail text…
          </div>
        ) : (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${spec.template.cols}, minmax(0, 1fr))` }}
          >
            {cells.map((cell, idx) => (
              <CellTile
                key={idx}
                cell={cell}
                isSelected={selectedIdx === idx}
                onSelect={() => onSelectCell(idx)}
                onSetImage={(uri) => onSetCellImage(idx, uri)}
                onClear={() => onClearCellImage(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text overlay editor + preview */}
      <div className="rounded-xl border border-card-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Thumbnail text</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Top line (hook)</span>
            <input
              type="text"
              value={text.top}
              onChange={(e) => onTextChange({ ...text, top: e.target.value })}
              placeholder="THEY LOVE 115° HEAT"
              disabled={isLoading}
              className="rounded-lg border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Bottom line (payoff)</span>
            <input
              type="text"
              value={text.bottom}
              onChange={(e) => onTextChange({ ...text, bottom: e.target.value })}
              placeholder="MASSIVE FRUIT HARVEST!"
              disabled={isLoading}
              className="rounded-lg border border-card-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50"
            />
          </label>
        </div>

        {/* Live preview of the text bar — full-width, vertically centered in a 16:9 frame */}
        <div className="relative w-full overflow-hidden rounded-lg bg-surface" style={{ aspectRatio: '16/9' }}>
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center px-6 py-3"
            style={{ backgroundColor: spec.text.barColor }}
          >
            <div
              className="uppercase tracking-tight text-center"
              style={{
                color: spec.text.topColor,
                fontFamily: `"${spec.text.topFont}", "Inter", sans-serif`,
                fontWeight: 900,
                fontSize: 'clamp(24px, 5vw, 54px)',
                lineHeight: 1,
                marginBottom: `${spec.text.lineGap}px`,
                WebkitTextStroke: `2px ${spec.text.strokeColor}`,
                paintOrder: 'stroke fill',
                filter: shadowFilter,
              }}
            >
              {text.top.toUpperCase() || 'TOP LINE PREVIEW'}
            </div>
            <div
              className="font-bold uppercase tracking-tight text-center"
              style={{
                color: spec.text.bottomColor,
                fontFamily: `"${spec.text.bottomFont}", "Inter", sans-serif`,
                fontSize: `clamp(${28}px, ${5 * spec.text.bottomSizeScale}vw, ${Math.round(54 * spec.text.bottomSizeScale)}px)`,
                lineHeight: 1,
                letterSpacing: '0.04em',
                WebkitTextStroke: `2px ${spec.text.strokeColor}`,
                paintOrder: 'stroke fill',
                filter: shadowFilter,
              }}
            >
              {text.bottom.toUpperCase() || 'BOTTOM LINE PREVIEW'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onCompose}
        disabled={isLoading || !canCompose}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent-glow hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-glow/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Composing…
          </>
        ) : (
          `Compose Thumbnail (${filledCount}/${cells.length} images)`
        )}
      </button>
    </div>
  );
}

function CellTile({
  cell,
  isSelected,
  onSelect,
  onSetImage,
  onClear,
}: {
  cell: ThumbnailCell;
  isSelected: boolean;
  onSelect: () => void;
  onSetImage: (uri: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSetImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onSelect();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }

  function handleSearch(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect();
    const q = cell.keyword || 'plant garden';
    window.open(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`,
      '_blank',
    );
  }

  return (
    <div
      onClick={onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative aspect-square overflow-hidden rounded-lg border-2 cursor-pointer transition-all ${
        isSelected ? 'border-accent shadow-md shadow-accent-glow/30' : 'border-card-border hover:border-accent/40'
      }`}
      style={{ backgroundColor: '#1e293b' }}
    >
      {cell.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cell.imageUrl} alt={cell.keyword} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-black/50">
            <button
              onClick={handleSearch}
              className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30 backdrop-blur-sm"
            >
              Search
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30 backdrop-blur-sm"
            >
              Replace
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="rounded-md bg-red-500/40 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-500/60 backdrop-blur-sm"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/70 truncate max-w-full">
            {cell.keyword || '—'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 rounded-md bg-accent/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-accent"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/20"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
