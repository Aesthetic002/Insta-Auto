import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { getTemplate } from "@/lib/templates";

// Keep this route node-only so Remotion's native deps are never pulled into
// any edge/client graph at build time.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const templateId = typeof body?.templateId === "string" ? body.templateId : "";
  const inputs = body?.inputs as Record<string, unknown> | undefined;

  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "unknown_template" }, { status: 400 });
  }
  if (!inputs || typeof inputs !== "object") {
    return NextResponse.json({ error: "inputs_required" }, { status: 400 });
  }

  for (const slot of template.slots) {
    const v = inputs[slot.id];
    if (typeof v !== "string" || !v.startsWith("http")) {
      return NextResponse.json(
        { error: "invalid_input", field: slot.id },
        { status: 400 }
      );
    }
  }
  for (const ti of template.textInputs) {
    const v = inputs[ti.id];
    if (typeof v !== "string" || v.trim().length === 0) {
      return NextResponse.json(
        { error: "invalid_input", field: ti.id },
        { status: 400 }
      );
    }
    if (v.length > ti.maxChars) {
      return NextResponse.json(
        { error: "too_long", field: ti.id },
        { status: 400 }
      );
    }
  }

  // Inject the clinic logo from the active creator's profile (if set) so
  // templates render the real logo instead of the fallback tooth glyph. Logo
  // is a server-side concern — never sent from or trusted from the client.
  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  const finalInputs: Record<string, unknown> = { ...inputs };
  if (ctx) {
    const profile = await db.businessProfile.findUnique({
      where: { userId: ctx.creatorId },
      select: { logoUrl: true },
    });
    if (profile?.logoUrl) {
      finalInputs.logoUrl = profile.logoUrl;
    }
  }

  const job = await db.renderJob.create({
    data: {
      userId: session.user.id,
      templateId: template.id,
      kind: template.kind === "image" ? "IMAGE" : "VIDEO",
      inputs: finalInputs as object,
      status: "QUEUED",
    },
  });

  const { startRender } = await import("@/lib/render/service");
  await startRender(job.id);

  return NextResponse.json({ jobId: job.id, status: job.status });
}
