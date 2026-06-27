import Database from "better-sqlite3";
import path from "path";
import { encrypt, decrypt, isEncrypted } from "./crypto";

const DB_PATH =
  process.env.DATABASE_URL?.replace("file:", "") ||
  path.join(process.cwd(), "data", "imagegate.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const tempDb = new Database(DB_PATH);
    try {
      tempDb.pragma("journal_mode = WAL");
      tempDb.pragma("foreign_keys = ON");
      initSchema(tempDb);
      db = tempDb;
    } catch (error) {
      tempDb.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Database initialization failed (path: ${DB_PATH}): ${message}`,
      );
    }
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER,
      provider TEXT NOT NULL,
      model TEXT,
      prompt TEXT,
      parameters TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      duration_ms INTEGER,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id INTEGER UNIQUE NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      access_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      generation_id INTEGER,
      local_path TEXT,
      github_path TEXT,
      github_sha TEXT,
      repo_name TEXT,
      prompt TEXT,
      provider TEXT,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (generation_id) REFERENCES generation_records(id)
    );
  `);

  // Clean up records stuck in 'pending' for more than 10 minutes (e.g. from a crash)
  db.prepare(
    "UPDATE generation_records SET status = 'failed', error_message = 'Process interrupted' WHERE status = 'pending' AND created_at < datetime('now', '-10 minutes')",
  ).run();
}

// API Keys
export interface ApiKey {
  id: number;
  name: string;
  provider: string;
  api_key: string;
  is_active: number;
  created_at: string;
}

/**
 * Decrypt API key if it's encrypted
 */
function decryptApiKey(key: ApiKey): ApiKey {
  return {
    ...key,
    api_key: isEncrypted(key.api_key) ? decrypt(key.api_key) : key.api_key,
  };
}

export function getAllKeys(): ApiKey[] {
  const keys = getDb()
    .prepare("SELECT * FROM api_keys ORDER BY created_at DESC")
    .all() as ApiKey[];
  return keys.map(decryptApiKey);
}

export function getActiveKeyByProvider(provider: string): ApiKey | undefined {
  const key = getDb()
    .prepare(
      "SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 LIMIT 1",
    )
    .get(provider) as ApiKey | undefined;
  return key ? decryptApiKey(key) : undefined;
}

export function getKeyIdByProviderAndKey(
  provider: string,
  apiKey: string,
): number | null {
  // We need to check all keys for this provider and compare decrypted values
  const keys = getDb()
    .prepare("SELECT id, api_key FROM api_keys WHERE provider = ?")
    .all(provider) as { id: number; api_key: string }[];
  for (const key of keys) {
    const decrypted = isEncrypted(key.api_key)
      ? decrypt(key.api_key)
      : key.api_key;
    if (decrypted === apiKey) {
      return key.id;
    }
  }
  return null;
}

export function addKey(name: string, provider: string, apiKey: string): ApiKey {
  // Encrypt the API key before storing
  const encryptedKey = encrypt(apiKey);
  const result = getDb()
    .prepare("INSERT INTO api_keys (name, provider, api_key) VALUES (?, ?, ?)")
    .run(name, provider, encryptedKey);
  const key = getDb()
    .prepare("SELECT * FROM api_keys WHERE id = ?")
    .get(result.lastInsertRowid) as ApiKey;
  return decryptApiKey(key);
}

export function deleteKey(id: number): void {
  getDb().prepare("DELETE FROM api_keys WHERE id = ?").run(id);
}

export function toggleKey(id: number, isActive: boolean): void {
  getDb()
    .prepare("UPDATE api_keys SET is_active = ? WHERE id = ?")
    .run(isActive ? 1 : 0, id);
}

// Generation Records
export interface GenerationRecord {
  id: number;
  api_key_id: number | null;
  provider: string;
  model: string | null;
  prompt: string | null;
  parameters: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  image_url: string | null;
  created_at: string;
}

