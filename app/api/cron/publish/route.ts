import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { publishPost } from "@/lib/publish";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_PER_RUN = 5;
const MAX_RETRIES = 3;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { scheduledAt: "asc" },
    take: MAX_PER_RUN,
    include: { socialAccount: true },
  });

  const results: Array<{
    id: string;
    status: "posted" | "failed" | "skipped";
    error?: string;
  }> = [];

  for (const post of due) {
    const claimed = await db.post.updateMany({
      where: { id: post.id, status: "SCHEDULED" },
      data: { status: "PUBLISHING", errorMessage: null },
    });
    if (claimed.count === 0) {
      results.push({ id: post.id, status: "skipped" });
      continue;
    }

    if (!post.caption || !post.socialAccount || post.socialAccount.disconnectedAt) {
      await db.post.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          retryCount: { increment: 1 },
          errorMessage: !post.caption
            ? "Caption missing at publish time"
            : !post.socialAccount
            ? "No social account selected"
            : "Social account is disconnected",
        },
      });
      results.push({ id: post.id, status: "failed", error: "pre_check_failed" });
      continue;
    }

    try {
      const { platformPostId, platformUrl } = await publishPost(post.id);
      await db.post.update({
        where: { id: post.id },
        data: {
          status: "POSTED",
          platformPostId,
          platformUrl,
          postedAt: new Date(),
          ...(post.platform === "INSTAGRAM"
            ? { igMediaId: platformPostId, igPermalink: platformUrl }
            : {}),
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

  console.log(`[cron/publish] processed ${results.length} post(s) at ${now.toISOString()}`, results);
  return NextResponse.json({ at: now.toISOString(), results });
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}
