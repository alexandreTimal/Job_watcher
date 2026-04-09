import { lt, and, sql } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import { rawOffers } from "@jobfindeer/db/schema";
import { userFeeds } from "@jobfindeer/db/schema";
import { createLogger } from "../lib/logger";

const logger = createLogger("PURGER");

const RETENTION_DAYS = 7;

export async function purgeExpiredOffers(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Get IDs of offers that are saved/applied by any user — never purge those
  const savedOfferIds = db
    .select({ offerId: userFeeds.offerId })
    .from(userFeeds)
    .where(
      sql`${userFeeds.status} IN ('saved', 'applied')`,
    );

  const result = await db
    .delete(rawOffers)
    .where(
      and(
        lt(rawOffers.createdAt, cutoff),
        sql`${rawOffers.id} NOT IN (${savedOfferIds})`,
      ),
    )
    .returning({ id: rawOffers.id });

  logger.info(`Purged ${result.length} expired offers (older than ${RETENTION_DAYS} days)`);
  return result.length;
}
