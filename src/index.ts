import { parseArgs } from 'node:util';
import type { JobOffer, RunContext, Source } from './types.js';
import { SOURCES_ENABLED } from './config.js';
import { initDb, closeDb } from './store/sqlite.js';
import { createLogger, setVerbose } from './utils/logger.js';
import { validateOffers } from './filters/validator.js';
import { scoreOffers } from './filters/keyword-filter.js';
import { deduplicateOffers } from './filters/dedup.js';

// Source imports
import { fetchOffers as fetchIndeed } from './sources/indeed.js';
import { fetchOffers as fetchGoogleAlerts } from './sources/google-alerts-rss.js';
import { fetchOffers as fetchHellowork } from './sources/hellowork.js';
import { fetchOffers as fetchFranceTravail } from './sources/france-travail.js';
import { fetchOffers as fetchWttj } from './sources/wttj.js';
import { fetchOffers as fetchStationF } from './sources/station-f.js';
import { fetchOffers as fetchCareerPages } from './sources/career-pages.js';
import { fetchOffers as fetchLinkedinEmail } from './sources/linkedin-email.js';
import { pushToNotion } from './notifications/notion.js';

const logger = createLogger('MAIN');

// --- Parse CLI flags ---
const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
  },
  strict: true,
});

const context: RunContext = {
  dryRun: values['dry-run'] ?? false,
  verbose: values.verbose ?? false,
};

if (context.verbose) setVerbose(true);
if (context.dryRun) logger.info('Mode dry-run activé — aucune écriture');

// --- Define sources ---
const allSources: Source[] = [
  { name: 'indeed', enabled: SOURCES_ENABLED['indeed'] ?? false, fetchOffers: fetchIndeed },
  { name: 'google-alerts', enabled: SOURCES_ENABLED['google-alerts'] ?? false, fetchOffers: fetchGoogleAlerts },
  { name: 'hellowork', enabled: SOURCES_ENABLED['hellowork'] ?? false, fetchOffers: fetchHellowork },
  { name: 'france-travail', enabled: SOURCES_ENABLED['france-travail'] ?? false, fetchOffers: fetchFranceTravail },
  { name: 'wttj', enabled: SOURCES_ENABLED['wttj'] ?? false, fetchOffers: fetchWttj },
  { name: 'station-f', enabled: SOURCES_ENABLED['station-f'] ?? false, fetchOffers: fetchStationF },
  { name: 'career-pages', enabled: SOURCES_ENABLED['career-pages'] ?? false, fetchOffers: fetchCareerPages },
  { name: 'linkedin-email', enabled: SOURCES_ENABLED['linkedin-email'] ?? false, fetchOffers: fetchLinkedinEmail },
];

async function main(): Promise<void> {
  const db = initDb();
  logger.info('Job_watcher démarré');

  try {
    // 1. Collect from all enabled sources in parallel
    const enabledSources = allSources.filter((s) => s.enabled);
    logger.info(`${enabledSources.length} sources activées`);

    const results = await Promise.allSettled(
      enabledSources.map((s) => s.fetchOffers()),
    );

    // 2. Aggregate results
    const rawOffers: JobOffer[] = [];
    let failedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      const sourceName = enabledSources[i]!.name;

      if (result.status === 'fulfilled') {
        rawOffers.push(...result.value);
      } else {
        failedCount++;
        logger.error(`Source ${sourceName} a échoué: ${result.reason}`);
      }
    }

    if (failedCount === enabledSources.length && enabledSources.length > 0) {
      logger.error('Toutes les sources ont échoué');
      closeDb();
      process.exit(1);
    }

    // 3. Pipeline: validate → score → deduplicate
    const validated = validateOffers(rawOffers);
    const scored = scoreOffers(validated);
    const newOffers = deduplicateOffers(scored, context.dryRun);

    // 4. Push to Notion
    if (newOffers.length > 0) {
      await pushToNotion(newOffers, context);
    }

    // 5. Summary
    logger.info(
      `Run terminé — ${rawOffers.length} scannées, ${scored.length} filtrées, ${newOffers.length} nouvelles`,
    );

    if (context.dryRun && newOffers.length > 0) {
      logger.info('Offres qui auraient été ajoutées:');
      for (const offer of newOffers) {
        logger.info(`  ${offer.priority} [${offer.score}] ${offer.title} — ${offer.company ?? 'N/A'} (${offer.source})`);
      }
    }
  } finally {
    closeDb();
  }
}

main().catch((error) => {
  logger.error(`Erreur fatale: ${error instanceof Error ? error.message : String(error)}`);
  closeDb();
  process.exit(1);
});
