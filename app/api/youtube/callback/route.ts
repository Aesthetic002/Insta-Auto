import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeCodeForToken,
  getChannel,
} from "@/lib/youtube/oauth";
import { getPublicOrigin, publicUrl } from "@/lib/origin";

const STATE_COOKIE = "yt_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(publicUrl(request, "/"));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectToSettings(request, { error: `youtube_${error}` });
  if (!code || !state)
    return redirectToSettings(request, { error: "youtube_missing_code" });

  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expected || expected !== state)
    return redirectToSettings(request, { error: "youtube_state_mismatch" });

  try {
    const redirectUri = `${getPublicOrigin(request)}/api/youtube/callback`;
    const tok = await exchangeCodeForToken({ code, redirectUri });
    const channel = await getChannel(tok.accessToken);

    if (!channel) {
      return redirectToSettings(request, { error: "youtube_no_channel" });
    }

    await db.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: session.user.id,
          platform: "YOUTUBE",
          accountId: channel.channelId,
        },
      },
      create: {
        userId: session.user.id,
        platform: "YOUTUBE",
        accountId: channel.channelId,
        username: channel.title,
        displayName: channel.title,
        avatarUrl: channel.thumbnailUrl,
        accessToken: encrypt(tok.accessToken),
        refreshToken: tok.refreshToken ? encrypt(tok.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tok.expiresInSec * 1000),
        disconnectedAt: null,
      },
      update: {
        username: channel.title,
        displayName: channel.title,
        avatarUrl: channel.thumbnailUrl,
        accessToken: encrypt(tok.accessToken),
        refreshToken: tok.refreshToken ? encrypt(tok.refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + tok.expiresInSec * 1000),
        disconnectedAt: null,
      },
    });

    return redirectToSettings(request, { connected_platform: "YouTube" });
  } catch (err) {
    console.error("[youtube-callback]", err);
    return redirectToSettings(request, { error: "youtube_exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = publicUrl(request, "/settings");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
