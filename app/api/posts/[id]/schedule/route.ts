import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCreatorOf } from "@/lib/permissions";
import { signApprovalToken } from "@/lib/crypto/tokens";
import { sendEmail } from "@/lib/email/resend";
import { approvalEmailHtml } from "@/lib/email/templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = (await request.json()) as { scheduledAt?: string };
  if (!body.scheduledAt) {
    return NextResponse.json({ error: "scheduledAt_required" }, { status: 400 });
  }
  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { error: "past_date", message: "Pick a time in the future." },
      { status: 400 }
    );
  }

  const post = await db.post.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only the creator can schedule.
  if (!(await isCreatorOf(session.user.id, post.userId))) {
    return NextResponse.json(
      { error: "forbidden", message: "Only the creator can schedule." },
      { status: 403 }
    );
  }
  if (!post.caption) {
    return NextResponse.json(
      { error: "caption_required", message: "Add or generate a caption first." },
      { status: 400 }
    );
  }
  if (
    post.status !== "DRAFT" &&
    post.status !== "SCHEDULED" &&
    post.status !== "PENDING_APPROVAL" &&
    post.status !== "FAILED" &&
    post.status !== "REJECTED"
  ) {
    return NextResponse.json(
      { error: "wrong_state", message: `Cannot schedule from status ${post.status}` },
      { status: 400 }
    );
  }

  const prefs = await db.preferences.findUnique({
    where: { userId: post.userId },
  });
  const mode = prefs?.approvalMode ?? "EMAIL";

  if (mode === "AUTO") {
    const updated = await db.post.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt,
        errorMessage: null,
        retryCount: 0,
      },
    });
    return NextResponse.json({ post: updated, requiresApproval: false });
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      status: "PENDING_APPROVAL",
      scheduledAt,
      errorMessage: null,
      retryCount: 0,
    },
  });

  if (mode === "EMAIL" && post.user.email) {
    try {
      const appUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
      const approveTok = signApprovalToken({ postId: id, action: "approve" });
      const rejectTok = signApprovalToken({ postId: id, action: "reject" });
      const editTok = signApprovalToken({ postId: id, action: "edit" });
      await sendEmail({
        to: post.user.email,
        subject: `Approve reel: ${post.outline.slice(0, 60)}`,
        html: approvalEmailHtml({
          appUrl,
          recipientName: post.user.name,
          thumbnailUrl: post.thumbnailUrl,
          outline: post.outline,
          caption: post.caption,
          scheduledAt,
          approveUrl: `${appUrl}/approve/${approveTok}`,
          rejectUrl: `${appUrl}/approve/${rejectTok}`,
          editUrl: `${appUrl}/approve/${editTok}`,
        }),
      });
    } catch (err) {
      console.error("[schedule] approval email failed", err);
    }
  }

  return NextResponse.json({ post: updated, requiresApproval: true, mode });
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
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await isCreatorOf(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.post.update({
    where: { id },
    data: { status: "DRAFT", scheduledAt: null },
  });
  return NextResponse.json({ ok: true });
}
