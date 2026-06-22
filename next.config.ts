import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output bundles the minimal node_modules needed at runtime into
  // .next/standalone, so the Docker image stays small. Required for the
  // DigitalOcean App Platform deploy.
  output: "standalone",
};

export default nextConfig;
