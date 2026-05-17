import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCreatorOf } from "@/lib/permissions";
import { publishPost, publishPostToTargets } from "@/lib/publish";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await db.post.findUnique({
    where: { id },
    include: { socialAccount: true, targets: { include: { socialAccount: true } } },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await isCreatorOf(session.user.id, post.userId))) {
    return NextResponse.json(
      { error: "forbidden", message: "Only the creator can publish." },
      { status: 403 }
    );
  }

  if (!post.caption) {
    return NextResponse.json(
      { error: "caption_required", message: "Generate or write a caption first." },
      { status: 400 }
    );
  }

  const hasTargets = post.targets.length > 0;

  if (!hasTargets && !post.socialAccount) {
    return NextResponse.json(
      { error: "no_account", message: "Select at least one social account to publish to." },
      { status: 400 }
    );
  }

  if (!hasTargets && post.socialAccount?.disconnectedAt) {
    return NextResponse.json(
      { error: "account_disconnected", message: "Reconnect this social account in Settings." },
      { status: 400 }
    );
  }

  await db.post.update({ where: { id }, data: { status: "PUBLISHING", errorMessage: null } });

  try {
    if (hasTargets) {
      const results = await publishPostToTargets(id);
      const anyFailed = results.some((r) => r.status === "failed");
      const updated = await db.post.findUnique({
        where: { id },
        include: { targets: { include: { socialAccount: true } } },
      });
      if (anyFailed) {
        return NextResponse.json(
          { error: "partial_failure", message: "Some accounts failed to publish.", post: updated, results },
          { status: 207 }
        );
      }
      return NextResponse.json({ post: updated, results });
    } else {
      // Legacy single-account path
      const { platformPostId, platformUrl } = await publishPost(id);
      const updated = await db.post.update({
        where: { id },
        data: {
          status: "POSTED",
          platformPostId,
          platformUrl,
          postedAt: new Date(),
          ...(post.platform === "INSTAGRAM" ? { igMediaId: platformPostId, igPermalink: platformUrl } : {}),
        },
      });
      return NextResponse.json({ post: updated });
    }
  } catch (err) {
    console.error("[publish] failed", err);
    const message = err instanceof Error ? err.message : String(err);
    const updated = await db.post.update({
      where: { id },
      data: { status: "FAILED", retryCount: { increment: 1 }, errorMessage: message.slice(0, 1000) },
    });
    return NextResponse.json(
      { error: "publish_failed", message, post: updated },
      { status: 500 }
    );
  }
}
