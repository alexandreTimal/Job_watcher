import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { rawOffers } from "./offers";

export const userProfiles = pgTable("user_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  cvPath: text("cv_path"),
  hardSkills: jsonb("hard_skills").$type<string[]>().default([]),
  softSkills: jsonb("soft_skills").$type<string[]>().default([]),
  // Kept for scoring backward compat — populated as hardSkills + softSkills
  skills: jsonb("skills").$type<string[]>().default([]),
  experienceYears: integer("experience_years"),
  currentLocation: text("current_location"),
  currentTitle: text("current_title"),
  languages: jsonb("languages").$type<{ name: string; level: string | null }[]>().default([]),
  educationLevel: text("education_level"),
  rawExtraction: jsonb("raw_extraction"),
  // Onboarding v3 fields
  branch: text("branch", {
    enum: ["1", "2", "3", "4", "5"],
  }),
  freeTextRaw: text("free_text_raw"),
  calibrationAnswers: jsonb("calibration_answers"),
  currentEmployer: text("current_employer"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  contractTypes: jsonb("contract_types").$type<string[]>().default([]),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  remotePreference: text("remote_preference", {
    enum: ["onsite", "hybrid", "remote", "any"],
  }).default("any"),
  // Legacy — kept to avoid destructive migration, unused in app code
  sectors: jsonb("sectors").$type<string[]>().default([]),
  negativeKeywords: jsonb("negative_keywords").$type<string[]>().default([]),
  // Onboarding v3 fields
  locationMode: text("location_mode", {
    enum: ["cities", "france", "remote_only"],
  }).default("cities"),
  cities: jsonb("cities")
    .$type<{ name: string; lat: number; lng: number; radius_km: number }[]>()
    .default([]),
  defaultRadiusKm: integer("default_radius_km").default(25),
  remoteFriendly: boolean("remote_friendly").default(false),
  locations: jsonb("locations")
    .$type<{ label: string; radius: number | null }[]>()
    .default([]),
  workSchedule: text("work_schedule", {
    enum: ["full_time", "part_time", "any"],
  }).default("any"),
  notificationsEnabled: text("notifications_enabled", {
    enum: ["true", "false"],
  })
    .notNull()
    .default("true"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const userInteractions = pgTable(
  "user_interactions",
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
    eventType: text("event_type", {
      enum: ["impression", "click", "save", "dismiss", "apply"],
    }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_interactions_user").on(table.userId),
    index("idx_user_interactions_offer").on(table.offerId),
  ],
);
