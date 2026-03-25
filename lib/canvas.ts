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

interface SizeConfig {
  maxWidth: number;
  fontSize: number;
}

const SIZE_CONFIGS: Record<VisualElement['type'], SizeConfig> = {
  'listicle-heading': { maxWidth: 1200, fontSize: 84 },
  'point-of-interest': { maxWidth: 800, fontSize: 63 },
};

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
  const config = SIZE_CONFIGS[element.type];
  const fontFamily = FONT_MAP[options.fontFamily] || 'Inter';
  const fontSpec = `${config.fontSize}px "${fontFamily}"`;

  // First pass: measure text to determine canvas dimensions
  const measureCanvas = createCanvas(config.maxWidth, 100);
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = fontSpec;

  const availableWidth = config.maxWidth - PADDING * 2;
  const uppercaseText = element.text.toUpperCase();
  const lines = wrapText(measureCtx, uppercaseText, availableWidth);

  const lineHeight = config.fontSize * 1.4;
  const textBlockHeight = lines.length * lineHeight;
  const canvasHeight = Math.ceil(textBlockHeight + PADDING * 2);

  // Second pass: render
  const canvas = createCanvas(config.maxWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, config.maxWidth, canvasHeight);

  // Text — uppercase, left-aligned, vertically centered
  ctx.fillStyle = options.textColor;
  ctx.font = fontSpec;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const startX = PADDING;
  const centerY = canvasHeight / 2;
  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], startX, firstLineY + i * lineHeight);
  }

  const buffer = canvas.toBuffer('image/png');
  return { buffer, width: config.maxWidth, height: canvasHeight };
}
