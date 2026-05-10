// Instagram Reels publishing pipeline:
//   1. POST /{ig-user-id}/media → create container (returns container id)
//   2. Poll  /{container-id}?fields=status_code  every 3-5s until FINISHED (or ERROR)
//   3. POST /{ig-user-id}/media_publish → publish container
// Tokens are PAGE access tokens (decrypted from DB by the caller).

const GRAPH_BASE = "https://graph.facebook.com";

function v() {
  return process.env.META_GRAPH_VERSION ?? "v23.0";
}

export interface CreateContainerOpts {
  igBusinessId: string;
  pageAccessToken: string;
  videoUrl: string;
  caption: string;
}

export async function createReelsContainer(
  opts: CreateContainerOpts
): Promise<{ containerId: string }> {
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: opts.videoUrl,
    caption: opts.caption,
    access_token: opts.pageAccessToken,
  });
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/${opts.igBusinessId}/media`,
    { method: "POST", body: params, cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(
      `createReelsContainer failed: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return { containerId: json.id };
}

export type ContainerStatus =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

export async function getContainerStatus(opts: {
  containerId: string;
  pageAccessToken: string;
}): Promise<{ status: ContainerStatus; raw: unknown }> {
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/${opts.containerId}?fields=status_code,status&access_token=${encodeURIComponent(
      opts.pageAccessToken
    )}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `getContainerStatus failed: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return { status: json.status_code as ContainerStatus, raw: json };
}

export async function waitForContainerReady(opts: {
  containerId: string;
  pageAccessToken: string;
  /** Timeout in ms. Default 5 minutes. */
  timeoutMs?: number;
  /** Poll interval in ms. Default 4s. */
  intervalMs?: number;
}): Promise<void> {
  const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60 * 1000);
  const interval = opts.intervalMs ?? 4000;

  while (Date.now() < deadline) {
    const { status } = await getContainerStatus(opts);
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Container processing ${status.toLowerCase()}`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Container processing timed out");
}

export async function publishContainer(opts: {
  igBusinessId: string;
  containerId: string;
  pageAccessToken: string;
}): Promise<{ mediaId: string }> {
  const params = new URLSearchParams({
    creation_id: opts.containerId,
    access_token: opts.pageAccessToken,
  });
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/${opts.igBusinessId}/media_publish`,
    { method: "POST", body: params, cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || !json.id) {
    throw new Error(
      `publishContainer failed: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return { mediaId: json.id };
}

export async function getMediaPermalink(opts: {
  mediaId: string;
  pageAccessToken: string;
}): Promise<string | null> {
  const res = await fetch(
    `${GRAPH_BASE}/${v()}/${opts.mediaId}?fields=permalink&access_token=${encodeURIComponent(
      opts.pageAccessToken
    )}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json.permalink === "string" ? json.permalink : null;
}

/**
 * Full pipeline: create container → wait until FINISHED → publish → fetch permalink.
 * Returns the published IG media ID and (if available) its public permalink.
 */
export async function publishReel(opts: CreateContainerOpts): Promise<{
  containerId: string;
  mediaId: string;
  permalink: string | null;
}> {
  const { containerId } = await createReelsContainer(opts);
  await waitForContainerReady({
    containerId,
    pageAccessToken: opts.pageAccessToken,
  });
  const { mediaId } = await publishContainer({
    igBusinessId: opts.igBusinessId,
    containerId,
    pageAccessToken: opts.pageAccessToken,
  });
  const permalink = await getMediaPermalink({
    mediaId,
    pageAccessToken: opts.pageAccessToken,
  }).catch(() => null);
  return { containerId, mediaId, permalink };
}
