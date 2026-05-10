import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encryption";
import { isCreatorOf } from "@/lib/permissions";
import { publishReel } from "@/lib/instagram/publish";

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
    include: { igAccount: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only the creator (not editors) can manually publish.
  if (!(await isCreatorOf(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden", message: "Only the creator can publish." }, { status: 403 });
  }

  if (!post.caption) {
    return NextResponse.json(
      { error: "caption_required", message: "Generate or write a caption first." },
      { status: 400 }
    );
  }
  if (post.igAccount.disconnectedAt) {
    return NextResponse.json(
      { error: "ig_disconnected", message: "Reconnect this Instagram account." },
      { status: 400 }
    );
  }

  await db.post.update({
    where: { id },
    data: { status: "PUBLISHING", errorMessage: null },
  });

  try {
    const pageToken = decrypt(post.igAccount.pageAccessToken);
    const { containerId, mediaId, permalink } = await publishReel({
      igBusinessId: post.igAccount.igBusinessId,
      pageAccessToken: pageToken,
      videoUrl: post.videoUrl,
      caption: post.caption,
    });

    const updated = await db.post.update({
      where: { id },
      data: {
        status: "POSTED",
        igContainerId: containerId,
        igMediaId: mediaId,
        igPermalink: permalink,
        postedAt: new Date(),
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
