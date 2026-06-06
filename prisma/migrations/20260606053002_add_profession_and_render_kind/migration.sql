-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('DENTAL');

-- CreateEnum
CREATE TYPE "RenderKind" AS ENUM ('VIDEO', 'IMAGE');

-- AlterTable
ALTER TABLE "RenderJob" ADD COLUMN     "kind" "RenderKind" NOT NULL DEFAULT 'VIDEO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profession" "Profession";
