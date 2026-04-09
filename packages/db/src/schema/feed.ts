import { index, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { rawOffers } from "./offers";

export const userFeeds = pgTable(
  "user_feeds",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offerId: text("offer_id")
      .notNull()
      .references(() => rawOffers.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    justification: text("justification"),
    status: text("status", {
      enum: ["pending", "saved", "dismissed", "applied"],
    })
      .notNull()
      .default("pending"),
    appliedAt: timestamp("applied_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_feeds_user_status").on(table.userId, table.status),
    index("idx_user_feeds_user_score").on(table.userId, table.score),
  ],
);

export const redirectionLogs = pgTable(
  "redirection_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    offerId: text("offer_id")
      .notNull()
      .references(() => rawOffers.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("idx_redirection_logs_user").on(table.userId)],
);
