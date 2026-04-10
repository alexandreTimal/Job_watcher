import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import {
  users,
  userProfiles,
  userPreferences,
  userFeeds,
  userInteractions,
  redirectionLogs,
} from "@jobfindeer/db/schema";
import {
  preferencesSchema,
  extractedProfileSchema,
  freeTextSchema,
  branchEnum,
} from "@jobfindeer/validators";

import { protectedProcedure } from "../trpc";

export const profileRouter = {
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, ctx.session.user.id))
      .limit(1);

    const preferences = await ctx.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.session.user.id))
      .limit(1);

    return {
      profile: profile[0] ?? null,
      preferences: preferences[0] ?? null,
    };
  }),

  saveExtraction: protectedProcedure
    .input(extractedProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const allSkills = [...input.hardSkills, ...input.softSkills];

      const data = {
        hardSkills: input.hardSkills,
        softSkills: input.softSkills,
        skills: allSkills,
        experienceYears: input.experienceYears,
        currentLocation: input.currentLocation,
        currentTitle: input.currentTitle,
        languages: input.languages,
        educationLevel: input.educationLevel,
        rawExtraction: input as unknown,
        updatedAt: new Date(),
      };

      const existing = await ctx.db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.session.user.id))
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(userProfiles)
          .set(data)
          .where(eq(userProfiles.userId, ctx.session.user.id));
      } else {
        await ctx.db.insert(userProfiles).values({
          userId: ctx.session.user.id,
          ...data,
        });
      }

      return { success: true };
    }),

  updatePreferences: protectedProcedure
    .input(preferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.session.user.id))
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(userPreferences)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(userPreferences.userId, ctx.session.user.id));
      } else {
        await ctx.db.insert(userPreferences).values({
          userId: ctx.session.user.id,
          ...input,
        });
      }

      return { success: true };
    }),
  saveBranch: protectedProcedure
    .input(
      z.object({
        branch: branchEnum,
        freeTextRaw: z.string().optional(),
        calibrationAnswers: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userProfiles)
        .set({
          branch: input.branch,
          freeTextRaw: input.freeTextRaw,
          calibrationAnswers: input.calibrationAnswers,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, ctx.session.user.id));

      return { success: true };
    }),

  exportData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [profile] = await ctx.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    const [preferences] = await ctx.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    const feeds = await ctx.db
      .select()
      .from(userFeeds)
      .where(eq(userFeeds.userId, userId));

    const interactions = await ctx.db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId));

    const redirects = await ctx.db
      .select()
      .from(redirectionLogs)
      .where(eq(redirectionLogs.userId, userId));

    return {
      profile: profile ?? null,
      preferences: preferences ?? null,
      feeds,
      interactions,
      redirectionLogs: redirects,
      exportedAt: new Date().toISOString(),
    };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Cascade delete handles: profiles, preferences, feeds, interactions, redirectionLogs, sessions, accounts
    await ctx.db.delete(users).where(eq(users.id, userId));
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
