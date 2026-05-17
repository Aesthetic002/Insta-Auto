// Multi-platform publish router.
// Called by the publish API route. Reads the post + social account and
// dispatches to the correct platform adapter.

import { db } from "@/lib/db";
import { publishToInstagram } from "./instagram";
import { publishToFacebook } from "./facebook";
import { publishToLinkedIn } from "./linkedin";
import { publishToPinterest, getFirstPinterestBoard } from "./pinterest";

export interface PublishResult {
  platformPostId: string;
  platformUrl: string | null;
}

export async function publishPost(postId: string): Promise<PublishResult> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { socialAccount: true },
  });

  if (!post) throw new Error("Post not found");
  if (!post.socialAccount) throw new Error("No social account selected for this post");
  if (!post.caption) throw new Error("Caption required before publishing");

  const acc = post.socialAccount;
  const mediaUrls = post.mediaUrls.length > 0 ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
  const mediaType = post.mediaType as "VIDEO" | "PHOTO" | "CAROUSEL";

  switch (acc.platform) {
    case "INSTAGRAM": {
      if (!acc.accountId) throw new Error("Instagram account ID missing");
      return publishToInstagram({
        igBusinessId: acc.accountId,
        encryptedToken: acc.accessToken,
        mediaUrls,
        mediaType,
        caption: post.caption,
      });
    }

    case "FACEBOOK": {
      const pageId = acc.pageId ?? acc.accountId;
      if (!pageId) throw new Error("Facebook Page ID missing");
      return publishToFacebook({
        pageId,
        encryptedToken: acc.accessToken,
        mediaUrls,
        mediaType,
        caption: post.caption,
      });
    }

    case "LINKEDIN": {
      if (!acc.accountId) throw new Error("LinkedIn author URN missing");
      return publishToLinkedIn({
        authorUrn: acc.accountId,
        encryptedToken: acc.accessToken,
        mediaUrls,
        mediaType,
        caption: post.caption,
      });
    }

    case "PINTEREST": {
      // Board ID: stored as "board:{id}" prefix in displayName field (v1 convention)
      let boardId: string | null = null;
      if (acc.displayName?.startsWith("board:")) {
        boardId = acc.displayName.slice(6);
      } else {
        const board = await getFirstPinterestBoard(acc.accessToken);
        boardId = board?.boardId ?? null;
      }
      if (!boardId) throw new Error("No Pinterest board found. Connect again to pick a board.");
      return publishToPinterest({
        boardId,
        encryptedToken: acc.accessToken,
        mediaUrls,
        mediaType,
        caption: post.caption,
      });
    }

    default:
      throw new Error(`Unsupported platform: ${acc.platform}`);
  }
}
