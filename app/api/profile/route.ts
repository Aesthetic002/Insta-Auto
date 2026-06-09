import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  canEditCreatorWorkspace,
  resolveActiveCreator,
} from "@/lib/permissions";

// Business profile reads/writes always target the active CREATOR's profile.
// An editor filling templates for a creator uses (and may update) that
// creator's profile — never their own.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) return NextResponse.json({ profile: null });

  const profile = await db.businessProfile.findUnique({
    where: { userId: ctx.creatorId },
  });
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  if (!ctx) {
    return NextResponse.json({ error: "no_workspace" }, { status: 400 });
  }
  if (!(await canEditCreatorWorkspace(session.user.id, ctx.creatorId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  const clinicName =
    typeof body.clinicName === "string" ? body.clinicName.trim() : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const logoUrl =
    typeof body.logoUrl === "string" && body.logoUrl.startsWith("http")
      ? body.logoUrl
      : body.logoUrl === null
      ? null
      : undefined;
  const services = Array.isArray(body.services)
    ? body.services
        .filter((s: unknown) => typeof s === "string")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 8)
    : undefined;

  const data: Record<string, unknown> = {};
  if (clinicName !== undefined) data.clinicName = clinicName || null;
  if (phone !== undefined) data.phone = phone || null;
  if (logoUrl !== undefined) data.logoUrl = logoUrl;
  if (services !== undefined) data.services = services;

  const profile = await db.businessProfile.upsert({
    where: { userId: ctx.creatorId },
    create: { userId: ctx.creatorId, ...data },
    update: data,
  });

  return NextResponse.json({ profile });
}
