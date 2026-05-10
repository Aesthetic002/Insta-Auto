import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

// PATCH { action: "accept" | "decline" } — recipient responds to a PENDING invite.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as { action?: string };
  if (!["accept", "decline"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const assignment = await db.editorAssignment.findUnique({ where: { id } });
  if (!assignment || assignment.status !== "PENDING") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Recipient = the OPPOSITE party from the initiator.
  const recipientId =
    assignment.initiatedBy === "CREATOR" ? assignment.editorId : assignment.creatorId;
  if (recipientId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await db.editorAssignment.update({
    where: { id },
    data: {
      status: body.action === "accept" ? "ACCEPTED" : "DECLINED",
      respondedAt: new Date(),
    },
  });
  return NextResponse.json({ assignment: updated });
}

// DELETE — cancel a PENDING invite I sent, or remove an ACCEPTED link.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const assignment = await db.editorAssignment.findUnique({ where: { id } });
  if (!assignment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Either party may break an accepted link or cancel an invite.
  const allowed =
    assignment.creatorId === session.user.id ||
    assignment.editorId === session.user.id;
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.editorAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
