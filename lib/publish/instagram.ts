// Instagram publishing adapter — wraps the existing Reels pipeline.
// For carousels, uses the Instagram carousel container API.

import { decrypt } from "@/lib/crypto/encryption";
import {
  publishReel,
  createReelsContainer,
  waitForContainerReady,
  publishContainer,
  getMediaPermalink,
} from "@/lib/instagram/publish";

const GRAPH_BASE = "https://graph.facebook.com";
function v() { return process.env.META_GRAPH_VERSION ?? "v23.0"; }

export interface InstagramPublishOpts {
  igBusinessId: string;
  encryptedToken: string;
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  caption: string;
}

export async function publishToInstagram(
  opts: InstagramPublishOpts
): Promise<{ platformPostId: string; platformUrl: string | null }> {
  const token = decrypt(opts.encryptedToken);

  if (opts.mediaType === "VIDEO") {
    const { mediaId, permalink } = await publishReel({
      igBusinessId: opts.igBusinessId,
      pageAccessToken: token,
      videoUrl: opts.mediaUrls[0],
      caption: opts.caption,
    });
    return { platformPostId: mediaId, platformUrl: permalink };
  }

  if (opts.mediaType === "PHOTO" && opts.mediaUrls.length === 1) {
    // Single image post
    const res = await fetch(`${GRAPH_BASE}/${v()}/${opts.igBusinessId}/media`, {
      method: "POST",
      body: new URLSearchParams({
        image_url: opts.mediaUrls[0],
        caption: opts.caption,
        access_token: token,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(`IG photo container failed: ${JSON.stringify(json).slice(0, 400)}`);
    const containerId: string = json.id;
    await waitForContainerReady({ containerId, pageAccessToken: token });
    const { mediaId } = await publishContainer({ igBusinessId: opts.igBusinessId, containerId, pageAccessToken: token });
    const permalink = await getMediaPermalink({ mediaId, pageAccessToken: token }).catch(() => null);
    return { platformPostId: mediaId, platformUrl: permalink };
  }

  // Carousel
  const itemIds: string[] = [];
  for (const url of opts.mediaUrls) {
    const params: Record<string, string> = {
      is_carousel_item: "true",
      access_token: token,
    };
    // Detect video by common extensions
    if (/\.(mp4|mov|avi|webm)(\?|$)/i.test(url)) {
      params.media_type = "VIDEO";
      params.video_url = url;
    } else {
      params.image_url = url;
    }
    const r = await fetch(`${GRAPH_BASE}/${v()}/${opts.igBusinessId}/media`, {
      method: "POST",
      body: new URLSearchParams(params),
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok || !j.id) throw new Error(`IG carousel item failed: ${JSON.stringify(j).slice(0, 300)}`);
    itemIds.push(j.id as string);
  }

  // Create carousel container
  const containerRes = await fetch(`${GRAPH_BASE}/${v()}/${opts.igBusinessId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      caption: opts.caption,
      access_token: token,
    }),
    cache: "no-store",
  });
  const containerJson = await containerRes.json();
  if (!containerRes.ok || !containerJson.id) {
    throw new Error(`IG carousel container failed: ${JSON.stringify(containerJson).slice(0, 400)}`);
  }
  const containerId: string = containerJson.id;
  await waitForContainerReady({ containerId, pageAccessToken: token });
  const { mediaId } = await publishContainer({ igBusinessId: opts.igBusinessId, containerId, pageAccessToken: token });
  const permalink = await getMediaPermalink({ mediaId, pageAccessToken: token }).catch(() => null);
  return { platformPostId: mediaId, platformUrl: permalink };
}
