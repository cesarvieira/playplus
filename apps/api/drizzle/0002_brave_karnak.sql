ALTER TABLE "videos" ADD COLUMN "thumbnail_key" varchar(512);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "videos" SET "published_at" = "created_at" WHERE "published_at" IS NULL;