import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { signVideoUpload, signImageUpload } from "@/lib/cloudinary/sign";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resourceType = body?.resourceType === "image" ? "image" : "video";

  const publicId = `u_${session.user.id}/${randomUUID()}`;
  const signed =
    resourceType === "image"
      ? signImageUpload({ publicId })
      : signVideoUpload({ publicId });

  return NextResponse.json(signed);
}
