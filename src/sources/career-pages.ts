import { createHash } from 'node:crypto';
import type { JobOffer } from '../types.js';
import { CAREER_PAGES, RATE_LIMIT } from '../config.js';
import { getPageHash, updatePageHash } from '../store/sqlite.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CAREER_PAGES');

function normalizeContent(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function hashContent(content: string): string {
  return createHash('sha256').update(normalizeContent(content)).digest('hex');
}

export async function fetchOffers(): Promise<JobOffer[]> {
  const offers: JobOffer[] = [];

  for (const page of CAREER_PAGES) {
    try {
      const response = await fetch(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        logger.error(`Fetch failed pour ${page.name}: ${response.status}`, { url: page.url });
        await sleep(RATE_LIMIT.delayMs);
        continue;
      }

      const html = await response.text();
      const { load } = await import('cheerio');
      const $ = load(html);

      const content = $(page.selector).text();
      if (!content.trim()) {
        logger.warn(`Contenu vide pour ${page.name} avec sélecteur "${page.selector}"`);
        await sleep(RATE_LIMIT.delayMs);
        continue;
      }

      const newHash = hashContent(content);
      const previousHash = getPageHash(page.url);

      if (!previousHash) {
        // Premier run — stocker le hash initial sans créer d'offre
        updatePageHash(page.url, newHash);
        logger.debug(`${page.name}: hash initial enregistré`);
      } else if (newHash !== previousHash) {
        // Changement détecté
        updatePageHash(page.url, newHash);
        offers.push({
          title: `[Changement détecté] ${page.name}`,
          company: page.name,
          url: page.url,
          source: 'career-page',
          location: null,
          contractType: null,
          publishedAt: new Date(),
          description: null,
        });
        logger.info(`Changement détecté sur ${page.name}`);
      } else {
        logger.debug(`${page.name}: pas de changement`);
      }
    } catch (error) {
      logger.error(`Erreur pour ${page.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    await sleep(RATE_LIMIT.delayMs);
  }

  logger.info(`${offers.length} changements détectés sur ${CAREER_PAGES.length} pages`);
  return offers;
}
