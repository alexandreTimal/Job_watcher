import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadConfig() {
  // Read the raw TypeScript config file and extract values via regex
  const candidates = [
    resolve(process.cwd(), '../src/config.ts'),
    resolve(process.cwd(), 'src/config.ts'),
  ];
  const configPath = candidates.find((p) => { try { readFileSync(p); return true; } catch { return false; } }) ?? candidates[0]!;
  const content = readFileSync(configPath, 'utf-8');

  // Extract KEYWORDS block
  const keywords: Array<{ category: string; weight: number; terms: string[] }> = [];
  const keywordBlocks = content.matchAll(/(\w+):\s*\{\s*weight:\s*(-?\d+),\s*terms:\s*\[([\s\S]*?)\],?\s*\}/g);
  for (const match of keywordBlocks) {
    const category = match[1]!;
    const weight = parseInt(match[2]!, 10);
    const termsRaw = match[3]!;
    // Match both 'simple' and 'escaped\'apostrophe' strings
    const terms = [...termsRaw.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!.replace(/\\'/g, "'"));
    keywords.push({ category, weight, terms });
  }

  // Extract SCORING
  const minScoreMatch = content.match(/minScore:\s*(\d+)/);
  const highMinMatch = content.match(/high:\s*\{\s*min:\s*(\d+)/);
  const medMinMatch = content.match(/medium:\s*\{\s*min:\s*(\d+)/);
  const lowMinMatch = content.match(/low:\s*\{\s*min:\s*(\d+)/);

  // Extract DEDUP
  const windowMatch = content.match(/windowDays:\s*(\d+)/);

  // Extract RATE_LIMIT
  const delayMatch = content.match(/delayMs:\s*(\d+)/);
  const notionDelayMatch = content.match(/notionDelayMs:\s*(\d+)/);

  // Extract SOURCES_ENABLED
  const allSourceNames = ['indeed', 'google-alerts', 'hellowork', 'france-travail', 'wttj', 'station-f', 'career-pages', 'linkedin-email'];
  const sourcesSection = content.match(/SOURCES_ENABLED[\s\S]*?\{([\s\S]*?)\}/);
  const validSources = allSourceNames.map((name) => {
    // Match both quoted 'name': true and unquoted name: true
    const re = new RegExp(`(?:'${name}'|${name}):\\s*(true|false)`);
    const m = sourcesSection?.[1]?.match(re);
    return { name, enabled: m?.[1] === 'true' };
  });

  // Extract CAREER_PAGES
  const careerPages: Array<{ name: string; url: string; selector: string }> = [];
  const pageMatches = content.matchAll(/\{\s*name:\s*'([^']+)',\s*url:\s*'([^']+)',\s*selector:\s*'([^']+)'\s*\}/g);
  for (const m of pageMatches) {
    careerPages.push({ name: m[1]!, url: m[2]!, selector: m[3]! });
  }

  // Extract WTTJ URLs
  const wttjSection = content.match(/WTTJ_SEARCH_URLS\s*=\s*\[([\s\S]*?)\]/);
  const wttjUrls = wttjSection
    ? [...wttjSection[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    : [];

  // Extract France Travail searches
  const ftSection = content.match(/searches:\s*\[([\s\S]*?)\],/);
  const ftSearches: Array<Record<string, string>> = [];
  if (ftSection) {
    const searchBlocks = ftSection[1]!.matchAll(/\{([^}]+)\}/g);
    for (const block of searchBlocks) {
      const search: Record<string, string> = {};
      const pairs = block[1]!.matchAll(/(\w+):\s*'([^']+)'/g);
      for (const p of pairs) {
        search[p[1]!] = p[2]!;
      }
      if (Object.keys(search).length > 0) ftSearches.push(search);
    }
  }

  // Extract Google Alerts URLs
  const gaSection = content.match(/googleAlerts:\s*\[([\s\S]*?)\]/);
  const googleAlerts = gaSection
    ? [...gaSection[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    : [];

  return {
    keywords,
    scoring: {
      minScore: parseInt(minScoreMatch?.[1] ?? '3', 10),
      priorities: {
        high: { min: parseInt(highMinMatch?.[1] ?? '7', 10), label: '⭐⭐⭐' },
        medium: { min: parseInt(medMinMatch?.[1] ?? '4', 10), label: '⭐⭐' },
        low: { min: parseInt(lowMinMatch?.[1] ?? '3', 10), label: '⭐' },
      },
    },
    dedup: { windowDays: parseInt(windowMatch?.[1] ?? '30', 10) },
    rateLimit: {
      delayMs: parseInt(delayMatch?.[1] ?? '1500', 10),
      notionDelayMs: parseInt(notionDelayMatch?.[1] ?? '350', 10),
    },
    sources: validSources,
    rssUrls: { googleAlerts },
    careerPages,
    wttjUrls,
    franceTravail: { searches: ftSearches },
  };
}

export async function GET() {
  try {
    const config = loadConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load config: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
