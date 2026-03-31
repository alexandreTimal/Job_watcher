import type { JobOffer, ScoredOffer } from '../types.js';
import { KEYWORDS, SCORING } from '../config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('FILTER');

function calculateScore(offer: JobOffer): number {
  const text = `${offer.title} ${offer.description ?? ''}`.toLowerCase();
  let score = 0;

  for (const [, category] of Object.entries(KEYWORDS)) {
    for (const term of category.terms) {
      if (text.includes(term.toLowerCase())) {
        score += category.weight;
      }
    }
  }

  return score;
}

function getPriority(score: number): ScoredOffer['priority'] {
  if (score >= SCORING.priorities.high.min) return '⭐⭐⭐';
  if (score >= SCORING.priorities.medium.min) return '⭐⭐';
  return '⭐';
}

export function scoreOffers(offers: JobOffer[]): ScoredOffer[] {
  const scored: ScoredOffer[] = [];
  let filtered = 0;

  for (const offer of offers) {
    const score = calculateScore(offer);

    if (score < SCORING.minScore) {
      filtered++;
      continue;
    }

    scored.push({
      ...offer,
      score,
      priority: getPriority(score),
    });
  }

  logger.info(`${scored.length} offres retenues, ${filtered} filtrées (score < ${SCORING.minScore})`);
  return scored;
}
