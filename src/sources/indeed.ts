import type { JobOffer } from '../types.js';
import { RATE_LIMIT } from '../config.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('INDEED');

// URLs de recherche Indeed.fr (même params que les anciens RSS, format /jobs au lieu de /rss)
const SEARCH_URLS = [
  'https://www.indeed.fr/jobs?q=product+manager+alternance&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=développeur+full+stack+alternance&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=growth+marketing+alternance&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=chef+de+projet+tech+alternance&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=product+manager+stage&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=développeur+full+stack+stage&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=développeur+react+typescript+alternance&l=France&sort=date',
  'https://www.indeed.fr/jobs?q=stage+fin+études+informatique&l=France&sort=date',
];

interface IndeedJobCard {
  title?: string;
  company?: string;
  companyName?: string;
  formattedLocation?: string;
  jobLocationCity?: string;
  pubDate?: number;
  jobkey?: string;
  link?: string;
  displayTitle?: string;
  truncatedCompany?: string;
}

async function extractJobsFromPage(page: import('playwright').Page): Promise<JobOffer[]> {
  const offers: JobOffer[] = [];

  try {
    // Strategy 1: Extract from embedded JSON (most reliable)
    const jsonData = await page.evaluate(() => {
      try {
        const mosaic = (window as unknown as Record<string, unknown>).mosaic as Record<string, unknown> | undefined;
        if (mosaic?.providerData) {
          const providers = mosaic.providerData as Record<string, unknown>;
          const jobCards = providers['mosaic-provider-jobcards'] as { metaData?: { mosaicProviderJobCardsModel?: { results?: unknown[] } } } | undefined;
          return jobCards?.metaData?.mosaicProviderJobCardsModel?.results ?? null;
        }
        return null;
      } catch {
        return null;
      }
    }) as IndeedJobCard[] | null;

    if (jsonData && jsonData.length > 0) {
      for (const job of jsonData) {
        const title = job.displayTitle ?? job.title ?? '';
        const company = job.truncatedCompany ?? job.companyName ?? job.company ?? null;
        const jobKey = job.jobkey ?? '';
        const url = job.link ?? (jobKey ? `https://www.indeed.fr/viewjob?jk=${jobKey}` : '');

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
      return offers;
    }

    // Strategy 2: Fallback to DOM parsing
    const cards = await page.$$('.job_seen_beacon, .jobsearch-ResultsList .result');

    for (const card of cards) {
      const titleEl = await card.$('h2.jobTitle a, a.jcs-JobTitle');
      const companyEl = await card.$('[data-testid="company-name"], .companyName');
      const locationEl = await card.$('[data-testid="text-location"], .companyLocation');

      const title = await titleEl?.textContent() ?? '';
      const href = await titleEl?.getAttribute('href') ?? '';
      const company = await companyEl?.textContent() ?? null;
      const location = await locationEl?.textContent() ?? null;

      const url = href.startsWith('http') ? href : href ? `https://www.indeed.fr${href}` : '';

      if (title.trim() && url) {
        offers.push({
          title: title.trim(),
          company: company?.trim() ?? null,
          url,
          source: 'indeed',
          location: location?.trim() ?? null,
          contractType: null,
          publishedAt: null,
          description: null,
        });
      }
    }
  } catch (error) {
    logger.debug(`Extraction error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return offers;
}

export async function fetchOffers(): Promise<JobOffer[]> {
  const allOffers: JobOffer[] = [];

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
    });

    for (const searchUrl of SEARCH_URLS) {
      try {
        const page = await context.newPage();
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });

        // Wait for job cards to render
        await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList', { timeout: 8000 }).catch(() => {});

        const offers = await extractJobsFromPage(page);
        allOffers.push(...offers);
        await page.close();

        logger.debug(`${searchUrl.split('q=')[1]?.split('&')[0]}: ${offers.length} offres`);
      } catch (error) {
        logger.debug(`Page error: ${error instanceof Error ? error.message : String(error)}`);
      }

      await sleep(RATE_LIMIT.delayMs + 1000); // Extra delay for Indeed
    }

    logger.info(`${allOffers.length} offres récupérées via Playwright`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close();
  }

  return allOffers;
}
