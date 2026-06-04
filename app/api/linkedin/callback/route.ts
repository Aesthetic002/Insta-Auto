import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto/encryption";
import { exchangeLinkedInCode, getLinkedInProfile } from "@/lib/linkedin/oauth";
import { getPublicOrigin } from "@/lib/origin";

const STATE_COOKIE = "li_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectToSettings(request, { error: `linkedin_${error}` });
  if (!code || !state) return redirectToSettings(request, { error: "linkedin_missing_code" });

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return redirectToSettings(request, { error: "linkedin_state_mismatch" });
  }

  try {
    const redirectUri = `${getPublicOrigin(request)}/api/linkedin/callback`;
    const { accessToken, expiresIn } = await exchangeLinkedInCode({ code, redirectUri });
    const profile = await getLinkedInProfile(accessToken);

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    // LinkedIn member URN format for UGC posts
    const authorUrn = `urn:li:person:${profile.id}`;

    await db.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: session.user.id,
          platform: "LINKEDIN",
          accountId: authorUrn,
        },
      },
      create: {
        userId: session.user.id,
        platform: "LINKEDIN",
        accountId: authorUrn,
        username: profile.id,
        displayName: `${profile.firstName} ${profile.lastName}`.trim(),
        avatarUrl: profile.profilePicture,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        disconnectedAt: null,
      },
      update: {
        displayName: `${profile.firstName} ${profile.lastName}`.trim(),
        avatarUrl: profile.profilePicture,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        disconnectedAt: null,
      },
    });

    return redirectToSettings(request, { connected_platform: "LinkedIn" });
  } catch (err) {
    console.error("[linkedin-callback] failed", err);
    return redirectToSettings(request, { error: "linkedin_exchange_failed" });
  }
}

function redirectToSettings(request: Request, params: Record<string, string>) {
  const u = new URL("/settings", request.url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}
