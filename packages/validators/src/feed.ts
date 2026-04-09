import { z } from "zod/v4";

export const swipeActionSchema = z.enum(["saved", "dismissed"]);

export type SwipeAction = z.infer<typeof swipeActionSchema>;

export const feedItemSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  contractType: z.string().nullable(),
  urlSource: z.url(),
  score: z.number().int(),
  justification: z.string().nullable(),
  status: z.enum(["pending", "saved", "dismissed", "applied"]),
});

export type FeedItem = z.infer<typeof feedItemSchema>;
