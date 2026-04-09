import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { userProfiles, userPreferences } from "@jobfindeer/db/schema";
import { preferencesSchema, extractedProfileSchema } from "@jobfindeer/validators";

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
      const existing = await ctx.db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.session.user.id))
        .limit(1);

      if (existing.length > 0) {
        await ctx.db
          .update(userProfiles)
          .set({
            skills: input.skills,
            experienceYears: input.experienceYears,
            currentLocation: input.currentLocation,
            currentTitle: input.currentTitle,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, ctx.session.user.id));
      } else {
        await ctx.db.insert(userProfiles).values({
          userId: ctx.session.user.id,
          skills: input.skills,
          experienceYears: input.experienceYears,
          currentLocation: input.currentLocation,
          currentTitle: input.currentTitle,
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
} satisfies TRPCRouterRecord;
