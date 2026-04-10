import { eq } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import { rawOffers } from "@jobfindeer/db/schema";
import type { NormalizedOffer } from "@jobfindeer/validators";
import { createLogger } from "../lib/logger";

const logger = createLogger("DEDUPLICATOR");

export async function deduplicateAndInsert(
  offers: NormalizedOffer[],
): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const offer of offers) {
    const existing = await db
      .select({ id: rawOffers.id })
      .from(rawOffers)
      .where(eq(rawOffers.contentHash, offer.contentHash))
      .limit(1);

    if (existing.length > 0) {
      duplicates++;
      continue;
    }

    await db.insert(rawOffers).values({
      contentHash: offer.contentHash,
      title: offer.title,
      company: offer.company,
      location: offer.location,
      salary: offer.salary,
      contractType: offer.contractType,
      urlSource: offer.urlSource,
      sourceName: offer.sourceName,
      publishedAt: offer.publishedAt,
      locationLat: (offer as Record<string, unknown>).locationLat as number | undefined,
      locationLng: (offer as Record<string, unknown>).locationLng as number | undefined,
      remoteType: (offer as Record<string, unknown>).remoteType as string | undefined,
      requiredExperienceYears: (offer as Record<string, unknown>).requiredExperienceYears as number | undefined,
      companySize: (offer as Record<string, unknown>).companySize as string | undefined,
      descriptionRaw: (offer as Record<string, unknown>).descriptionRaw as string | undefined,
    });

    inserted++;
  }

  logger.info(`Dedup result`, { inserted, duplicates, total: offers.length });
  return { inserted, duplicates };
}
