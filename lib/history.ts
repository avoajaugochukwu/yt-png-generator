import { getDb } from './db';

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

export async function readHistory(): Promise<HistoryEntry[]> {
  const db = await getDb();
  console.log('[history] readHistory start');
  const result = await db.execute('SELECT * FROM gridder_history ORDER BY date DESC LIMIT 200');
  const entries = result.rows.map((row) => ({
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
  console.log(`[history] readHistory done, ${entries.length} entries`);
  return entries;
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  console.log('[history] appendHistory start, title:', entry.title);
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
  console.log('[history] appendHistory done');
}
