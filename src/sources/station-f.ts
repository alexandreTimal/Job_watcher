import type { JobOffer } from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('STATION_F');

const STATION_F_URL = 'https://jobs.stationf.co/search';

export async function fetchOffers(): Promise<JobOffer[]> {
  const offers: JobOffer[] = [];

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.goto(STATION_F_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Wait for job cards to render (SPA)
    await page.waitForSelector('a[href*="/jobs/"]', { timeout: 8000 }).catch(() => {});

    const jobs = await page.$$eval('a[href*="/jobs/"]', (links) => {
      const seen = new Set<string>();
      return links
        .filter((a) => {
          const href = a.getAttribute('href') ?? '';
          if (seen.has(href)) return false;
          seen.add(href);
          return true;
        })
        .map((a) => {
          const text = a.textContent?.trim() ?? '';
          const href = a.getAttribute('href') ?? '';
          // Try to split title and company from text
          const parts = text.split('\n').map((s) => s.trim()).filter(Boolean);
          return {
            title: parts[0] ?? text,
            company: parts[1] ?? null,
            location: parts[2] ?? null,
            href,
          };
        });
    });

    for (const job of jobs) {
      if (job.title && job.href) {
        const url = job.href.startsWith('http') ? job.href : `https://jobs.stationf.co${job.href}`;
        offers.push({
          title: job.title,
          company: job.company,
          url,
          source: 'station-f',
          location: job.location,
          contractType: null,
          publishedAt: null,
          description: null,
        });
      }
    }

    logger.info(`${offers.length} offres récupérées via Playwright`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close();
  }

  return offers;
}
