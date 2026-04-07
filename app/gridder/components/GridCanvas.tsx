'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { GridTemplate, GridCellData } from '@/lib/types';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, cellDimensions } from '@/lib/grid-templates';

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
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const { cellW, cellH } = cellDimensions(template, gap);

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
      const x = gap + cell.col * (cellW + gap);
      const y = gap + cell.row * (cellH + gap);

      if (cell.imageUrl) {
        const cached = imgCacheRef.current.get(cell.imageUrl);
        if (cached && cached.complete) {
          ctx.save();
          if (borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(x, y, cellW, cellH, borderRadius);
            ctx.clip();
          }

          const imgAspect = cached.naturalWidth / cached.naturalHeight;
          const cellAspect = cellW / cellH;
          let sw: number, sh: number, sx: number, sy: number;

          if (imgAspect > cellAspect) {
            sh = cached.naturalHeight;
            sw = sh * cellAspect;
            sx = (cached.naturalWidth - sw) * cell.cropOffsetX;
            sy = 0;
          } else {
            sw = cached.naturalWidth;
            sh = sw / cellAspect;
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

          ctx.drawImage(cached, sx, sy, sw, sh, x, y, cellW, cellH);
          ctx.restore();
        } else {
          // Still loading
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.fillStyle = '#64748b';
          ctx.font = '40px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('...', x + cellW / 2, y + cellH / 2);
        }
      } else {
        // Empty cell
        ctx.fillStyle = '#1e293b';
        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, borderRadius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, cellW, cellH);
        }

        // Plus icon
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const iconSize = Math.min(cellW, cellH) * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx - iconSize, cy);
        ctx.lineTo(cx + iconSize, cy);
        ctx.moveTo(cx, cy - iconSize);
        ctx.lineTo(cx, cy + iconSize);
        ctx.stroke();

        // Keyword label
        if (cell.keyword) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${Math.min(30, cellW * 0.06)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = cell.keyword.length > 20 ? cell.keyword.slice(0, 18) + '...' : cell.keyword;
          ctx.fillText(text, cx, cy + iconSize + 30);
        }
      }
    }

    // Selection highlight
    if (selectedCellId) {
      const sel = cells.find((c) => c.id === selectedCellId);
      if (sel) {
        const sx = gap + sel.col * (cellW + gap);
        const sy = gap + sel.row * (cellH + gap);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 6;
        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(sx, sy, cellW, cellH, borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(sx, sy, cellW, cellH);
        }
      }
    }
  }, [cells, template, gap, borderRadius, backgroundColor, selectedCellId, cellW, cellH]);

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

  // Handle click to select cell
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = OUTPUT_WIDTH / rect.width;
    const scaleY = OUTPUT_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const cell of cells) {
      const cx = gap + cell.col * (cellW + gap);
      const cy = gap + cell.row * (cellH + gap);
      if (mx >= cx && mx <= cx + cellW && my >= cy && my <= cy + cellH) {
        onSelectCell(cell.id);
        return;
      }
    }
  }

  // Handle drag-and-drop
  function handleDrop(e: React.DragEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Find which cell was dropped on
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = OUTPUT_WIDTH / rect.width;
    const scaleY = OUTPUT_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let targetId = selectedCellId;
    for (const cell of cells) {
      const cx = gap + cell.col * (cellW + gap);
      const cy = gap + cell.row * (cellH + gap);
      if (mx >= cx && mx <= cx + cellW && my >= cy && my <= cy + cellH) {
        targetId = cell.id;
        break;
      }
    }

    if (!targetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onDropImage(targetId!, reader.result);
      }
    };
    reader.readAsDataURL(file);
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
        Click a cell to select it, then paste an image or use the Chrome extension.
        You can also drag & drop images directly onto cells.
      </p>

      <div className="w-full overflow-hidden rounded-lg border border-card-border">
        <canvas
          ref={canvasRef}
          width={OUTPUT_WIDTH}
          height={OUTPUT_HEIGHT}
          onClick={handleCanvasClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full h-auto cursor-pointer"
          style={{ aspectRatio: '16/9' }}
        />
      </div>
    </div>
  );
}
