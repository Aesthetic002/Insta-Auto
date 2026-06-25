// Dropbox OAuth + file access helpers (app-folder scope).
//
// Flow:
//   1. buildAuthorizeUrl → redirect the user to Dropbox to grant access
//   2. exchangeCodeForToken → swap the returned code for an access token
//   3. listVideoFiles → list videos in the app folder
//   4. getTemporaryLink → a short-lived direct download URL for one file,
//      which Cloudinary fetches to import the media.
//
// We request offline access so we get a refresh token (Dropbox short-lived
// tokens expire in ~4 hours).

const AUTH_BASE = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const API_BASE = "https://api.dropboxapi.com/2";

function appKey(): string {
  return required("DROPBOX_APP_KEY");
}
function appSecret(): string {
  return required("DROPBOX_APP_SECRET");
}

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: appKey(),
    redirect_uri: opts.redirectUri,
    response_type: "code",
    token_access_type: "offline", // get a refresh token
    state: opts.state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export interface DropboxToken {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
  accountId: string | null;
}

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
}): Promise<DropboxToken> {
  const body = new URLSearchParams({
    code: opts.code,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    client_id: appKey(),
    client_secret: appSecret(),
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
    account_id?: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresInSec: json.expires_in,
    accountId: json.account_id ?? null,
  };
}

// Refresh an expired access token using the stored refresh token.
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresInSec: number;
}> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: appKey(),
    client_secret: appSecret(),
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

export async function getAccountName(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/users/get_current_account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      email?: string;
      name?: { display_name?: string };
    };
    return json.name?.display_name ?? json.email ?? null;
  } catch {
    return null;
  }
}

export interface DropboxFile {
  id: string;
  name: string;
  path: string;       // path_lower, used to fetch the temp link
  sizeBytes: number;
  isVideo: boolean;
  isImage: boolean;
}

const VIDEO_EXT = [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// List media files in the app folder (root "" within the app's sandbox).
export async function listMediaFiles(accessToken: string): Promise<DropboxFile[]> {
  const res = await fetch(`${API_BASE}/files/list_folder`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: "", // app-folder root
      recursive: true,
      limit: 200,
    }),
  });
  if (!res.ok) throw new Error(await errText("listFolder", res));
  const json = (await res.json()) as {
    entries: Array<{
      ".tag": string;
      id: string;
      name: string;
      path_lower: string;
      size?: number;
    }>;
  };

  return json.entries
    .filter((e) => e[".tag"] === "file")
    .map((e) => {
      const lower = e.name.toLowerCase();
      const isVideo = VIDEO_EXT.some((x) => lower.endsWith(x));
      const isImage = IMAGE_EXT.some((x) => lower.endsWith(x));
      return {
        id: e.id,
        name: e.name,
        path: e.path_lower,
        sizeBytes: e.size ?? 0,
        isVideo,
        isImage,
      };
    })
    .filter((f) => f.isVideo || f.isImage);
}

// Short-lived (~4 hour) direct download link for a file, which Cloudinary
// fetches to import the media.
export async function getTemporaryLink(
  accessToken: string,
  path: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/files/get_temporary_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error(await errText("getTemporaryLink", res));
  const json = (await res.json()) as { link: string };
  return json.link;
}

async function errText(where: string, res: Response): Promise<string> {
  const t = await res.text().catch(() => "");
  return `Dropbox ${where} failed (${res.status}): ${t}`;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
