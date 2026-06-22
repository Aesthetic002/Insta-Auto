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

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bump CACHE_BUST to force `prisma generate` + `npm run build` to re-execute.
# DigitalOcean App Platform caches layers aggressively, and a `COPY . .`
# change isn't always enough to invalidate downstream RUN layers.
ARG CACHE_BUST=2026-06-15a
RUN echo "Cache bust: $CACHE_BUST"

RUN npx prisma generate
RUN npm run build

# ---------- 3. Runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

# Next standalone output + static assets + public dir.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma client + query engine, needed at runtime.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "server.js"]
