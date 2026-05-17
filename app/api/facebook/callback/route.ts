import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeCodeForUserToken,
  upgradeToLongLivedUserToken,
} from "@/lib/instagram/oauth";

const STATE_COOKIE = "fb_oauth_state";
const GRAPH_BASE = "https://graph.facebook.com";

function v() { return process.env.META_GRAPH_VERSION ?? "v23.0"; }

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
}

// Fetch pages via /me/accounts (works for standard Facebook Login)
async function fetchPagesFromMeAccounts(token: string): Promise<FbPage[]> {
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/me/accounts?fields=id,name,access_token,picture&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) return [];
  return json.data ?? [];
}

// Fallback for Business Login: discover page IDs from granular_scopes on the debug token,
// then fetch each page's token individually.
async function fetchPagesFromGranularScopes(userToken: string): Promise<FbPage[]> {
  const dbgRes = await fetch(
    `${GRAPH_BASE}/${v()}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(`${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`)}`,
    { cache: "no-store" }
  );
  const dbgJson = await dbgRes.json();
  const granular: Array<{ scope: string; target_ids?: string[] }> =
    dbgJson?.data?.granular_scopes ?? [];

  const pageIds = new Set<string>();
  for (const g of granular) {
    if (g.target_ids && (
      g.scope === "pages_show_list" ||
      g.scope === "pages_read_engagement" ||
      g.scope === "pages_manage_posts"
    )) {
      for (const id of g.target_ids) pageIds.add(id);
    }
  }

  const pages: FbPage[] = [];
  for (const pageId of pageIds) {
    const res = await fetch(
      `${GRAPH_BASE}/${v()}/${pageId}?fields=id,name,access_token,picture&access_token=${encodeURIComponent(userToken)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (res.ok && json.access_token) {
      pages.push(json as FbPage);
    }
  }
  return pages;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectToSettings(request, { error: `facebook_${error}` });
  if (!code || !state) return redirectToSettings(request, { error: "facebook_missing_code" });

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return redirectToSettings(request, { error: "facebook_state_mismatch" });
  }

  try {
    const redirectUri = `${url.origin}/api/facebook/callback`;
    const short = await exchangeCodeForUserToken({ code, redirectUri });
    const long = await upgradeToLongLivedUserToken(short.accessToken);

    // Try /me/accounts first; fall back to granular_scopes for Business Login
    let pages = await fetchPagesFromMeAccounts(long.accessToken);
    if (pages.length === 0) {
      pages = await fetchPagesFromGranularScopes(long.accessToken);
    }

    if (pages.length === 0) {
      return redirectToSettings(request, { error: "facebook_no_pages" });
    }

    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000)
      : null;

    for (const page of pages) {
      await db.socialAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "FACEBOOK",
            accountId: page.id,
          },
        },
        create: {
          userId: session.user.id,
          platform: "FACEBOOK",
          accountId: page.id,
          pageId: page.id,
          username: page.name,
          displayName: page.name,
          avatarUrl: page.picture?.data?.url ?? null,
          accessToken: encrypt(page.access_token),
          tokenExpiresAt: expiresAt,
          disconnectedAt: null,
        },
        update: {
          username: page.name,
          displayName: page.name,
          avatarUrl: page.picture?.data?.url ?? null,
          accessToken: encrypt(page.access_token),
          tokenExpiresAt: expiresAt,
          disconnectedAt: null,
        },
      });
    }

    return redirectToSettings(request, { connected_platform: "Facebook" });
  } catch (err) {
    console.error("[facebook-callback] failed", err);
    return redirectToSettings(request, { error: "facebook_exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = new URL("/settings", request.url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
