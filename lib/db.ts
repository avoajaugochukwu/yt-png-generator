import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Run migrations on first import
const migrated = db.execute(`
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

export { db, migrated };
