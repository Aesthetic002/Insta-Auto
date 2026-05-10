import { createHash } from "node:crypto";

// Server-side signer for Cloudinary direct browser uploads.
// We sign a fixed set of parameters so the browser cannot mutate them.
// Signature spec: SHA-1 of "key1=v1&key2=v2..." (sorted, alphabetical) + api_secret.

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  uploadUrl: string;
}

export function signVideoUpload(opts: {
  /** Public ID (file name without extension). Generate with crypto.randomUUID() upstream. */
  publicId: string;
  /** Cloudinary folder. Defaults to "reels". */
  folder?: string;
}): SignedUpload {
  const cloudName = required("CLOUDINARY_CLOUD_NAME");
  const apiKey = required("CLOUDINARY_API_KEY");
  const apiSecret = required("CLOUDINARY_API_SECRET");

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = opts.folder ?? "reels";

  // Params that go into the signature MUST match what the browser sends.
  // Keep this list and the browser FormData strictly in sync.
  const params: Record<string, string | number> = {
    folder,
    public_id: opts.publicId,
    timestamp,
  };

  const signature = signParams(params, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId: opts.publicId,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  };
}

function signParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const toSign =
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&") + apiSecret;
  return createHash("sha1").update(toSign).digest("hex");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
