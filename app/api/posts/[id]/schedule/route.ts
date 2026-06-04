import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCreatorOf } from "@/lib/permissions";
import { signApprovalToken } from "@/lib/crypto/tokens";
import { sendEmail } from "@/lib/email/resend";
import { approvalEmailHtml } from "@/lib/email/templates";
import { getPublicOrigin } from "@/lib/origin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const post = await db.post.findUnique({
    where: { id },
    include: { socialAccount: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await isCreatorOf(session.user.id, post.userId)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!post.caption)
    return NextResponse.json(
      { error: "caption_required", message: "Generate or write a caption before scheduling." },
      { status: 400 }
    );

  const body = await request.json();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || isNaN(scheduledAt.getTime()))
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });

  // Check user's approval mode preference
  const prefs = await db.preferences.findUnique({ where: { userId: post.userId } });
  const needsApproval = prefs?.approvalMode === "EMAIL";

  if (needsApproval) {
    const creator = await db.user.findUnique({ where: { id: post.userId } });

    const appUrl = getPublicOrigin(request);
    const approveTok = signApprovalToken({ postId: id, action: "approve" });
    const rejectTok = signApprovalToken({ postId: id, action: "reject" });
    const editTok = signApprovalToken({ postId: id, action: "edit" });

    const approveUrl = `${appUrl}/approve/${approveTok}`;
    const rejectUrl = `${appUrl}/approve/${rejectTok}`;
    const editUrl = `${appUrl}/approve/${editTok}`;

    await db.post.update({
      where: { id },
      data: { scheduledAt, status: "PENDING_APPROVAL" },
    });

    if (creator?.email) {
      await sendEmail({
        to: creator.email,
        subject: `Approve your post: ${post.outline}`,
        html: approvalEmailHtml({
          appUrl,
          recipientName: creator.name,
          thumbnailUrl: post.thumbnailUrl,
          outline: post.outline,
          caption: post.caption,
          scheduledAt,
          approveUrl,
          rejectUrl,
          editUrl,
        }),
      }).catch((err) => console.error("[schedule] email failed", err));
    }

    return NextResponse.json({ requiresApproval: true });
  }

  // No approval needed — go straight to SCHEDULED
  await db.post.update({
    where: { id },
    data: { scheduledAt, status: "SCHEDULED" },
  });

  return NextResponse.json({ requiresApproval: false });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await isCreatorOf(session.user.id, post.userId)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db.post.update({
    where: { id },
    data: { scheduledAt: null, status: "DRAFT" },
  });

  return NextResponse.json({ ok: true });
}
