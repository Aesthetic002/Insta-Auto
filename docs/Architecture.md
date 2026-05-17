---
tags: [architecture, system-design, reels-bot]
date: 2026-05-10
parent: "[[README]]"
---

# Architecture

How Reels Bot is composed: services, data flow, request paths.

---

## Table of Contents

- [[#High-Level Diagram|High-Level Diagram]]
- [[#Request Path - Sign-in|Request Path: Sign-in]]
- [[#Request Path - Upload|Request Path: Upload]]
- [[#Request Path - Schedule + Auto-publish|Request Path: Schedule + Auto-publish]]
- [[#Where Data Lives|Where Data Lives]]
- [[#Edge vs Node Boundary|Edge vs Node Boundary]]
- [[#Why These Choices|Why These Choices]]

---

## High-Level Diagram

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI[React UI]
    end

    subgraph Vercel["Vercel (Next.js 16)"]
        Edge[Edge Proxy / Auth check]
        SSR[Server Components & Route Handlers]
        DCron[Daily cron - refresh tokens]
    end

    subgraph DB["Neon Postgres"]
        Users[(User, Account, Session)]
        Posts[(Post, IgAccount, Preferences)]
        Assignments[(EditorAssignment)]
    end

    subgraph Ext["External services"]
        CL[Cloudinary]
        MG[Meta Graph API v23]
        GM[Google Gemini]
        RS[Resend]
        CJ[cron-job.org]
    end

    UI -->|HTTP| Edge
    Edge --> SSR
    SSR <--> DB
    UI -->|signed direct upload| CL
    SSR --> MG
    SSR --> GM
    SSR --> RS
    DCron --> MG
    CJ -->|every 1m, bearer auth| SSR
```

---

## Request Path - Sign-in

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Vercel as Next.js Server
    participant Google
    participant DB as Neon Postgres
    participant Edge as Edge Proxy

    User->>Browser: visit /
    Browser->>Vercel: GET / (RSC)
    Vercel-->>Browser: landing page
    User->>Browser: click "Continue with Google"
    Browser->>Vercel: POST / (form action)
    Vercel->>Vercel: signInWithGoogle() server action
    Vercel-->>Browser: 302 → Google OAuth
    Browser->>Google: authorize
    Google-->>Browser: 302 → /api/auth/callback/google
    Browser->>Vercel: GET /api/auth/callback/google
    Vercel->>Google: exchange code → tokens
    Vercel->>DB: upsert User + Account (Prisma adapter)
    Vercel-->>Browser: set JWT cookie, 302 → /dashboard
    Browser->>Vercel: GET /dashboard
    Vercel->>Edge: middleware check JWT
    Edge-->>Vercel: ok
    Vercel->>DB: load user role + onboarding state
    alt onboarded == false
        Vercel-->>Browser: 302 → /onboarding
    else
        Vercel-->>Browser: dashboard HTML
    end
```

The proxy uses a **separate edge-safe config** (`auth.config.ts`) without the Prisma adapter, so it can run in the edge runtime where Prisma can't. The full server-side `auth()` function uses the database-backed config from `auth.ts`. See [[Authentication and Authorization#Edge vs Node split]].

---

## Request Path - Upload

```mermaid
sequenceDiagram
    actor User
    participant UI as Browser
    participant API as Next.js API
    participant CL as Cloudinary
    participant DB as Postgres

    User->>UI: drag video + outline → submit
    UI->>API: POST /api/upload/sign
    API->>API: auth() check, generate publicId
    API->>API: SHA-1 sign(folder, public_id, timestamp)
    API-->>UI: { uploadUrl, signature, apiKey, ... }
    UI->>CL: POST FormData(file + signed params) directly
    Note over UI,CL: XHR with progress events
    CL-->>UI: secure_url
    UI->>API: POST /api/posts {videoUrl, thumbnailUrl, outline}
    API->>API: resolveActiveCreator() (cookie or self)
    API->>API: canEditCreatorWorkspace() check
    API->>DB: insert Post(status=DRAFT)
    API-->>UI: 200
    UI->>UI: router.push(/posts)
```

The video bytes never touch our server. This sidesteps Vercel's 4.5 MB request body cap and 60-second function timeout.

Thumbnail is derived purely from a Cloudinary URL transform — no extra request, no extra storage. See [[Cloudinary Upload#Thumbnail trick]].

---

## Request Path - Schedule + Auto-publish

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB
    participant RS as Resend
    participant Inbox as User's Email
    actor Recipient
    participant CJ as cron-job.org
    participant Meta

    User->>UI: pick datetime + click Schedule
    UI->>API: POST /api/posts/[id]/schedule
    API->>DB: load Preferences.approvalMode
    alt mode == AUTO
        API->>DB: status=SCHEDULED, scheduledAt=T
    else mode == EMAIL
        API->>DB: status=PENDING_APPROVAL, scheduledAt=T
        API->>API: signApprovalToken() x3 (approve/reject/edit)
        API->>RS: send email
        RS->>Inbox: deliver
    else mode == MANUAL
        API->>DB: status=PENDING_APPROVAL
    end

    Recipient->>Inbox: open email, click "Approve"
    Inbox->>API: GET /approve/<token>
    API->>API: verifyApprovalToken() (HMAC + expiry)
    API->>DB: status=SCHEDULED

    loop every minute
        CJ->>API: GET /api/cron/publish (Bearer CRON_SECRET)
        API->>DB: claim due posts (atomic updateMany)
        loop each due post
            API->>API: decrypt page token
            API->>Meta: POST /{ig}/media (container)
            loop poll
                API->>Meta: GET /{container}?fields=status_code
            end
            API->>Meta: POST /{ig}/media_publish
            Meta-->>API: media_id
            API->>Meta: GET /{media_id}?fields=permalink
            API->>DB: status=POSTED, igPermalink=...
        end
    end
```

See [[Approval Flow]] for token mechanics, [[Scheduling and Cron]] for the queue claim pattern, [[Instagram Publishing]] for Meta Graph specifics.

---

## Where Data Lives

| Entity | Where | Why |
|---|---|---|
| User identity, sessions | Postgres (NextAuth Prisma adapter) | Session JWT-encoded but User+Account rows persisted for audit & multi-provider readiness |
| Posts, IG accounts, preferences | Postgres | Core state |
| Page access tokens | Postgres, **encrypted with AES-256-GCM** | Token theft → posting on user's behalf, treated as secret at rest |
| Approval tokens | Stateless — HMAC-signed | No DB lookup; token IS the auth |
| Videos | Cloudinary | Heavy bytes; their CDN handles delivery to Meta during publish |
| Email templates | In-source HTML strings | Simple, versioned with code |

---

## Edge vs Node Boundary

Next.js 16 has two runtimes; they affect what code runs where:

```mermaid
flowchart LR
    subgraph EdgeRuntime["Edge Runtime"]
        proxy[proxy.ts]
        authcfg[auth.config.ts]
    end
    subgraph NodeRuntime["Node Runtime"]
        routes[All API routes]
        layouts[All RSC pages/layouts]
        authfull[auth.ts + Prisma adapter]
        cron[Cron handlers]
    end

    proxy -.uses.-> authcfg
    routes -.uses.-> authfull
    layouts -.uses.-> authfull
```

**Why split:** The edge proxy needs to run on Vercel's edge network for fast auth checks on every request — but Prisma can't run there. So `auth.config.ts` exports an edge-safe config (just providers + JWT callbacks); `auth.ts` extends it with the Prisma adapter for full DB-backed sign-in. See [[Authentication and Authorization#Edge vs Node split]].

---

## Why These Choices

| Decision | Alternative | Why we picked this |
|---|---|---|
| **Postgres-as-queue** for scheduling | Redis + BullMQ | Avoid extra infra. Atomic `updateMany` with status filter prevents double-claim. Scales to thousands of users before becoming a bottleneck. |
| **JWT sessions** with Prisma adapter | Database sessions | Edge proxy can't talk to Prisma. JWT is verifiable in edge. User + Account rows still persist via the adapter. |
| **Direct browser → Cloudinary** | Through Vercel proxy | Vercel function body cap (4.5 MB) + 60s timeout would fail on most reels. |
| **HMAC-signed approval tokens** | DB rows for tokens | Stateless; recipients act without sign-in; no token-cleanup job. |
| **Meta long-lived (60d) tokens** | Short-lived re-auth flow | Single OAuth flow per user; daily refresh cron extends in place. |
| **Cron via cron-job.org** | Vercel Pro | Vercel Hobby cron is now 1/day; external service is free, reliable, 1-min granularity. See [[Scheduling and Cron]]. |
| **Granular_scopes fallback** | Block sign-in flow | Meta's new Business Login Flow returns no Pages from `/me/accounts`; we discover them from `debug_token`. See [[Instagram Publishing#granular_scopes fallback]]. |

---

## Cross-references

- [[README]] — top-level overview
- [[Authentication and Authorization]] — full auth + permissions detail
- [[Database Schema]] — model definitions
- [[Instagram Publishing]] — Meta Graph mechanics
- [[Scheduling and Cron]] — cron-job.org wiring
