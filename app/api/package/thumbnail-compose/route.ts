import { NextRequest } from 'next/server';
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import path from 'path';
import { cellRect } from '@/lib/grid-templates';
import type { GridTemplate } from '@/lib/types';
import type { ThumbnailTextStyle } from '@/lib/channels';

const FONTS_DIR = path.join(process.cwd(), 'lib', 'fonts');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Anton-Regular.ttf'), 'Anton');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Inter-Variable.ttf'), 'Inter');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'OpenSauceSans-Black.ttf'), 'Open Sauce Sans');

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

interface RequestBody {
  template: { cols: number; rows: number; colWeights?: number[] };
  cells: CellInput[];
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  text: { top: string; bottom: string; style: ThumbnailTextStyle };
}

const WIDTH = 1920;
const HEIGHT = 1080;
const TEXT_FONT_SIZE = 144;
const TEXT_PADDING_X = 48;
const TEXT_PADDING_Y = 10;

function fitFontSize(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  startSize: number,
  maxWidth: number,
): number {
  let size = startSize;
  while (size > 24) {
    ctx.font = `${size}px "${fontFamily}"`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  }
  return size;
}

function drawTextOverlay(
  ctx: SKRSContext2D,
  top: string,
  bottom: string,
  style: ThumbnailTextStyle,
) {
  const topFont = style.topFont || 'Anton';
  const bottomFont = style.bottomFont || 'Anton';
  const bottomScale = style.bottomSizeScale || 1;
  const bottomLetterSpacing = style.bottomLetterSpacing || 0;
  const strokeColor = style.strokeColor || '#000000';
  const strokeWidth = style.strokeWidth || 0;
  const shadowColor = style.shadowColor || '#000000';
  const shadowOffset = style.shadowOffset || 0;
  const shadowAngle = style.shadowAngle ?? 45;
  const shadowAngleRad = shadowAngle * (Math.PI / 180);
  const shadowDx = shadowOffset * Math.cos(shadowAngleRad);
  const shadowDy = shadowOffset * Math.sin(shadowAngleRad);
  const maxLineWidth = WIDTH - TEXT_PADDING_X * 2;

  const topText = top.toUpperCase();
  const bottomText = bottom.toUpperCase();

  const topSize = fitFontSize(ctx, topText, topFont, TEXT_FONT_SIZE, maxLineWidth);
  const bottomSize = fitFontSize(ctx, bottomText, bottomFont, Math.round(TEXT_FONT_SIZE * bottomScale), maxLineWidth);

  const lineGap = style.lineGap;
  const barHeight = TEXT_PADDING_Y * 2 + topSize + lineGap + bottomSize;
  const barY = (HEIGHT - barHeight) / 2;

  ctx.fillStyle = style.barColor;
  ctx.fillRect(0, barY, WIDTH, barHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // Top line — shadow first, then stroke, then fill on top
  ctx.font = `900 ${topSize}px "${topFont}"`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  const topBaselineY = barY + TEXT_PADDING_Y + topSize * 0.86;
  if (shadowOffset > 0) {
    ctx.fillStyle = shadowColor;
    ctx.fillText(topText, WIDTH / 2 + shadowDx, topBaselineY + shadowDy);
  }
  if (strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(topText, WIDTH / 2, topBaselineY);
  }
  ctx.fillStyle = style.topColor;
  ctx.fillText(topText, WIDTH / 2, topBaselineY);

  // Bottom line
  ctx.font = `${bottomSize}px "${bottomFont}"`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${bottomLetterSpacing}px`;
  const bottomBaselineY = topBaselineY + (topSize - topSize * 0.86) + lineGap + bottomSize * 0.86;
  if (shadowOffset > 0) {
    ctx.fillStyle = shadowColor;
    ctx.fillText(bottomText, WIDTH / 2 + shadowDx, bottomBaselineY + shadowDy);
  }
  if (strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(bottomText, WIDTH / 2, bottomBaselineY);
  }
  ctx.fillStyle = style.bottomColor;
  ctx.fillText(bottomText, WIDTH / 2, bottomBaselineY);

  // Reset for any future caller of this ctx
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { template, cells, gap, borderRadius, backgroundColor, text } = body;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = backgroundColor || '#9CA3AF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const tpl: GridTemplate = {
      id: 'package',
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
        console.error(`[thumbnail-compose] Failed to load image for cell ${cell.row},${cell.col}:`, imgErr);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    }

    if (text?.top || text?.bottom) {
      drawTextOverlay(ctx, text.top || '', text.bottom || '', text.style);
    }

    const buffer = canvas.toBuffer('image/png');
    const base64 = Buffer.from(buffer).toString('base64');

    return Response.json({ png: base64 });
  } catch (err) {
    console.error('[thumbnail-compose] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Composition failed' },
      { status: 500 },
    );
  }
}