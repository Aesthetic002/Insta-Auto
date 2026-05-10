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

  const post = await db.post.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await isCreatorOf(session.user.id, post.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!post.caption) {
    return NextResponse.json({ error: "caption_required" }, { status: 400 });
  }
  if (!post.user.email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

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
      scheduledAt: post.scheduledAt,
      approveUrl: `${appUrl}/approve/${approveTok}`,
      rejectUrl: `${appUrl}/approve/${rejectTok}`,
      editUrl: `${appUrl}/approve/${editTok}`,
    }),
  });

  return NextResponse.json({ ok: true });
}
