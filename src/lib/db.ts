import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import type { PublicUser, Settings, SheetData, UserRow } from "./types";
import { defaultSheets } from "./seed-sheets";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let db: Database.Database | null = null;

function ensureDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spreadsheet (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      whatsapp TEXT NOT NULL DEFAULT '',
      wechat TEXT NOT NULL DEFAULT '',
      whatsapp_qr TEXT NOT NULL DEFAULT '',
      wechat_qr TEXT NOT NULL DEFAULT ''
    );
  `);

  // Migrate older DBs that lack QR columns
  const cols = db
    .prepare("PRAGMA table_info(settings)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("whatsapp_qr")) {
    db.exec(
      "ALTER TABLE settings ADD COLUMN whatsapp_qr TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!names.has("wechat_qr")) {
    db.exec(
      "ALTER TABLE settings ADD COLUMN wechat_qr TEXT NOT NULL DEFAULT ''"
    );
  }

  seedIfNeeded(db);
  return db;
}

function seedIfNeeded(database: Database.Database) {
  const userCount = database.prepare("SELECT COUNT(*) AS c FROM users").get() as {
    c: number;
  };
  if (userCount.c === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    database
      .prepare(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
      )
      .run(crypto.randomUUID(), "admin", hash, new Date().toISOString());
  }

  const sheet = database
    .prepare("SELECT id FROM spreadsheet WHERE id = ?")
    .get("default");
  if (!sheet) {
    database
      .prepare(
        "INSERT INTO spreadsheet (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?)"
      )
      .run(
        "default",
        JSON.stringify(defaultSheets),
        new Date().toISOString(),
        null
      );
  }

  const settings = database
    .prepare("SELECT id FROM settings WHERE id = ?")
    .get("default");
  if (!settings) {
    database
      .prepare(
        "INSERT INTO settings (id, whatsapp, wechat, whatsapp_qr, wechat_qr) VALUES (?, ?, ?, ?, ?)"
      )
      .run("default", "", "", "", "");
  }
}

export function getUserByUsername(username: string): UserRow | undefined {
  return ensureDb()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return ensureDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
}

export function listUsers(): PublicUser[] {
  const rows = ensureDb()
    .prepare(
      "SELECT id, username, created_at FROM users ORDER BY created_at ASC"
    )
    .all() as Array<{ id: string; username: string; created_at: string }>;
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    createdAt: r.created_at,
  }));
}

export function createUser(username: string, password: string): PublicUser {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);
  ensureDb()
    .prepare(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(id, username, passwordHash, createdAt);
  return { id, username, createdAt };
}

export function updateUserPassword(id: string, password: string): boolean {
  const result = ensureDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(bcrypt.hashSync(password, 10), id);
  return result.changes > 0;
}

export function deleteUser(id: string): { ok: boolean; error?: string } {
  const count = (
    ensureDb().prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }
  ).c;
  if (count <= 1) {
    return { ok: false, error: "Cannot delete the last admin" };
  }
  const result = ensureDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) {
    return { ok: false, error: "User not found" };
  }
  return { ok: true };
}

export function getSpreadsheet(): {
  data: SheetData[];
  updatedAt: string;
  updatedBy: string | null;
} {
  const row = ensureDb()
    .prepare(
      "SELECT data, updated_at, updated_by FROM spreadsheet WHERE id = ?"
    )
    .get("default") as
    | { data: string; updated_at: string; updated_by: string | null }
    | undefined;

  if (!row) {
    return { data: defaultSheets, updatedAt: new Date().toISOString(), updatedBy: null };
  }
  return {
    data: JSON.parse(row.data) as SheetData[],
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function saveSpreadsheet(data: SheetData[], updatedBy: string | null) {
  ensureDb()
    .prepare(
      "UPDATE spreadsheet SET data = ?, updated_at = ?, updated_by = ? WHERE id = ?"
    )
    .run(JSON.stringify(data), new Date().toISOString(), updatedBy, "default");
}

export function getSettings(): Settings {
  const row = ensureDb()
    .prepare(
      "SELECT whatsapp, wechat, whatsapp_qr, wechat_qr FROM settings WHERE id = ?"
    )
    .get("default") as
    | {
        whatsapp: string;
        wechat: string;
        whatsapp_qr: string;
        wechat_qr: string;
      }
    | undefined;
  return {
    whatsapp: row?.whatsapp ?? "",
    wechat: row?.wechat ?? "",
    whatsappQr: row?.whatsapp_qr ?? "",
    wechatQr: row?.wechat_qr ?? "",
  };
}

export function updateSettings(settings: Partial<Settings>): Settings {
  const current = getSettings();
  const next = {
    whatsapp: settings.whatsapp ?? current.whatsapp,
    wechat: settings.wechat ?? current.wechat,
    whatsappQr: settings.whatsappQr ?? current.whatsappQr,
    wechatQr: settings.wechatQr ?? current.wechatQr,
  };
  ensureDb()
    .prepare(
      "UPDATE settings SET whatsapp = ?, wechat = ?, whatsapp_qr = ?, wechat_qr = ? WHERE id = ?"
    )
    .run(
      next.whatsapp,
      next.wechat,
      next.whatsappQr,
      next.wechatQr,
      "default"
    );
  return next;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}
