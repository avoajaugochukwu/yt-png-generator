import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import path from 'path';
import type { VisualElement, CustomizationOptions } from './types';

const FONTS_DIR = path.join(process.cwd(), 'lib', 'fonts');

GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Anton-Regular.ttf'), 'Anton');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Inter-Variable.ttf'), 'Inter');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Merriweather-Regular.ttf'), 'Merriweather');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'JetBrainsMono-Variable.ttf'), 'JetBrains Mono');

const FONT_MAP: Record<string, string> = {
  'Anton': 'Anton',
  'Inter': 'Inter',
  'Merriweather': 'Merriweather',
  'JetBrains Mono': 'JetBrains Mono',
};

const PADDING = 40;
const BAR_WIDTH = 12;
const DEFAULT_BAR_COLOR = '#60B5F6'; // light blue
const HEADING_TYPES: Set<VisualElement['type']> = new Set(['main-title', 'listicle-heading']);

interface SizeConfig {
  maxWidth: number;
  fontSize: number;
}

const SIZE_CONFIGS: Record<VisualElement['type'], SizeConfig> = {
  'main-title': { maxWidth: 1400, fontSize: 120 },
  'listicle-heading': { maxWidth: 1200, fontSize: 84 },
  'point-of-interest': { maxWidth: 800, fontSize: 63 },
  'subscribe': { maxWidth: 1000, fontSize: 96 },
};

function drawHeart(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const topLobeY = y + h * 0.3;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, topLobeY);
  ctx.bezierCurveTo(x + w / 2, y, x, y, x, topLobeY);
  ctx.bezierCurveTo(x, y + h * 0.55, x + w / 2, y + h * 0.8, x + w / 2, y + h);
  ctx.bezierCurveTo(x + w / 2, y + h * 0.8, x + w, y + h * 0.55, x + w, topLobeY);
  ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, topLobeY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function generatePng(
  element: VisualElement,
  options: CustomizationOptions
): { buffer: Buffer; width: number; height: number } {
  const isSubscribe = element.type === 'subscribe';
  const config = SIZE_CONFIGS[element.type];
  const fontFamily = FONT_MAP[options.fontFamily] || 'Inter';
  const fontSpec = `${config.fontSize}px "${fontFamily}"`;

  // Subscribe type always uses red bg + white text
  const bgColor = isSubscribe ? '#FF0000' : options.backgroundColor;
  const textColor = isSubscribe ? '#FFFFFF' : options.textColor;

  // Heart shape dimensions for subscribe type (drawn as a canvas path — no emoji font required)
  const heartSize = Math.round(config.fontSize * 0.85);
  const heartBoxHeight = heartSize * 0.9;
  const heartGap = Math.round(config.fontSize * 0.4);

  // First pass: measure text to determine canvas dimensions
  const measureCanvas = createCanvas(config.maxWidth, 100);
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = fontSpec;

  const availableWidth = config.maxWidth - PADDING * 2;
  const uppercaseText = element.text.toUpperCase();

  const heartWidth = isSubscribe ? heartSize + heartGap : 0;

  const lines = wrapText(measureCtx, uppercaseText, availableWidth - heartWidth);

  const lineHeight = config.fontSize * 1.4;
  const textBlockHeight = lines.length * lineHeight;
  const canvasHeight = Math.ceil(textBlockHeight + PADDING * 2);

  // Second pass: render
  const canvas = createCanvas(config.maxWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, config.maxWidth, canvasHeight);

  // Left bar for headings
  const hasBar = HEADING_TYPES.has(element.type);
  if (hasBar) {
    ctx.fillStyle = options.barColor || DEFAULT_BAR_COLOR;
    ctx.fillRect(0, 0, BAR_WIDTH, canvasHeight);
  }

  // Text — uppercase, vertically centered
  const isCentered = element.type === 'main-title' || isSubscribe;
  ctx.fillStyle = textColor;
  ctx.font = fontSpec;
  ctx.textBaseline = 'middle';
  ctx.textAlign = isCentered ? 'center' : 'left';

  const textLeftPad = hasBar ? PADDING + BAR_WIDTH : PADDING;
  const startX = isCentered ? config.maxWidth / 2 : textLeftPad;
  const centerY = canvasHeight / 2;
  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

  if (isSubscribe) {
    // Draw heart path + text centered together
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      const lineY = firstLineY + i * lineHeight;
      ctx.font = fontSpec;
      const textW = ctx.measureText(lines[i]).width;
      const totalW = heartWidth + textW;
      const blockX = (config.maxWidth - totalW) / 2;

      drawHeart(ctx, blockX, lineY - heartBoxHeight / 2, heartSize, heartBoxHeight, textColor);

      ctx.font = fontSpec;
      ctx.fillStyle = textColor;
      ctx.fillText(lines[i], blockX + heartWidth, lineY);
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], startX, firstLineY + i * lineHeight);
    }
  }

  const buffer = canvas.toBuffer('image/png');
  return { buffer, width: config.maxWidth, height: canvasHeight };
}
