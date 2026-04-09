import type { TRPCRouterRecord } from "@trpc/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod/v4";

import { userFeeds, rawOffers, redirectionLogs } from "@jobfindeer/db/schema";

import { protectedProcedure } from "../trpc";

export const offersRouter = {
  saved: protectedProcedure
    .input(
      z.object({
        status: z.enum(["saved", "applied"]).optional().default("saved"),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const statusFilter = input?.status ?? "saved";
      const statuses = statusFilter === "saved" ? ["saved", "applied"] as const : [statusFilter] as const;

      const items = await ctx.db
        .select({
          feedId: userFeeds.id,
          offerId: userFeeds.offerId,
          score: userFeeds.score,
          justification: userFeeds.justification,
          status: userFeeds.status,
          appliedAt: userFeeds.appliedAt,
          savedAt: userFeeds.createdAt,
          title: rawOffers.title,
          company: rawOffers.company,
          location: rawOffers.location,
          salary: rawOffers.salary,
          contractType: rawOffers.contractType,
          urlSource: rawOffers.urlSource,
          publishedAt: rawOffers.publishedAt,
        })
        .from(userFeeds)
        .innerJoin(rawOffers, eq(userFeeds.offerId, rawOffers.id))
        .where(
          and(
            eq(userFeeds.userId, ctx.session.user.id),
            inArray(userFeeds.status, statuses),
          ),
        )
        .orderBy(desc(userFeeds.createdAt));

      return items;
    }),

  redirect: protectedProcedure
    .input(z.object({ offerId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(redirectionLogs).values({
        userId: ctx.session.user.id,
        offerId: input.offerId,
        url: input.url,
      });

      return { success: true };
    }),

  markApplied: protectedProcedure
    .input(z.object({ feedItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userFeeds)
        .set({ status: "applied", appliedAt: new Date() })
        .where(
          and(
            eq(userFeeds.id, input.feedItemId),
            eq(userFeeds.userId, ctx.session.user.id),
          ),
        );

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
