import { getDb } from './db';

export interface HistoryCellData {
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  imageBase64: string;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  user: {
    name: string | null;
    email: string | null;
  };
  keywords: string[];
  template: { cols: number; rows: number; colWeights?: number[] };
  cellCount: number;
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  thumbnail: string | null;
}

export interface HistoryEntryWithCells extends HistoryEntry {
  cells: HistoryCellData[];
}

export async function readHistory(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const result = await db.execute('SELECT * FROM gridder_history ORDER BY date DESC LIMIT 200');
  return result.rows.map((row) => ({
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    user: {
      name: (row.user_name as string) || null,
      email: (row.user_email as string) || null,
    },
    keywords: JSON.parse((row.keywords as string) || '[]'),
    template: {
      cols: row.template_cols as number,
      rows: row.template_rows as number,
      colWeights: row.col_weights ? JSON.parse(row.col_weights as string) : undefined,
    },
    cellCount: row.cell_count as number,
    gap: row.gap as number,
    borderRadius: row.border_radius as number,
    backgroundColor: row.background_color as string,
    thumbnail: (row.thumbnail as string) || null,
  }));
}

export async function readHistoryEntry(id: string): Promise<HistoryEntryWithCells | null> {
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM gridder_history WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const cellsResult = await db.execute({
    sql: 'SELECT * FROM gridder_history_cells WHERE history_id = ? ORDER BY cell_row, cell_col',
    args: [id],
  });

  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    user: {
      name: (row.user_name as string) || null,
      email: (row.user_email as string) || null,
    },
    keywords: JSON.parse((row.keywords as string) || '[]'),
    template: {
      cols: row.template_cols as number,
      rows: row.template_rows as number,
      colWeights: row.col_weights ? JSON.parse(row.col_weights as string) : undefined,
    },
    cellCount: row.cell_count as number,
    gap: row.gap as number,
    borderRadius: row.border_radius as number,
    backgroundColor: row.background_color as string,
    thumbnail: (row.thumbnail as string) || null,
    cells: cellsResult.rows.map((c) => ({
      row: c.cell_row as number,
      col: c.cell_col as number,
      colSpan: c.col_span as number,
      rowSpan: c.row_span as number,
      imageBase64: c.image_base64 as string,
      cropOffsetX: c.crop_offset_x as number,
      cropOffsetY: c.crop_offset_y as number,
      zoom: c.zoom as number,
    })),
  };
}

export async function appendHistory(entry: HistoryEntry, cells: HistoryCellData[]): Promise<void> {
  const db = await getDb();
  console.log('[history] appendHistory start, title:', entry.title, 'cells:', cells.length);

  await db.execute({
    sql: `INSERT INTO gridder_history (id, date, title, user_name, user_email, keywords, template_cols, template_rows, col_weights, cell_count, gap, border_radius, background_color, thumbnail)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.id,
      entry.date,
      entry.title,
      entry.user.name,
      entry.user.email,
      JSON.stringify(entry.keywords),
      entry.template.cols,
      entry.template.rows,
      entry.template.colWeights ? JSON.stringify(entry.template.colWeights) : null,
      entry.cellCount,
      entry.gap,
      entry.borderRadius,
      entry.backgroundColor,
      entry.thumbnail,
    ],
  });

  // Save cell images
  for (const cell of cells) {
    await db.execute({
      sql: `INSERT INTO gridder_history_cells (id, history_id, cell_row, cell_col, col_span, row_span, image_base64, crop_offset_x, crop_offset_y, zoom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        entry.id,
        cell.row,
        cell.col,
        cell.colSpan,
        cell.rowSpan,
        cell.imageBase64,
        cell.cropOffsetX,
        cell.cropOffsetY,
        cell.zoom,
      ],
    });
  }

  console.log('[history] appendHistory done');
}
