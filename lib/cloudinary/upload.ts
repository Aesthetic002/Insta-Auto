import { stat, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Server-side upload of a local file to Cloudinary. Used by the render service
// to push rendered media after Remotion finishes, so the final URL fits into
// the existing /api/posts mediaUrl shape.

export interface UploadedAsset {
  secureUrl: string;
  publicId: string;
}

export type CloudinaryResourceType = "video" | "image";

export async function uploadLocalFile(opts: {
  filePath: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  folder?: string;
  ext?: string; // e.g. "mp4", "png" — informational only, Cloudinary infers from bytes
}): Promise<UploadedAsset> {
  const cloudName = required("CLOUDINARY_CLOUD_NAME");
  const apiKey = required("CLOUDINARY_API_KEY");
  const apiSecret = required("CLOUDINARY_API_SECRET");

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = opts.folder ?? "renders";

  const toSign: Record<string, string | number> = {
    folder,
    public_id: opts.publicId,
    timestamp,
  };
  const signature = signParams(toSign, apiSecret);

  await stat(opts.filePath); // throw early if missing

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", opts.publicId);
  form.append("signature", signature);

  const buf = await readFile(opts.filePath);
  const ext = opts.ext ?? (opts.resourceType === "video" ? "mp4" : "png");
  form.append("file", new Blob([buf]), `${opts.publicId}.${ext}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${opts.resourceType}/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { secureUrl: json.secure_url, publicId: json.public_id };
}

// Upload to Cloudinary by handing it a remote URL to fetch directly. Used to
// import media from cloud storage (Dropbox/Drive temp links) without streaming
// the bytes through our own server — Cloudinary pulls the file itself.
export async function uploadRemoteUrl(opts: {
  url: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  folder?: string;
}): Promise<UploadedAsset> {
  const cloudName = required("CLOUDINARY_CLOUD_NAME");
  const apiKey = required("CLOUDINARY_API_KEY");
  const apiSecret = required("CLOUDINARY_API_SECRET");

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = opts.folder ?? "imports";

  const toSign: Record<string, string | number> = {
    folder,
    public_id: opts.publicId,
    timestamp,
  };
  const signature = signParams(toSign, apiSecret);

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", opts.publicId);
  form.append("signature", signature);
  form.append("file", opts.url); // Cloudinary fetches this URL server-side

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${opts.resourceType}/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary remote upload failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { secureUrl: json.secure_url, publicId: json.public_id };
}

// Back-compat alias — old call sites that already imported uploadLocalVideo.
export async function uploadLocalVideo(opts: {
  filePath: string;
  publicId: string;
  folder?: string;
}): Promise<UploadedAsset> {
  return uploadLocalFile({ ...opts, resourceType: "video", ext: "mp4" });
}

export async function uploadLocalImage(opts: {
  filePath: string;
  publicId: string;
  folder?: string;
  ext?: "png" | "jpg";
}): Promise<UploadedAsset> {
  return uploadLocalFile({ ...opts, resourceType: "image", ext: opts.ext ?? "png" });
}

function signParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(sorted + apiSecret).digest("hex");
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
