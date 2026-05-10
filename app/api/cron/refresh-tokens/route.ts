import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "@/lib/instagram/oauth";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Refresh any IG account tokens within 7 days of expiry. Meta long-lived
// tokens last 60 days; refreshing within the last 7 buys another 60.
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS);
  const due = await db.igAccount.findMany({
    where: {
      disconnectedAt: null,
      OR: [{ tokenExpiresAt: { lte: cutoff } }, { tokenExpiresAt: null }],
    },
  });

  const results: Array<{ id: string; status: "refreshed" | "failed"; error?: string }> =
    [];

  for (const acc of due) {
    try {
      const current = decrypt(acc.pageAccessToken);
      const { accessToken, expiresIn } = await refreshAccessToken(current);
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

      await db.igAccount.update({
        where: { id: acc.id },
        data: {
          pageAccessToken: encrypt(accessToken),
          tokenExpiresAt: expiresAt,
        },
      });
      results.push({ id: acc.id, status: "refreshed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/refresh-tokens] ${acc.id} failed`, message);
      results.push({ id: acc.id, status: "failed", error: message });
    }
  }

  console.log(
    `[cron/refresh-tokens] processed ${results.length} account(s)`,
    results
  );
  return NextResponse.json({ at: new Date().toISOString(), results });
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}
