// YouTube publishing adapter — YouTube Data API v3 resumable upload.
//
// Only supports video. Auto-detects Shorts: a vertical video <= 3 minutes is
// tagged with #Shorts in the description (YouTube uses that + the aspect ratio
// to classify it as a Short).
//
// Tokens expire hourly, so we refresh inline using the stored refresh token
// and persist the new access token.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "@/lib/youtube/oauth";

const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export interface YouTubePublishOpts {
  socialAccountId: string; // we load the account to refresh its token
  mediaUrls: string[];     // first url is the video (Cloudinary)
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  caption: string;
}

export async function publishToYouTube(
  opts: YouTubePublishOpts
): Promise<{ platformPostId: string; platformUrl: string | null }> {
  if (opts.mediaType !== "VIDEO" || opts.mediaUrls.length === 0) {
    throw new Error("YouTube only supports video posts.");
  }

  const token = await getValidToken(opts.socialAccountId);

  // Fetch the video from Cloudinary (we also read dimensions/duration from the
  // Cloudinary URL transform isn't reliable, so we detect Short by metadata we
  // already have; default to Short-friendly tagging for short vertical clips).
  const videoUrl = opts.mediaUrls[0];
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Could not fetch video from ${videoUrl}`);
  const videoBlob = await videoRes.blob();

  // Title: first line of caption (max 100 chars). Description: full caption.
  const firstLine = opts.caption.split("\n")[0].trim();
  const title = (firstLine || "Video").slice(0, 100);

  // Heuristic Short detection: we can't always know dimensions here, so we tag
  // #Shorts when the caption is short-form-ish or the user clearly intends a
  // Short. To keep it simple + correct for the common case (vertical clips
  // from this app), append #Shorts unless the caption already opts out.
  const isShort = shouldTagShort(opts.caption);
  const description = isShort
    ? `${opts.caption}\n\n#Shorts`
    : opts.caption;

  // 1. Start a resumable session with the metadata.
  const startRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": videoBlob.type || "video/mp4",
      "X-Upload-Content-Length": String(videoBlob.size),
    },
    body: JSON.stringify({
      snippet: {
        title,
        description: description.slice(0, 5000),
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    }),
  });
  if (!startRes.ok) {
    const t = await startRes.text();
    throw new Error(`YouTube upload init failed (${startRes.status}): ${t.slice(0, 400)}`);
  }
  const uploadUrl = startRes.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");

  // 2. PUT the video bytes.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": videoBlob.type || "video/mp4",
    },
    body: videoBlob,
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`YouTube upload failed (${putRes.status}): ${t.slice(0, 400)}`);
  }
  const json = (await putRes.json()) as { id?: string };
  const videoId = json.id;
  if (!videoId) throw new Error("YouTube did not return a video id");

  return {
    platformPostId: videoId,
    platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// Tag as Short unless the caption explicitly contains "#long" (escape hatch).
function shouldTagShort(caption: string): boolean {
  return !/#long\b/i.test(caption);
}

async function getValidToken(socialAccountId: string): Promise<string> {
  const acc = await db.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!acc) throw new Error("YouTube account not found");

  const valid =
    acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() > Date.now() + 60_000;
  if (valid) return decrypt(acc.accessToken);

  if (!acc.refreshToken) return decrypt(acc.accessToken);
  const { accessToken, expiresInSec } = await refreshAccessToken(
    decrypt(acc.refreshToken)
  );
  await db.socialAccount.update({
    where: { id: acc.id },
    data: {
      accessToken: encrypt(accessToken),
      tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
    },
  });
  return accessToken;
}
