import {
  index,
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const sourceConfigs = pgTable("source_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  type: text("type", { enum: ["api", "scraping"] }).notNull(),
  active: boolean("active").notNull().default(true),
  config: text("config"), // JSON string for source-specific config
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const rawOffers = pgTable(
  "raw_offers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contentHash: text("content_hash").notNull().unique(),
    title: text("title").notNull(),
    company: text("company"),
    location: text("location"),
    salary: text("salary"),
    contractType: text("contract_type"),
    urlSource: text("url_source").notNull(),
    sourceName: text("source_name").notNull(),
    publishedAt: timestamp("published_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_raw_offers_source").on(table.sourceName),
    index("idx_raw_offers_hash").on(table.contentHash),
    index("idx_raw_offers_created").on(table.createdAt),
  ],
);
