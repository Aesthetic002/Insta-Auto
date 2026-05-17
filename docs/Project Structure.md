---
tags: [structure, layout, conventions]
date: 2026-05-10
parent: "[[README]]"
---

# Project Structure

The directory layout, the conventions we follow, and where to find what.

---

## Table of Contents

- [[#Top-Level Layout|Top-Level Layout]]
- [[#The (app) Route Group|The (app) Route Group]]
- [[#API Routes|API Routes]]
- [[#lib - Domain Modules|lib (domain modules)]]
- [[#components|components]]
- [[#prisma|prisma]]
- [[#Conventions|Conventions]]

---

## Top-Level Layout

```
insta_automation/
├─ app/                    Next.js App Router
├─ components/             React components (UI primitives + domain)
├─ lib/                    Server-side modules (DB, Meta, Gemini, etc.)
├─ prisma/                 Schema + migration history
├─ public/                 Static assets
├─ reference/              Original n8n JSON (preserved for reference)
├─ docs/                   This documentation
├─ auth.ts                 NextAuth full config (Node)
├─ auth.config.ts          NextAuth edge-safe config
├─ proxy.ts                Auth.js proxy/middleware
├─ vercel.json             Vercel cron config (daily refresh-tokens)
├─ next.config.ts          Next.js config (default)
├─ tsconfig.json
├─ package.json
└─ .env / .env.example
```

---

## The (app) Route Group

`app/(app)/` is a Next.js **route group** — the parens mean "doesn't appear in the URL". The folder exists to share a single layout (with sidebar, mobile nav, workspace banner) across `dashboard`, `posts`, `calendar`, `settings`.

```
app/(app)/
├─ layout.tsx              sidebar + workspace banner; enforces auth + onboarding
├─ dashboard/
│  ├─ page.tsx
│  └─ loading.tsx
├─ posts/
│  ├─ page.tsx             list view
│  ├─ loading.tsx          skeleton
│  ├─ new/page.tsx         uploader
│  └─ [id]/page.tsx        detail with editor + schedule card
├─ calendar/
│  ├─ page.tsx
│  └─ loading.tsx
└─ settings/
   └─ page.tsx
```

Outside the route group:

```
app/
├─ page.tsx                public landing
├─ layout.tsx              root layout (Toaster mounts here)
├─ globals.css
├─ onboarding/page.tsx     forced post-signup, role picker
├─ approve/[token]/        public approval-link landing (no auth)
├─ actions/auth.ts         signIn/signOut server actions
└─ api/                    route handlers
```

---

## API Routes

```
app/api/
├─ auth/[...nextauth]/route.ts       NextAuth handlers
├─ instagram/
│  ├─ connect/route.ts               redirect to FB dialog
│  ├─ callback/route.ts               token exchange + IG discovery
│  └─ disconnect/route.ts
├─ posts/
│  ├─ route.ts                       GET list, POST upload
│  └─ [id]/
│     ├─ route.ts                    PATCH (caption/outline), DELETE
│     ├─ generate-caption/route.ts   Gemini call
│     ├─ schedule/route.ts           POST schedule (branches on approval mode), DELETE cancel
│     ├─ publish/route.ts            manual "Post Now"
│     └─ request-approval/route.ts   re-send the approval email
├─ editor-invites/
│  ├─ route.ts                       POST send invite, GET list invites
│  └─ [id]/route.ts                  PATCH accept/decline, DELETE cancel
├─ preferences/route.ts              GET/PATCH approvalMode, captionTone, etc.
├─ upload/sign/route.ts              Cloudinary signed-upload params
├─ onboarding/route.ts               POST role + onboarded=true
└─ cron/
   ├─ publish/route.ts               every-minute (external cron-job.org)
   └─ refresh-tokens/route.ts        daily (Vercel cron)
```

**Naming convention:** API routes use HTTP methods (GET/POST/PATCH/DELETE) inside `route.ts`. No verbs in URL paths (RESTful). Sub-actions live in nested folders (e.g. `posts/[id]/publish/`) so they remain discoverable.

---

## lib - Domain Modules

```
lib/
├─ db.ts                   Prisma singleton (avoids reconnects in dev)
├─ env.ts                  Typed lazy env access (one place to validate)
├─ utils.ts                shadcn cn() merger
├─ permissions.ts          workspace ACL helpers
├─ crypto/
│  ├─ encryption.ts        AES-256-GCM (IG tokens)
│  └─ tokens.ts            HMAC signed approval tokens
├─ instagram/
│  ├─ oauth.ts             authorize URL, code exchange, granular_scopes discovery
│  └─ publish.ts           container → poll → publish → permalink pipeline
├─ cloudinary/
│  └─ sign.ts              SHA-1 upload param signing
├─ email/
│  ├─ resend.ts            Resend client
│  └─ templates.ts         approval email HTML
└─ gemini/
   └─ caption.ts           Gemini 2.5 Flash prompt + call
```

> [!tip] Boundaries
> Anything in `lib/` is **server-only** (Node runtime). Don't import `lib/` modules from client components except via API routes. The `'use client'` directive in a component using `lib/db` would crash at build time.

---

## components

```
components/
├─ ui/                                shadcn primitives
│  ├─ button.tsx                      (Radix Base UI primitive)
│  ├─ input.tsx, label.tsx, textarea.tsx, card.tsx, dialog.tsx
│  ├─ dropdown-menu.tsx, sonner.tsx, badge.tsx
│  ├─ progress.tsx, sheet.tsx, skeleton.tsx
│  └─ ...
├─ approval-mode-card.tsx             3-card mode picker, calls /api/preferences
├─ collaborators-card.tsx             editor invite/accept/list
├─ creator-picker.tsx                 sidebar workspace switcher (editor only)
├─ mobile-nav.tsx                     hamburger + Sheet drawer for sidebar
├─ onboarding-form.tsx                role chooser
├─ post-detail-editor.tsx             caption editor, generate, publish, retry, delete
├─ post-schedule-card.tsx             datetime picker + schedule action
├─ post-uploader.tsx                  drag-drop + Cloudinary direct upload
└─ workspace-banner.tsx               top strip showing active creator (editor view)
```

**Convention:** UI primitives live in `components/ui/`. Domain components are at the top of `components/` and named for what they do (`post-uploader`, not `PostUploader`).

Client components use `'use client'` at the top. Server components have no directive (default in Next 16).

---

## prisma

```
prisma/
├─ schema.prisma                       all models in one file
└─ migrations/
   ├─ 20260509113032_init/             initial schema
   ├─ 20260510002706_add_ig_permalink/ Phase 8 polish
   └─ 20260510003649_editor_role_and_assignments/
      └─ migration.sql
```

The schema is one file, intentionally not split. Easier to scan, easier to reason about relations. See [[Database Schema]] for content.

---

## Conventions

### File naming
- **kebab-case** for component files: `post-uploader.tsx`.
- **PascalCase** for exported component names: `export function PostUploader()`.
- **camelCase** for everything else (helper functions, variables).

### Imports
- Absolute paths via `@/` alias: `import { db } from "@/lib/db"`.
- Group order: external → `@/lib` → `@/components` → relative.
- shadcn primitives always imported from `@/components/ui/...`.

### Auth checks at the top of every API route
```ts
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
```

### Permission checks before any DB write
- Editor-allowed mutations: `canEditCreatorWorkspace`.
- Creator-only mutations: `isCreatorOf`.

See [[Editor Role#Permission boundaries]].

### Errors return JSON with shape
```ts
return NextResponse.json(
  { error: "code_string", message: "Human readable message" },
  { status: 400 }
);
```

Client components display `json.message ?? json.error` in toasts/error banners.

### No comments unless they explain WHY
Source files contain comments only where the *reason* is non-obvious. We don't echo what the code does.

---

## Cross-references

- [[Architecture]] — how these folders interact at runtime
- [[Database Schema]] — the schema in detail
- [[Authentication and Authorization]] — auth helpers
- [[Stack and Versioning]] — exact pinned versions
