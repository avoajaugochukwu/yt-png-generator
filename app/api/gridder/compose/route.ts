import { NextRequest } from 'next/server';
import { createCanvas, loadImage } from '@napi-rs/canvas';

interface CellInput {
  row: number;
  col: number;
  imageBase64: string;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
}

interface ComposeRequest {
  template: { cols: number; rows: number };
  cells: CellInput[];
  gap: number;
  borderRadius: number;
  backgroundColor: string;
}

const WIDTH = 1920;
const HEIGHT = 1080;

export async function POST(request: NextRequest) {
  try {
    const body: ComposeRequest = await request.json();
    const { template, cells, gap, borderRadius, backgroundColor } = body;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = backgroundColor || '#000000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const cellW = (WIDTH - gap * (template.cols + 1)) / template.cols;
    const cellH = (HEIGHT - gap * (template.rows + 1)) / template.rows;

    for (const cell of cells) {
      if (!cell.imageBase64) continue;

      const x = gap + cell.col * (cellW + gap);
      const y = gap + cell.row * (cellH + gap);

      try {
        // Strip data URI prefix if present
        let raw = cell.imageBase64;
        const commaIdx = raw.indexOf(',');
        if (commaIdx !== -1 && raw.startsWith('data:')) {
          raw = raw.slice(commaIdx + 1);
        }

        const buf = Buffer.from(raw, 'base64');
        const img = await loadImage(buf);

        ctx.save();

        // Clip to rounded rect
        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, borderRadius);
          ctx.clip();
        }

        // Cover-fit calculation
        const imgAspect = img.width / img.height;
        const cellAspect = cellW / cellH;

        let sw: number, sh: number, sx: number, sy: number;

        if (imgAspect > cellAspect) {
          // Image is wider — crop sides
          sh = img.height;
          sw = sh * cellAspect;
          const maxOffsetX = img.width - sw;
          sx = maxOffsetX * (cell.cropOffsetX ?? 0.5);
          sy = 0;
        } else {
          // Image is taller — crop top/bottom
          sw = img.width;
          sh = sw / cellAspect;
          const maxOffsetY = img.height - sh;
          sx = 0;
          sy = maxOffsetY * (cell.cropOffsetY ?? 0.5);
        }

        // Apply zoom
        const zoom = cell.zoom ?? 1;
        if (zoom > 1) {
          const zoomSw = sw / zoom;
          const zoomSh = sh / zoom;
          sx += (sw - zoomSw) * (cell.cropOffsetX ?? 0.5);
          sy += (sh - zoomSh) * (cell.cropOffsetY ?? 0.5);
          sw = zoomSw;
          sh = zoomSh;
        }

        ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
        ctx.restore();
      } catch (imgErr) {
        console.error(`[compose] Failed to load image for cell ${cell.row},${cell.col}:`, imgErr);
        // Draw placeholder
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    const buffer = canvas.toBuffer('image/png');
    const base64 = Buffer.from(buffer).toString('base64');

    return Response.json({ png: base64 });
  } catch (err) {
    console.error('[compose] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Composition failed' },
      { status: 500 },
    );
  }
}
