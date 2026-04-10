CREATE TABLE "user_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "location_mode" text DEFAULT 'cities';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "cities" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "default_radius_km" integer DEFAULT 25;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "remote_friendly" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "work_schedule" text DEFAULT 'any';--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "free_text_raw" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "calibration_answers" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "current_employer" text;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_offer_id_raw_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."raw_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_interactions_user" ON "user_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_offer" ON "user_interactions" USING btree ("offer_id");