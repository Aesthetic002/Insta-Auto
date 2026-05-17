import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canEditCreatorWorkspace } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await db.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!(await canEditCreatorWorkspace(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.caption === "string") data.caption = body.caption;
  if (typeof body.outline === "string") data.outline = body.outline.trim();
  if (typeof body.socialAccountId === "string") data.socialAccountId = body.socialAccountId;
  if (typeof body.platform === "string") data.platform = body.platform;

  const updated = await db.post.update({ where: { id }, data });
  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await db.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!(await canEditCreatorWorkspace(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
