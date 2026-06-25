// Google Drive OAuth + file access helpers.
//
// Reuses the existing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (same Google
// Cloud project as Google login) but runs its own OAuth flow with Drive
// scopes and a Drive-specific redirect URI.
//
// Unlike Dropbox, Drive has no public temporary-link endpoint — file content
// is fetched from the API with the access token. So the import route streams
// bytes through our server (capped to a sane size) rather than handing
// Cloudinary a public URL.

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

// Read-only access to files the user opens/created with this app. drive.file
// is the least-privilege scope (no full-Drive review needed) — the user picks
// files via Google's picker OR we list app-created files. For broad listing we
// use drive.readonly; we request both and rely on what's granted.
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
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
    access_type: "offline", // get a refresh token
    prompt: "consent", // force refresh-token issuance on reconnect
    state: opts.state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export interface DriveToken {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
}

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
}): Promise<DriveToken> {
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

export async function getAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string; name?: string };
    return json.email ?? json.name ?? null;
  } catch {
    return null;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  isVideo: boolean;
  isImage: boolean;
}

// List video + image files (not in trash), newest first.
export async function listMediaFiles(accessToken: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    "(mimeType contains 'video/' or mimeType contains 'image/') and trashed = false"
  );
  const fields = encodeURIComponent("files(id,name,size,mimeType)");
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=${fields}&pageSize=200&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(await errText("listFiles", res));
  const json = (await res.json()) as {
    files: Array<{ id: string; name: string; size?: string; mimeType: string }>;
  };
  return json.files.map((f) => ({
    id: f.id,
    name: f.name,
    sizeBytes: f.size ? Number(f.size) : 0,
    mimeType: f.mimeType,
    isVideo: f.mimeType.startsWith("video/"),
    isImage: f.mimeType.startsWith("image/"),
  }));
}

// Download a Drive file's bytes (auth required — no public link).
export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<ArrayBuffer> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await errText("download", res));
  return res.arrayBuffer();
}

async function errText(where: string, res: Response): Promise<string> {
  const t = await res.text().catch(() => "");
  return `Drive ${where} failed (${res.status}): ${t}`;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
