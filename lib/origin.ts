// Public origin (scheme + host) for the running app, used to build OAuth
// redirect URIs that must exactly match what's registered with each provider.
//
// Behind a proxy (DigitalOcean App Platform, Vercel, etc.) `new URL(request.url).origin`
// returns the internal container address — e.g. `https://0.0.0.0:4000` — which
// providers like Meta correctly reject as not whitelisted. So we prefer the
// explicit env vars and only fall back to the request when nothing is configured.
//
// Note: ?? only catches null/undefined, but env vars are often set to an empty
// string on DO. Treat empty strings as "not set" too.

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export function getPublicOrigin(request: Request): string {
  const env = firstNonEmpty(process.env.AUTH_URL, process.env.NEXTAUTH_URL);
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

// Build a URL against the PUBLIC origin (instead of request.url) so generated
// redirects work behind a proxy. Use this everywhere we would otherwise write
// `new URL(path, request.url)` for a redirect Location header.
export function publicUrl(request: Request, path: string): URL {
  return new URL(path, getPublicOrigin(request));
}
