'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { GridTemplate, GridCellData } from '@/lib/types';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, cellRect } from '@/lib/grid-templates';

interface GridCanvasProps {
  template: GridTemplate;
  cells: GridCellData[];
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  selectedCellId: string | null;
  onSelectCell: (id: string) => void;
  onDropImage: (cellId: string, dataUri: string) => void;
  onRemoveImage: (cellId: string) => void;
}

export default function GridCanvas({
  template,
  cells,
  gap,
  borderRadius,
  backgroundColor,
  selectedCellId,
  onSelectCell,
  onDropImage,
  onRemoveImage,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Draw grid on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    for (const cell of cells) {
      const r = cellRect(template, gap, cell.row, cell.col, cell.colSpan, cell.rowSpan);

      if (cell.imageUrl) {
        const cached = imgCacheRef.current.get(cell.imageUrl);
        if (cached && cached.complete) {
          ctx.save();
          if (borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, borderRadius);
            ctx.clip();
          }

          const imgAspect = cached.naturalWidth / cached.naturalHeight;
          const cAspect = r.w / r.h;
          let sw: number, sh: number, sx: number, sy: number;

          if (imgAspect > cAspect) {
            sh = cached.naturalHeight;
            sw = sh * cAspect;
            sx = (cached.naturalWidth - sw) * cell.cropOffsetX;
            sy = 0;
          } else {
            sw = cached.naturalWidth;
            sh = sw / cAspect;
            sx = 0;
            sy = (cached.naturalHeight - sh) * cell.cropOffsetY;
          }

          if (cell.zoom > 1) {
            const zSw = sw / cell.zoom;
            const zSh = sh / cell.zoom;
            sx += (sw - zSw) * cell.cropOffsetX;
            sy += (sh - zSh) * cell.cropOffsetY;
            sw = zSw;
            sh = zSh;
          }

          ctx.drawImage(cached, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = '#64748b';
          ctx.font = '40px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('...', r.x + r.w / 2, r.y + r.h / 2);
        }
      } else {
        // Empty cell background
        ctx.fillStyle = '#1e293b';
        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, r.h, borderRadius);
          ctx.fill();
        } else {
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
      }
    }

    // Selection highlight
    if (selectedCellId) {
      const sel = cells.find((c) => c.id === selectedCellId);
      if (sel) {
        const r = cellRect(template, gap, sel.row, sel.col, sel.colSpan, sel.rowSpan);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 6;
        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, r.h, borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
      }
    }
  }, [cells, template, gap, borderRadius, backgroundColor, selectedCellId]);

  // Load images and redraw
  useEffect(() => {
    let stale = false;

    for (const cell of cells) {
      if (!cell.imageUrl) continue;
      if (imgCacheRef.current.has(cell.imageUrl)) continue;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!stale) {
          imgCacheRef.current.set(cell.imageUrl!, img);
          requestAnimationFrame(draw);
        }
      };
      img.src = cell.imageUrl;
      imgCacheRef.current.set(cell.imageUrl, img);
    }

    requestAnimationFrame(draw);

    return () => {
      stale = true;
    };
  }, [cells, draw]);

  // Find which cell a mouse event lands on
  function hitTest(e: React.MouseEvent | React.DragEvent): GridCellData | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * OUTPUT_WIDTH;
    const my = ((e.clientY - rect.top) / rect.height) * OUTPUT_HEIGHT;

    for (const cell of cells) {
      const r = cellRect(template, gap, cell.row, cell.col, cell.colSpan, cell.rowSpan);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        return cell;
      }
    }
    return null;
  }

  // Handle drag-and-drop on the container
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const hit = hitTest(e);
    const targetId = hit?.id ?? selectedCellId;
    if (!targetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onDropImage(targetId, reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSearchAndSelect(cell: GridCellData) {
    onSelectCell(cell.id);
    const query = cell.keyword || `image ${cell.row + 1},${cell.col + 1}`;
    window.open(
      `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
      '_blank',
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Grid Preview</h3>
        </div>
        {selectedCellId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              Selected: {selectedCellId.replace('cell-', '').replace('-', ',')}
            </span>
            {cells.find((c) => c.id === selectedCellId)?.imageUrl && (
              <button
                onClick={() => onRemoveImage(selectedCellId)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger-light transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted mb-3">
        Click &quot;Search&quot; on a cell to open Google Images. Use the Chrome extension to add the image.
        You can also paste or drag & drop images.
      </p>

      {/* Canvas + HTML overlays container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-card-border"
        style={{ aspectRatio: '16/9' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          width={OUTPUT_WIDTH}
          height={OUTPUT_HEIGHT}
          className="absolute inset-0 w-full h-full"
        />

        {/* HTML overlays for each cell */}
        {cells.map((cell) => {
          const r = cellRect(template, gap, cell.row, cell.col, cell.colSpan, cell.rowSpan);
          const xPct = (r.x / OUTPUT_WIDTH) * 100;
          const yPct = (r.y / OUTPUT_HEIGHT) * 100;
          const wPct = (r.w / OUTPUT_WIDTH) * 100;
          const hPct = (r.h / OUTPUT_HEIGHT) * 100;
          const isSelected = cell.id === selectedCellId;

          return (
            <div
              key={cell.id}
              className="absolute flex flex-col items-center justify-center cursor-pointer"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: `${wPct}%`,
                height: `${hPct}%`,
                borderRadius: borderRadius > 0 ? `${borderRadius * (containerRef.current ? containerRef.current.clientWidth / OUTPUT_WIDTH : 0.5)}px` : undefined,
              }}
              onClick={() => onSelectCell(cell.id)}
            >
              {/* Empty cell overlay */}
              {!cell.imageUrl && (
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 w-full h-full">
                  <svg
                    className="w-[12%] h-[12%] text-[#475569]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>

                  {cell.keyword && (
                    <span className="text-[#94a3b8] text-[clamp(8px,1.2vw,14px)] font-medium uppercase tracking-wider text-center px-2 truncate max-w-[90%]">
                      {cell.keyword}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchAndSelect(cell);
                    }}
                    className={`mt-1 flex items-center gap-1 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-[clamp(8px,1vw,12px)] font-semibold transition-all ${
                      isSelected
                        ? 'bg-accent text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <svg
                      className="w-[clamp(8px,1vw,12px)] h-[clamp(8px,1vw,12px)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </div>
              )}

              {/* Filled cell hover overlay */}
              {cell.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded-[inherit]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchAndSelect(cell);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 sm:px-3 sm:py-1.5 text-[clamp(8px,1vw,12px)] font-semibold text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <svg
                      className="w-[clamp(8px,1vw,12px)] h-[clamp(8px,1vw,12px)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Replace
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(cell.id);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-red-500/30 px-2 py-1 sm:px-3 sm:py-1.5 text-[clamp(8px,1vw,12px)] font-semibold text-white hover:bg-red-500/50 transition-colors backdrop-blur-sm"
                  >
                    <svg
                      className="w-[clamp(8px,1vw,12px)] h-[clamp(8px,1vw,12px)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
