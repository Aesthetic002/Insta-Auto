import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import { publishReel } from "@/lib/instagram/publish";

export const maxDuration = 300; // up to 5 minutes per invocation
export const dynamic = "force-dynamic";

const MAX_PER_RUN = 5; // pick up at most 5 due posts per minute
const MAX_RETRIES = 3;

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>; allow ?secret=... for manual.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Atomically claim due posts: transition SCHEDULED -> PUBLISHING for ones whose time has come.
  // We do it one-by-one with optimistic locks (updateMany returns count) to avoid double-publish.
  const due = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { scheduledAt: "asc" },
    take: MAX_PER_RUN,
    include: { igAccount: true },
  });

  const results: Array<{
    id: string;
    status: "posted" | "failed" | "skipped";
    error?: string;
  }> = [];

  for (const post of due) {
    // Try to claim by bumping status — only succeeds if still SCHEDULED.
    const claimed = await db.post.updateMany({
      where: { id: post.id, status: "SCHEDULED" },
      data: { status: "PUBLISHING", errorMessage: null },
    });
    if (claimed.count === 0) {
      results.push({ id: post.id, status: "skipped" });
      continue;
    }

    if (!post.caption || post.igAccount.disconnectedAt) {
      await db.post.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          retryCount: { increment: 1 },
          errorMessage: !post.caption
            ? "Caption missing at publish time"
            : "IG account is disconnected",
        },
      });
      results.push({
        id: post.id,
        status: "failed",
        error: !post.caption ? "no_caption" : "ig_disconnected",
      });
      continue;
    }

    try {
      const pageToken = decrypt(post.igAccount.pageAccessToken);
      const { containerId, mediaId, permalink } = await publishReel({
        igBusinessId: post.igAccount.igBusinessId,
        pageAccessToken: pageToken,
        videoUrl: post.videoUrl,
        caption: post.caption,
      });
      await db.post.update({
        where: { id: post.id },
        data: {
          status: "POSTED",
          igContainerId: containerId,
          igMediaId: mediaId,
          igPermalink: permalink,
          postedAt: new Date(),
        },
      });
      results.push({ id: post.id, status: "posted" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.post.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          retryCount: { increment: 1 },
          errorMessage: message.slice(0, 1000),
        },
      });
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  console.log(
    `[cron/publish] processed ${results.length} post(s) at ${now.toISOString()}`,
    results
  );
  return NextResponse.json({ at: now.toISOString(), results });
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}
