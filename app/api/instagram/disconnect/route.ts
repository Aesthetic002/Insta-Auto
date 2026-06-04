import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/origin";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // Legacy route kept for backward compat; new UI uses /api/social/disconnect
  await db.socialAccount.updateMany({
    where: { id, userId: session.user.id },
    data: { disconnectedAt: new Date() },
  });

  return NextResponse.redirect(publicUrl(request, "/settings?disconnected=1"), {
    status: 303,
  });
}
