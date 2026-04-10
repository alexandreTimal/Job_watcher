import { z } from "zod/v4";

export const eventTypeEnum = z.enum([
  "impression",
  "click",
  "save",
  "dismiss",
  "apply",
]);

export type EventType = z.infer<typeof eventTypeEnum>;

export const userInteractionSchema = z.object({
  userId: z.string().min(1),
  offerId: z.string().min(1),
  eventType: eventTypeEnum,
});

export type UserInteraction = z.infer<typeof userInteractionSchema>;
