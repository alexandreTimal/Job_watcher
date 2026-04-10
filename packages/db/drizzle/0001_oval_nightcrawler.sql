ALTER TABLE "raw_offers" ADD COLUMN "location_lat" real;--> statement-breakpoint
ALTER TABLE "raw_offers" ADD COLUMN "location_lng" real;--> statement-breakpoint
ALTER TABLE "raw_offers" ADD COLUMN "remote_type" text;--> statement-breakpoint
ALTER TABLE "raw_offers" ADD COLUMN "required_experience_years" integer;--> statement-breakpoint
ALTER TABLE "raw_offers" ADD COLUMN "company_size" text;--> statement-breakpoint
ALTER TABLE "raw_offers" ADD COLUMN "description_raw" text;