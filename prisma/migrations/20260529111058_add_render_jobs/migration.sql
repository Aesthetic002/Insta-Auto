/*
  Warnings:

  - You are about to drop the column `igAccountId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `IgAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'PINTEREST');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'PHOTO', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('PENDING', 'PUBLISHING', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RenderStatus" AS ENUM ('QUEUED', 'RENDERING', 'UPLOADING', 'DONE', 'FAILED');

-- DropForeignKey
ALTER TABLE "IgAccount" DROP CONSTRAINT "IgAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_igAccountId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "igAccountId",
DROP COLUMN "videoUrl",
ADD COLUMN     "mediaType" "MediaType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platform" "Platform",
ADD COLUMN     "platformPostId" TEXT,
ADD COLUMN     "platformUrl" TEXT,
ADD COLUMN     "socialAccountId" TEXT;

-- DropTable
DROP TABLE "IgAccount";

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "pageId" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'PENDING',
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "errorMessage" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "status" "RenderStatus" NOT NULL DEFAULT 'QUEUED',
    "outputUrl" TEXT,
    "thumbnailUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_userId_platform_idx" ON "SocialAccount"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_accountId_key" ON "SocialAccount"("userId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "PostTarget_postId_idx" ON "PostTarget"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_socialAccountId_key" ON "PostTarget"("postId", "socialAccountId");

-- CreateIndex
CREATE INDEX "RenderJob_userId_createdAt_idx" ON "RenderJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RenderJob_status_idx" ON "RenderJob"("status");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
