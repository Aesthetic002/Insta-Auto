import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canEditCreatorWorkspace } from "@/lib/permissions";
import { generateCaption } from "@/lib/gemini/caption";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canEditCreatorWorkspace(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const prefs = await db.preferences.findUnique({
    where: { userId: post.userId },
  });

  try {
    const caption = await generateCaption({
      outline: post.outline,
      tone: prefs?.captionTone,
      hashtagCount: prefs?.hashtagCount,
      systemPromptOverride: prefs?.systemPrompt ?? undefined,
    });
    const updated = await db.post.update({
      where: { id },
      data: { caption },
    });
    return NextResponse.json({ post: updated });
  } catch (err) {
    console.error("[generate-caption] failed", err);
    return NextResponse.json(
      {
        error: "generation_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
