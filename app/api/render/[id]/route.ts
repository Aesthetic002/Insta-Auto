import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const job = await db.renderJob.findUnique({ where: { id } });
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    outputUrl: job.outputUrl,
    thumbnailUrl: job.thumbnailUrl,
    errorMessage: job.errorMessage,
  });
}
