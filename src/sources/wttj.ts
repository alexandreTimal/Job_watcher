import type { JobOffer } from '../types.js';
import { WTTJ_SEARCH_URLS, RATE_LIMIT } from '../config.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WTTJ');

interface WttjJob {
  name: string;
  slug: string;
  organization?: { name?: string; slug?: string };
  office?: { city?: string };
  contract_type?: { fr?: string };
  published_at?: string;
}

async function tryApi(): Promise<JobOffer[] | null> {
  try {
    const response = await fetch(
      'https://www.welcometothejungle.com/api/v1/jobs?query=developer&contract_type=internship,apprenticeship&page=1&per_page=30',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      logger.debug(`API interne WTTJ retourne ${response.status} — fallback Playwright`);
      return null;
    }

    const data = (await response.json()) as { jobs?: WttjJob[] };
    if (!data.jobs) return null;

    return data.jobs.map((job) => ({
      title: job.name,
      company: job.organization?.name ?? null,
      url: `https://www.welcometothejungle.com/fr/companies/${job.organization?.slug ?? ''}/jobs/${job.slug}`,
      source: 'wttj',
      location: job.office?.city ?? null,
      contractType: job.contract_type?.fr ?? null,
      publishedAt: job.published_at ? new Date(job.published_at) : null,
      description: null,
    }));
  } catch {
    return null;
  }
}

async function tryPlaywright(): Promise<JobOffer[]> {
  const offers: JobOffer[] = [];
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

    for (const searchUrl of WTTJ_SEARCH_URLS) {
      try {
        const page = await context.newPage();
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });

        // Wait for job cards to render (React SPA)
        await page.waitForSelector('[data-testid="search-results-list-item-wrapper"], [class*="JobCard"]', { timeout: 8000 }).catch(() => {});

        // Extract job cards — WTTJ uses /fr/companies/{company}/jobs/{slug} links with h2 titles
        const jobs = await page.$$eval(
          'a[href*="/fr/companies/"][href*="/jobs/"]',
          (links) => {
            const seen = new Set<string>();
            return links
              .filter((a) => {
                // Only keep links that have a title (h2) — skip image-only duplicates
                const h2 = a.querySelector('h2');
                if (!h2) return false;
                const href = a.getAttribute('href') ?? '';
                if (seen.has(href)) return false;
                seen.add(href);
                return true;
              })
              .map((a) => {
                const title = a.querySelector('h2')?.textContent?.trim() ?? '';
                const href = a.getAttribute('href') ?? '';
                // Extract company from URL: /fr/companies/{company}/jobs/{slug}
                const match = href.match(/\/fr\/companies\/([^/]+)\/jobs\//);
                const companySlug = match?.[1] ?? '';
                return { title, companySlug, href };
              });
          },
        );

        for (const job of jobs) {
          if (job.title && job.href) {
            const url = `https://www.welcometothejungle.com${job.href}`;
            const company = job.companySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            offers.push({
              title: job.title,
              company,
              url,
              source: 'wttj',
              location: null,
              contractType: null,
              publishedAt: null,
              description: null,
            });
          }
        }

        await page.close();
        logger.debug(`${searchUrl.split('query=')[1]?.split('&')[0]}: ${jobs.length} offres`);
      } catch (error) {
        logger.debug(`Page error: ${error instanceof Error ? error.message : String(error)}`);
      }

      await sleep(RATE_LIMIT.delayMs);
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close();
  }

  return offers;
}

export async function fetchOffers(): Promise<JobOffer[]> {
  try {
    // Try API first
    const apiOffers = await tryApi();
    if (apiOffers && apiOffers.length > 0) {
      logger.info(`${apiOffers.length} offres récupérées (API)`);
      return apiOffers;
    }

    // Fallback to Playwright
    const playwrightOffers = await tryPlaywright();
    logger.info(`${playwrightOffers.length} offres récupérées (Playwright)`);
    return playwrightOffers;
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return [];
  }
}
