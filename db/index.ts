import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const client = openDatabaseSync("expense-tracker.db");

// Bootstrap schema on first open (v1 — no drizzle-kit migrations yet).
// Future schema changes: add ALTER TABLE statements here with IF NOT EXISTS guards.
client.execSync(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    capture_method TEXT NOT NULL,
    receipt_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    budget_food REAL,
    budget_transport REAL,
    budget_entertainment REAL,
    budget_shopping REAL,
    budget_bills REAL,
    budget_other REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export const db = drizzle(client, { schema });
