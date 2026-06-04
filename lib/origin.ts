// Public origin (scheme + host) for the running app, used to build OAuth
// redirect URIs that must exactly match what's registered with each provider.
//
// Behind a proxy (DigitalOcean App Platform, Vercel, etc.) `new URL(request.url).origin`
// returns the internal container address — e.g. `https://0.0.0.0:4000` — which
// providers like Meta correctly reject as not whitelisted. So we prefer the
// explicit env vars and only fall back to the request when nothing is configured.

export function getPublicOrigin(request: Request): string {
  const env = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}
