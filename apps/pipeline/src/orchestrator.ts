import { eq } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import { sourceConfigs, pipelineRuns, userProfiles, userPreferences } from "@jobfindeer/db/schema";
import type { SearchFilters } from "./lib/source-interface";
import { sourceRegistry } from "./sources/registry";
import { normalizeOffers } from "./processing/normalizer";
import { deduplicateAndInsert } from "./processing/deduplicator";
import { purgeExpiredOffers } from "./processing/purger";
import { geocodeNewOffers } from "./processing/geocoder";
import { generateFeeds } from "./workers/feed.worker";
import { createLogger } from "./lib/logger";

const logger = createLogger("ORCHESTRATOR");

export interface SourceRunResult {
  source: string;
  status: "success" | "error";
  offersCollected: number;
  offersInserted: number;
  duplicates: number;
  durationMs: number;
  error?: string;
}

export async function loadUserFilters(userId: string): Promise<SearchFilters> {
  const [profile] = await db
    .select({
      currentTitle: userProfiles.currentTitle,
      currentLocation: userProfiles.currentLocation,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const [prefs] = await db
    .select({
      contractTypes: userPreferences.contractTypes,
      remotePreference: userPreferences.remotePreference,
      locations: userPreferences.locations,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const filters: SearchFilters = {};

  if (profile?.currentTitle) {
    filters.keyword = profile.currentTitle;
  }

  if (prefs?.locations) {
    const locations = prefs.locations as { label: string; radius: number | null }[];
    if (locations.length > 0) {
      filters.locations = locations;
    }
  }

  if (prefs?.contractTypes) {
    const cts = prefs.contractTypes as string[];
    if (cts.length > 0) {
      filters.contractTypes = cts;
    }
  }

  if (prefs?.remotePreference) {
    filters.remotePreference = prefs.remotePreference as SearchFilters["remotePreference"];
  }

  return filters;
}

async function runSource(sourceName: string, filters?: SearchFilters): Promise<SourceRunResult> {
  const source = sourceRegistry[sourceName];
  if (!source) {
    return {
      source: sourceName,
      status: "error",
      offersCollected: 0,
      offersInserted: 0,
      duplicates: 0,
      durationMs: 0,
      error: `Source inconnue : ${sourceName}`,
    };
  }

  const run = await db
    .insert(pipelineRuns)
    .values({ sourceName, status: "running" })
    .returning();

  const runId = run[0]!.id;
  const startTime = Date.now();

  try {
    // 1. Fetch with filters
    const rawOffers = await source.fetch({
      maxPages: 3,
      filters,
    });

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

    return {
      source: sourceName,
      status: "success",
      offersCollected: rawOffers.length,
      offersInserted: inserted,
      duplicates,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await db
      .update(pipelineRuns)
      .set({
        status: "error",
        errorsCount: 1,
        errorDetails: errorMsg,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    logger.error(`Source ${sourceName} failed`, { error: errorMsg, durationMs });

    return {
      source: sourceName,
      status: "error",
      offersCollected: 0,
      offersInserted: 0,
      duplicates: 0,
      durationMs,
      error: errorMsg,
    };
  }
}

export async function runPipeline(): Promise<void> {
  logger.info("Pipeline run started");

  const activeSources = await db
    .select()
    .from(sourceConfigs)
    .where(eq(sourceConfigs.active, true));

  if (activeSources.length === 0) {
    logger.warn("No active sources configured");
    return;
  }

  const results = await Promise.allSettled(
    activeSources.map((sc) => runSource(sc.name)),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info("Pipeline run completed", {
    total: activeSources.length,
    succeeded: activeSources.length - failed,
    failed,
  });

  await purgeExpiredOffers();

  logger.info("Geocoding new offers...");
  await geocodeNewOffers();

  logger.info("Generating user feeds...");
  await generateFeeds();
  logger.info("Feed generation completed");
}

export async function runSingleSource(sourceName: string, userId?: string): Promise<SourceRunResult> {
  let filters: SearchFilters | undefined;

  if (userId) {
    filters = await loadUserFilters(userId);
    logger.info(`Loaded filters for user ${userId}`, { filters });
  }

  return runSource(sourceName, filters);
}
