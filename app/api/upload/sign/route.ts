import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { signVideoUpload } from "@/lib/cloudinary/sign";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicId = `u_${session.user.id}/${randomUUID()}`;
  const signed = signVideoUpload({ publicId });
  return NextResponse.json(signed);
}
