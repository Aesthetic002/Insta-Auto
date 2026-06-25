-- Cloud storage connections (Dropbox, Google Drive) for importing media.
-- Additive only.

CREATE TYPE "StorageProvider" AS ENUM ('DROPBOX', 'GOOGLE_DRIVE');

CREATE TABLE "StorageConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "accountId" TEXT,
    "displayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "StorageConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageConnection_userId_provider_key" ON "StorageConnection"("userId", "provider");
CREATE INDEX "StorageConnection_userId_idx" ON "StorageConnection"("userId");

ALTER TABLE "StorageConnection" ADD CONSTRAINT "StorageConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
