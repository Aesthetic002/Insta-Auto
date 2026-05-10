import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

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

  await db.igAccount.updateMany({
    where: { id, userId: session.user.id },
    data: { disconnectedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/settings?disconnected=1", request.url), {
    status: 303,
  });
}
