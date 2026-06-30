/**
 * Database layer — sql.js (pure WASM SQLite) implementation.
 *
 * Replaces better-sqlite3 to avoid native compilation issues.
 * Provides a compatible API so consuming code doesn't need changes.
 *
 * Key differences from better-sqlite3:
 * - sql.js operates on in-memory WASM; must explicitly load/save to disk
 * - No direct file-path opening; reads Uint8Array, writes via fs.writeFileSync
 * - WAL mode not supported (in-memory); uses DELETE journal mode instead
 * - Save-to-disk happens after every write operation for data safety
 */

import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import type { Statement as SqlJsStatement, BindParams, SqlValue } from "sql.js";
import path from "path";
import fs from "fs";
import { encrypt, decrypt, isEncrypted } from "./crypto";

const DB_PATH =
  process.env.DATABASE_URL?.replace("file:", "") ||
  path.join(process.cwd(), "data", "imagegate.db");

let dbInstance: CompatibleDatabase | null = null;
let initPromise: Promise<CompatibleDatabase> | null = null;

// ---------------------------------------------------------------------------
// Compatibility layer — mimics better-sqlite3's prepare().run/get/all API
// ---------------------------------------------------------------------------

interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

class CompatibleStatement {
  private stmt: SqlJsStatement;

  constructor(stmt: SqlJsStatement) {
    this.stmt = stmt;
  }

  run(...params: unknown[]): RunResult {
    this.stmt.bind(params as BindParams);
    this.stmt.step();
    const lastInsertRowid = (this.stmt as unknown as { lastInsertRowid: number }).lastInsertRowid ?? 0;
    const changes = (this.stmt as unknown as { changes: number }).changes ?? 0;
    this.stmt.free();
    return { lastInsertRowid, changes };
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    this.stmt.bind(params as BindParams);
    const hasRow = this.stmt.step();
    if (!hasRow) {
      this.stmt.free();
      return undefined;
    }
    const row = this.stmt.getAsObject();
    this.stmt.free();
    return row;
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    this.stmt.bind(params as BindParams);
    const rows: Record<string, unknown>[] = [];
    while (this.stmt.step()) {
      rows.push(this.stmt.getAsObject());
    }
    this.stmt.free();
    return rows;
  }
}

class CompatibleDatabase {
  private db: SqlJsDatabase;

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  prepare(sql: string): CompatibleStatement {
    const stmt = this.db.prepare(sql);
    return new CompatibleStatement(stmt);
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.saveToDisk();
  }

  pragma(str: string): void {
    // sql.js doesn't have .pragma(); use exec instead
    this.db.exec(`PRAGMA ${str}`);
  }

  close(): void {
    this.saveToDisk();
    this.db.close();
  }

  /** Save in-memory database to disk file. */
  saveToDisk(): void {
    try {
      const data = this.db.export();
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, data);
    } catch (err) {
      console.error("Failed to save database to disk:", err);
    }
  }

  /** Raw sql.js database access (for advanced use). */
  getRawDb(): SqlJsDatabase {
    return this.db;
  }
}

// ---------------------------------------------------------------------------
// Database initialization
// ---------------------------------------------------------------------------

export type Database = CompatibleDatabase;

