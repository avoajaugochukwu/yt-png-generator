import { NextRequest } from 'next/server';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { cellRect } from '@/lib/grid-templates';
import type { GridTemplate } from '@/lib/types';

interface CellInput {
  row: number;
  col: number;
  colSpan?: number;
  rowSpan?: number;
  imageBase64: string;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
}

interface ComposeRequest {
  template: { cols: number; rows: number; colWeights?: number[] };
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

    // Build a GridTemplate for cellRect
    const tpl: GridTemplate = {
      id: 'compose',
      label: '',
      cols: template.cols,
      rows: template.rows,
      colWeights: template.colWeights,
    };

    for (const cell of cells) {
      if (!cell.imageBase64) continue;

      const r = cellRect(tpl, gap, cell.row, cell.col, cell.colSpan ?? 1, cell.rowSpan ?? 1);

      try {
        let raw = cell.imageBase64;
        const commaIdx = raw.indexOf(',');
        if (commaIdx !== -1 && raw.startsWith('data:')) {
          raw = raw.slice(commaIdx + 1);
        }

        const buf = Buffer.from(raw, 'base64');
        const img = await loadImage(buf);

        ctx.save();

        if (borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, r.h, borderRadius);
          ctx.clip();
        }

        // Cover-fit calculation
        const imgAspect = img.width / img.height;
        const cAspect = r.w / r.h;

        let sw: number, sh: number, sx: number, sy: number;

        if (imgAspect > cAspect) {
          sh = img.height;
          sw = sh * cAspect;
          sx = (img.width - sw) * (cell.cropOffsetX ?? 0.5);
          sy = 0;
        } else {
          sw = img.width;
          sh = sw / cAspect;
          sx = 0;
          sy = (img.height - sh) * (cell.cropOffsetY ?? 0.5);
        }

        const zoom = cell.zoom ?? 1;
        if (zoom > 1) {
          const zSw = sw / zoom;
          const zSh = sh / zoom;
          sx += (sw - zSw) * (cell.cropOffsetX ?? 0.5);
          sy += (sh - zSh) * (cell.cropOffsetY ?? 0.5);
          sw = zSw;
          sh = zSh;
        }

        ctx.drawImage(img, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
        ctx.restore();
      } catch (imgErr) {
        console.error(`[compose] Failed to load image for cell ${cell.row},${cell.col}:`, imgErr);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(r.x, r.y, r.w, r.h);
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
