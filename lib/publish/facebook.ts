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
    // FB Pages video upload
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
    return {
      platformPostId: json.id as string,
      platformUrl: `https://www.facebook.com/video.php?v=${json.id}`,
    };
  }

  if (opts.mediaUrls.length === 1) {
    // Single photo
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
    return { platformPostId: json.id as string, platformUrl: null };
  }

  // Multi-photo: upload each unpublished, then create a post linking them
  const photoIds: string[] = [];
  for (const url of opts.mediaUrls) {
    const r = await fetch(`${GRAPH_BASE}/${v()}/${opts.pageId}/photos`, {
      method: "POST",
      body: new URLSearchParams({
        url,
        published: "false",
        access_token: token,
      }),
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
  return { platformPostId: postJson.id as string, platformUrl: null };
}
