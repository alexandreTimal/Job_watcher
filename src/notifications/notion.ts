import type { ScoredOffer, RunContext } from '../types.js';
import { ENV, RATE_LIMIT } from '../config.js';
import { markNotifiedNotion, isNotifiedNotion } from '../store/sqlite.js';
import { sleep } from '../utils/sleep.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('NOTION');

const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';

function buildNotionProperties(offer: ScoredOffer) {
  const publishedIso = offer.publishedAt?.toISOString().split('T')[0] ?? null;
  const relanceIso = offer.publishedAt
    ? new Date(offer.publishedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: offer.company ?? 'N/A' } }] },
    Poste: { rich_text: [{ text: { content: offer.title } }] },
    Source: { select: { name: offer.source } },
    'Lien offre': { url: offer.url },
    Score: { number: offer.score },
    Priorité: { select: { name: offer.priority } },
    Statut: { select: { name: '🔵 À postuler' } },
  };

  if (offer.contractType) {
    properties['Type contrat'] = { select: { name: offer.contractType } };
  }
  if (offer.location) {
    properties.Localisation = { rich_text: [{ text: { content: offer.location } }] };
  }
  if (publishedIso) {
    properties['Date publication'] = { date: { start: publishedIso } };
  }
  if (relanceIso) {
    properties['Date relance'] = { date: { start: relanceIso } };
  }

  return properties;
}

async function createNotionPage(offer: ScoredOffer): Promise<boolean> {
  const response = await fetch(NOTION_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: ENV.NOTION_DATABASE_ID },
      properties: buildNotionProperties(offer),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(`Échec création page: ${offer.title}`, {
      status: response.status,
      body: body.slice(0, 200),
    });
    return false;
  }

  return true;
}

export async function pushToNotion(
  offers: Array<ScoredOffer>,
  context: RunContext,
): Promise<void> {
  if (!ENV.NOTION_API_KEY || !ENV.NOTION_DATABASE_ID) {
    logger.warn('NOTION_API_KEY ou NOTION_DATABASE_ID non configuré — skip Notion');
    return;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const offer of offers) {
    // Anti-doublons: vérifier si déjà notifié
    if (offer._hash && isNotifiedNotion(offer._hash)) {
      skipped++;
      continue;
    }

    if (context.dryRun) {
      logger.info(`DRY-RUN: Would create Notion page for "${offer.title}" (${offer.company ?? 'N/A'})`);
      created++;
      continue;
    }

    try {
      const success = await createNotionPage(offer);
      if (success) {
        created++;
        if (offer._hash) {
          markNotifiedNotion(offer._hash);
        }
      } else {
        errors++;
      }
    } catch (error) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Exception pour "${offer.title}": ${message}`);
    }

    await sleep(RATE_LIMIT.notionDelayMs);
  }

  logger.info(`${created} entrées créées, ${skipped} déjà notifiées, ${errors} erreurs`);
}
