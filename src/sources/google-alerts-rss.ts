import type { JobOffer } from '../types.js';
import { RSS_URLS, RATE_LIMIT } from '../config.js';
import { parseRssFeed } from '../utils/rss-parser.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GOOGLE_ALERTS');

export async function fetchOffers(): Promise<JobOffer[]> {
  const offers: JobOffer[] = [];

  if (RSS_URLS.googleAlerts.length === 0) {
    logger.info('Aucune URL Google Alerts configurée — créez vos alertes sur google.com/alerts et ajoutez les URLs RSS dans config.ts');
    return [];
  }

  try {
    for (const url of RSS_URLS.googleAlerts) {
      const items = await parseRssFeed(url);

      for (const item of items) {
        offers.push({
          title: item.title,
          company: null,
          url: item.link,
          source: 'google-alerts',
          location: null,
          contractType: null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          description: item.content,
        });
      }

      await sleep(RATE_LIMIT.delayMs);
    }

    logger.info(`${offers.length} offres récupérées`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    return [];
  }

  return offers;
}
