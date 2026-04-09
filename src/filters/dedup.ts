import { createHash } from 'node:crypto';
import type { ScoredOffer } from '../types.js';
import { DEDUP } from '../config.js';
import { isOfferSeen, insertOffer } from '../store/sqlite.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DEDUP');

// --- Axe 6: Normalisation avancée ---

function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(text: string | null): string {
  if (!text) return '';
  return removeAccents(text)
    .toLowerCase()
    .trim()
    // Supprimer les suffixes genrés
    .replace(/\s*\(h\/f\)\s*/gi, '')
    .replace(/\s*\(f\/h\)\s*/gi, '')
    .replace(/\s*\(f\/h\/x\)\s*/gi, '')
    .replace(/\s*\(h\/f\/x\)\s*/gi, '')
    .replace(/\s*\(h\/f\/n\)\s*/gi, '')
    .replace(/\s*h\/f\s*/gi, '')
    .replace(/\s*f\/h\s*/gi, '')
    // Normaliser les variantes courantes
    .replace(/full[\s-]?stack/gi, 'fullstack')
    .replace(/front[\s-]?end/gi, 'frontend')
    .replace(/back[\s-]?end/gi, 'backend')
    .replace(/dev[\s-]?ops/gi, 'devops')
    // Supprimer ponctuation et espaces multiples
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

  // Dédoublonnage intra-batch en plus du dédoublonnage SQLite
  const seenInBatch = new Set<string>();

  for (const offer of offers) {
    const hash = computeHash(offer.title, offer.company);

    // Check intra-batch (même run, sources différentes)
    if (seenInBatch.has(hash)) {
      duplicates++;
      continue;
    }

    // Check SQLite (runs précédents)
    if (isOfferSeen(hash, DEDUP.windowDays)) {
      duplicates++;
      continue;
    }

    seenInBatch.add(hash);

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
