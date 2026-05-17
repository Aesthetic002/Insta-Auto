// Multi-platform publish router.
// publishPost: publishes to a single social account (legacy single-account path).
// publishPostToAccount: publishes to a specific account by ID (multi-account fan-out).

import { db } from "@/lib/db";
import { publishToInstagram } from "./instagram";
import { publishToFacebook } from "./facebook";
import { publishToLinkedIn } from "./linkedin";
import { publishToPinterest, getFirstPinterestBoard } from "./pinterest";

export interface PublishResult {
  platformPostId: string;
  platformUrl: string | null;
}

async function dispatchToAccount(
  post: { caption: string; mediaUrls: string[]; mediaUrl: string | null; mediaType: string },
  accId: string
): Promise<PublishResult> {
  const acc = await db.socialAccount.findUnique({ where: { id: accId } });
  if (!acc) throw new Error(`Social account ${accId} not found`);

  const mediaUrls = post.mediaUrls.length > 0 ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
  const mediaType = post.mediaType as "VIDEO" | "PHOTO" | "CAROUSEL";

  switch (acc.platform) {
    case "INSTAGRAM": {
      if (!acc.accountId) throw new Error("Instagram account ID missing");
      return publishToInstagram({ igBusinessId: acc.accountId, encryptedToken: acc.accessToken, mediaUrls, mediaType, caption: post.caption });
    }
    case "FACEBOOK": {
      const pageId = acc.pageId ?? acc.accountId;
      if (!pageId) throw new Error("Facebook Page ID missing");
      return publishToFacebook({ pageId, encryptedToken: acc.accessToken, mediaUrls, mediaType, caption: post.caption });
    }
    case "LINKEDIN": {
      if (!acc.accountId) throw new Error("LinkedIn author URN missing");
      return publishToLinkedIn({ authorUrn: acc.accountId, encryptedToken: acc.accessToken, mediaUrls, mediaType, caption: post.caption });
    }
    case "PINTEREST": {
      let boardId: string | null = null;
      if (acc.displayName?.startsWith("board:")) {
        boardId = acc.displayName.slice(6);
      } else {
        const board = await getFirstPinterestBoard(acc.accessToken);
        boardId = board?.boardId ?? null;
      }
      if (!boardId) throw new Error("No Pinterest board found. Connect again to pick a board.");
      return publishToPinterest({ boardId, encryptedToken: acc.accessToken, mediaUrls, mediaType, caption: post.caption });
    }
    default:
      throw new Error(`Unsupported platform: ${acc.platform}`);
  }
}

// Fan-out: publish to all PostTarget rows for a given post.
// Returns per-target results. Errors on individual targets are recorded but don't throw.
export async function publishPostToTargets(postId: string): Promise<{ targetId: string; status: "posted" | "failed"; error?: string }[]> {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");
  if (!post.caption) throw new Error("Caption required before publishing");

  const targets = await db.postTarget.findMany({ where: { postId } });
  if (targets.length === 0) throw new Error("No publish targets set for this post");

  const results: { targetId: string; status: "posted" | "failed"; error?: string }[] = [];

  for (const target of targets) {
    // Claim the target
    const claimed = await db.postTarget.updateMany({
      where: { id: target.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PUBLISHING" },
    });
    if (claimed.count === 0) {
      results.push({ targetId: target.id, status: "posted" }); // already in flight or done
      continue;
    }

    try {
      const { platformPostId, platformUrl } = await dispatchToAccount(
        { caption: post.caption, mediaUrls: post.mediaUrls, mediaUrl: post.mediaUrl, mediaType: post.mediaType },
        target.socialAccountId
      );
      await db.postTarget.update({
        where: { id: target.id },
        data: { status: "POSTED", platformPostId, platformUrl, postedAt: new Date(), errorMessage: null },
      });
      results.push({ targetId: target.id, status: "posted" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.postTarget.update({
        where: { id: target.id },
        data: { status: "FAILED", errorMessage: message.slice(0, 1000) },
      });
      results.push({ targetId: target.id, status: "failed", error: message });
    }
  }

  // Roll up post-level status
  const allPosted = results.every((r) => r.status === "posted");
  const anyPosted = results.some((r) => r.status === "posted");
  await db.post.update({
    where: { id: postId },
    data: {
      status: allPosted ? "POSTED" : anyPosted ? "POSTED" : "FAILED",
      postedAt: anyPosted ? new Date() : undefined,
    },
  });

  return results;
}

// Legacy single-account path: used when PostTarget rows don't exist (old posts).
export async function publishPost(postId: string): Promise<PublishResult> {
  const post = await db.post.findUnique({ where: { id: postId }, include: { socialAccount: true } });
  if (!post) throw new Error("Post not found");
  if (!post.socialAccount) throw new Error("No social account selected for this post");
  if (!post.caption) throw new Error("Caption required before publishing");

  return dispatchToAccount(
    { caption: post.caption, mediaUrls: post.mediaUrls, mediaUrl: post.mediaUrl, mediaType: post.mediaType },
    post.socialAccount.id
  );
}
