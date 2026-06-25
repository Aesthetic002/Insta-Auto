-- Add YouTube as a publish platform + a refreshToken column for OAuth
-- platforms (YouTube/Google) whose access tokens expire hourly.

ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'YOUTUBE';

ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
