import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

import { users } from "./auth";

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
  sectors: jsonb("sectors").$type<string[]>().default([]),
  locations: jsonb("locations").$type<{ label: string; radius: number | null }[]>().default([]),
  negativeKeywords: jsonb("negative_keywords").$type<string[]>().default([]),
  notificationsEnabled: text("notifications_enabled", {
    enum: ["true", "false"],
  })
    .notNull()
    .default("true"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
