import type { JobOffer } from '../types.js';
import { RATE_LIMIT } from '../config.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('HELLOWORK');

// URLs de recherche HelloWork — pages statiques, pas besoin de Playwright
const SEARCH_URLS = [
  'https://www.hellowork.com/fr-fr/alternance/domaine_informatique.html',
  'https://www.hellowork.com/fr-fr/stage/domaine_informatique.html',
  'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=product+manager+alternance',
  'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=growth+marketing+alternance',
  'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=développeur+full+stack+alternance',
];

export async function fetchOffers(): Promise<JobOffer[]> {
  const allOffers: JobOffer[] = [];

  try {
    const { load } = await import('cheerio');

    for (const url of SEARCH_URLS) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html',
          },
        });

        if (!response.ok) {
          logger.error(`Fetch failed: ${response.status}`, { url });
          await sleep(RATE_LIMIT.delayMs);
          continue;
        }

        const html = await response.text();
        const $ = load(html);

        // HelloWork job cards — extract from listing items
        $('a[href*="/emploi/"], a[href*="/alternance/"], a[href*="/stage/"]').each(function () {
          const el = $(this);
          const titleEl = el.find('h2, h3, [class*="title"]').first();
          const companyEl = el.find('[class*="company"], [class*="recruteur"]').first();
          const locationEl = el.find('[class*="location"], [class*="lieu"]').first();
          const href = el.attr('href') ?? '';

          const title = titleEl.text().trim();

          // Only keep links that look like individual job offers (not category pages)
          if (!title || !href.includes('-')) return;
          if (href.includes('domaine_') || href.includes('region_') || href.includes('ville_')) return;

          const fullUrl = href.startsWith('http') ? href : `https://www.hellowork.com${href}`;

          allOffers.push({
            title,
            company: companyEl.text().trim() || null,
            url: fullUrl,
            source: 'hellowork',
            location: locationEl.text().trim() || null,
            contractType: null,
            publishedAt: null,
            description: null,
          });
        });
      } catch (error) {
        logger.debug(`Page error: ${error instanceof Error ? error.message : String(error)}`);
      }

      await sleep(RATE_LIMIT.delayMs);
    }

    logger.info(`${allOffers.length} offres récupérées`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return [];
  }

  return allOffers;
}
