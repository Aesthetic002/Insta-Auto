---
tags: [environment, configuration, secrets, env-vars]
date: 2026-05-10
parent: "[[README]]"
---

# Environment Variables

Every env var the app reads, what it's for, where to get it, and what happens if it's missing.

---

## Table of Contents

- [[#Quick Reference|Quick Reference]]
- [[#Database|Database]]
- [[#Auth|Auth]]
- [[#Meta / Instagram|Meta / Instagram]]
- [[#Gemini|Gemini]]
- [[#Cloudinary|Cloudinary]]
- [[#Resend Email|Resend Email]]
- [[#Secrets|Secrets]]
- [[#Generation Commands|Generation Commands]]

---

## Quick Reference

| Var | Required | Used in |
|---|---|---|
| `DATABASE_URL` | yes | Prisma (`lib/db.ts`, all migrations) |
| `NEXTAUTH_URL` | local only | NextAuth (auto-detected in prod) |
| `NEXTAUTH_SECRET` | yes | NextAuth JWT signing |
| `GOOGLE_CLIENT_ID` | yes | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | yes | Google sign-in |
| `META_APP_ID` | yes | IG OAuth + token exchange |
| `META_APP_SECRET` | yes | IG OAuth + debug_token |
| `META_GRAPH_VERSION` | optional | defaults to `v23.0` |
| `GEMINI_API_KEY` | yes | Caption generation |
| `CLOUDINARY_CLOUD_NAME` | yes | Upload signing + URL building |
| `CLOUDINARY_API_KEY` | yes | Upload signing |
| `CLOUDINARY_API_SECRET` | yes | Upload signing (server-only, NEVER ship to client) |
| `CLOUDINARY_UPLOAD_PRESET` | optional | Reserved; not currently used |
| `RESEND_API_KEY` | yes | Approval emails |
| `RESEND_FROM_EMAIL` | yes | Sender identity |
| `CRON_SECRET` | yes | Cron endpoint auth |
| `APPROVAL_TOKEN_SECRET` | yes | HMAC signing of approval URLs |
| `ENCRYPTION_KEY` | yes | AES-256 of IG tokens at rest |

---

## Database

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

- Get from Neon → Project → Connection details → **Pooled connection** (recommended for serverless).
- Sanity check: `npx prisma migrate dev` succeeds when this works.

If missing → Prisma fails immediately at any DB operation with a clear error.

---

## Auth

```bash
NEXTAUTH_URL="http://localhost:4000"           # local only
NEXTAUTH_SECRET="..."                          # any random 32-byte base64
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

- `NEXTAUTH_URL`: in production, **don't set it** — NextAuth v5 auto-detects from request headers. Setting it to a wrong value (like leaving localhost in prod) breaks OAuth callbacks.
- `NEXTAUTH_SECRET`: signs the session JWT. Rotate to invalidate all sessions.
- Google credentials: GCP Console → Credentials → create **OAuth Client ID** → Web application.
  - Authorized redirect URIs: `http://localhost:4000/api/auth/callback/google` (local) + `https://<vercel>/api/auth/callback/google` (prod).

If `GOOGLE_CLIENT_ID` is missing → sign-in fails silently (the form action redirects to nowhere).

---

## Meta / Instagram

```bash
META_APP_ID="..."
META_APP_SECRET="..."
META_GRAPH_VERSION="v23.0"      # optional, defaults to v23.0
```

- developers.facebook.com → My Apps → your App → Settings → Basic.
- App type: **Business**.
- Required products: **Facebook Login** + **Instagram Graph API**.
- Valid OAuth Redirect URIs: `http://localhost:4000/api/instagram/callback` (local) + `https://<vercel>/api/instagram/callback` (prod).
- Pin the Graph API version in env so we don't get surprised by Meta's quarterly version bumps. Update with care; minor versions change scope availability.

If missing → `IG_SCOPES` builder throws when `/api/instagram/connect` is hit.

See [[Instagram Publishing#OAuth Connect Flow]].

---

## Gemini

```bash
GEMINI_API_KEY="..."
```

- Get from https://aistudio.google.com/app/apikey
- Free tier: see [[Caption Generation#Cost / Quota]].

If missing → caption generation throws "GEMINI_API_KEY is not set" clearly.

---

## Cloudinary

```bash
CLOUDINARY_CLOUD_NAME="djgs90vay"     # public, appears in URLs
CLOUDINARY_API_KEY="..."              # public-ish (gets sent to browser in signing response)
CLOUDINARY_API_SECRET="..."           # SECRET — server-only, never ship to client
CLOUDINARY_UPLOAD_PRESET=""           # reserved, not currently used
```

> [!danger] CLOUDINARY_API_SECRET is server-only
> The Cloudinary signing endpoint returns `apiKey` (safe) but never `apiSecret`. Don't accidentally `process.env.CLOUDINARY_API_SECRET` in a client component or `'use server'` boundary that returns it to the browser.

Get from cloudinary.com → Dashboard → API Keys.

If missing → upload-sign endpoint fails clearly.

---

## Resend Email

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Reels Bot <onboarding@resend.dev>"
```

- API key: https://resend.com/api-keys.
- From email: see [[Approval Flow#Resend domain]] for the sandbox-vs-verified distinction.

If missing → approval emails fail (caught and logged; doesn't block the schedule).

---

## Secrets

```bash
CRON_SECRET="..."              # Bearer token for /api/cron/*
APPROVAL_TOKEN_SECRET="..."    # HMAC key for /approve/[token]
ENCRYPTION_KEY="..."           # AES-256 key for IgAccount.pageAccessToken
```

All three are 32-byte base64-encoded random values. Generate with:

```powershell
[Convert]::ToBase64String((1..32 | %{[byte](Get-Random -Max 256)}))
```

| Secret | Rotation effect |
|---|---|
| `CRON_SECRET` | safe to rotate; cron-job.org / Vercel cron need updated header |
| `APPROVAL_TOKEN_SECRET` | rotation invalidates all in-flight approval emails |
| `ENCRYPTION_KEY` | **rotation bricks every existing IG connection** — see [[Instagram Publishing#Token security]] |

If missing → respective subsystem throws clearly at first use (e.g. `CRON_SECRET` missing → cron returns 401).

---

## Generation Commands

### Random 32-byte base64 (PowerShell)
```powershell
[Convert]::ToBase64String((1..32 | %{[byte](Get-Random -Max 256)}))
```

### Random 32-byte base64 (bash)
```bash
openssl rand -base64 32
```

### Inspect what's set without exposing values (PowerShell)
```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') {
    $key = $Matches[1]; $val = $Matches[2].Trim('"').Trim("'")
    "{0,-25} length={1}" -f $key, $val.Length
  }
}
```

---

## Cross-references

- [[Deployment#Env Var Mapping]] — what to copy into Vercel
- [[Instagram Publishing#Token security]] — why `ENCRYPTION_KEY` is special
- [[Approval Flow#Resend domain]] — `RESEND_FROM_EMAIL` choices
- [[Scheduling and Cron#Auth]] — how `CRON_SECRET` is consumed