export interface RecordFilters {
  provider?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function getRecords(filters: RecordFilters = {}): {
  records: GenerationRecord[];
  total: number;
} {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.provider) {
    conditions.push("provider = ?");
    params.push(filters.provider);
  }
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (
    db
      .prepare(`SELECT COUNT(*) as count FROM generation_records ${where}`)
      .get(...params) as { count: number }
  ).count;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const records = db
    .prepare(
      `SELECT * FROM generation_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as GenerationRecord[];

  return { records, total };
}

export function addRecord(record: {
  api_key_id?: number | null;
  provider: string;
  model?: string | null;
  prompt?: string | null;
  parameters?: string | null;
  status: string;
  error_message?: string | null;
  duration_ms?: number | null;
  image_url?: string | null;
}): GenerationRecord {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO generation_records (api_key_id, provider, model, prompt, parameters, status, error_message, duration_ms, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      record.api_key_id ?? null,
      record.provider,
      record.model ?? null,
      record.prompt ?? null,
      record.parameters ?? null,
      record.status,
      record.error_message ?? null,
      record.duration_ms ?? null,
      record.image_url ?? null,
    );
  return db
    .prepare("SELECT * FROM generation_records WHERE id = ?")
    .get(result.lastInsertRowid) as GenerationRecord;
}

export function updateRecord(
  id: number,
  updates: Partial<
    Pick<
      GenerationRecord,
      "status" | "error_message" | "duration_ms" | "image_url"
    >
  >,
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.error_message !== undefined) {
    fields.push("error_message = ?");
    values.push(updates.error_message);
  }
  if (updates.duration_ms !== undefined) {
    fields.push("duration_ms = ?");
    values.push(updates.duration_ms);
  }
  if (updates.image_url !== undefined) {
    fields.push("image_url = ?");
    values.push(updates.image_url);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE generation_records SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values);
  }
}

// Stats
export interface Stats {
  totalGenerations: number;
  successCount: number;
  failCount: number;
  todayCount: number;
  avgDurationMs: number;
  providerStats: { provider: string; count: number }[];
}

export function getStats(): Stats {
  const db = getDb();
  const total = (
    db.prepare("SELECT COUNT(*) as count FROM generation_records").get() as {
      count: number;
    }
  ).count;
  const success = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM generation_records WHERE status = 'success'",
      )
      .get() as { count: number }
  ).count;
  const fail = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM generation_records WHERE status = 'failed'",
      )
      .get() as { count: number }
  ).count;
  const today = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM generation_records WHERE date(created_at) = date('now')",
      )
      .get() as { count: number }
  ).count;
  const avgDuration =
    (
      db
        .prepare(
          "SELECT AVG(duration_ms) as avg FROM generation_records WHERE status = 'success'",
        )
        .get() as { avg: number | null }
    ).avg || 0;
  const providerStats = db
    .prepare(
      "SELECT provider, COUNT(*) as count FROM generation_records GROUP BY provider ORDER BY count DESC",
    )
    .all() as { provider: string; count: number }[];

  return {
    totalGenerations: total,
    successCount: success,
    failCount: fail,
    todayCount: today,
    avgDurationMs: Math.round(avgDuration),
    providerStats,
  };
}

// Settings
const ENCRYPTED_SETTINGS_KEYS = [
  "openai_api_key",
  "anthropic_api_key",
];

/**
 * Check if a setting key should be encrypted
 */
function shouldEncrypt(key: string): boolean {
  return ENCRYPTED_SETTINGS_KEYS.includes(key);
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  if (!row?.value) return null;

  // Decrypt if needed
  if (shouldEncrypt(key) && isEncrypted(row.value)) {
    return decrypt(row.value);
  }

  return row.value;
}

export function setSetting(key: string, value: string): void {
  // Encrypt API keys before storing
  const valueToStore = shouldEncrypt(key) ? encrypt(value) : value;
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, valueToStore);
}
