import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "@/lib/instagram/oauth";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Refresh Meta tokens (Instagram + Facebook) within 7 days of expiry.
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS);
  // Only Meta platforms use the refresh flow; LinkedIn/Pinterest have their own rotation
  const due = await db.socialAccount.findMany({
    where: {
      disconnectedAt: null,
      platform: { in: ["INSTAGRAM", "FACEBOOK"] },
      OR: [{ tokenExpiresAt: { lte: cutoff } }, { tokenExpiresAt: null }],
    },
  });

  const results: Array<{ id: string; status: "refreshed" | "failed"; error?: string }> = [];

  for (const acc of due) {
    try {
      const current = decrypt(acc.accessToken);
      const { accessToken, expiresIn } = await refreshAccessToken(current);
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      await db.socialAccount.update({
        where: { id: acc.id },
        data: { accessToken: encrypt(accessToken), tokenExpiresAt: expiresAt },
      });
      results.push({ id: acc.id, status: "refreshed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/refresh-tokens] ${acc.id} failed`, message);
      results.push({ id: acc.id, status: "failed", error: message });
    }
  }

  console.log(`[cron/refresh-tokens] processed ${results.length} account(s)`, results);
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
