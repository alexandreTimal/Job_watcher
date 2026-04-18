import { z } from "zod/v4";

export const branchEnum = z.enum(["1", "2", "3", "4", "5"]);
export type Branch = z.infer<typeof branchEnum>;

export const freeTextSchema = z.object({
  text: z.string().min(100).max(5000),
});

export const intentAnalysisOutputSchema = z.object({
  branch: branchEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  signals: z.object({
    constraints: z.array(z.string()).default([]),
    tone: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  }),
});

export type IntentAnalysisOutput = z.infer<typeof intentAnalysisOutputSchema>;

// Calibration schemas per branch
export const branch1CalibrationSchema = z.object({
  improvementAxes: z.array(z.string()).min(1).max(3),
  salaryMinimum: z.number().int().positive(),
  remoteLevel: z.enum(["onsite", "hybrid", "mostly_remote", "full_remote"]),
});

export const branch2CalibrationSchema = z.object({
  responsibilityTypes: z.array(z.string()).min(1),
});

export const branch3CalibrationSchema = z.object({
  pivotJobs: z.array(z.string()).min(1),
  salaryDropTolerance: z.enum(["none", "up_to_10", "up_to_20", "more_than_20"]),
  trainingWillingness: z.enum(["self_learning", "employer_paid", "none"]).default("none"),
});

export const branch4CalibrationSchema = z.object({
  maturity: z.enum(["precise", "few_ideas", "not_yet"]),
  acceptedLevel: z.enum(["junior", "intermediate", "both"]).optional(),
  targetJobs: z.array(z.string().min(1)).optional(),
});

export const branch5CalibrationSchema = z.object({
  contractTypes: z.array(z.enum(["alternance", "stage", "first_job"])).min(1),
  studyField: z.string().min(1),
});

export const calibrationByBranchSchemas = {
  "1": branch1CalibrationSchema,
  "2": branch2CalibrationSchema,
  "3": branch3CalibrationSchema,
  "4": branch4CalibrationSchema,
  "5": branch5CalibrationSchema,
} as const;

// Search titles schemas
const nonBlankStringOrNull = z
  .string()
  .nullable()
  .transform((v) => (v === null ? null : v.trim()))
  .transform((v) => (v === null || v.length === 0 ? null : v));

export const searchTitleSchema = z
  .object({
    fr: nonBlankStringOrNull,
    en: nonBlankStringOrNull,
  })
  .refine((t) => t.fr !== null || t.en !== null, {
    message: "Au moins un des champs fr ou en doit être non vide",
  });

export type SearchTitle = z.infer<typeof searchTitleSchema>;

export const searchTitleWithActiveSchema = z
  .object({
    fr: nonBlankStringOrNull,
    en: nonBlankStringOrNull,
    active: z.boolean(),
  })
  .refine((t) => t.fr !== null || t.en !== null, {
    message: "Au moins un des champs fr ou en doit être non vide",
  });

export type SearchTitleWithActive = z.infer<typeof searchTitleWithActiveSchema>;

export const searchTitlesDataSchema = z.object({
  generated_at: z.iso.datetime(),
  branch_used: branchEnum,
  titles: z.array(searchTitleWithActiveSchema).min(1).max(50),
});

export type SearchTitlesData = z.infer<typeof searchTitlesDataSchema>;

export const llmTitleOutputSchema = z.object({
  titles: z.array(searchTitleSchema).min(1).max(18),
});

// ---------------------------------------------------------------------------
// Arbitre de réalité (pipeline de génération de titres V1)
// ---------------------------------------------------------------------------

export const niveauCibleEnum = z.enum([
  "junior",
  "confirmé",
  "senior",
  "lead",
  "manager",
  "director",
]);
export type NiveauCible = z.infer<typeof niveauCibleEnum>;

export const gapDetectedEnum = z.enum([
  "none",
  "mild_downgrade",
  "strong_downgrade",
  "mild_upgrade",
  "strong_upgrade",
]);
export type GapDetected = z.infer<typeof gapDetectedEnum>;

export const arbitreOutputSchema = z.object({
  analyse_realite: z.string().min(10).max(500),
  niveau_cible_effectif: niveauCibleEnum,
  gap_detected: gapDetectedEnum,
  rationale_debug: z.string().min(1).max(500),
});

export type ArbitreOutput = z.infer<typeof arbitreOutputSchema>;
