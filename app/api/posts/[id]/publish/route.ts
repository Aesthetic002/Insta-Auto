import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCreatorOf } from "@/lib/permissions";
import { publishPost } from "@/lib/publish";

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
    include: { socialAccount: true },
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

  if (!post.socialAccount) {
    return NextResponse.json(
      { error: "no_account", message: "Select a social account to publish to." },
      { status: 400 }
    );
  }

  if (post.socialAccount.disconnectedAt) {
    return NextResponse.json(
      { error: "account_disconnected", message: "Reconnect this social account in Settings." },
      { status: 400 }
    );
  }

  await db.post.update({
    where: { id },
    data: { status: "PUBLISHING", errorMessage: null },
  });

  try {
    const { platformPostId, platformUrl } = await publishPost(id);

    const updated = await db.post.update({
      where: { id },
      data: {
        status: "POSTED",
        platformPostId,
        platformUrl,
        postedAt: new Date(),
        // Keep legacy IG fields populated for Instagram posts
        ...(post.platform === "INSTAGRAM" ? { igMediaId: platformPostId, igPermalink: platformUrl } : {}),
      },
    });
    return NextResponse.json({ post: updated });
  } catch (err) {
    console.error("[publish] failed", err);
    const message = err instanceof Error ? err.message : String(err);
    const updated = await db.post.update({
      where: { id },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
        errorMessage: message.slice(0, 1000),
      },
    });
    return NextResponse.json(
      { error: "publish_failed", message, post: updated },
      { status: 500 }
    );
  }
}
