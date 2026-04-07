import type { GridTemplate, GridCellData } from './types';

export const OUTPUT_WIDTH = 1920;
export const OUTPUT_HEIGHT = 1080;

export const BUILT_IN_TEMPLATES: GridTemplate[] = [
  { id: '2x1', label: '2 x 1', cols: 2, rows: 1 },
  { id: '2x1-skew', label: '2 x 1 Skewed', cols: 2, rows: 1, colWeights: [7, 3] },
  {
    id: '2x1-skew-split',
    label: '1 + 2 Skewed',
    cols: 2,
    rows: 2,
    colWeights: [7, 3],
    cellDefs: [
      { col: 0, row: 0, rowSpan: 2 },
      { col: 1, row: 0 },
      { col: 1, row: 1 },
    ],
  },
  { id: '2x2', label: '2 x 2', cols: 2, rows: 2 },
  { id: '3x2', label: '3 x 2', cols: 3, rows: 2 },
  { id: '4x2', label: '4 x 2', cols: 4, rows: 2 },
  { id: '5x2', label: '5 x 2', cols: 5, rows: 2 },
  { id: '3x1', label: '3 x 1', cols: 3, rows: 1 },
];

export function createCells(template: GridTemplate, keywords: string[] = []): GridCellData[] {
  const cells: GridCellData[] = [];

  if (template.cellDefs) {
    template.cellDefs.forEach((def, idx) => {
      cells.push({
        id: `cell-${def.row}-${def.col}`,
        row: def.row,
        col: def.col,
        colSpan: def.colSpan ?? 1,
        rowSpan: def.rowSpan ?? 1,
        imageUrl: null,
        cropOffsetX: 0.5,
        cropOffsetY: 0.5,
        zoom: 1,
        keyword: keywords[idx] ?? '',
      });
    });
    return cells;
  }

  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.cols; c++) {
      cells.push({
        id: `cell-${r}-${c}`,
        row: r,
        col: c,
        colSpan: 1,
        rowSpan: 1,
        imageUrl: null,
        cropOffsetX: 0.5,
        cropOffsetY: 0.5,
        zoom: 1,
        keyword: keywords[idx] ?? '',
      });
      idx++;
    }
  }
  return cells;
}

/** Simple equal-size dimensions (kept for backward compat). */
export function cellDimensions(template: GridTemplate, gap: number) {
  const cellW = (OUTPUT_WIDTH - gap * (template.cols + 1)) / template.cols;
  const cellH = (OUTPUT_HEIGHT - gap * (template.rows + 1)) / template.rows;
  return { cellW, cellH };
}

/**
 * Returns the pixel rect {x, y, w, h} for a cell, respecting colWeights and col/row spans.
 */
export function cellRect(
  template: GridTemplate,
  gap: number,
  row: number,
  col: number,
  colSpan = 1,
  rowSpan = 1,
): { x: number; y: number; w: number; h: number } {
  // Row math
  const unitRowH = (OUTPUT_HEIGHT - gap * (template.rows + 1)) / template.rows;
  const y = gap + row * (unitRowH + gap);
  const h = unitRowH * rowSpan + gap * (rowSpan - 1);

  // Column math
  const totalGapW = gap * (template.cols + 1);
  const availW = OUTPUT_WIDTH - totalGapW;

  if (!template.colWeights || template.colWeights.length !== template.cols) {
    const unitColW = availW / template.cols;
    const x = gap + col * (unitColW + gap);
    const w = unitColW * colSpan + gap * (colSpan - 1);
    return { x, y, w, h };
  }

  const totalWeight = template.colWeights.reduce((a, b) => a + b, 0);
  let x = gap;
  for (let c = 0; c < col; c++) {
    x += (template.colWeights[c] / totalWeight) * availW + gap;
  }
  let w = 0;
  for (let c = col; c < col + colSpan; c++) {
    w += (template.colWeights[c] / totalWeight) * availW;
  }
  w += gap * (colSpan - 1);

  return { x, y, w, h };
}
