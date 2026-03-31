import { NextResponse } from 'next/server';

// Import config from parent project
// We read the config module directly since dashboard runs server-side
async function loadConfig() {
  const config = await import('../../../../src/config.js');
  return {
    keywords: Object.entries(config.KEYWORDS).map(([category, data]) => ({
      category,
      weight: data.weight,
      terms: [...data.terms],
    })),
    scoring: {
      minScore: config.SCORING.minScore,
      priorities: config.SCORING.priorities,
    },
    dedup: config.DEDUP,
    rateLimit: config.RATE_LIMIT,
    sources: Object.entries(config.SOURCES_ENABLED).map(([name, enabled]) => ({
      name,
      enabled,
    })),
    rssUrls: {
      indeed: [],  // Disabled — uses Playwright now
      googleAlerts: [...config.RSS_URLS.googleAlerts],
      hellowork: [...config.RSS_URLS.hellowork],
    },
    careerPages: config.CAREER_PAGES.map((p) => ({
      name: p.name,
      url: p.url,
      selector: p.selector,
    })),
    wttjUrls: [...config.WTTJ_SEARCH_URLS],
    franceTravail: {
      searches: config.FRANCE_TRAVAIL.searches,
    },
  };
}

export async function GET() {
  try {
    const config = await loadConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load config: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
