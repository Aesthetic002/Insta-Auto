import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  canEditCreatorWorkspace,
  resolveActiveCreator,
} from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await db.post.findMany({
    where: { userId: ctx.creatorId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    mediaUrl,
    mediaUrls,
    thumbnailUrl,
    outline,
    mediaType = "VIDEO",
  } = body as {
    mediaUrl?: string;
    mediaUrls?: string[];
    thumbnailUrl?: string;
    outline?: string;
    mediaType?: "VIDEO" | "PHOTO" | "CAROUSEL";
  };

  if (!outline || typeof outline !== "string" || outline.trim().length < 3) {
    return NextResponse.json({ error: "outline required" }, { status: 400 });
  }

  const allUrls = mediaUrls?.length ? mediaUrls : mediaUrl ? [mediaUrl] : [];
  if (allUrls.length === 0) {
    return NextResponse.json({ error: "at least one media URL required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) {
    return NextResponse.json(
      {
        error: "no_workspace",
        message: "No creator workspace available. Connect with a creator first.",
      },
      { status: 400 }
    );
  }

  if (!(await canEditCreatorWorkspace(session.user.id, ctx.creatorId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const post = await db.post.create({
    data: {
      userId: ctx.creatorId,
      source: "UPLOAD",
      mediaType,
      mediaUrl: allUrls[0],
      mediaUrls: allUrls,
      thumbnailUrl: thumbnailUrl ?? null,
      outline: outline.trim(),
      status: "DRAFT",
    },
  });

  return NextResponse.json({ post });
}
