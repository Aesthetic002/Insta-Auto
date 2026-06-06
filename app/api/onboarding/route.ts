import { NextResponse } from "next/server";
import type { Profession, UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_ROLES: UserRole[] = ["CREATOR", "EDITOR"];
const VALID_PROFESSIONS: Profession[] = ["DENTAL"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    role?: string;
    profession?: string;
  };

  if (!body.role || !VALID_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  if (
    !body.profession ||
    !VALID_PROFESSIONS.includes(body.profession as Profession)
  ) {
    return NextResponse.json({ error: "invalid_profession" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      role: body.role as UserRole,
      profession: body.profession as Profession,
      onboarded: true,
    },
  });

  return NextResponse.json({ ok: true });
}
