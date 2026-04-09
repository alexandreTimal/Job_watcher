import { eq, and, sql } from "drizzle-orm";
import { db } from "@jobfindeer/db/client";
import {
  users,
  userProfiles,
  userPreferences,
  rawOffers,
  userFeeds,
} from "@jobfindeer/db/schema";
import { scoreOffer } from "../scoring/rules-engine";
import { generateJustification } from "../scoring/justification";
import { createLogger } from "../lib/logger";

const logger = createLogger("FEED_WORKER");

export async function generateFeeds(): Promise<void> {
  const activeUsers = await db
    .select({
      userId: users.id,
      skills: userProfiles.skills,
      currentLocation: userProfiles.currentLocation,
      experienceYears: userProfiles.experienceYears,
      contractTypes: userPreferences.contractTypes,
      salaryMin: userPreferences.salaryMin,
      salaryMax: userPreferences.salaryMax,
      remotePreference: userPreferences.remotePreference,
      sectors: userPreferences.sectors,
      preferredLocation: userPreferences.preferredLocation,
      locationRadius: userPreferences.locationRadius,
      negativeKeywords: userPreferences.negativeKeywords,
    })
    .from(users)
    .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
    .innerJoin(userPreferences, eq(users.id, userPreferences.userId))
    .where(
      sql`(${users.trialEndsAt} > NOW() OR ${users.trialEndsAt} IS NULL)`,
    );

  if (activeUsers.length === 0) {
    logger.info("No active users with profiles");
    return;
  }

  const recentOffers = await db
    .select()
    .from(rawOffers)
    .where(sql`${rawOffers.createdAt} > NOW() - INTERVAL '24 hours'`);

  logger.info(`Scoring ${recentOffers.length} offers for ${activeUsers.length} users`);

  for (const user of activeUsers) {
    let inserted = 0;

    for (const offer of recentOffers) {
      const existing = await db
        .select({ id: userFeeds.id })
        .from(userFeeds)
        .where(
          and(eq(userFeeds.userId, user.userId), eq(userFeeds.offerId, offer.id)),
        )
        .limit(1);

      if (existing.length > 0) continue;

      const result = scoreOffer(
        {
          title: offer.title,
          company: offer.company,
          location: offer.location,
          salary: offer.salary,
          contractType: offer.contractType,
        },
        {
          skills: (user.skills as string[]) ?? [],
          currentLocation: user.currentLocation,
          experienceYears: user.experienceYears,
        },
        {
          contractTypes: (user.contractTypes as string[]) ?? [],
          salaryMin: user.salaryMin,
          salaryMax: user.salaryMax,
          remotePreference: (user.remotePreference as "onsite" | "hybrid" | "remote" | "any") ?? "any",
          sectors: (user.sectors as string[]) ?? [],
          preferredLocation: user.preferredLocation,
          locationRadius: user.locationRadius,
          negativeKeywords: (user.negativeKeywords as string[]) ?? [],
        },
      );

      if (result.disqualified || result.score === 0) continue;

      await db.insert(userFeeds).values({
        userId: user.userId,
        offerId: offer.id,
        score: result.score,
        justification: generateJustification(result),
        status: "pending",
      });

      inserted++;
    }

    logger.info(`User ${user.userId}: ${inserted} new feed items`);
  }
}
