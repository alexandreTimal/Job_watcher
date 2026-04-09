import { eq } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import { sourceConfigs, pipelineRuns } from "@jobfindeer/db/schema";
import { sourceRegistry } from "./sources/registry";
import { normalizeOffers } from "./processing/normalizer";
import { deduplicateAndInsert } from "./processing/deduplicator";
import { purgeExpiredOffers } from "./processing/purger";
import { generateFeeds } from "./workers/feed.worker";
import { createLogger } from "./lib/logger";

const logger = createLogger("ORCHESTRATOR");

async function runSource(sourceName: string): Promise<void> {
  const source = sourceRegistry[sourceName];
  if (!source) {
    logger.error(`Unknown source: ${sourceName}`);
    return;
  }

  const run = await db
    .insert(pipelineRuns)
    .values({ sourceName, status: "running" })
    .returning();

  const runId = run[0]!.id;
  const startTime = Date.now();

  try {
    // 1. Fetch
    const rawOffers = await source.fetch();

    // 2. Normalize & validate
    const normalized = normalizeOffers(rawOffers);

    // 3. Deduplicate & insert
    const { inserted, duplicates } = await deduplicateAndInsert(normalized);

    // 4. Update run metrics
    const durationMs = Date.now() - startTime;
    await db
      .update(pipelineRuns)
      .set({
        status: "success",
        offersCollected: rawOffers.length,
        offersFiltered: duplicates,
        offersInserted: inserted,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    logger.info(`Source ${sourceName} completed`, { collected: rawOffers.length, inserted, duplicates, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await db
      .update(pipelineRuns)
      .set({
        status: "error",
        errorsCount: 1,
        errorDetails: error instanceof Error ? error.message : String(error),
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    logger.error(`Source ${sourceName} failed`, { error: error instanceof Error ? error.message : String(error), durationMs });
  }
}

export async function runPipeline(): Promise<void> {
  logger.info("Pipeline run started");

  // Get active sources from DB
  const activeSources = await db
    .select()
    .from(sourceConfigs)
    .where(eq(sourceConfigs.active, true));

  if (activeSources.length === 0) {
    logger.warn("No active sources configured");
    return;
  }

  // Run all sources in parallel with allSettled
  const results = await Promise.allSettled(
    activeSources.map((sc) => runSource(sc.name)),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info("Pipeline run completed", {
    total: activeSources.length,
    succeeded: activeSources.length - failed,
    failed,
  });

  // Purge old offers
  await purgeExpiredOffers();

  // Generate user feeds
  logger.info("Generating user feeds...");
  await generateFeeds();
  logger.info("Feed generation completed");
}

export async function runSingleSource(sourceName: string): Promise<void> {
  await runSource(sourceName);
}
