// Pinterest publishing adapter — Pinterest API v5.
// Creates a Pin on a board.
//
// Required env vars:
//   PINTEREST_APP_ID
//   PINTEREST_APP_SECRET
//
// SocialAccount fields used:
//   accessToken  — encrypted OAuth 2.0 access token
//   accountId    — Pinterest user ID (used to look up boards)
//
// The board to pin to is stored in a convention: we use the first board
// found for the user, or a preferred board ID stored in SocialAccount.displayName
// as "board:{boardId}" (hacky but avoids a new schema column for v1).

import { decrypt } from "@/lib/crypto/encryption";

const API_BASE = "https://api.pinterest.com/v5";

export interface PinterestPublishOpts {
  encryptedToken: string;
  boardId: string;         // Pinterest board ID to pin to
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  caption: string;
}

export async function publishToPinterest(
  opts: PinterestPublishOpts
): Promise<{ platformPostId: string; platformUrl: string | null }> {
  const token = decrypt(opts.encryptedToken);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (opts.mediaType === "VIDEO" && opts.mediaUrls.length > 0) {
    // Pinterest video Pin via media_source URL
    const body = {
      board_id: opts.boardId,
      title: opts.caption.slice(0, 100),
      description: opts.caption,
      media_source: {
        source_type: "video_url",
        url: opts.mediaUrls[0],
        content_type: "video/mp4",
      },
    };
    const res = await fetch(`${API_BASE}/pins`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(`Pinterest pin failed: ${JSON.stringify(json).slice(0, 400)}`);
    return {
      platformPostId: json.id as string,
      platformUrl: `https://www.pinterest.com/pin/${json.id}/`,
    };
  }

  // Image pin (single or first of carousel)
  const body = {
    board_id: opts.boardId,
    title: opts.caption.slice(0, 100),
    description: opts.caption,
    media_source: {
      source_type: "image_url",
      url: opts.mediaUrls[0],
    },
  };

  const res = await fetch(`${API_BASE}/pins`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.id) throw new Error(`Pinterest pin failed: ${JSON.stringify(json).slice(0, 400)}`);
  return {
    platformPostId: json.id as string,
    platformUrl: `https://www.pinterest.com/pin/${json.id}/`,
  };
}

// Fetch the user's boards and return the first one
export async function getFirstPinterestBoard(
  encryptedToken: string
): Promise<{ boardId: string; boardName: string } | null> {
  const token = decrypt(encryptedToken);
  const res = await fetch(`${API_BASE}/boards?page_size=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const board = json.items?.[0];
  if (!board) return null;
  return { boardId: board.id as string, boardName: board.name as string };
}
