import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { buildAuthorizeUrl } from "@/lib/instagram/oauth";
import { getPublicOrigin, publicUrl } from "@/lib/origin";

const STATE_COOKIE = "ig_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(publicUrl(request, "/"));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getPublicOrigin(request)}/api/instagram/callback`;
  const authorizeUrl = buildAuthorizeUrl({ redirectUri, state });

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.redirect(authorizeUrl);
}
