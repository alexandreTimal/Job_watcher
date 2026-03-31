import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const DB_PATH = resolve(process.cwd(), '../data/job-watcher.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export interface DbOffer {
  id: number;
  hash: string;
  title: string;
  company: string | null;
  url: string | null;
  source: string;
  score: number;
  first_seen_at: string;
  notified_notion: number;
}

export function getStats() {
  const d = getDb();
  const totalOffers = (d.prepare('SELECT COUNT(*) as count FROM seen_offers').get() as { count: number }).count;

  const offersBySource = d.prepare(
    'SELECT source, COUNT(*) as count FROM seen_offers GROUP BY source ORDER BY count DESC',
  ).all() as Array<{ source: string; count: number }>;

  const todayOffers = (d.prepare(
    "SELECT COUNT(*) as count FROM seen_offers WHERE first_seen_at >= date('now', 'start of day')",
  ).get() as { count: number }).count;

  const offersByPriority = {
    high: (d.prepare('SELECT COUNT(*) as count FROM seen_offers WHERE score >= 7').get() as { count: number }).count,
    medium: (d.prepare('SELECT COUNT(*) as count FROM seen_offers WHERE score >= 4 AND score < 7').get() as { count: number }).count,
    low: (d.prepare('SELECT COUNT(*) as count FROM seen_offers WHERE score >= 1 AND score < 4').get() as { count: number }).count,
  };

  return { totalOffers, offersBySource, todayOffers, offersByPriority };
}

export function getOffers(params: {
  source?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  const d = getDb();
  const { source, minScore, maxScore, page = 1, limit = 20, sort = 'first_seen_at', order = 'desc' } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (source) {
    conditions.push('source = ?');
    values.push(source);
  }
  if (minScore !== undefined) {
    conditions.push('score >= ?');
    values.push(minScore);
  }
  if (maxScore !== undefined) {
    conditions.push('score <= ?');
    values.push(maxScore);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSorts = ['first_seen_at', 'score', 'title', 'company', 'source'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'first_seen_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const total = (d.prepare(`SELECT COUNT(*) as count FROM seen_offers ${where}`).get(...values) as { count: number }).count;
  const offset = (page - 1) * limit;

  const offers = d.prepare(
    `SELECT * FROM seen_offers ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`,
  ).all(...values, limit, offset) as DbOffer[];

  return {
    offers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export function getSources(): string[] {
  const d = getDb();
  return (d.prepare('SELECT DISTINCT source FROM seen_offers ORDER BY source').all() as Array<{ source: string }>).map(r => r.source);
}
