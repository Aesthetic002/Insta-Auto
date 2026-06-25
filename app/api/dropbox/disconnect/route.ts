import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await db.storageConnection.updateMany({
    where: { userId: session.user.id, provider: "DROPBOX" },
    data: { disconnectedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
