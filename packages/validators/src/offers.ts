import { z } from "zod/v4";

export const rawJobOfferSchema = z.object({
  title: z.string().min(1),
  company: z.string().nullable(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  contractType: z.string().nullable(),
  urlSource: z.url(),
  sourceName: z.string().min(1),
  publishedAt: z.coerce.date().nullable(),
});

export type RawJobOffer = z.infer<typeof rawJobOfferSchema>;

export const normalizedOfferSchema = rawJobOfferSchema.extend({
  contentHash: z.string().min(1),
  titleNormalized: z.string().min(1),
  companyNormalized: z.string().nullable(),
});

export type NormalizedOffer = z.infer<typeof normalizedOfferSchema>;

export const scoredOfferSchema = normalizedOfferSchema.extend({
  score: z.number().min(0).max(100),
  scoreBreakdown: z.object({
    hardFilters: z.number(),
    softCriteria: z.number(),
    lexical: z.number(),
  }),
  justification: z.string(),
  matchedBranch: z.string().nullable(),
});

export type ScoredOffer = z.infer<typeof scoredOfferSchema>;
