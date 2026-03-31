import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/job-watcher.db');

let db: Database.Database | null = null;

export function initDb(): Database.Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS seen_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      url TEXT,
      source TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notified_notion BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS page_hashes (
      url TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_seen_hash ON seen_offers(hash);
    CREATE INDEX IF NOT EXISTS idx_seen_date ON seen_offers(first_seen_at);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    return initDb();
  }
  return db;
}

export function isOfferSeen(hash: string, windowDays: number): boolean {
  const row = getDb().prepare(
    `SELECT 1 FROM seen_offers WHERE hash = ? AND first_seen_at > datetime('now', ?)`,
  ).get(hash, `-${windowDays} days`);
  return row !== undefined;
}

export function insertOffer(offer: {
  hash: string;
  title: string;
  company: string | null;
  url: string;
  source: string;
  score: number;
}): void {
  getDb().prepare(
    `INSERT OR IGNORE INTO seen_offers (hash, title, company, url, source, score) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(offer.hash, offer.title, offer.company, offer.url, offer.source, offer.score);
}

export function markNotifiedNotion(hash: string): void {
  getDb().prepare(
    `UPDATE seen_offers SET notified_notion = 1 WHERE hash = ?`,
  ).run(hash);
}

export function isNotifiedNotion(hash: string): boolean {
  const row = getDb().prepare(
    `SELECT 1 FROM seen_offers WHERE hash = ? AND notified_notion = 1`,
  ).get(hash);
  return row !== undefined;
}

export function getPageHash(url: string): string | undefined {
  const row = getDb().prepare(
    `SELECT content_hash FROM page_hashes WHERE url = ?`,
  ).get(url) as { content_hash: string } | undefined;
  return row?.content_hash;
}

export function updatePageHash(url: string, hash: string): void {
  getDb().prepare(
    `INSERT INTO page_hashes (url, content_hash, last_checked_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(url) DO UPDATE SET content_hash = ?, last_checked_at = datetime('now')`,
  ).run(url, hash, hash);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
