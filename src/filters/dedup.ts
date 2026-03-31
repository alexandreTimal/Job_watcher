import { createHash } from 'node:crypto';
import type { ScoredOffer } from '../types.js';
import { DEDUP } from '../config.js';
import { isOfferSeen, insertOffer } from '../store/sqlite.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DEDUP');

function normalize(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s*\(h\/f\)\s*/gi, '')
    .replace(/\s*\(f\/h\)\s*/gi, '')
    .replace(/\s*\(f\/h\/x\)\s*/gi, '')
    .replace(/\s*\(h\/f\/x\)\s*/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeHash(title: string, company: string | null): string {
  const key = `${normalize(title)}|${normalize(company)}`;
  return createHash('sha256').update(key).digest('hex');
}

export function deduplicateOffers(
  offers: ScoredOffer[],
  dryRun: boolean,
): ScoredOffer[] {
  const unique: ScoredOffer[] = [];
  let duplicates = 0;

  for (const offer of offers) {
    const hash = computeHash(offer.title, offer.company);

    if (isOfferSeen(hash, DEDUP.windowDays)) {
      duplicates++;
      continue;
    }

    if (!dryRun) {
      insertOffer({
        hash,
        title: offer.title,
        company: offer.company,
        url: offer.url,
        source: offer.source,
        score: offer.score,
      });
    }

    unique.push({ ...offer, _hash: hash });
  }

  logger.info(`${unique.length} nouvelles offres, ${duplicates} doublons ignorés`);
  return unique;
}
