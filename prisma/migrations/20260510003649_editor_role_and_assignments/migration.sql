-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'EDITOR');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AssignmentInitiator" AS ENUM ('CREATOR', 'EDITOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "UserRole";

-- CreateTable
CREATE TABLE "EditorAssignment" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" "AssignmentInitiator" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "EditorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditorAssignment_editorId_status_idx" ON "EditorAssignment"("editorId", "status");

-- CreateIndex
CREATE INDEX "EditorAssignment_creatorId_status_idx" ON "EditorAssignment"("creatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EditorAssignment_creatorId_editorId_key" ON "EditorAssignment"("creatorId", "editorId");

-- AddForeignKey
ALTER TABLE "EditorAssignment" ADD CONSTRAINT "EditorAssignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorAssignment" ADD CONSTRAINT "EditorAssignment_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
