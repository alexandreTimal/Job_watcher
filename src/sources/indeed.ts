import * as cheerio from 'cheerio';
import type { JobOffer } from '../types.js';
import { RATE_LIMIT, ENV, INDEED_SEARCH_URLS } from '../config.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('INDEED');

const BRIGHT_DATA_UNLOCKER = 'https://api.brightdata.com/request';

async function fetchPageViaUnlocker(url: string): Promise<string | null> {
  try {
    const res = await fetch(BRIGHT_DATA_UNLOCKER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.BRIGHTDATA_API_KEY}`,
      },
      body: JSON.stringify({
        zone: 'job_crawler',
        url,
        format: 'raw',
        country: 'fr',
      }),
    });

    if (!res.ok) {
      logger.debug(`Web Unlocker HTTP ${res.status} pour ${url}`);
      return null;
    }

    return await res.text();
  } catch (error) {
    logger.debug(`Fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function extractJobsFromHtml(html: string): JobOffer[] {
  const offers: JobOffer[] = [];
  const $ = cheerio.load(html);

  // Strategy 1: Extract from embedded JSON (mosaic data)
  $('script').each((_, el) => {
    const text = $(el).html() ?? '';
    if (!text.includes('mosaic-provider-jobcards')) return;

    try {
      const match = text.match(/window\.mosaic\s*=\s*(\{[\s\S]*?\});/);
      if (!match) return;
      const data = JSON.parse(match[1]!);
      const results = data?.providerData?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results;
      if (!Array.isArray(results)) return;

      for (const job of results) {
        const title = job.displayTitle ?? job.title ?? '';
        const company = job.truncatedCompany ?? job.companyName ?? job.company ?? null;
        const jobKey = job.jobkey ?? '';
        const url = job.link ?? (jobKey ? `https://fr.indeed.com/viewjob?jk=${jobKey}` : '');

        if (title && url) {
          offers.push({
            title,
            company,
            url,
            source: 'indeed',
            location: job.formattedLocation ?? job.jobLocationCity ?? null,
            contractType: null,
            publishedAt: job.pubDate ? new Date(job.pubDate) : null,
            description: null,
          });
        }
      }
    } catch {
      // JSON parse failed, fall through to DOM strategy
    }
  });

  if (offers.length > 0) return offers;

  // Strategy 2: Fallback to DOM parsing
  $('.job_seen_beacon, .jobsearch-ResultsList .result').each((_, el) => {
    const card = $(el);
    const titleEl = card.find('h2.jobTitle a, a.jcs-JobTitle');
    const companyEl = card.find('[data-testid="company-name"], .companyName');
    const locationEl = card.find('[data-testid="text-location"], .companyLocation');

    const title = titleEl.text().trim();
    const href = titleEl.attr('href') ?? '';
    const company = companyEl.text().trim() || null;
    const location = locationEl.text().trim() || null;

    const jobUrl = href.startsWith('http') ? href : href ? `https://fr.indeed.com${href}` : '';

    if (title && jobUrl) {
      offers.push({
        title,
        company,
        url: jobUrl,
        source: 'indeed',
        location,
        contractType: null,
        publishedAt: null,
        description: null,
      });
    }
  });

  return offers;
}

export async function fetchOffers(): Promise<JobOffer[]> {
  if (!ENV.BRIGHTDATA_API_KEY) {
    logger.error('BRIGHTDATA_API_KEY manquante — source Indeed désactivée');
    return [];
  }

  const allOffers: JobOffer[] = [];

  for (const searchUrl of INDEED_SEARCH_URLS) {
    const html = await fetchPageViaUnlocker(searchUrl);

    if (html) {
      const offers = extractJobsFromHtml(html);
      allOffers.push(...offers);

      const query = searchUrl.split('q=')[1]?.split('&')[0] ?? searchUrl;
      logger.debug(`${decodeURIComponent(query)}: ${offers.length} offres`);
    }

    await sleep(RATE_LIMIT.delayMs);
  }

  logger.info(`${allOffers.length} offres récupérées via Web Unlocker`);
  return allOffers;
}
