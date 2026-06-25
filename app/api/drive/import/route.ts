import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { downloadFile } from "@/lib/drive/oauth";
import { getValidDriveToken } from "@/lib/drive/client";
import { uploadBuffer } from "@/lib/cloudinary/upload";

export const runtime = "nodejs";

// Drive files are downloaded through the server (no public link), so cap the
// size to protect the container's memory. 200MB matches the device-upload cap.
const MAX_BYTES = 200 * 1024 * 1024;

// Body: { path: string (Drive file id), isVideo: boolean }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const fileId = typeof body.path === "string" ? body.path : "";
  const isVideo = body.isVideo !== false;
  if (!fileId) {
    return NextResponse.json({ error: "file_id_required" }, { status: 400 });
  }

  try {
    const token = await getValidDriveToken(session.user.id);
    const bytes = await downloadFile(token, fileId);

    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        {
          error: "too_large",
          message: "That file is over 200 MB. Use a smaller file or upload from device.",
        },
        { status: 400 }
      );
    }

    const publicId = `u_${session.user.id}/${randomUUID()}`;
    const uploaded = await uploadBuffer({
      data: bytes,
      publicId,
      resourceType: isVideo ? "video" : "image",
      folder: "imports",
      ext: isVideo ? "mp4" : "png",
    });

    const mediaUrl = uploaded.secureUrl;
    const thumbnailUrl = isVideo
      ? mediaUrl
          .replace("/video/upload/", "/video/upload/so_0,w_400,h_400,c_fill/")
          .replace(/\.[^.]+$/, ".jpg")
      : mediaUrl.replace("/image/upload/", "/image/upload/w_400,h_400,c_fill/");

    return NextResponse.json({
      mediaUrl,
      thumbnailUrl,
      mediaType: isVideo ? "VIDEO" : "PHOTO",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: "import_failed", message }, { status: 500 });
  }
}
