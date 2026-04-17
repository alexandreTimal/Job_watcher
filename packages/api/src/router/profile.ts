import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
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
  searchTitlesDataSchema,
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

  saveSearchTitles: protectedProcedure
    .input(searchTitlesDataSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ branch: userProfiles.branch })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.session.user.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil introuvable. Completez d'abord l'onboarding.",
        });
      }

      if (existing.branch && existing.branch !== input.branch_used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La branche des titres ne correspond pas au profil courant.",
        });
      }

      const result = await ctx.db
        .update(userProfiles)
        .set({
          searchTitles: input,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, ctx.session.user.id))
        .returning({ id: userProfiles.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil introuvable.",
        });
      }

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
