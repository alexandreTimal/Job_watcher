import type { JobOffer } from '../types.js';
import { ENV, FRANCE_TRAVAIL, RATE_LIMIT } from '../config.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('FRANCE_TRAVAIL');

async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(FRANCE_TRAVAIL.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ENV.FRANCE_TRAVAIL_CLIENT_ID,
        client_secret: ENV.FRANCE_TRAVAIL_CLIENT_SECRET,
        scope: 'api_offresdemploiv2 o2dsoffre',
      }),
    });

    if (!response.ok) {
      logger.error(`OAuth token failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  } catch (error) {
    logger.error(`OAuth exception: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

interface FranceTravailOffer {
  id: string;
  intitule: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  typeContrat?: string;
  natureContrat?: string;
  dateCreation?: string;
  origineOffre?: { urlOrigine?: string };
}

export async function fetchOffers(): Promise<JobOffer[]> {
  if (!ENV.FRANCE_TRAVAIL_CLIENT_ID || !ENV.FRANCE_TRAVAIL_CLIENT_SECRET) {
    logger.info('FRANCE_TRAVAIL_CLIENT_ID/SECRET non configuré — skip');
    return [];
  }

  const allOffers: JobOffer[] = [];

  try {
    const token = await getAccessToken();
    if (!token) return [];

    for (const search of FRANCE_TRAVAIL.searches) {
      const cleanSearch = Object.fromEntries(Object.entries(search).filter(([, v]) => v !== undefined)) as Record<string, string>;
      const params = new URLSearchParams(cleanSearch);
      const response = await fetch(`${FRANCE_TRAVAIL.searchUrl}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        logger.error(`Search failed: ${response.status}`, { params: search.motsCles });
        await sleep(RATE_LIMIT.delayMs);
        continue;
      }

      const data = (await response.json()) as { resultats?: FranceTravailOffer[] };
      const results = data.resultats ?? [];

      for (const r of results) {
        allOffers.push({
          title: r.intitule,
          company: r.entreprise?.nom ?? null,
          url: r.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${r.id}`,
          source: 'france-travail',
          location: r.lieuTravail?.libelle ?? null,
          contractType: r.natureContrat ?? r.typeContrat ?? null,
          publishedAt: r.dateCreation ? new Date(r.dateCreation) : null,
          description: null,
        });
      }

      logger.debug(`"${search.motsCles}": ${results.length} résultats`);
      await sleep(RATE_LIMIT.delayMs);
    }

    logger.info(`${allOffers.length} offres récupérées (${FRANCE_TRAVAIL.searches.length} recherches)`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  }

  return allOffers;
}
