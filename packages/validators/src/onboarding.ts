import { z } from "zod/v4";

export const branchEnum = z.enum(["1", "2", "3", "4", "5"]);
export type Branch = z.infer<typeof branchEnum>;

export const freeTextSchema = z.object({
  text: z.string().min(100).max(500),
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
});

export const branch4CalibrationSchema = z.object({
  maturity: z.enum(["precise", "few_ideas", "not_yet"]),
  acceptedLevel: z.enum(["junior", "intermediate", "both"]).optional(),
});

export const branch5CalibrationSchema = z.object({
  contractType: z.enum(["alternance", "stage"]),
  studyField: z.string().min(1),
});

export const calibrationByBranchSchemas = {
  "1": branch1CalibrationSchema,
  "2": branch2CalibrationSchema,
  "3": branch3CalibrationSchema,
  "4": branch4CalibrationSchema,
  "5": branch5CalibrationSchema,
} as const;
