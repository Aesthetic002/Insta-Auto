import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC-signed approval tokens. Stateless — no DB lookup needed to validate.
// Format (base64url): "<payloadJson>.<signature>"
//
// Payload: { pid: postId, act: "approve"|"reject"|"edit", exp: epochMs }

export type ApprovalAction = "approve" | "reject" | "edit";

interface Payload {
  pid: string;
  act: ApprovalAction;
  exp: number;
}

const SEPARATOR = ".";

function getSecret(): Buffer {
  const s = process.env.APPROVAL_TOKEN_SECRET;
  if (!s) throw new Error("APPROVAL_TOKEN_SECRET is not set");
  return Buffer.from(s, "utf8");
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "==".slice(0, (4 - (padded.length % 4)) % 4), "base64");
}

export function signApprovalToken(opts: {
  postId: string;
  action: ApprovalAction;
  /** TTL in ms. Defaults to 7 days. */
  ttlMs?: number;
}): string {
  const payload: Payload = {
    pid: opts.postId,
    act: opts.action,
    exp: Date.now() + (opts.ttlMs ?? 7 * 24 * 60 * 60 * 1000),
  };
  const payloadStr = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", getSecret()).update(payloadStr).digest();
  const sigStr = b64urlEncode(sig);
  return `${payloadStr}${SEPARATOR}${sigStr}`;
}

export function verifyApprovalToken(
  token: string
): { ok: true; payload: Payload } | { ok: false; reason: string } {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadStr, sigStr] = parts;

  const expected = createHmac("sha256", getSecret()).update(payloadStr).digest();
  let actual: Buffer;
  try {
    actual = b64urlDecode(sigStr);
  } catch {
    return { ok: false, reason: "bad_signature_encoding" };
  }
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    typeof payload.pid !== "string" ||
    !["approve", "reject", "edit"].includes(payload.act)
  ) {
    return { ok: false, reason: "bad_payload_shape" };
  }
  return { ok: true, payload };
}
