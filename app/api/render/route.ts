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
  // Text fields are optional: a blank field falls back to its placeholder so
  // the template never renders an empty string. We only reject values that
  // exceed the max length. Numeric-looking values (e.g. the testimonial star
  // rating) are coerced to numbers so they satisfy the composition's zod
  // schema, whether they came from the client or a placeholder default.
  const resolvedText: Record<string, string | number> = {};
  for (const ti of template.textInputs) {
    const raw = inputs[ti.id];
    const strValue =
      (typeof raw === "string" || typeof raw === "number") &&
      String(raw).trim().length > 0
        ? String(raw)
        : ti.placeholder ?? "";
    if (strValue.length > ti.maxChars) {
      return NextResponse.json(
        { error: "too_long", field: ti.id },
        { status: 400 }
      );
    }
    // Short fields that are a clean integer get coerced (rating, etc.).
    const asNum = Number(strValue);
    resolvedText[ti.id] =
      ti.maxChars <= 2 && Number.isInteger(asNum) && strValue.length > 0
        ? asNum
        : strValue;
  }

  // Inject the clinic logo from the active creator's profile (if set) so
  // templates render the real logo instead of the fallback tooth glyph. Logo
  // is a server-side concern — never sent from or trusted from the client.
  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );
  const finalInputs: Record<string, unknown> = { ...inputs, ...resolvedText };
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
