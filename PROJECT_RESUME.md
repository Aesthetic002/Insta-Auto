# Promote — Multi-Platform Social Media Automation SaaS

A full-stack, multi-tenant SaaS that lets creators and their editors upload media,
auto-generate captions with AI, schedule posts, and publish to multiple social
platforms simultaneously — with an email approval workflow and a drag-and-drop
content calendar. Ported and rebuilt from an original n8n automation workflow
into a production Next.js application deployed on DigitalOcean.

**Live:** deployed on DigitalOcean App Platform (Docker) · **Repo:** private

---

## Elevator pitch (résumé one-liner)

> Built and shipped a multi-tenant social-media scheduling SaaS (Next.js 16,
> TypeScript, Prisma/PostgreSQL) with OAuth publishing to 5 platforms, AI caption
> generation, cloud-storage import (Dropbox/Google Drive), an email approval flow,
> and a cron-driven scheduler — deployed via Docker on DigitalOcean.

---

## Use case / problem solved

Creators and small marketing teams waste hours manually cross-posting the same
video/photo to Instagram, Facebook, LinkedIn, Pinterest and YouTube, writing
captions per platform, and coordinating approvals over chat. Promote collapses
that into one flow:

1. **Upload once** — from device, or import directly from **Dropbox / Google Drive**.
2. **AI drafts the caption** (Google Gemini) from a short outline; user edits it.
3. **Pick target accounts** across platforms; a live per-platform preview shows
   how the post will look on each.
4. **Approve** — optionally via a one-click email approval link (for teams where a
   creator signs off on an editor's drafts).
5. **Schedule** on a calendar (drag-to-reschedule) or publish immediately.
6. **Auto-publish** fires on a cron; the creator gets an email summary with a
   per-platform "posted / failed + permalink" breakdown.

**Multi-tenancy with roles:** a **Creator** owns accounts and scheduling power; an
**Editor** can prepare drafts for one or more creators they've been granted access
to. Permission checks gate every mutating action to the correct workspace.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components, Route Handlers), React 19 |
| **Language** | TypeScript (strict) |
| **Auth** | Auth.js (NextAuth v5) with Google OAuth + Prisma adapter |
| **Database** | PostgreSQL (Neon in dev, DigitalOcean Managed Postgres in prod) via Prisma 6 |
| **AI** | Google Gemini (`@google/genai`) for caption generation |
| **Media** | Cloudinary (signed direct-browser uploads, server-side remote/buffer imports, on-the-fly transforms for thumbnails) |
| **Email** | Nodemailer (Gmail/SMTP) with Resend fallback — transport auto-selected by env |
| **UI** | Tailwind CSS v4, shadcn/Radix (Base UI), Framer Motion, Sonner toasts |
| **Scheduling** | Vercel-style cron endpoint hit by an external scheduler (cron-job.org), secret-authenticated |
| **Deployment** | Docker (multi-stage, Next.js standalone output) on DigitalOcean App Platform + Managed Postgres |
| **Integrations** | Instagram, Facebook, LinkedIn, Pinterest, YouTube (publishing); Dropbox, Google Drive (import) |

**Scale of the codebase:** ~37 API route handlers, 12 Prisma models, 10 sequential
migrations, 6 platform publish adapters, 4 OAuth provider flows.

---

## Notable engineering complexities (the interesting part)

### 1. Five real OAuth integrations, each with its own quirks
Every platform authenticates and publishes differently, and each was reverse-engineered
from its docs:
- **Instagram/Facebook (Meta Graph):** two-step "create media container → publish"
  flow; discovering the user's Pages via the `granular_scopes` fallback because
  `/me/accounts` returns empty under Business Login.
- **LinkedIn (UGC Posts API):** register-upload → PUT binary → reference asset URN;
  post ID returned in a response header.
- **YouTube (Data API v3):** resumable upload (init session → PUT bytes), hourly
  token expiry requiring inline refresh-token rotation, and **Shorts auto-detection**
  (vertical + short → `#Shorts` tagging).
