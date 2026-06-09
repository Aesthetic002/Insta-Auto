import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  canEditCreatorWorkspace,
  resolveActiveCreator,
} from "@/lib/permissions";

// Reusable media library, keyed to the active creator. The browser uploads
// directly to Cloudinary (signed), then POSTs the resulting URL here to save
// it for reuse across templates.

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) return NextResponse.json({ assets: [] });

  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind =
    kindParam === "IMAGE" || kindParam === "VIDEO" ? kindParam : undefined;

  const assets = await db.mediaAsset.findMany({
    where: { userId: ctx.creatorId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "no_workspace" }, { status: 400 });
  }
  if (!(await canEditCreatorWorkspace(session.user.id, ctx.creatorId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url : "";
  const kind = body.kind === "VIDEO" ? "VIDEO" : "IMAGE";
  const label =
    typeof body.label === "string" && body.label.trim().length > 0
      ? body.label.trim().slice(0, 80)
      : null;

  if (!url.startsWith("http")) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  // De-dupe: if this exact URL is already saved, return it instead of a copy.
  const existing = await db.mediaAsset.findFirst({
    where: { userId: ctx.creatorId, url },
  });
  if (existing) return NextResponse.json({ asset: existing });

  const asset = await db.mediaAsset.create({
    data: { userId: ctx.creatorId, kind, url, label },
  });
  return NextResponse.json({ asset });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) return NextResponse.json({ error: "no_workspace" }, { status: 400 });
  if (!(await canEditCreatorWorkspace(session.user.id, ctx.creatorId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  // Scope the delete to this creator so editors can't nuke arbitrary rows.
  await db.mediaAsset.deleteMany({ where: { id, userId: ctx.creatorId } });
  return NextResponse.json({ ok: true });
}
