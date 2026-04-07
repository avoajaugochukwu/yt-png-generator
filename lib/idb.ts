const DB_NAME = 'videoassetforge';
const DB_VERSION = 2;
const STORE_NAME = 'current';
const SESSION_KEY = 'current-session';

export interface CurrentSession {
  scriptText: string;
  elements: unknown[] | null;
  timeline: unknown[] | null;
  zipBase64: string | null;
  customization: {
    textColor: string;
    backgroundColor: string;
    barColor: string;
    fontFamily: string;
  };
  customInstructions: string;
  step: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Remove old sessions store if it exists
      if (db.objectStoreNames.contains('sessions')) {
        db.deleteObjectStore('sessions');
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCurrentSession(session: CurrentSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(session, SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCurrentSession(): Promise<CurrentSession | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(SESSION_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearCurrentSession(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Shared Analysis (bridges PNG generator → Gridder) ──

const SHARED_ANALYSIS_KEY = 'shared-analysis';

export interface SharedAnalysis {
  elements: { id: string; type: string; text: string; timestamp?: number; timestampEnd?: number }[];
  scriptText: string;
  savedAt: string;
}

export async function saveSharedAnalysis(analysis: SharedAnalysis): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(analysis, SHARED_ANALYSIS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSharedAnalysis(): Promise<SharedAnalysis | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(SHARED_ANALYSIS_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Gridder Session ──

const GRIDDER_SESSION_KEY = 'gridder-session';

export interface GridderSession {
  gridderState: unknown;
  step: string;
  analysisKeywords: string[];
}

export async function saveGridderSession(session: GridderSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(session, GRIDDER_SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getGridderSession(): Promise<GridderSession | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(GRIDDER_SESSION_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearGridderSession(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(GRIDDER_SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
