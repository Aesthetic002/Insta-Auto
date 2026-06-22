import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_ROLES: UserRole[] = ["CREATOR", "EDITOR"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { role?: string };

  if (!body.role || !VALID_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { role: body.role as UserRole, onboarded: true },
  });

  return NextResponse.json({ ok: true });
}
