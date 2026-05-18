// Facebook Pages publishing adapter — Meta Graph API.
// Publishes video or photo posts (including multi-photo albums) to a FB Page.
// Requires: FACEBOOK_PAGE_ACCESS_TOKEN stored encrypted in SocialAccount.accessToken
// and SocialAccount.pageId = the Facebook Page ID.

import { decrypt } from "@/lib/crypto/encryption";

const GRAPH_BASE = "https://graph.facebook.com";
function v() { return process.env.META_GRAPH_VERSION ?? "v23.0"; }

export interface FacebookPublishOpts {
  pageId: string;
  encryptedToken: string;
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  caption: string;
}

export async function publishToFacebook(
  opts: FacebookPublishOpts
): Promise<{ platformPostId: string; platformUrl: string | null }> {
  const token = decrypt(opts.encryptedToken);

  if (opts.mediaType === "VIDEO") {
    const res = await fetch(`${GRAPH_BASE}/${v()}/${opts.pageId}/videos`, {
      method: "POST",
      body: new URLSearchParams({
        file_url: opts.mediaUrls[0],
        description: opts.caption,
        access_token: token,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(`FB video post failed: ${JSON.stringify(json).slice(0, 400)}`);
    const postId = json.id as string;
    const permalink = await fetchPermalink(postId, token);
    return { platformPostId: postId, platformUrl: permalink };
  }

  if (opts.mediaUrls.length === 1) {
    const res = await fetch(`${GRAPH_BASE}/${v()}/${opts.pageId}/photos`, {
      method: "POST",
      body: new URLSearchParams({
        url: opts.mediaUrls[0],
        caption: opts.caption,
        access_token: token,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(`FB photo post failed: ${JSON.stringify(json).slice(0, 400)}`);
    const postId = json.id as string;
    const permalink = await fetchPermalink(postId, token);
    return { platformPostId: postId, platformUrl: permalink };
  }

  // Multi-photo carousel
  const photoIds: string[] = [];
  for (const url of opts.mediaUrls) {
    const r = await fetch(`${GRAPH_BASE}/${v()}/${opts.pageId}/photos`, {
      method: "POST",
      body: new URLSearchParams({ url, published: "false", access_token: token }),
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok || !j.id) throw new Error(`FB photo upload failed: ${JSON.stringify(j).slice(0, 300)}`);
    photoIds.push(j.id as string);
  }

  const mediaBody = new URLSearchParams({ message: opts.caption, access_token: token });
  photoIds.forEach((pid, i) => mediaBody.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: pid })));

  const postRes = await fetch(`${GRAPH_BASE}/${v()}/${opts.pageId}/feed`, {
    method: "POST",
    body: mediaBody,
    cache: "no-store",
  });
  const postJson = await postRes.json();
  if (!postRes.ok || !postJson.id) throw new Error(`FB feed post failed: ${JSON.stringify(postJson).slice(0, 400)}`);
  const postId = postJson.id as string;
  const permalink = await fetchPermalink(postId, token);
  return { platformPostId: postId, platformUrl: permalink };
}

// Fetch the public permalink for any FB object (post, video, photo).
// Meta returns relative paths like "/reel/123/" for some object types — prefix
// those with the Facebook origin so they're usable as full URLs.
async function fetchPermalink(objectId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${v()}/${objectId}?fields=permalink_url&access_token=${token}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    const raw = json.permalink_url as string | undefined;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `https://www.facebook.com${raw.startsWith("/") ? "" : "/"}${raw}`;
  } catch {
    return null;
  }
}
