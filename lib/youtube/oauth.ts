// YouTube OAuth + channel helpers.
//
// Reuses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (same Google Cloud project as
// login + Drive) but runs its own OAuth flow with the youtube.upload scope and
// a YouTube-specific redirect URI.

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// youtube.upload = insert videos. youtube.readonly = read channel info for the
// connection display. We request both; upload is the one that matters.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "openid",
  "email",
].join(" ");

function clientId(): string {
  return required("GOOGLE_CLIENT_ID");
}
function clientSecret(): string {
  return required("GOOGLE_CLIENT_SECRET");
}

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export interface YouTubeToken {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
}

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
}): Promise<YouTubeToken> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await errText("exchangeCode", res));
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresInSec: json.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresInSec: number;
}> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await errText("refresh", res));
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: json.access_token, expiresInSec: json.expires_in };
}

export interface YouTubeChannel {
  channelId: string;
  title: string | null;
  thumbnailUrl: string | null;
}

export async function getChannel(accessToken: string): Promise<YouTubeChannel | null> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
    }>;
  };
  const ch = json.items?.[0];
  if (!ch) return null;
  return {
    channelId: ch.id,
    title: ch.snippet?.title ?? null,
    thumbnailUrl: ch.snippet?.thumbnails?.default?.url ?? null,
  };
}

async function errText(where: string, res: Response): Promise<string> {
  const t = await res.text().catch(() => "");
  return `YouTube ${where} failed (${res.status}): ${t}`;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
