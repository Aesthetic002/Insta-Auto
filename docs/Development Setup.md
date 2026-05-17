---
tags: [development, local, setup, debugging]
date: 2026-05-10
parent: "[[README]]"
---

# Development Setup

How to get the project running locally and what to know about Windows-specific quirks.

---

## Table of Contents

- [[#Prerequisites|Prerequisites]]
- [[#First-time Setup|First-time Setup]]
- [[#Daily Workflow|Daily Workflow]]
- [[#Port Issue|Port issue (Hyper-V)]]
- [[#Common Tasks|Common Tasks]]
- [[#Debugging IG Connect|Debugging IG connect]]
- [[#Debugging Cron|Debugging Cron]]
- [[#Debugging Email|Debugging Email]]

---

## Prerequisites

| Tool | Version we tested with |
|---|---|
| Node.js | 22.12 |
| npm | 10.9 |
| Postgres | Neon (cloud, no local install) |
| OS | Windows 11 (PowerShell) — should also work on macOS / Linux |

A code editor (VSCode is what we used), and Obsidian if you want to read these docs as wikilinks.

---

## First-time Setup

```powershell
git clone <repo-url>
cd insta_automation
npm install
```

Provision the cloud services and gather keys (one-time per service):

| Service | What you need | Where |
|---|---|---|
| Neon Postgres | connection string | https://neon.tech → new project |
| Google Cloud OAuth | client ID + secret | GCP Console → Credentials → OAuth Client |
| Meta App | App ID + Secret | https://developers.facebook.com/apps → new App (Business) |
| Cloudinary | cloud name + key + secret | cloudinary.com → Dashboard → API Keys |
| Gemini | API key | https://aistudio.google.com/app/apikey |
| Resend | API key | https://resend.com/api-keys |

Copy `.env.example` → `.env` and paste each value. See [[Environment Variables]] for the exact list.

Generate secrets locally:

```powershell
# Generate any 32-byte base64 key (NEXTAUTH_SECRET, CRON_SECRET, APPROVAL_TOKEN_SECRET, ENCRYPTION_KEY)
[Convert]::ToBase64String((1..32 | %{[byte](Get-Random -Max 256)}))
```

Apply migrations against your Neon DB:

```powershell
npx prisma migrate dev
```

Start the dev server:

```powershell
npm run dev
# http://localhost:4000
```

---

## Daily Workflow

```powershell
# pull latest
git pull

# refresh deps if package.json changed
npm install

# regenerate Prisma client if schema changed
npx prisma generate

# run migrations if any are pending
npx prisma migrate dev

# start dev
npm run dev
```

**Hot reload works for everything**: server components, API routes, client components. Schema changes need `npx prisma generate` to refresh types.

---

## Port issue

> [!warning] Dev server runs on `:4000`, not `:3000`
>
> Hyper-V on Windows reserves the TCP range **2965–3764**. Trying to bind 3000 fails with `EACCES: permission denied`.
>
> Verify via:
> ```powershell
> netsh interface ipv4 show excludedportrange protocol=tcp
> ```
>
> The dev script in `package.json` is pinned to port 4000:
> ```json
> "dev": "next dev -p 4000",
> "start": "next start -p 4000"
> ```
>
> All OAuth redirect URIs in Google Cloud Console + Meta App Dashboard reference `:4000`.

If you genuinely need to free port 3000 (e.g. for compatibility with another tool), as **admin**:

```powershell
net stop winnat
netsh int ipv4 add excludedportrange protocol=tcp startport=3000 numberofports=1
net start winnat
```

This permanently reserves port 3000 for your apps. Survives reboots.

---

## Common Tasks

### Add a new shadcn component

```powershell
npx shadcn@latest add <component-name> -y
```

> [!tip] shadcn `--yes` is broken
> The `-y` flag still prompts in some versions. If `init` hangs, use `init -d` (defaults flag) instead.

### Add a new Prisma model / field

1. Edit `prisma/schema.prisma`
2. `npx prisma migrate dev --name <descriptive>`
3. Restart `npm run dev` so types reload

### Reset DB (dangerous — wipes all data)

```powershell
npx prisma migrate reset
```

### Browse / edit DB rows

```powershell
npx prisma studio
# opens http://localhost:5555
```

### Build production bundle

```powershell
npx next build
# Useful to catch type errors before pushing
```

### Lint / typecheck

```powershell
npm run lint
npx tsc --noEmit
```

---

## Debugging IG Connect

The IG OAuth callback (`/api/instagram/callback`) writes a structured debug block to the dev server console. When something goes wrong:

```
[ig-callback] discovery debug:
  • granted_permissions=[{...}]
  • pages_count=0
  • pages=[]
  • falling_back_to_granular_scopes
  • granular_page_ids=[...]
  • granular_page_xxx={"id":...,"name":...,"has_token":true,"ig":{...}}
```

Read this in order:
- `granted_permissions` — did the user actually tick all required scopes on the consent screen?
- `pages_count` — `/me/accounts` result. Often 0 in the new Business Login Flow.
- `granular_page_ids` — fallback path. Should match the Page the user picked at consent.
- `granular_page_xxx` — per-page resolution. `has_token: true` and `ig.id` set means we're golden.

Full reference: [[Instagram Publishing#granular_scopes fallback]].

---

## Debugging Cron

Vercel cron doesn't run in dev. Manually trigger:

```powershell
$secret = (Get-Content .env | ?{$_ -match '^CRON_SECRET=(.*)'}) -replace '.*="?([^"]+)"?.*','$1'

# fire publish cron once
Invoke-RestMethod -Headers @{Authorization="Bearer $secret"} `
  http://localhost:4000/api/cron/publish

# or refresh-tokens
Invoke-RestMethod -Headers @{Authorization="Bearer $secret"} `
  http://localhost:4000/api/cron/refresh-tokens
```

For continuous local cron simulation, see [[Scheduling and Cron#Local Testing]].

---

## Debugging Email

Resend's sandbox sender (`onboarding@resend.dev`) only delivers to your Resend signup email. If approval emails aren't arriving:

1. Check the dev server console — `[schedule] approval email failed` shows Resend error if any.
2. Check the recipient — must equal your Resend account email exactly.
3. Check Resend dashboard → Emails → see if the send was attempted/blocked.

For development, you can also flip `Preferences.approvalMode` to `MANUAL` in Prisma Studio to skip emails entirely and just approve from the dashboard.

---

## Cross-references

- [[Environment Variables]] — full env reference
- [[Scheduling and Cron#Local Testing]] — cron simulation
- [[Instagram Publishing#Common Failures]] — IG connect debugging
- Project memory: [[Dev port 4000]]
