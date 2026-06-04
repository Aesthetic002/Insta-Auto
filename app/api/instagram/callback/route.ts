import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import {
  discoverIgAccounts,
  exchangeCodeForUserToken,
  upgradeToLongLivedUserToken,
} from "@/lib/instagram/oauth";
import { getPublicOrigin, publicUrl } from "@/lib/origin";

const STATE_COOKIE = "ig_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(publicUrl(request, "/"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_reason");

  if (error) return redirectToSettings(request, { error: errorReason ?? error });
  if (!code || !state) return redirectToSettings(request, { error: "missing_code_or_state" });

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return redirectToSettings(request, { error: "state_mismatch" });
  }

  const redirectUri = `${getPublicOrigin(request)}/api/instagram/callback`;

  try {
    const short = await exchangeCodeForUserToken({ code, redirectUri });
    const long = await upgradeToLongLivedUserToken(short.accessToken);
    const { accounts, debug } = await discoverIgAccounts(long.accessToken);

    console.log("[ig-callback] discovery debug:");
    for (const line of debug) console.log("  •", line);

    if (accounts.length === 0) {
      return redirectToSettings(request, { error: "no_ig_accounts" });
    }

    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000)
      : null;

    for (const acc of accounts) {
      await db.socialAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "INSTAGRAM",
            accountId: acc.igBusinessId,
          },
        },
        create: {
          userId: session.user.id,
          platform: "INSTAGRAM",
          accountId: acc.igBusinessId,
          username: acc.username,
          displayName: acc.username ?? acc.pageName,
          pageId: acc.pageId,
          accessToken: encrypt(acc.pageAccessToken),
          tokenExpiresAt: expiresAt,
          disconnectedAt: null,
        },
        update: {
          username: acc.username,
          displayName: acc.username ?? acc.pageName,
          pageId: acc.pageId,
          accessToken: encrypt(acc.pageAccessToken),
          tokenExpiresAt: expiresAt,
          disconnectedAt: null,
        },
      });
    }

    return redirectToSettings(request, { connected: String(accounts.length) });
  } catch (err) {
    console.error("[ig-callback] failed", err);
    return redirectToSettings(request, { error: "exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = publicUrl(request, "/settings");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
