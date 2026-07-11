-- Rollback manual da migration 0003_busy_centennial
-- Aplicar com: node --env-file=../../.env psql "$DATABASE_URL" -f drizzle/rollback/0003_busy_centennial.down.sql
-- (ou executar o conteúdo via cliente Postgres). Ordem inversa: pivots -> entidades -> colunas -> tipo.

DROP TABLE IF EXISTS "video_actors";--> statement-breakpoint
DROP TABLE IF EXISTS "video_directors";--> statement-breakpoint
DROP TABLE IF EXISTS "video_genres";--> statement-breakpoint
DROP TABLE IF EXISTS "video_tags";--> statement-breakpoint

DROP TABLE IF EXISTS "actors";--> statement-breakpoint
DROP TABLE IF EXISTS "directors";--> statement-breakpoint
DROP TABLE IF EXISTS "genres";--> statement-breakpoint
DROP TABLE IF EXISTS "tags";--> statement-breakpoint

ALTER TABLE "videos" DROP COLUMN IF EXISTS "score";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "rating_reason";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "rating";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "release_date";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "description";--> statement-breakpoint

DROP TYPE IF EXISTS "public"."video_rating";
