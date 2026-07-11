# Promote — Multi-Platform Social Media Automation

Upload once, let AI write the caption, and auto-publish to Instagram, Facebook,
LinkedIn, and YouTube — with a scheduling calendar, an email approval workflow,
and media import from Dropbox and Google Drive.

A full-stack, multi-tenant SaaS built with **Next.js 16, TypeScript, Prisma/PostgreSQL**.

> _Screenshots: drop images into `docs/screenshots/` and reference them here —_
> _e.g. dashboard, calendar (month/week/list), post editor with live platform previews._

---

## Features

- **Publish to 5 platforms** — Instagram, Facebook, LinkedIn, Pinterest, YouTube,
  each via its official OAuth + publishing API. One post fans out to many
  accounts concurrently, with per-target success/failure tracking.
- **AI captions** — Google Gemini drafts a caption from a short outline; edit before posting.
- **Cloud import** — pull a video/photo straight from **Dropbox** or **Google Drive**
  instead of uploading from device.
- **Scheduling calendar** — month / week / list views, drag-to-reschedule,
  timezone-correct (posts bucket into the viewer's local day).
- **Email approval flow** — a creator can approve/reject/edit a draft from a
  signed, stateless email link before it publishes.
- **Multi-tenant with roles** — Creators own accounts + scheduling; Editors
  prepare drafts for creators who've granted them access.
- **Published notifications** — after a post goes out, the creator gets an email
  with a per-platform "posted/failed + permalink" summary.
- **Cron-driven auto-publish** — scheduled posts publish on time via a
  secret-authenticated cron endpoint.
- **YouTube Shorts auto-detect**, live per-platform post previews, and a
  step-by-step progress stepper through the publish journey.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Route Handlers), React 19 |
| Language | TypeScript (strict) |
| Auth | Auth.js (NextAuth v5) + Google OAuth + Prisma adapter |
| Database | PostgreSQL + Prisma 6 |
| AI | Google Gemini (`@google/genai`) |
| Media | Cloudinary (signed direct uploads, remote/buffer imports, transforms) |
| Email | Nodemailer (Gmail/SMTP) with Resend fallback |
| UI | Tailwind CSS v4, shadcn/Radix, Framer Motion, Sonner |
| Deploy | Docker (multi-stage, Next standalone) on Render / DigitalOcean |
| APIs | Meta Graph, LinkedIn, YouTube Data v3, Pinterest, Dropbox, Google Drive |

## Architecture at a glance

```
Browser ──▶ Next.js (App Router)
              ├─ Route Handlers (/api/*)   37 endpoints
              │    ├─ OAuth connect/callback per provider (tokens encrypted at rest)
              │    ├─ /api/posts …          draft / caption / schedule / targets
              │    ├─ /api/{dropbox,drive}  cloud import → Cloudinary
              │    └─ /api/cron/publish     ← external pinger (every ~1 min)
              ├─ lib/publish/*              per-platform adapters + fan-out router
              ├─ lib/{dropbox,drive,youtube} OAuth + API clients
              └─ Prisma ──▶ PostgreSQL      12 models

Cloudinary  ── media store + transforms
Gemini      ── caption generation
SMTP/Resend ── approval + published emails
```

## Local development

```bash
# 1. Install
npm install

# 2. Start Postgres (Docker) — see docker-compose.yml
docker compose up -d

# 3. Configure env (copy .env.example → .env and fill in)
cp .env.example .env

# 4. Apply migrations + generate the client
npx prisma migrate deploy
npx prisma generate

# 5. Run (http://localhost:4000)
npm run dev
```

### Required environment variables

Auth: `AUTH_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST` ·
DB: `DATABASE_URL` ·
Google (login/Drive/YouTube): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` ·
Meta: `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` ·
LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` ·
Dropbox: `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET` ·
AI: `GEMINI_API_KEY` ·
Media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` ·
Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (or Resend) ·
Secrets: `CRON_SECRET`, `APPROVAL_TOKEN_SECRET`, `ENCRYPTION_KEY`

See [`.env.example`](.env.example) for the full template.

## Deployment

- **Render.com** (recommended, free-friendly): see [`RENDER_DEPLOY.md`](RENDER_DEPLOY.md).
  Runs the Docker image as a persistent service, so cron + large uploads work.
- **DigitalOcean App Platform**: see [`DEPLOY.md`](DEPLOY.md).

> ⚠️ Not Vercel: the serverless model breaks the ~1-minute cron and the
> long-running YouTube/Drive upload flows (function timeouts). This app needs a
> persistent server.

## Notable engineering details

- **Proxy-aware OAuth** — behind a TLS-terminating proxy, `request.url` resolves
  to the internal container address; `getPublicOrigin()` derives the real public
  origin from env so `redirect_uri`s aren't rejected.
- **Memory-safe cloud import** — Dropbox uses Cloudinary remote-fetch (bytes never
  touch the server); Drive streams through with a hard size cap.
- **Token security** — all third-party access/refresh tokens are AES-encrypted at
  rest; every mutating route enforces workspace-level permission checks.
- **Reversible migrations** — a full feature (a Remotion video-render studio) was
  added and later cleanly removed, including dropping its tables/enums via migration.

## License

Private project — not licensed for reuse.
