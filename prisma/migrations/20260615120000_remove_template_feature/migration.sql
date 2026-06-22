-- Remove the studio/templates feature: drop its tables, enums, and the
-- User.profession column. All additive in reverse — no other tables depend
-- on these.

-- Drop tables (FKs cascade from User were defined onDelete: Cascade).
DROP TABLE IF EXISTS "RenderJob";
DROP TABLE IF EXISTS "MediaAsset";
DROP TABLE IF EXISTS "BusinessProfile";

-- Drop the profession column from User.
ALTER TABLE "User" DROP COLUMN IF EXISTS "profession";

-- Drop the now-unused enums.
DROP TYPE IF EXISTS "RenderKind";
DROP TYPE IF EXISTS "RenderStatus";
DROP TYPE IF EXISTS "MediaAssetKind";
DROP TYPE IF EXISTS "Profession";
