import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import { exchangePinterestCode, getPinterestUser } from "@/lib/pinterest/oauth";
import { getFirstPinterestBoard } from "@/lib/publish/pinterest";

const STATE_COOKIE = "pin_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectToSettings(request, { error: `pinterest_${error}` });
  if (!code || !state) return redirectToSettings(request, { error: "pinterest_missing_code" });

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return redirectToSettings(request, { error: "pinterest_state_mismatch" });
  }

  try {
    const redirectUri = `${url.origin}/api/pinterest/callback`;
    const { accessToken, expiresIn } = await exchangePinterestCode({ code, redirectUri });
    const profile = await getPinterestUser(accessToken);
    // Fetch first board to store as default
    const board = await getFirstPinterestBoard(encrypt(accessToken)).catch(() => null);

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: session.user.id,
          platform: "PINTEREST",
          accountId: profile.id,
        },
      },
      create: {
        userId: session.user.id,
        platform: "PINTEREST",
        accountId: profile.id,
        username: profile.username,
        displayName: board ? `board:${board.boardId}` : profile.displayName,
        avatarUrl: profile.profileImage,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        disconnectedAt: null,
      },
      update: {
        username: profile.username,
        displayName: board ? `board:${board.boardId}` : profile.displayName,
        avatarUrl: profile.profileImage,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        disconnectedAt: null,
      },
    });

    return redirectToSettings(request, { connected_platform: "Pinterest" });
  } catch (err) {
    console.error("[pinterest-callback] failed", err);
    return redirectToSettings(request, { error: "pinterest_exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = new URL("/settings", request.url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
