import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output bundles the minimal node_modules needed at runtime into
  // .next/standalone, so the Docker image stays small. Required for the
  // DigitalOcean App Platform deploy.
  output: "standalone",

  // Remotion's server-side render pipeline (esbuild, chromium, ffmpeg) must
  // never be bundled into client or server-component graphs — they're large
  // native deps used only inside lib/render/service.ts.
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "remotion",
    "esbuild",
  ],
};

export default nextConfig;
