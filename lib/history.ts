import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/data';
const HISTORY_FILE = path.join(DATA_DIR, 'gridder-history.json');
const MAX_ENTRIES = 200;

export interface HistoryEntry {
  id: string;
  date: string; // ISO string
  user: {
    name: string | null;
    email: string | null;
  };
  template: { cols: number; rows: number };
  cellCount: number;
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  /** Small base64 thumbnail for preview */
  thumbnail: string | null;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await ensureDir();
  const history = await readHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history), 'utf-8');
}
