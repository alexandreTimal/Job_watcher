import type { TRPCRouterRecord } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";

import { userFeeds, rawOffers } from "@jobfindeer/db/schema";
import { swipeActionSchema } from "@jobfindeer/validators";

import { protectedProcedure } from "../trpc";

export const feedRouter = {
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const items = await ctx.db
        .select({
          id: userFeeds.id,
          offerId: userFeeds.offerId,
          score: userFeeds.score,
          justification: userFeeds.justification,
          status: userFeeds.status,
          title: rawOffers.title,
          company: rawOffers.company,
          location: rawOffers.location,
          salary: rawOffers.salary,
          contractType: rawOffers.contractType,
          urlSource: rawOffers.urlSource,
        })
        .from(userFeeds)
        .innerJoin(rawOffers, eq(userFeeds.offerId, rawOffers.id))
        .where(
          and(
            eq(userFeeds.userId, ctx.session.user.id),
            eq(userFeeds.status, "pending"),
          ),
        )
        .orderBy(desc(userFeeds.score))
        .limit(limit)
        .offset(offset);

      return items;
    }),

  swipe: protectedProcedure
    .input(
      z.object({
        feedItemId: z.string(),
        action: swipeActionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userFeeds)
        .set({ status: input.action })
        .where(
          and(
            eq(userFeeds.id, input.feedItemId),
            eq(userFeeds.userId, ctx.session.user.id),
          ),
        );

      return { success: true };
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ id: userFeeds.id })
      .from(userFeeds)
      .where(
        and(
          eq(userFeeds.userId, ctx.session.user.id),
          eq(userFeeds.status, "pending"),
        ),
      );

    return { pending: result.length };
  }),
} satisfies TRPCRouterRecord;
