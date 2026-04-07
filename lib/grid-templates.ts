import type { GridTemplate, GridCellData } from './types';

export const OUTPUT_WIDTH = 1920;
export const OUTPUT_HEIGHT = 1080;

export const BUILT_IN_TEMPLATES: GridTemplate[] = [
  { id: '2x1', label: '2 x 1', cols: 2, rows: 1 },
  { id: '2x2', label: '2 x 2', cols: 2, rows: 2 },
  { id: '3x2', label: '3 x 2', cols: 3, rows: 2 },
  { id: '4x2', label: '4 x 2', cols: 4, rows: 2 },
  { id: '5x2', label: '5 x 2', cols: 5, rows: 2 },
  { id: '3x1', label: '3 x 1', cols: 3, rows: 1 },
];

export function createCells(template: GridTemplate, keywords: string[] = []): GridCellData[] {
  const cells: GridCellData[] = [];
  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.cols; c++) {
      cells.push({
        id: `cell-${r}-${c}`,
        row: r,
        col: c,
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

export function cellDimensions(template: GridTemplate, gap: number) {
  const cellW = (OUTPUT_WIDTH - gap * (template.cols + 1)) / template.cols;
  const cellH = (OUTPUT_HEIGHT - gap * (template.rows + 1)) / template.rows;
  return { cellW, cellH };
}
