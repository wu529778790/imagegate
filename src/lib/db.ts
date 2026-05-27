import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || path.join(process.cwd(), "data", "baoyuimages.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      initSchema();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Database initialization failed (path: ${DB_PATH}): ${message}`);
    }
  }
  return db;
}

function initSchema() {
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
  `);
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

export function getAllKeys(): ApiKey[] {
  return getDb().prepare("SELECT * FROM api_keys ORDER BY created_at DESC").all() as ApiKey[];
}

export function getActiveKeyByProvider(provider: string): ApiKey | undefined {
  return getDb().prepare("SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 LIMIT 1").get(provider) as ApiKey | undefined;
}

export function addKey(name: string, provider: string, apiKey: string): ApiKey {
  const result = getDb().prepare("INSERT INTO api_keys (name, provider, api_key) VALUES (?, ?, ?)").run(name, provider, apiKey);
  return getDb().prepare("SELECT * FROM api_keys WHERE id = ?").get(result.lastInsertRowid) as ApiKey;
}

export function deleteKey(id: number): void {
  getDb().prepare("DELETE FROM api_keys WHERE id = ?").run(id);
}

export function toggleKey(id: number, isActive: boolean): void {
  getDb().prepare("UPDATE api_keys SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);
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

export function getRecords(filters: RecordFilters = {}): { records: GenerationRecord[]; total: number } {
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as count FROM generation_records ${where}`).get(...params) as { count: number }).count;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const records = db.prepare(`SELECT * FROM generation_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as GenerationRecord[];

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
  const result = db.prepare(
    "INSERT INTO generation_records (api_key_id, provider, model, prompt, parameters, status, error_message, duration_ms, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(record.api_key_id ?? null, record.provider, record.model ?? null, record.prompt ?? null, record.parameters ?? null, record.status, record.error_message ?? null, record.duration_ms ?? null, record.image_url ?? null);
  return db.prepare("SELECT * FROM generation_records WHERE id = ?").get(result.lastInsertRowid) as GenerationRecord;
}

export function updateRecord(id: number, updates: Partial<Pick<GenerationRecord, "status" | "error_message" | "duration_ms" | "image_url">>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.error_message !== undefined) { fields.push("error_message = ?"); values.push(updates.error_message); }
  if (updates.duration_ms !== undefined) { fields.push("duration_ms = ?"); values.push(updates.duration_ms); }
  if (updates.image_url !== undefined) { fields.push("image_url = ?"); values.push(updates.image_url); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE generation_records SET ${fields.join(", ")} WHERE id = ?`).run(...values);
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
  const total = (db.prepare("SELECT COUNT(*) as count FROM generation_records").get() as { count: number }).count;
  const success = (db.prepare("SELECT COUNT(*) as count FROM generation_records WHERE status = 'success'").get() as { count: number }).count;
  const fail = (db.prepare("SELECT COUNT(*) as count FROM generation_records WHERE status = 'failed'").get() as { count: number }).count;
  const today = (db.prepare("SELECT COUNT(*) as count FROM generation_records WHERE date(created_at) = date('now')").get() as { count: number }).count;
  const avgDuration = (db.prepare("SELECT AVG(duration_ms) as avg FROM generation_records WHERE status = 'success'").get() as { avg: number | null }).avg || 0;
  const providerStats = db.prepare("SELECT provider, COUNT(*) as count FROM generation_records GROUP BY provider ORDER BY count DESC").all() as { provider: string; count: number }[];

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
export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
