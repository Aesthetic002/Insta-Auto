// Meta OAuth helpers for connecting an Instagram Business account.
// Flow:
//   1. Redirect user to dialog/oauth with our app id + scopes
//   2. Meta calls back with code -> exchange for short-lived user token
//   3. Upgrade to long-lived user token (60d)
//   4. List user's Pages -> each page has its own page access token
//   5. For each page, look up linked instagram_business_account
//
// We persist (page_id, page_access_token, ig_business_id) per IG account.
// Page access tokens derived from a long-lived user token do NOT expire,
// but we still record an `expiresAt` for future refresh logic.

const GRAPH_BASE = "https://graph.facebook.com";
const FB_BASE = "https://www.facebook.com";

export const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

function v() {
  return process.env.META_GRAPH_VERSION ?? "v23.0";
}

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: required("META_APP_ID"),
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: IG_SCOPES,
    response_type: "code",
  });
  return `${FB_BASE}/${v()}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForUserToken(opts: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    client_id: required("META_APP_ID"),
    client_secret: required("META_APP_SECRET"),
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/oauth/access_token?${params.toString()}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) throw graphError("exchangeCodeForUserToken", json);
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function upgradeToLongLivedUserToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: required("META_APP_ID"),
    client_secret: required("META_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/oauth/access_token?${params.toString()}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) throw graphError("upgradeToLongLivedUserToken", json);
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

/**
 * Refresh a (long-lived) user/page access token by exchanging it for a fresh
 * one. Same endpoint as the upgrade — Meta extends the expiry by another 60 days.
 */
export async function refreshAccessToken(
  currentToken: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  return upgradeToLongLivedUserToken(currentToken);
}

export interface DiscoveredIgAccount {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string;
  username?: string;
}

export async function discoverIgAccounts(
  longLivedUserToken: string
): Promise<{ accounts: DiscoveredIgAccount[]; debug: string[] }> {
  const debug: string[] = [];

  // 1. Try /me/accounts first (works for legacy Pages-managed flow)
  const pagesRes = await fetch(
    `${GRAPH_BASE}/${v()}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(
      longLivedUserToken
    )}`,
    { cache: "no-store" }
  );
  const pagesJson = await pagesRes.json();
  if (!pagesRes.ok) {
    debug.push(`pages_error=${JSON.stringify(pagesJson)}`);
    throw graphError("discoverIgAccounts:pages", { ...pagesJson, debug });
  }

  const pages: Array<{ id: string; name: string; access_token: string }> =
    pagesJson.data ?? [];
  debug.push(`pages_count=${pages.length}`);
  debug.push(`pages=${JSON.stringify(pages.map((p) => ({ id: p.id, name: p.name })))}`);

  // 2. If /me/accounts returned nothing, fall back to discovering via granular_scopes
  //    on the debug_token. The new Business Login Flow (per-asset consent dialog) grants
  //    per-Page/per-IG access that doesn't show up in /me/accounts.
  if (pages.length === 0) {
    debug.push("falling_back_to_granular_scopes");
    const fallback = await discoverViaGranularScopes(longLivedUserToken, debug);
    return { accounts: fallback, debug };
  }

  const accounts: DiscoveredIgAccount[] = [];
  for (const page of pages) {
    const igRes = await fetch(
      `${GRAPH_BASE}/${v()}/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(
        page.access_token
      )}`,
      { cache: "no-store" }
    );
    const igJson = await igRes.json();
    if (!igRes.ok) {
      debug.push(`page_${page.id}_error=${JSON.stringify(igJson)}`);
      continue;
    }
    const ig = igJson.instagram_business_account;
    debug.push(
      `page_${page.id}_ig=${ig ? JSON.stringify({ id: ig.id, username: ig.username }) : "null"}`
    );
    if (!ig?.id) continue;
    accounts.push({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      igBusinessId: ig.id,
      username: ig.username,
    });
  }
  return { accounts, debug };
}

// Fallback for the new Business Login Flow: read granular_scopes from debug_token to
// learn which Page IDs and IG accounts the user authorized, then fetch each Page's
// access token directly.
async function discoverViaGranularScopes(
  userToken: string,
  debug: string[]
): Promise<DiscoveredIgAccount[]> {
  const dbgRes = await fetch(
    `${GRAPH_BASE}/${v()}/debug_token?input_token=${encodeURIComponent(
      userToken
    )}&access_token=${encodeURIComponent(
      `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
    )}`,
    { cache: "no-store" }
  );
  const dbgJson = await dbgRes.json();
  const granular: Array<{ scope: string; target_ids?: string[] }> =
    dbgJson?.data?.granular_scopes ?? [];

  const pageIds = new Set<string>();
  for (const g of granular) {
    if (
      (g.scope === "pages_show_list" || g.scope === "pages_read_engagement") &&
      g.target_ids
    ) {
      for (const id of g.target_ids) pageIds.add(id);
    }
  }
  debug.push(`granular_page_ids=${JSON.stringify([...pageIds])}`);

  const accounts: DiscoveredIgAccount[] = [];
  for (const pageId of pageIds) {
    const pageRes = await fetch(
      `${GRAPH_BASE}/${v()}/${pageId}?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(
        userToken
      )}`,
      { cache: "no-store" }
    );
    const pageJson = await pageRes.json();
    if (!pageRes.ok) {
      debug.push(`granular_page_${pageId}_error=${JSON.stringify(pageJson)}`);
      continue;
    }
    debug.push(
      `granular_page_${pageId}=${JSON.stringify({
        id: pageJson.id,
        name: pageJson.name,
        has_token: !!pageJson.access_token,
        ig: pageJson.instagram_business_account ?? null,
      })}`
    );
    const ig = pageJson.instagram_business_account;
    if (!ig?.id || !pageJson.access_token) continue;
    accounts.push({
      pageId: pageJson.id,
      pageName: pageJson.name ?? "",
      pageAccessToken: pageJson.access_token,
      igBusinessId: ig.id,
      username: ig.username,
    });
  }
  return accounts;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function graphError(where: string, body: unknown): Error {
  return new Error(
    `Meta Graph error in ${where}: ${JSON.stringify(body).slice(0, 500)}`
  );
}
