# Deploying Promote to Render.com

Render runs the existing Dockerfile as a **persistent** web service, so every
feature that broke on Vercel (the ~1-minute cron, YouTube resumable upload,
Google Drive streaming import, the detached published-post email) keeps working
exactly as it did on DigitalOcean.

**Free-tier caveats:** the web service spins down after ~15 min idle and takes
~30s to cold-start on the next request; the free Postgres is deleted after 90
days. Both are fine for a portfolio/demo; upgrade the plans for real traffic.

---

## 1. Push the repo (already done)

`render.yaml` is committed at the repo root. Render reads it as a **Blueprint**.

## 2. Create the Blueprint

1. https://dashboard.render.com → **New → Blueprint**
2. Connect the GitHub repo `Aesthetic002/Insta-Auto`
3. Render detects `render.yaml` → it proposes a **web service** (`promote`) + a
   **Postgres** (`promote-db`)
4. Click **Apply**. Render creates the DB and starts the first Docker build
   (~5-8 min). It will fail its first health check until env vars are set —
   that's expected; continue to step 3.

## 3. Set the secret env vars

In the `promote` service → **Environment**, fill every var marked
`sync: false` in the blueprint. Copy the values from your DO app (or local
`.env`). The full list:

| Key | Where to get it |
|---|---|
| `NEXTAUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL` | see step 4 for the URL ones |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console (same as now) |
| `META_APP_ID` / `META_APP_SECRET` | Meta app |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn app |
| `DROPBOX_APP_KEY` / `DROPBOX_APP_SECRET` | Dropbox app |
| `GEMINI_API_KEY` | Google AI Studio |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | your Gmail + app password |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend (fallback; optional) |
| `CRON_SECRET`, `APPROVAL_TOKEN_SECRET`, `ENCRYPTION_KEY` | copy the EXACT values from DO |

> **Critical:** `ENCRYPTION_KEY` must match the one used to encrypt existing
> tokens. If you're starting the Render DB fresh (recommended), any value works,
> but users must re-connect their social accounts. If you migrate data from the
> DO DB, the key must be identical or stored tokens become unreadable.

`DATABASE_URL`, `PORT`, `HOSTNAME`, `NODE_ENV`, `AUTH_TRUST_HOST`,
`META_GRAPH_VERSION`, `SMTP_HOST`, `SMTP_PORT` are already set by the blueprint.

## 4. Set the app URL

Render assigns a URL like `https://promote.onrender.com`. Once you have it:
- Set `AUTH_URL` = `https://promote.onrender.com`
- Set `NEXTAUTH_URL` = `https://promote.onrender.com`
- Save → the service redeploys.

## 5. Run database migrations

Render doesn't run migrations automatically. From your machine, against the
Render Postgres (copy its **External Connection String** from the DB page):

```bash
DATABASE_URL="postgresql://…render…/promote" npx prisma migrate deploy
```

This creates all tables + enums on the fresh DB. Re-run this after any future
schema change (same as the DO workflow).

## 6. Update OAuth redirect URIs

Each provider must allow the new Render callback URLs. Add these alongside the
existing DO ones (keep both so DO still works during the transition):

**Google Cloud Console** (Credentials → your OAuth client → Authorized redirect URIs):
```
https://promote.onrender.com/api/auth/callback/google
https://promote.onrender.com/api/drive/callback
https://promote.onrender.com/api/youtube/callback
```

**Meta** (Facebook Login → Valid OAuth Redirect URIs):
```
https://promote.onrender.com/api/instagram/callback
https://promote.onrender.com/api/facebook/callback
```

**LinkedIn** (Auth → Authorized redirect URLs):
```
https://promote.onrender.com/api/linkedin/callback
```

**Dropbox** (App console → OAuth 2 → Redirect URIs):
```
https://promote.onrender.com/api/dropbox/callback
```

## 7. Point the publish cron at Render

In **cron-job.org** (already set up), update the two jobs' URLs to the Render host:
```
https://promote.onrender.com/api/cron/publish        (every 1 min)
https://promote.onrender.com/api/cron/refresh-tokens (daily)
```
Keep the `Authorization: Bearer <CRON_SECRET>` header.

> **Free-tier note:** the every-minute cron ping also keeps the free service
> awake (no cold starts) — a happy side effect.

## 8. Smoke test

1. Visit the Render URL → sign in with Google → dashboard loads
2. Settings → connect a social account (redirect works on the new host)
3. New post → upload/import a video → caption → publish → check the published email
4. Schedule a post 2 min out → confirm cron publishes it

## Decommissioning DigitalOcean

Once Render is verified working, delete the DO app + DB to stop the credit burn.
Keep DO's OAuth redirect URIs registered only until you're sure Render is stable.
