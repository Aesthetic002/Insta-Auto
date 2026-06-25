// Resolve a usable Google Drive access token for a stored StorageConnection,
// refreshing transparently when expired.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "./oauth";

export async function getValidDriveToken(userId: string): Promise<string> {
  const conn = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE_DRIVE" } },
  });
  if (!conn || conn.disconnectedAt) {
    throw new Error("Google Drive not connected");
  }

  const notExpired =
    conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() > Date.now() + 60_000;
  if (notExpired) {
    return decrypt(conn.accessToken);
  }

  if (!conn.refreshToken) {
    return decrypt(conn.accessToken);
  }
  const { accessToken, expiresInSec } = await refreshAccessToken(
    decrypt(conn.refreshToken)
  );
  await db.storageConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encrypt(accessToken),
      tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
    },
  });
  return accessToken;
}
