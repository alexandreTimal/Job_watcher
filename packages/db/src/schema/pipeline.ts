import { index, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sourceName: text("source_name").notNull(),
    status: text("status", { enum: ["running", "success", "error"] })
      .notNull()
      .default("running"),
    offersCollected: integer("offers_collected").notNull().default(0),
    offersFiltered: integer("offers_filtered").notNull().default(0),
    offersInserted: integer("offers_inserted").notNull().default(0),
    errorsCount: integer("errors_count").notNull().default(0),
    errorDetails: text("error_details"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    index("idx_pipeline_runs_source").on(table.sourceName),
    index("idx_pipeline_runs_started").on(table.startedAt),
  ],
);
