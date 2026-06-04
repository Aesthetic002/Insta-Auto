import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { buildLinkedInAuthorizeUrl } from "@/lib/linkedin/oauth";
import { getPublicOrigin } from "@/lib/origin";

const STATE_COOKIE = "li_oauth_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/", request.url));

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getPublicOrigin(request)}/api/linkedin/callback`;
  const authorizeUrl = buildLinkedInAuthorizeUrl({ redirectUri, state });

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authorizeUrl);
}
