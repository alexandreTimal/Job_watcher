import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getOffers, getSources } from '@/lib/db';

function safeInt(value: string | null, fallback: number, min = 0, max = 1000): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const orderRaw = searchParams.get('order');
    const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

    const params = {
      source: searchParams.get('source') || undefined,
      minScore: searchParams.get('minScore') ? safeInt(searchParams.get('minScore'), 0, -10, 100) : undefined,
      maxScore: searchParams.get('maxScore') ? safeInt(searchParams.get('maxScore'), 100, -10, 100) : undefined,
      page: safeInt(searchParams.get('page'), 1, 1, 10000),
      limit: safeInt(searchParams.get('limit'), 20, 1, 100),
      sort: searchParams.get('sort') || 'first_seen_at',
      order,
    };

    const result = getOffers(params);
    const sources = getSources();

    return NextResponse.json({ ...result, sources });
  } catch {
    return NextResponse.json(
      { error: 'Database not found. Run the job-watcher script at least once.' },
      { status: 500 },
    );
  }
}
