import { z } from "zod/v4";

export const languageSchema = z.object({
  name: z.string(),
  level: z.string().nullable(),
});

export const workHistoryItemSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
});

export const educationItemSchema = z.object({
  degree: z.string(),
  school: z.string().nullable(),
  year: z.number().int().nullable(),
});

export const extractedProfileSchema = z.object({
  currentTitle: z.string().nullable(),
  currentLocation: z.string().nullable(),
  experienceYears: z.number().int().min(0).nullable(),
  hardSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  languages: z.array(languageSchema).default([]),
  educationLevel: z.string().nullable(),
  workHistory: z.array(workHistoryItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  certifications: z.array(z.string()).default([]),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;
export type Language = z.infer<typeof languageSchema>;
export type WorkHistoryItem = z.infer<typeof workHistoryItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;

export const preferencesSchema = z
  .object({
    contractTypes: z.array(z.string()).default([]),
    salaryMin: z.number().int().min(0).nullable().default(null),
    salaryMax: z.number().int().min(0).nullable().default(null),
    remotePreference: z.enum(["onsite", "hybrid", "remote", "any"]).default("any"),
    sectors: z.array(z.string()).default([]),
    locations: z.array(z.object({
      label: z.string(),
      radius: z.number().int().min(5).max(200).nullable().default(null),
    })).default([]),
    negativeKeywords: z.array(z.string()).default([]),
  })
  .refine((data) => data.salaryMin == null || data.salaryMax == null || data.salaryMin <= data.salaryMax, {
    message: "salaryMin must be less than or equal to salaryMax",
  });

export type Preferences = z.infer<typeof preferencesSchema>;
