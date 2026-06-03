# Deploying Anvaya to DigitalOcean App Platform

This is a runbook for going from a fresh DO account to a live URL. It assumes
the repo is at https://github.com/Aesthetic002/Insta-Auto and you've redeemed
the GitHub Student Pack DO credit.

## 1. Push code to GitHub

```bash
git add .
git commit -m "feat: deploy config for DigitalOcean App Platform"
git push origin main
```

The repo now contains:
- `Dockerfile` — Node 22 + Chromium deps for Remotion rendering
- `.dockerignore` — excludes dev junk from the build context
- `next.config.ts` — `output: "standalone"` for slim images
- `.do/app.yaml` — reference spec for the App Platform service

## 2. Create the Managed Postgres database

In the DigitalOcean dashboard:

1. **Databases → Create Database Cluster**
2. Engine: **PostgreSQL 16**
3. Plan: **Basic / 1 GB RAM / $15/mo** (dev tier — fine for now)
4. Region: same as where you'll deploy the app (e.g. `nyc3`)
5. Name: `anvaya-db`
6. Create. Wait ~5 min for provisioning.

When ready, click into the cluster → **Connection details** → copy the
**Connection string (URI)**. It looks like:
```
postgresql://doadmin:xxx@db-xxx.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

That's your production `DATABASE_URL`.

## 3. Create the App Platform service

In the DO dashboard:

1. **Apps → Create App**
2. Source: **GitHub** → authorize → pick `Aesthetic002/Insta-Auto` → branch `main`
3. Resource type: **Web Service** (auto-detected as Dockerfile)
4. Plan: **Basic / 1 GB RAM / 1 vCPU (~$12-14/mo)** — NOT the $5 tier; Chromium needs the headroom
5. HTTP port: **4000**
6. Region: same as the database

## 4. Set environment variables

In the app's **Settings → App-Level Environment Variables**, add each row
below. Mark anything `(SECRET)` as encrypted in the UI.

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` (SECRET) | the Postgres URI from step 2 | App Platform can also bind this automatically — see "Bonus" below |
| `NEXTAUTH_URL` | `https://<your-app>.ondigitalocean.app` | Update after first deploy when DO assigns the URL |
| `NEXTAUTH_SECRET` (SECRET) | generate with `openssl rand -base64 32` | Or copy from local `.env` |
| `GOOGLE_CLIENT_ID` (SECRET) | from local `.env` | |
| `GOOGLE_CLIENT_SECRET` (SECRET) | from local `.env` | |
| `META_APP_ID` (SECRET) | from local `.env` | |
| `META_APP_SECRET` (SECRET) | from local `.env` | |
| `META_GRAPH_VERSION` | `v23.0` | |
| `GEMINI_API_KEY` (SECRET) | from local `.env` | |
| `CLOUDINARY_CLOUD_NAME` | from local `.env` | |
| `CLOUDINARY_API_KEY` (SECRET) | from local `.env` | |
| `CLOUDINARY_API_SECRET` (SECRET) | from local `.env` | |
| `RESEND_API_KEY` (SECRET) | from local `.env` | |
| `RESEND_FROM_EMAIL` | from local `.env` | |
| `LINKEDIN_CLIENT_ID` (SECRET) | from local `.env` | |
| `LINKEDIN_CLIENT_SECRET` (SECRET) | from local `.env` | |
| `PINTEREST_APP_ID` (SECRET) | from local `.env` (empty for now) | |
| `PINTEREST_APP_SECRET` (SECRET) | from local `.env` (empty for now) | |
| `CRON_SECRET` (SECRET) | from local `.env` | |
| `APPROVAL_TOKEN_SECRET` (SECRET) | from local `.env` | |
| `ENCRYPTION_KEY` (SECRET) | from local `.env` | |
| `REMOTION_OUTPUT_DIR` | `/tmp/renders` | Writable spot in App Platform's container |

**Bonus — DB binding:** instead of manually pasting `DATABASE_URL`, App
Platform can inject it. In the app settings: **Resources → Attach database
→ pick `anvaya-db`**. DO sets `DATABASE_URL` to a `${...}` template that
resolves at runtime. Both ways work.

## 5. First deploy

Click **Create Resources**. App Platform will:

1. Clone the repo
2. Build the Dockerfile (~5-8 min for the first build; Chromium deps + npm install)
3. Push the image to its private registry
4. Roll out the container

Watch **Activity** for the build log. Common first-build failures:
- `prisma generate` fails → check `DATABASE_URL` is set as a BUILD_TIME var, not just RUN_TIME
- OOM during build → bump the build instance size temporarily
- Chromium download in npm install → already handled by Dockerfile (Remotion downloads its own headless shell at first render)

## 6. Run database migrations

The Dockerfile doesn't run migrations automatically (intentional — you should
choose when migrations land). Two ways:

**Option A — Run locally against prod DB (simplest):**
```bash
DATABASE_URL="<the prod URI>" npx prisma migrate deploy
```

**Option B — Add as a deploy hook:**

In the app's **Settings → Jobs**, create a **Pre-Deploy Job**:
- Run command: `npx prisma migrate deploy`
- Source: same as the web service

This runs migrations as part of every deploy. Safer for a team setup.

## 7. Update OAuth redirect URIs

Once DO assigns the live URL (e.g. `https://anvaya-xyz.ondigitalocean.app`):

**Google Cloud Console** → APIs & Services → Credentials → your OAuth client
→ Authorized redirect URIs → add:
```
https://anvaya-xyz.ondigitalocean.app/api/auth/callback/google
```

**Meta for Developers** → your app → Use cases → Instagram/Facebook Login →
Valid OAuth Redirect URIs → add:
```
https://anvaya-xyz.ondigitalocean.app/api/instagram/callback
https://anvaya-xyz.ondigitalocean.app/api/facebook/callback
```

**LinkedIn Developers** → your app → Auth tab → Authorized redirect URLs → add:
```
https://anvaya-xyz.ondigitalocean.app/api/linkedin/callback
```

After updating: **update `NEXTAUTH_URL` env var** in DO to the same URL,
then trigger a redeploy (DO → Actions → Force Rebuild).

## 8. Smoke test

1. Visit the live URL
2. Sign in with Google → onboarding → pick Creator
3. Connect Instagram (or any provider)
4. **Templates → pick one → upload 3 clips → headline → Render video**
5. Wait 20-60s — render should complete and "Use in a new post" should work

If renders hang at "Rendering": check the app's **Runtime Logs** in DO. The
most likely cause is missing fonts (Chinese/Japanese text in the user's
upload but `fonts-noto-cjk` failed to install) or insufficient memory (bump
to Basic-S 2GB if so).

## Cost recap

- App Platform Basic-XS 1GB: **~$12/mo**
- Managed Postgres Basic 1GB: **~$15/mo**
- Total: **~$27/mo** — your $200 student credit covers ~7 months

## When to outgrow this setup

- More than ~5 concurrent renders → move renders to Remotion Lambda
- Need stable URL → add a custom domain in DO (~free) + Cloudflare
- Need staging env → second App Platform service from a `staging` branch
