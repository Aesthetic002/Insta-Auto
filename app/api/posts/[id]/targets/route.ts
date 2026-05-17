import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isCreatorOf } from "@/lib/permissions";

// PUT /api/posts/[id]/targets
// Body: { accountIds: string[] }
// Replaces all PostTarget rows for this post with the given account IDs.
export async function PUT(
  request: Request,
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

  const body = await request.json();
  const accountIds: string[] = Array.isArray(body.accountIds) ? body.accountIds : [];

  // Verify all accounts belong to the creator
  const accounts = await db.socialAccount.findMany({
    where: { id: { in: accountIds }, userId: post.userId, disconnectedAt: null },
  });
  if (accounts.length !== accountIds.length) {
    return NextResponse.json({ error: "invalid_accounts" }, { status: 400 });
  }

  // Replace targets atomically
  await db.$transaction([
    db.postTarget.deleteMany({ where: { postId: id } }),
    ...accounts.map((acc) =>
      db.postTarget.create({ data: { postId: id, socialAccountId: acc.id } })
    ),
  ]);

  // Also update the post's primary platform/account for display purposes
  const primary = accounts[0] ?? null;
  await db.post.update({
    where: { id },
    data: {
      socialAccountId: primary?.id ?? null,
      platform: primary?.platform ?? null,
    },
  });

  const targets = await db.postTarget.findMany({
    where: { postId: id },
    include: { socialAccount: true },
  });
  return NextResponse.json({ targets });
}

// GET /api/posts/[id]/targets
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const targets = await db.postTarget.findMany({
    where: { postId: id },
    include: { socialAccount: true },
  });
  return NextResponse.json({ targets });
}
