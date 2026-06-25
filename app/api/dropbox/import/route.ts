import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getTemporaryLink } from "@/lib/dropbox/oauth";
import { getValidDropboxToken } from "@/lib/dropbox/client";
import { uploadRemoteUrl } from "@/lib/cloudinary/upload";

export const runtime = "nodejs";

// Import one Dropbox file into Cloudinary so it can be used in a post.
// Body: { path: string, isVideo: boolean }
// Returns: { mediaUrl, thumbnailUrl, mediaType }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : "";
  const isVideo = body.isVideo !== false; // default to video
  if (!path) {
    return NextResponse.json({ error: "path_required" }, { status: 400 });
  }

  try {
    const token = await getValidDropboxToken(session.user.id);
    const tempLink = await getTemporaryLink(token, path);

    const publicId = `u_${session.user.id}/${randomUUID()}`;
    const uploaded = await uploadRemoteUrl({
      url: tempLink,
      publicId,
      resourceType: isVideo ? "video" : "image",
      folder: "imports",
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
