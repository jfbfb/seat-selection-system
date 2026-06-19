-- AlterTable
ALTER TABLE "classes" ADD COLUMN "podium_col" INTEGER NOT NULL DEFAULT 1;

-- Backfill: center podium for existing classes
UPDATE "classes" SET "podium_col" = CEIL("cols"::float / 2);
