import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (error) {
    // Debug info for path resolution
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, '../data/job-watcher.db'),
      resolve(cwd, 'data/job-watcher.db'),
      resolve(cwd, '../../data/job-watcher.db'),
    ];
    const debug = {
      error: 'Database not found.',
      cwd,
      candidates: candidates.map((p) => ({ path: p, exists: existsSync(p) })),
      originalError: error instanceof Error ? error.message : String(error),
    };
    return NextResponse.json(debug, { status: 500 });
  }
}
