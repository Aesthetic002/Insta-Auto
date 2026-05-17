// LinkedIn publishing adapter — LinkedIn UGC Posts API v2.
// Supports text + single image + single video posts.
// Multi-image carousels on LinkedIn require a Document upload (PDF) or the
// "Articles" API — not supported in v1 of this adapter.
//
// Required env vars:
//   LINKEDIN_CLIENT_ID
//   LINKEDIN_CLIENT_SECRET
//
// SocialAccount fields used:
//   accessToken  — encrypted OAuth 2.0 access token
//   accountId    — LinkedIn member URN ("urn:li:person:xxx") or org URN

import { decrypt } from "@/lib/crypto/encryption";

const API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInPublishOpts {
  authorUrn: string;       // e.g. "urn:li:person:abc123"
  encryptedToken: string;
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  caption: string;
}

export async function publishToLinkedIn(
  opts: LinkedInPublishOpts
): Promise<{ platformPostId: string; platformUrl: string | null }> {
  const token = decrypt(opts.encryptedToken);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  // LinkedIn UGC post content
  let specificContent: Record<string, unknown>;

  if (opts.mediaType === "VIDEO" && opts.mediaUrls.length > 0) {
    // Register upload → upload binary → reference in post
    const asset = await registerLinkedInVideoUpload(opts.authorUrn, token);
    await uploadLinkedInMedia(opts.mediaUrls[0], asset.uploadUrl, token);

    specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: opts.caption },
        shareMediaCategory: "VIDEO",
        media: [{
          status: "READY",
          description: { text: opts.caption.slice(0, 200) },
          media: asset.urn,
          title: { text: "Video" },
        }],
      },
    };
  } else if (opts.mediaUrls.length > 0) {
    // Image post
    const asset = await registerLinkedInImageUpload(opts.authorUrn, token);
    await uploadLinkedInMedia(opts.mediaUrls[0], asset.uploadUrl, token);

    specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: opts.caption },
        shareMediaCategory: "IMAGE",
        media: [{
          status: "READY",
          description: { text: opts.caption.slice(0, 200) },
          media: asset.urn,
        }],
      },
    };
  } else {
    // Text only
    specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: opts.caption },
        shareMediaCategory: "NONE",
      },
    };
  }

  const body = {
    author: opts.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent,
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${API_BASE}/ugcPosts`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${text.slice(0, 400)}`);
  }

  // LinkedIn returns the post URN in X-RestLi-Id header
  const postUrn = res.headers.get("X-RestLi-Id") ?? res.headers.get("x-restli-id") ?? "";
  const postId = postUrn.split(":").pop() ?? postUrn;

  return {
    platformPostId: postUrn || postId,
    platformUrl: postId ? `https://www.linkedin.com/feed/update/${postUrn}/` : null,
  };
}

async function registerLinkedInImageUpload(
  authorUrn: string,
  token: string
): Promise<{ urn: string; uploadUrl: string }> {
  const res = await fetch(`${API_BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LinkedIn image upload registration failed: ${JSON.stringify(json).slice(0, 300)}`);
  return {
    urn: json.value.asset as string,
    uploadUrl: json.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl as string,
  };
}

async function registerLinkedInVideoUpload(
  authorUrn: string,
  token: string
): Promise<{ urn: string; uploadUrl: string }> {
  const res = await fetch(`${API_BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LinkedIn video upload registration failed: ${JSON.stringify(json).slice(0, 300)}`);
  return {
    urn: json.value.asset as string,
    uploadUrl: json.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl as string,
  };
}

async function uploadLinkedInMedia(
  sourceUrl: string,
  uploadUrl: string,
  token: string
): Promise<void> {
  // Fetch from Cloudinary, stream to LinkedIn
  const mediaRes = await fetch(sourceUrl);
  if (!mediaRes.ok) throw new Error(`Could not fetch media from ${sourceUrl}`);
  const blob = await mediaRes.blob();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });
  if (!putRes.ok && putRes.status !== 201) {
    throw new Error(`LinkedIn media upload PUT failed (${putRes.status})`);
  }
}
