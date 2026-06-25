import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listMediaFiles } from "@/lib/drive/oauth";
import { getValidDriveToken } from "@/lib/drive/client";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const token = await getValidDriveToken(session.user.id);
    const driveFiles = await listMediaFiles(token);
    // Normalize to the shape CloudImportPicker expects (path === file id).
    const files = driveFiles.map((f) => ({
      id: f.id,
      name: f.name,
      path: f.id, // Drive uses the file id as the import key
      sizeBytes: f.sizeBytes,
      isVideo: f.isVideo,
      isImage: f.isImage,
    }));
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
