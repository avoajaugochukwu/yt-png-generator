import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;
let _migrated = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function ensureMigrated(client: Client) {
  if (_migrated) return;
  await client.batch([
    `CREATE TABLE IF NOT EXISTS gridder_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      user_name TEXT,
      user_email TEXT,
      keywords TEXT NOT NULL DEFAULT '[]',
      template_cols INTEGER NOT NULL,
      template_rows INTEGER NOT NULL,
      col_weights TEXT,
      cell_count INTEGER NOT NULL,
      gap INTEGER NOT NULL DEFAULT 8,
      border_radius INTEGER NOT NULL DEFAULT 0,
      background_color TEXT NOT NULL DEFAULT '#000000',
      thumbnail TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS gridder_history_cells (
      id TEXT PRIMARY KEY,
      history_id TEXT NOT NULL REFERENCES gridder_history(id) ON DELETE CASCADE,
      cell_row INTEGER NOT NULL,
      cell_col INTEGER NOT NULL,
      col_span INTEGER NOT NULL DEFAULT 1,
      row_span INTEGER NOT NULL DEFAULT 1,
      image_base64 TEXT NOT NULL,
      crop_offset_x REAL NOT NULL DEFAULT 0.5,
      crop_offset_y REAL NOT NULL DEFAULT 0.5,
      zoom REAL NOT NULL DEFAULT 1
    )`,
    // Clean up entries older than 7 days
    `DELETE FROM gridder_history WHERE date < datetime('now', '-7 days')`,
  ], 'write');
  _migrated = true;
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  await ensureMigrated(client);
  return client;
}
