import { NextResponse } from "next/server";
import type { ApprovalMode } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_MODES: ApprovalMode[] = ["AUTO", "EMAIL", "MANUAL"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const prefs = await db.preferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });
  return NextResponse.json({ preferences: prefs });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    approvalMode?: string;
    captionTone?: string;
    hashtagCount?: number;
    systemPrompt?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (body.approvalMode) {
    if (!VALID_MODES.includes(body.approvalMode as ApprovalMode)) {
      return NextResponse.json({ error: "invalid_approval_mode" }, { status: 400 });
    }
    data.approvalMode = body.approvalMode;
  }
  if (typeof body.captionTone === "string") data.captionTone = body.captionTone;
  if (typeof body.hashtagCount === "number" && body.hashtagCount >= 0 && body.hashtagCount <= 10)
    data.hashtagCount = body.hashtagCount;
  if (body.systemPrompt !== undefined) data.systemPrompt = body.systemPrompt;

  const prefs = await db.preferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });
  return NextResponse.json({ preferences: prefs });
}
