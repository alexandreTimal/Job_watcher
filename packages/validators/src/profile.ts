import { z } from "zod/v4";

export const extractedProfileSchema = z.object({
  skills: z.array(z.string()),
  experienceYears: z.number().int().min(0).nullable(),
  currentLocation: z.string().nullable(),
  currentTitle: z.string().nullable(),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;

export const preferencesSchema = z
  .object({
    contractTypes: z.array(z.string()).default([]),
    salaryMin: z.number().int().min(0).nullable().default(null),
    salaryMax: z.number().int().min(0).nullable().default(null),
    remotePreference: z.enum(["onsite", "hybrid", "remote", "any"]).default("any"),
    sectors: z.array(z.string()).default([]),
    locationRadius: z.number().int().min(0).nullable().default(null),
    preferredLocation: z.string().nullable().default(null),
    negativeKeywords: z.array(z.string()).default([]),
  })
  .refine((data) => data.salaryMin == null || data.salaryMax == null || data.salaryMin <= data.salaryMax, {
    message: "salaryMin must be less than or equal to salaryMax",
  });

export type Preferences = z.infer<typeof preferencesSchema>;
