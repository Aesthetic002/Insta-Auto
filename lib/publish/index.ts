// Multi-platform publish router.
// publishPost: publishes to a single social account (legacy single-account path).
// publishPostToAccount: publishes to a specific account by ID (multi-account fan-out).

import { db } from "@/lib/db";
import { publishToInstagram } from "./instagram";
import { publishToFacebook } from "./facebook";
import { publishToLinkedIn } from "./linkedin";
import { publishToPinterest, getFirstPinterestBoard } from "./pinterest";
import { sendEmail } from "@/lib/email/resend";
import {
  publishedEmailHtml,
  type PublishedTargetResult,
} from "@/lib/email/templates";

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

  const targets = await db.postTarget.findMany({
    where: { postId },
    include: { socialAccount: { select: { platform: true, displayName: true } } },
  });
  if (targets.length === 0) throw new Error("No publish targets set for this post");

  const results: { targetId: string; status: "posted" | "failed"; error?: string }[] = [];
  // Rich per-target detail for the published-summary email.
  const emailResults: PublishedTargetResult[] = [];

  for (const target of targets) {
    const platform = target.socialAccount.platform;
    const accountName = target.socialAccount.displayName ?? null;

    // Claim the target
    const claimed = await db.postTarget.updateMany({
      where: { id: target.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "PUBLISHING" },
    });
    if (claimed.count === 0) {
      results.push({ targetId: target.id, status: "posted" }); // already in flight or done
      emailResults.push({ platform, accountName, status: "posted", url: target.platformUrl });
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
      emailResults.push({ platform, accountName, status: "posted", url: platformUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.postTarget.update({
        where: { id: target.id },
        data: { status: "FAILED", errorMessage: message.slice(0, 1000) },
      });
      results.push({ targetId: target.id, status: "failed", error: message });
      emailResults.push({ platform, accountName, status: "failed", url: null, error: message });
    }
  }

  // Roll up post-level status
  const anyPosted = results.some((r) => r.status === "posted");
  const postedAt = anyPosted ? new Date() : null;
  await db.post.update({
    where: { id: postId },
    data: {
      status: anyPosted ? "POSTED" : "FAILED",
      postedAt: postedAt ?? undefined,
    },
  });

  // Notify the creator with a published summary (best-effort — never block or
  // fail the publish on email problems).
  if (anyPosted) {
    void sendPublishedEmail(post.userId, postId, postedAt ?? new Date(), emailResults);
  }

  return results;
}

async function sendPublishedEmail(
  creatorId: string,
  postId: string,
  postedAt: Date,
  emailResults: PublishedTargetResult[]
): Promise<void> {
  try {
    const [creator, post] = await Promise.all([
      db.user.findUnique({ where: { id: creatorId }, select: { name: true, email: true } }),
      db.post.findUnique({
        where: { id: postId },
        select: { outline: true, caption: true, thumbnailUrl: true, mediaType: true },
      }),
    ]);
    if (!creator?.email || !post) return;

    // App URL for email links — env-based (no request context here).
    const appUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "")
      .trim()
      .replace(/\/$/, "");

    await sendEmail({
      to: creator.email,
      subject: `Published: ${post.outline}`,
      html: publishedEmailHtml({
        appUrl: appUrl || "https://seashell-app-3hblv.ondigitalocean.app",
        recipientName: creator.name,
        outline: post.outline,
        caption: post.caption ?? "",
        thumbnailUrl: post.thumbnailUrl,
        mediaType: post.mediaType,
        postedAt,
        postId,
        results: emailResults,
      }),
    });
  } catch (err) {
    console.error("[publish] published-email failed", err);
  }
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
