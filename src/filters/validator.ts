import type { JobOffer } from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VALIDATOR');

export function validateOffers(offers: JobOffer[]): JobOffer[] {
  const valid: JobOffer[] = [];
  let rejected = 0;

  for (const offer of offers) {
    if (!offer.title?.trim() || !offer.url?.trim() || !offer.source?.trim()) {
      rejected++;
      continue;
    }

    valid.push({
      ...offer,
      title: offer.title.trim(),
      company: offer.company?.trim() || null,
      url: offer.url.trim(),
      source: offer.source.trim(),
      location: offer.location?.trim() || null,
      contractType: offer.contractType?.trim() || null,
      description: offer.description?.trim() || null,
    });
  }

  if (rejected > 0) {
    logger.warn(`${rejected} offres rejetées (champs requis manquants)`);
  }

  return valid;
}
