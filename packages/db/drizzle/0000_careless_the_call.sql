CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"hashed_password" text,
	"image" text,
	"role" text DEFAULT 'candidate' NOT NULL,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "raw_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"content_hash" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"location" text,
	"salary" text,
	"contract_type" text,
	"url_source" text NOT NULL,
	"source_name" text NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "raw_offers_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "source_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"config" text,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "source_configs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"offers_collected" integer DEFAULT 0 NOT NULL,
	"offers_filtered" integer DEFAULT 0 NOT NULL,
	"offers_inserted" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"error_details" text,
	"duration_ms" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contract_types" jsonb DEFAULT '[]'::jsonb,
	"salary_min" integer,
	"salary_max" integer,
	"remote_preference" text DEFAULT 'any',
	"sectors" jsonb DEFAULT '[]'::jsonb,
	"locations" jsonb DEFAULT '[]'::jsonb,
	"negative_keywords" jsonb DEFAULT '[]'::jsonb,
	"notifications_enabled" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cv_path" text,
	"hard_skills" jsonb DEFAULT '[]'::jsonb,
	"soft_skills" jsonb DEFAULT '[]'::jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"experience_years" integer,
	"current_location" text,
	"current_title" text,
	"languages" jsonb DEFAULT '[]'::jsonb,
	"education_level" text,
	"raw_extraction" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "redirection_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"score" integer NOT NULL,
	"justification" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirection_logs" ADD CONSTRAINT "redirection_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirection_logs" ADD CONSTRAINT "redirection_logs_offer_id_raw_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."raw_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_offer_id_raw_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."raw_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_raw_offers_source" ON "raw_offers" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "idx_raw_offers_hash" ON "raw_offers" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_raw_offers_created" ON "raw_offers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_pipeline_runs_source" ON "pipeline_runs" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "idx_pipeline_runs_started" ON "pipeline_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_redirection_logs_user" ON "redirection_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_feeds_user_status" ON "user_feeds" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_user_feeds_user_score" ON "user_feeds" USING btree ("user_id","score");