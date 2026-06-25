import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeCodeForToken,
  getAccountName,
} from "@/lib/dropbox/oauth";
import { getPublicOrigin, publicUrl } from "@/lib/origin";

const STATE_COOKIE = "dbx_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(publicUrl(request, "/"));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectToSettings(request, { error: `dropbox_${error}` });
  if (!code || !state)
    return redirectToSettings(request, { error: "dropbox_missing_code" });

  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expected || expected !== state)
    return redirectToSettings(request, { error: "dropbox_state_mismatch" });

  try {
    const redirectUri = `${getPublicOrigin(request)}/api/dropbox/callback`;
    const tok = await exchangeCodeForToken({ code, redirectUri });
    const displayName = await getAccountName(tok.accessToken);

    await db.storageConnection.upsert({
      where: {
        userId_provider: { userId: session.user.id, provider: "DROPBOX" },
      },
      create: {
        userId: session.user.id,
        provider: "DROPBOX",
        accountId: tok.accountId,
        displayName,
        accessToken: encrypt(tok.accessToken),
        refreshToken: tok.refreshToken ? encrypt(tok.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tok.expiresInSec * 1000),
        disconnectedAt: null,
      },
      update: {
        accountId: tok.accountId,
        displayName,
        accessToken: encrypt(tok.accessToken),
        refreshToken: tok.refreshToken ? encrypt(tok.refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + tok.expiresInSec * 1000),
        disconnectedAt: null,
      },
    });

    return redirectToSettings(request, { connected_storage: "Dropbox" });
  } catch (err) {
    console.error("[dropbox-callback]", err);
    return redirectToSettings(request, { error: "dropbox_exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = publicUrl(request, "/settings");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
