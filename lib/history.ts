import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/data';
const HISTORY_FILE = path.join(DATA_DIR, 'gridder-history.json');
const MAX_ENTRIES = 200;

export interface HistoryEntry {
  id: string;
  date: string; // ISO string
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
  /** Small base64 thumbnail for preview */
  thumbnail: string | null;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function checkDataDir() {
  try {
    const stat = await fs.stat(DATA_DIR);
    console.log(`[history] DATA_DIR="${DATA_DIR}" exists=${true} isDir=${stat.isDirectory()}`);
  } catch {
    console.log(`[history] DATA_DIR="${DATA_DIR}" exists=false`);
  }
  try {
    const stat = await fs.stat(HISTORY_FILE);
    console.log(`[history] HISTORY_FILE="${HISTORY_FILE}" exists=${true} size=${stat.size}`);
  } catch {
    console.log(`[history] HISTORY_FILE="${HISTORY_FILE}" exists=false`);
  }
}

export async function readHistory(): Promise<HistoryEntry[]> {
  console.log('[history] readHistory start');
  await checkDataDir();
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf-8');
    const entries = JSON.parse(raw);
    console.log(`[history] readHistory done, ${entries.length} entries`);
    return entries;
  } catch (err) {
    console.log('[history] readHistory no file or parse error:', err);
    return [];
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  console.log('[history] appendHistory start, title:', entry.title);
  await checkDataDir();
  await ensureDir();
  console.log('[history] ensureDir done');
  const history = await readHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history), 'utf-8');
  console.log(`[history] appendHistory done, wrote ${history.length} entries`);
  await checkDataDir();
}
