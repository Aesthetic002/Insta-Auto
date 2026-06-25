// Resolve a usable Dropbox access token for a stored StorageConnection,
// refreshing it (and persisting the new one) when expired.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "./oauth";

export async function getValidDropboxToken(userId: string): Promise<string> {
  const conn = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider: "DROPBOX" } },
  });
  if (!conn || conn.disconnectedAt) {
    throw new Error("Dropbox not connected");
  }

  const notExpired =
    conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() > Date.now() + 60_000;
  if (notExpired) {
    return decrypt(conn.accessToken);
  }

  // Expired (or about to) — refresh.
  if (!conn.refreshToken) {
    // No refresh token: best effort, return what we have and let the call fail
    // with a clear Dropbox error if it's truly dead.
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