- **Pinterest:** board discovery + pin creation.

A single `dispatchToAccount` router fans one post out to N selected accounts
concurrently, records per-target success/failure without failing the whole batch,
and rolls the results up to a post-level status.

### 2. Proxy-aware OAuth redirect handling
DigitalOcean App Platform terminates TLS at a proxy, so `request.url` inside the
container resolves to the internal address (`https://0.0.0.0:4000`). This silently
broke every OAuth `redirect_uri` (providers rejected the internal host). Fixed with
a `getPublicOrigin()` helper that derives the public origin from env, treating empty
strings as unset — a subtle bug that only surfaced in production.

### 3. Cloud-storage import without blowing the container's memory
Importing a video from Dropbox/Drive means getting a *third-party* file into
Cloudinary. Two strategies by provider:
- **Dropbox:** fetch a short-lived temp link, hand the URL to Cloudinary's
  remote-fetch upload — bytes never touch the server.
- **Google Drive** (no public link): stream bytes through the server with a hard
  size cap to protect the 1 GB container.

Token lifecycles differ too (Dropbox and Google both use refresh tokens with
transparent refresh-and-persist on expiry).

### 4. Timezone-correct calendar rendered client-side
Posts are stored in UTC but the month/week/list calendar buckets each post into
the **user's local day** on the client, so a 9 AM IST post shows on the IST day,
not the UTC one. Includes drag-to-reschedule (a lightweight PATCH that moves the
time without re-triggering the approval flow) and hover quick-actions.

### 5. Token security + role-based access control
All third-party access/refresh tokens are **encrypted at rest** (AES). Every
mutating route resolves the "active creator" from a cookie and verifies the caller
has edit rights on that workspace, so editors can't act outside their granted
creators.

### 6. Signed, stateless email approval
Approval links carry an HMAC-signed token (post ID + action + expiry), so a creator
can approve/reject/edit straight from their inbox with no session — verified
server-side before the action runs.

### 7. Production-hardening the deploy
- Multi-stage **Dockerfile** using Next's `standalone` output for a slim image.
- Diagnosed and fixed a Prisma **query-engine binary mismatch** (the container's
  OpenSSL 3 vs. the default `debian-openssl-1.1.x` engine) via `binaryTargets`.
- Worked through DigitalOcean's aggressive build-layer caching, env-var scoping,
  and instance-sizing (right-sized down to 1 GB once compute-heavy features were removed).

---

## Product evolution (shows product judgment, not just coding)

The project pivoted twice, and I built + then cleanly removed a major feature — which
is itself a demonstrable skill:
- **v1:** faithful port of an n8n Instagram-reels workflow into a real app.
- **v2:** expanded to multi-platform + a Canva-style **template studio** (server-side
  video rendering with Remotion + headless Chromium on the container) with a
  profession-specific template library and a "fill your business profile once,
  auto-fill every template" system.
- **v3:** de-scoped the rendering engine entirely (it was memory-heavy and off-mission),
  cleanly reverting the schema (dropping tables/enums via migration), Dockerfile
  (removing Chromium/FFmpeg deps), and dependencies — then refocused on being a
  best-in-class **posting tool**: richer calendar, published-post notifications, and
  more platform/storage integrations.

Managing that scope change — adding a complex subsystem, validating it in production,
then surgically removing it without breaking the working product — required careful
migration design and dependency hygiene.

---

## Skills demonstrated

- **Full-stack TypeScript** across App-Router server components, route handlers, and client UI.
- **OAuth 2.0 end-to-end** for 7 providers, including token refresh, encryption, and provider-specific publish protocols.
- **Relational data modeling** + iterative, reversible schema migrations under a live database.
- **Third-party API integration** (Meta Graph, LinkedIn, YouTube Data, Pinterest, Dropbox, Google Drive, Gemini, Cloudinary, Resend).
- **DevOps:** Docker multi-stage builds, managed Postgres, cron scheduling, environment/secrets management, production debugging.
- **Product engineering:** roles/permissions, approval workflows, and knowing when to *remove* a feature.
