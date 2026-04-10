import type { TRPCRouterRecord } from "@trpc/server";
import { desc, eq, sql, gte } from "drizzle-orm";
import { z } from "zod/v4";

import {
  sourceConfigs,
  pipelineRuns,
  users,
  rawOffers,
} from "@jobfindeer/db/schema";

import { adminProcedure } from "../trpc";

export const adminRouter = {
  sources: adminProcedure.query(async ({ ctx }) => {
    const sources = await ctx.db.select().from(sourceConfigs);

    const metrics = await ctx.db
      .select({
        sourceName: pipelineRuns.sourceName,
        totalRuns: sql<number>`count(*)`,
        successRuns: sql<number>`count(*) filter (where ${pipelineRuns.status} = 'success')`,
        totalCollected: sql<number>`coalesce(sum(${pipelineRuns.offersCollected}), 0)`,
        totalInserted: sql<number>`coalesce(sum(${pipelineRuns.offersInserted}), 0)`,
      })
      .from(pipelineRuns)
      .where(gte(pipelineRuns.startedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .groupBy(pipelineRuns.sourceName);

    const metricsMap = Object.fromEntries(
      metrics.map((m) => [m.sourceName, m]),
    );

    return sources.map((s) => ({
      ...s,
      metrics24h: metricsMap[s.name] ?? null,
    }));
  }),

  metrics: adminProcedure.query(async ({ ctx }) => {
    const [offersToday] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(rawOffers)
      .where(gte(rawOffers.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    const [totalUsers] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const recentRuns = await ctx.db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(20);

    return {
      offersToday: offersToday?.count ?? 0,
      totalUsers: totalUsers?.count ?? 0,
      recentRuns,
    };
  }),

  toggleSource: adminProcedure
    .input(z.object({ sourceId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(sourceConfigs)
        .set({ active: input.active })
        .where(eq(sourceConfigs.id, input.sourceId));
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
