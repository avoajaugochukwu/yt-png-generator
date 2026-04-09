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
  await client.execute(`
    CREATE TABLE IF NOT EXISTS gridder_history (
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
    )
  `);
  _migrated = true;
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  await ensureMigrated(client);
  return client;
}
