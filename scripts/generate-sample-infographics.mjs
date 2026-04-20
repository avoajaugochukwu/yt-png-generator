import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'lib', 'fonts');
const OUT_DIR = path.join(ROOT, 'docs', 'samples', 'infographic');
fs.mkdirSync(OUT_DIR, { recursive: true });

GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Anton-Regular.ttf'), 'Anton');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Inter-Variable.ttf'), 'Inter');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Merriweather-Regular.ttf'), 'Merriweather');

const palette = {
  bg: '#FAF5E8',
  fg: '#2A2A2A',
  accent: '#C8502C',
  sand: '#E8D5A8',
  green: '#5B8C5A',
  muted: '#7A6F5C',
  cream: '#FFF8EC',
};

const fruits = [
  { n: 1, name: 'PRICKLY PEAR', blurb: 'Stores water in thick pads; sweet fruit under blazing sun.' },
  { n: 2, name: 'POMEGRANATE', blurb: 'Deep taproots reach buried moisture; ancient desert survivor.' },
  { n: 3, name: 'FIG', blurb: 'Goes dormant in drought, then bursts back when rain returns.' },
  { n: 4, name: 'JUJUBE', blurb: 'Chinese date — tolerant of heat, cold, and nearly any soil.' },
  { n: 5, name: 'OLIVE', blurb: 'Thrives on neglect; old trees fruit best in lean years.' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeart(ctx, x, y, w, h, color) {
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

function drawTracked(ctx, text, x, y, tracking) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  return cx - tracking;
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function subtleGrain(ctx, w, h, opacity = 0.025, spacing = 6) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = palette.fg;
  for (let y = 0; y < h; y += spacing) {
    for (let x = 0; x < w; x += spacing) {
      if ((x * 928371 + y * 72931) % 7 === 0) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 1. OPENER — numbered grid preview of all 5 fruits
// ─────────────────────────────────────────────────────────────
function renderOpener() {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);
  subtleGrain(ctx, W, H);

  const PAD = 120;

  // Accent bar top-left
  ctx.fillStyle = palette.accent;
  ctx.fillRect(PAD, PAD, 80, 8);

  // Kicker
  ctx.fillStyle = palette.accent;
  ctx.font = '600 30px Inter';
  ctx.textBaseline = 'top';
  drawTracked(ctx, 'A QUICK PREVIEW', PAD, PAD + 28, 6);

  // Title lockup
  ctx.fillStyle = palette.fg;
  ctx.font = '260px Anton';
  ctx.fillText('5 FRUITS', PAD, PAD + 80);

  ctx.fillStyle = palette.accent;
  ctx.font = '88px Anton';
  ctx.fillText('THAT THRIVE IN DROUGHT', PAD, PAD + 350);

  // Thin rule
  ctx.fillStyle = palette.fg;
  ctx.fillRect(PAD, 540, 260, 2);

  // 5-item grid (2 cols × 3 rows, last slot = footer tag)
  const gridTop = 580;
  const gridLeft = PAD;
  const gridW = W - PAD * 2;
  const gap = 24;
  const cols = 2, rows = 3;
  const cardW = (gridW - gap * (cols - 1)) / cols;
  const cardH = 120;

  fruits.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridLeft + col * (cardW + gap);
    const y = gridTop + row * (cardH + gap);

    ctx.fillStyle = palette.cream;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();

    const badgeSize = cardH - 28;
    ctx.fillStyle = palette.accent;
    roundRect(ctx, x + 14, y + 14, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '72px Anton';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(f.n), x + 14 + badgeSize / 2, y + 14 + badgeSize / 2 + 4);

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.fg;
    ctx.font = '60px Anton';
    ctx.fillText(f.name, x + 14 + badgeSize + 24, y + cardH / 2 - 14);

    ctx.fillStyle = palette.muted;
    ctx.font = '400 22px Inter';
    ctx.fillText(f.blurb, x + 14 + badgeSize + 24, y + cardH / 2 + 22);
  });

  // Footer tag (last cell area)
  const footY = gridTop + 2 * (cardH + gap);
  const footX = gridLeft + 1 * (cardW + gap);
  ctx.fillStyle = palette.green;
  roundRect(ctx, footX, footY, cardW, cardH, 14);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 28px Inter';
  ctx.textBaseline = 'middle';
  drawTracked(ctx, 'DESERT-GARDEN FIELD GUIDE', footX + 32, footY + cardH / 2 - 18, 4);
  ctx.font = '400 22px Inter';
  ctx.fillText('ep. 07 — drought-adapted food crops', footX + 32, footY + cardH / 2 + 22);

  fs.writeFileSync(path.join(OUT_DIR, '01-opener-numbered-grid.png'), canvas.toBuffer('image/png'));
  console.log('✓ 01-opener-numbered-grid.png');
}

// ─────────────────────────────────────────────────────────────
// 2. SPOTLIGHT — dramatic per-item card (using #1 Prickly Pear)
// ─────────────────────────────────────────────────────────────
function renderSpotlight(fruit) {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.fg;
  ctx.fillRect(0, 0, W, H);
  subtleGrain(ctx, W, H, 0.04, 5);

  // Left side: giant number filling full height
  ctx.fillStyle = palette.accent;
  ctx.font = '900px Anton';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`#${fruit.n}`, 60, H / 2 + 20);

  // Right side column
  const colX = 900;
  const colY = 280;

  // Kicker
  ctx.fillStyle = palette.sand;
  ctx.font = '600 28px Inter';
  ctx.textBaseline = 'top';
  drawTracked(ctx, 'SPOTLIGHT', colX, colY, 6);

  // Thin accent bar
  ctx.fillStyle = palette.accent;
  ctx.fillRect(colX, colY + 48, 80, 4);

  // Name
  ctx.fillStyle = palette.bg;
  ctx.font = '160px Anton';
  ctx.fillText(fruit.name, colX, colY + 80);

  // Blurb (wrapped, serif)
  ctx.fillStyle = palette.sand;
  ctx.font = '400 38px Merriweather';
  const blurbLines = wrap(ctx, fruit.blurb, W - colX - 120);
  blurbLines.forEach((ln, i) => ctx.fillText(ln, colX, colY + 290 + i * 54));

  // Stat chips
  const stats = [
    { k: 'ZONES', v: '8b – 11' },
    { k: 'WATER', v: 'Very Low' },
    { k: 'YIELD', v: 'Summer–Fall' },
  ];
  const chipY = colY + 500;
  let chipX = colX;
  stats.forEach((s) => {
    ctx.fillStyle = palette.accent;
    ctx.font = '600 22px Inter';
    ctx.textBaseline = 'top';
    const labelW = drawTracked(ctx, s.k, chipX, chipY, 4) - chipX;
    ctx.fillStyle = palette.bg;
    ctx.font = '700 44px Inter';
    ctx.fillText(s.v, chipX, chipY + 32);
    const valW = ctx.measureText(s.v).width;
    chipX += Math.max(labelW, valW) + 64;
  });

  fs.writeFileSync(path.join(OUT_DIR, `02-spotlight-${fruit.n}-${fruit.name.toLowerCase().replace(/\s+/g, '-')}.png`), canvas.toBuffer('image/png'));
  console.log(`✓ 02-spotlight-${fruit.n}-${fruit.name.toLowerCase().replace(/\s+/g, '-')}.png`);
}

// ─────────────────────────────────────────────────────────────
// 3. OUTRO — recap + subscribe CTA
// ─────────────────────────────────────────────────────────────
function renderOutro() {
  const W = 1920, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);
  subtleGrain(ctx, W, H);

  // Kicker centered
  ctx.fillStyle = palette.accent;
  ctx.font = '600 28px Inter';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  drawTracked(ctx, 'BEFORE YOU GO — YOUR RECAP', W / 2 - 180, 110, 6);

  // Big title
  ctx.fillStyle = palette.fg;
  ctx.font = '130px Anton';
  ctx.fillText('DROUGHT-PROOF 5', W / 2, 170);

  // Numbered recap — centered single column
  const listX = W / 2;
  const startY = 400;
  const step = 90;
  ctx.textBaseline = 'middle';
  fruits.forEach((f, i) => {
    const y = startY + i * step;
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.accent;
    ctx.font = '72px Anton';
    ctx.fillText(String(f.n), listX - 18, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.fg;
    ctx.font = '62px Anton';
    ctx.fillText(f.name, listX + 18, y);
  });

  // Subscribe pill at the bottom
  const pillW = 560, pillH = 110;
  const pillX = (W - pillW) / 2;
  const pillY = H - 180;
  ctx.fillStyle = '#FF0000';
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  const heartSize = 56;
  const heartBoxH = heartSize * 0.9;
  const gap = 22;
  ctx.font = '68px Anton';
  ctx.textBaseline = 'middle';
  const text = 'SUBSCRIBE';
  const textW = ctx.measureText(text).width;
  const blockW = heartSize + gap + textW;
  const blockX = (W - blockW) / 2;
  const lineY = pillY + pillH / 2;
  drawHeart(ctx, blockX, lineY - heartBoxH / 2, heartSize, heartBoxH, '#FFFFFF');
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(text, blockX + heartSize + gap, lineY);

  fs.writeFileSync(path.join(OUT_DIR, '03-outro-recap.png'), canvas.toBuffer('image/png'));
  console.log('✓ 03-outro-recap.png');
}

renderOpener();
renderSpotlight(fruits[0]);
renderOutro();

console.log(`\nSaved to ${OUT_DIR}`);
