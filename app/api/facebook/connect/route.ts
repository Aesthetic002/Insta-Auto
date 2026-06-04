import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { getPublicOrigin } from "@/lib/origin";

const STATE_COOKIE = "fb_oauth_state";
const FB_BASE = "https://www.facebook.com";

function v() { return process.env.META_GRAPH_VERSION ?? "v23.0"; }

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/", request.url));

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getPublicOrigin(request)}/api/facebook/callback`;

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: redirectUri,
    state,
    scope: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "public_profile"].join(","),
    response_type: "code",
  });

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(`${FB_BASE}/${v()}/dialog/oauth?${params.toString()}`);
}
