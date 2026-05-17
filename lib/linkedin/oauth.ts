// LinkedIn OAuth 2.0 helpers.
// Required env vars:
//   LINKEDIN_CLIENT_ID
//   LINKEDIN_CLIENT_SECRET
//   NEXTAUTH_URL (base for redirect URI)

const TOKEN_BASE = "https://www.linkedin.com/oauth/v2";
const API_BASE = "https://api.linkedin.com/v2";

export const LINKEDIN_SCOPES = ["openid", "profile", "email", "w_member_social"].join(" ");

export function buildLinkedInAuthorizeUrl(opts: { redirectUri: string; state: string }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: required("LINKEDIN_CLIENT_ID"),
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: LINKEDIN_SCOPES,
  });
  return `${TOKEN_BASE}/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(opts: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(`${TOKEN_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      client_id: required("LINKEDIN_CLIENT_ID"),
      client_secret: required("LINKEDIN_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`LinkedIn token exchange failed: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return { accessToken: json.access_token as string, expiresIn: json.expires_in as number };
}

export async function getLinkedInProfile(accessToken: string): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
}> {
  const res = await fetch(`${API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LinkedIn profile fetch failed: ${res.status}`);
  const json = await res.json();
  return {
    id: json.sub as string,
    firstName: (json.given_name as string) ?? "",
    lastName: (json.family_name as string) ?? "",
    profilePicture: (json.picture as string) ?? null,
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