/**
 * Get or initialize the database.
 * Since sql.js requires async WASM loading, this is now async.
 * All consuming code needs to await this before using the database.
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Load sql.js WASM module — locateFile tells sql.js where to find the .wasm binary.
    // On server side we use the absolute path in node_modules; on client side it's served from /public/.
    const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        // For the WASM binary, use the absolute filesystem path (server-side)
        if (file.endsWith(".wasm")) {
          // If node_modules wasm exists, use it; otherwise fallback to public dir
          if (fs.existsSync(wasmPath)) {
            return wasmPath;
          }
          // Fallback: read from public/ and return as a data URL (won't work server-side)
          // This shouldn't happen in production, but serves as safety net
          return path.join(process.cwd(), "public", file);
        }
        // For JS files, let sql.js use its default resolution
        return file;
      },
    });

    // Try to load existing database file
    let buffer: Uint8Array | null = null;
    if (fs.existsSync(DB_PATH)) {
      buffer = fs.readFileSync(DB_PATH) as Uint8Array;
    }

    const sqlDb = buffer ? new SQL.Database(buffer) : new SQL.Database();

    const compatDb = new CompatibleDatabase(sqlDb);

    // Apply pragmas (no WAL in sql.js, use DELETE journal mode)
    compatDb.pragma("journal_mode = DELETE");
    compatDb.pragma("foreign_keys = ON");

    // Initialize schema
    initSchema(compatDb);

    // Save initial state to disk
    compatDb.saveToDisk();

    // Ensure database is saved on process exit
    process.on("beforeExit", () => {
      if (dbInstance) {
        dbInstance.saveToDisk();
      }
    });

    dbInstance = compatDb;
    return compatDb;
  })();

  return initPromise;
}

function initSchema(db: Database) {
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

  // Clean up records stuck in 'pending' for more than 10 minutes
  db.prepare(
    "UPDATE generation_records SET status = 'failed', error_message = 'Process interrupted' WHERE status = 'pending' AND created_at < datetime('now', '-10 minutes')",
  ).run();
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: number;
  name: string;
  provider: string;
  api_key: string;
  is_active: number;
  created_at: string;
}

function decryptApiKey(key: ApiKey): ApiKey {
  return {
    ...key,
    api_key: isEncrypted(key.api_key) ? decrypt(key.api_key) : key.api_key,
  };
}

export async function getAllKeys(): Promise<ApiKey[]> {
  const db = await getDb();
  const keys = db
    .prepare("SELECT * FROM api_keys ORDER BY created_at DESC")
    .all() as unknown as ApiKey[];
  db.saveToDisk();
  return keys.map(decryptApiKey);
}

export async function getActiveKeyByProvider(provider: string): Promise<ApiKey | undefined> {
  const db = await getDb();
  const key = db
    .prepare("SELECT * FROM api_keys WHERE provider = ? AND is_active = 1 LIMIT 1")
    .get(provider) as unknown as ApiKey | undefined;
  return key ? decryptApiKey(key) : undefined;
}

export async function getKeyIdByProviderAndKey(
  provider: string,
  apiKey: string,
): Promise<number | null> {
  const db = await getDb();
  const keys = db
    .prepare("SELECT id, api_key FROM api_keys WHERE provider = ?")
    .all(provider) as unknown as { id: number; api_key: string }[];
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

export async function addKey(name: string, provider: string, apiKey: string): Promise<ApiKey> {
  const db = await getDb();
  const encryptedKey = encrypt(apiKey);
  const result = db
    .prepare("INSERT INTO api_keys (name, provider, api_key) VALUES (?, ?, ?)")
    .run(name, provider, encryptedKey);
  const key = db
    .prepare("SELECT * FROM api_keys WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as ApiKey;
  db.saveToDisk();
  return decryptApiKey(key);
}

export async function deleteKey(id: number): Promise<void> {
  const db = await getDb();
  db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);
  db.saveToDisk();
}

export async function toggleKey(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  db
    .prepare("UPDATE api_keys SET is_active = ? WHERE id = ?")
    .run(isActive ? 1 : 0, id);
  db.saveToDisk();
}

// ---------------------------------------------------------------------------
// Generation Records
// ---------------------------------------------------------------------------

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

export async function getRecords(filters: RecordFilters = {}): Promise<{
  records: GenerationRecord[];
  total: number;
}> {
  const db = await getDb();
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
      .get(...params) as unknown as { count: number }
  ).count;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const records = db
    .prepare(
      `SELECT * FROM generation_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as unknown as GenerationRecord[];

  return { records, total };
}

export async function addRecord(record: {
  api_key_id?: number | null;
  provider: string;
  model?: string | null;
  prompt?: string | null;
  parameters?: string | null;
  status: string;
  error_message?: string | null;
  duration_ms?: number | null;
  image_url?: string | null;
}): Promise<GenerationRecord> {
  const db = await getDb();
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
  const inserted = db
    .prepare("SELECT * FROM generation_records WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as GenerationRecord;
  db.saveToDisk();
  return inserted;
}

export async function updateRecord(
  id: number,
  updates: Partial<
    Pick<
      GenerationRecord,
      "status" | "error_message" | "duration_ms" | "image_url"
    >
  >,
): Promise<void> {
  const db = await getDb();
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
    db.saveToDisk();
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface Stats {
  totalGenerations: number;
  successCount: number;
  failCount: number;
  todayCount: number;
  avgDurationMs: number;
  providerStats: { provider: string; count: number }[];
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const total = (
    db.prepare("SELECT COUNT(*) as count FROM generation_records").get() as {
      count: number;
    }
  ).count;
  const success = (
    db
      .prepare("SELECT COUNT(*) as count FROM generation_records WHERE status = 'success'")
      .get() as unknown as { count: number }
  ).count;
  const fail = (
    db
      .prepare("SELECT COUNT(*) as count FROM generation_records WHERE status = 'failed'")
      .get() as unknown as { count: number }
  ).count;
  const today = (
    db
      .prepare("SELECT COUNT(*) as count FROM generation_records WHERE date(created_at) = date('now')")
      .get() as unknown as { count: number }
  ).count;
  const avgDuration =
    (
      db
        .prepare("SELECT AVG(duration_ms) as avg FROM generation_records WHERE status = 'success'")
        .get() as unknown as { avg: number | null }
    ).avg || 0;
  const providerStats = db
    .prepare(
      "SELECT provider, COUNT(*) as count FROM generation_records GROUP BY provider ORDER BY count DESC",
    )
    .all() as unknown as { provider: string; count: number }[];

  return {
    totalGenerations: total,
    successCount: success,
    failCount: fail,
    todayCount: today,
    avgDurationMs: Math.round(avgDuration),
    providerStats,
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const ENCRYPTED_SETTINGS_KEYS = [
  "openai_api_key",
  "anthropic_api_key",
];

function shouldEncrypt(key: string): boolean {
  return ENCRYPTED_SETTINGS_KEYS.includes(key);
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as unknown as { value: string } | undefined;
  if (!row?.value) return null;

  if (shouldEncrypt(key) && isEncrypted(row.value)) {
    return decrypt(row.value);
  }

  return row.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  const valueToStore = shouldEncrypt(key) ? encrypt(value) : value;
  db
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, valueToStore);
  db.saveToDisk();
}
