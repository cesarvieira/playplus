CREATE TYPE "public"."video_status" AS ENUM('pending', 'queued', 'processing', 'ready', 'error');--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" bigint NOT NULL,
	"duration" integer,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"upload_complete" boolean DEFAULT false NOT NULL,
	"storage_original_key" varchar(512) NOT NULL,
	"storage_hls_prefix" varchar(512),
	"error_reason" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at" DESC NULLS LAST);