import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

// POST { email, message? } — invite the user with that email.
// Direction is inferred from the sender's role.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const me = await db.user.findUnique({ where: { id: session.user.id } });
  if (!me?.role) {
    return NextResponse.json({ error: "complete_onboarding_first" }, { status: 400 });
  }

  const body = (await request.json()) as { email?: string; message?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (email === me.email.toLowerCase()) {
    return NextResponse.json(
      { error: "cannot_invite_self", message: "That's your own email." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { email } });
  if (!target) {
    return NextResponse.json(
      {
        error: "user_not_found",
        message:
          "That email isn't on Promote yet. Ask them to sign in first, then invite.",
      },
      { status: 404 }
    );
  }
  if (!target.role) {
    return NextResponse.json(
      {
        error: "user_not_onboarded",
        message: "That user hasn't picked a role yet. Ask them to finish onboarding.",
      },
      { status: 400 }
    );
  }

  // Determine direction
  let creatorId: string;
  let editorId: string;
  let initiator: "CREATOR" | "EDITOR";

  if (me.role === "CREATOR") {
    if (target.role !== "EDITOR") {
      return NextResponse.json(
        {
          error: "wrong_target_role",
          message: "That user is a creator, not an editor.",
        },
        { status: 400 }
      );
    }
    creatorId = me.id;
    editorId = target.id;
    initiator = "CREATOR";
  } else {
    if (target.role !== "CREATOR") {
      return NextResponse.json(
        {
          error: "wrong_target_role",
          message: "That user is an editor, not a creator.",
        },
        { status: 400 }
      );
    }
    creatorId = target.id;
    editorId = me.id;
    initiator = "EDITOR";
  }

  // Idempotent upsert. If a previous DECLINED record exists, reset to PENDING.
  const existing = await db.editorAssignment.findUnique({
    where: { creatorId_editorId: { creatorId, editorId } },
  });
  if (existing?.status === "ACCEPTED") {
    return NextResponse.json(
      { error: "already_linked", message: "You're already connected with that user." },
      { status: 400 }
    );
  }

  const assignment = await db.editorAssignment.upsert({
    where: { creatorId_editorId: { creatorId, editorId } },
    create: {
      creatorId,
      editorId,
      status: "PENDING",
      initiatedBy: initiator,
      message: body.message,
    },
    update: {
      status: "PENDING",
      initiatedBy: initiator,
      message: body.message,
      respondedAt: null,
    },
  });

  return NextResponse.json({ assignment });
}

// GET — list invites involving me.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const me = await db.user.findUnique({ where: { id: session.user.id } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const incoming = await db.editorAssignment.findMany({
    where: {
      status: "PENDING",
      AND: [
        me.role === "CREATOR"
          ? { creatorId: me.id, initiatedBy: "EDITOR" }
          : { editorId: me.id, initiatedBy: "CREATOR" },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      editor: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const outgoing = await db.editorAssignment.findMany({
    where: {
      status: "PENDING",
      AND: [
        me.role === "CREATOR"
          ? { creatorId: me.id, initiatedBy: "CREATOR" }
          : { editorId: me.id, initiatedBy: "EDITOR" },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      editor: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const active = await db.editorAssignment.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ creatorId: me.id }, { editorId: me.id }],
    },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      editor: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { respondedAt: "desc" },
  });

  return NextResponse.json({ incoming, outgoing, active });
}
