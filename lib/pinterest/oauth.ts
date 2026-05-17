// Pinterest OAuth 2.0 helpers — Pinterest API v5.
// Required env vars:
//   PINTEREST_APP_ID
//   PINTEREST_APP_SECRET

const TOKEN_BASE = "https://api.pinterest.com/v5/oauth";
const API_BASE = "https://api.pinterest.com/v5";

export const PINTEREST_SCOPES = ["boards:read", "pins:read", "pins:write"].join(",");

export function buildPinterestAuthorizeUrl(opts: { redirectUri: string; state: string }) {
  const params = new URLSearchParams({
    client_id: required("PINTEREST_APP_ID"),
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: PINTEREST_SCOPES,
    state: opts.state,
  });
  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export async function exchangePinterestCode(opts: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number }> {
  const credentials = Buffer.from(
    `${required("PINTEREST_APP_ID")}:${required("PINTEREST_APP_SECRET")}`
  ).toString("base64");

  const res = await fetch(`${TOKEN_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Pinterest token exchange failed: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return {
    accessToken: json.access_token as string,
    refreshToken: (json.refresh_token as string) ?? null,
    expiresIn: (json.expires_in as number) ?? 86400 * 30,
  };
}

export async function getPinterestUser(accessToken: string): Promise<{
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
}> {
  const res = await fetch(`${API_BASE}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Pinterest profile fetch failed: ${res.status}`);
  const json = await res.json();
  return {
    id: json.account_type === "BUSINESS" ? json.business_name : json.username,
    username: json.username as string,
    displayName: (json.business_name as string) ?? (json.username as string),
    profileImage: (json.profile_image as string) ?? null,
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
