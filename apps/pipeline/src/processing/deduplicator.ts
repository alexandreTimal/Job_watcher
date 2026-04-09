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
    });

    inserted++;
  }

  logger.info(`Dedup result`, { inserted, duplicates, total: offers.length });
  return { inserted, duplicates };
}
