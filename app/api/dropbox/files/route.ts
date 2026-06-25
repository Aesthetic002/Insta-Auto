import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listMediaFiles } from "@/lib/dropbox/oauth";
import { getValidDropboxToken } from "@/lib/dropbox/client";

export const runtime = "nodejs";

// List media files in the user's Dropbox app folder.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const token = await getValidDropboxToken(session.user.id);
    const files = await listMediaFiles(token);
    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not list files";
    const notConnected = message.includes("not connected");
    return NextResponse.json(
      { error: notConnected ? "not_connected" : "list_failed", message },
      { status: notConnected ? 400 : 500 }
    );
  }
}
