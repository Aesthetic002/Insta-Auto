# syntax=docker/dockerfile:1.6

# ---------- 1. Dependency install ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# package-lock.json is the source of truth for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Required at build time: prisma generate runs as part of `npm run build`.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bump CACHE_BUST when you need to force `prisma generate` + `npm run build`
# to re-execute. DigitalOcean App Platform caches layers aggressively, and a
# `COPY . .` change isn't always enough to invalidate downstream RUN layers.
ARG CACHE_BUST=2026-06-04a
RUN echo "Cache bust: $CACHE_BUST"

# Generate Prisma client + run Next build (which emits .next/standalone).
RUN npx prisma generate
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
# Tell Remotion where to put its rendered files so they land on writable disk.
ENV REMOTION_OUTPUT_DIR=/tmp/renders

# System libraries that headless Chromium needs to start at all. Without
# these the render service crashes the moment it tries to launch Chrome.
# Fonts cover Latin + common CJK ranges so user text renders correctly.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Copy Next standalone output + the public/ + static assets.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Remotion needs its own source files + node_modules at runtime to bundle the
# composition. Standalone build drops most node_modules, so we re-copy the
# Remotion bits and the templates explicitly.
COPY --from=builder /app/remotion ./remotion
COPY --from=builder /app/remotion.config.ts ./remotion.config.ts
COPY --from=builder /app/node_modules/@remotion ./node_modules/@remotion
COPY --from=builder /app/node_modules/remotion ./node_modules/remotion
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
# Prisma + its query engines live in node_modules — must be present at runtime.
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Render output dir. Files get cleaned up after upload; mount a volume here
# if you want renders to persist across container restarts.
RUN mkdir -p /tmp/renders

EXPOSE 4000
CMD ["node", "server.js"]
