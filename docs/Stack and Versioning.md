---
tags: [stack, versioning, dependencies, gotchas]
date: 2026-05-10
parent: "[[README]]"
---

# Stack and Versioning

Exact versions of the major dependencies, why they're pinned where they are, and known gotchas with the bleeding-edge bits.

---

## Table of Contents

- [[#Pinned Versions|Pinned Versions]]
- [[#Why Prisma 6 (not 7)|Why Prisma 6 (not 7)]]
- [[#Why JWT, not DB sessions|Why JWT, not DB sessions]]
- [[#Next.js 16 Quirks|Next.js 16 Quirks]]
- [[#shadcn (Radix Base) Quirks|shadcn (Radix Base) Quirks]]
- [[#lucide-react Branded Icons|lucide-react Branded Icons]]
- [[#Upgrade Strategy|Upgrade Strategy]]

---

## Pinned Versions

From `package.json` (as of v1 deploy, 2026-05-10):

```json
{
  "dependencies": {
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "next-auth": "^5.0.0-beta.31",
    "@auth/prisma-adapter": "^2.11.2",
    "@prisma/client": "^6.19.3",
    "prisma": "^6.19.3",
    "@base-ui/react": "^1.4.1",
    "shadcn": "^4.7.0",
    "@google/genai": "^2.0.1",
    "resend": "...",
    "lucide-react": "^1.14.0",
    "tailwind-merge": "^3.5.0",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

| Stack layer | Pinned to | Why |
|---|---|---|
| Next.js | 16.x | Latest stable, App Router + Turbopack default |
| React | 19.x | Comes with Next 16 |
| Tailwind | v4 | Comes with Next 16's create-next-app default |
| Prisma | **6.x (NOT 7)** | Prisma 7 broke `new PrismaClient({log:[...]})`; see below |
| NextAuth | v5 beta | v4 is in maintenance; v5 is the current direction |
| shadcn | v4 with Radix base | latest as of project start; uses `@base-ui/react` primitives |
| Node | 22.12 | What we tested with; npm warns EBADENGINE for some deps wanting 22.13+, harmless |

---

## Why Prisma 6 (not 7)

Prisma 7 GA shipped during this project's development with breaking changes:

1. New default generator (`prisma-client`) outputs to `app/generated/prisma` and requires custom config.
2. Default datasource setup uses `prisma.config.ts` instead of `env("DATABASE_URL")` in schema.
3. `PrismaClient` constructor signature changed; passing `{ log: ['error'] }` throws "Property 'accelerateUrl' is missing" (Prisma 7 wants either an Accelerate URL or a driver adapter — direct Postgres connections via `postgresql://` aren't first-class anymore).

The fix path on Prisma 7 is non-trivial: install `@prisma/adapter-pg` driver adapter, refactor every `lib/db.ts` import. Total churn: ~1 hour of learning + refactoring.

**We pinned 6.x** until the Prisma 7 ecosystem stabilizes and adapter docs are clearer. The 6.x line is in maintenance mode but works fully.

To upgrade to 7 later:

```powershell
npm i prisma@latest @prisma/client@latest @prisma/adapter-pg
```

Then refactor `lib/db.ts`:

```ts
// Prisma 7 pattern
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const db = new PrismaClient({ adapter });
```

---

## Why JWT, not DB sessions

NextAuth supports two session strategies:

- **Database** sessions: cookie holds session ID, every request looks up the row.
- **JWT** sessions: cookie holds the signed JWT itself, no DB lookup.

We picked **JWT** because:

1. The Auth.js edge proxy (`proxy.ts`) runs in the **edge runtime** which can't talk to Prisma. JWT verification works in edge; DB lookup doesn't.
2. We initially set `session: { strategy: "database" }` and got `JWTSessionError: Invalid Compact JWE` on every request because the edge proxy was trying to decrypt a non-existent JWT cookie. Switching to JWT fixed it instantly.

Trade-off: JWT sessions can't be revoked server-side until expiry (we use 30 days default). For most use cases this is fine — the user can sign out which clears the cookie.

See [[Authentication and Authorization#Edge vs Node split]].

---

## Next.js 16 Quirks

### `middleware.ts` → `proxy.ts`
Next 16 renamed the file convention. The auth proxy lives in `proxy.ts` now. **Default export must be a function**, not a destructured `{ auth }`:

```ts
// proxy.ts — works
const { auth } = NextAuth(authConfig);
export default auth;
export const config = { matcher: [...] };
```

```ts
// proxy.ts — does NOT work in Next 16
export const { auth: proxy } = NextAuth(authConfig);
// throws: Proxy is missing expected function export name
```

### `params` is a Promise
Route handlers and dynamic page components receive `params` as a Promise, must be `await`-ed:

```ts
export async function GET(_req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

### Turbopack is default
`next dev` uses Turbopack out of the box. Faster than Webpack but stricter; some incremental compilation glitches in our project led to occasional "module not found" errors on first request after a hot edit. Restart `npm run dev` if it gets weird.

---

## shadcn (Radix Base) Quirks

### `shadcn init` is interactive even with `--yes`
The `-y` flag prompts for preset/library/etc anyway. Use `-d` (`--defaults`) to skip:

```powershell
npx shadcn@latest init -d -f --no-monorepo
```

### `<Button asChild>` doesn't exist
The Radix-base `Button` component uses Base UI's `Button` primitive directly, not Radix Slot. There's no `asChild` pattern. To make a link styled as a button:

```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link href="/x" className={cn(buttonVariants({ size: "lg" }), "rounded-full")}>
  Click me
</Link>
```

This is everywhere in our codebase — recognize the pattern before "fixing" it.

---

## lucide-react Branded Icons

lucide-react v1.x dropped branded social icons (`Instagram`, `Twitter`, etc.) for trademark reasons. Importing them is a build error.

We use `Camera` instead of `Instagram` throughout the UI. If you really need the IG glyph, drop in an inline SVG.

---

## Upgrade Strategy

| Dep | When to upgrade |
|---|---|
| Next.js minor (16.2 → 16.3) | safe; `npm i next@latest` |
| Next.js major (16 → 17) | major release notes, breaking changes likely; expect a day of work |
| Prisma 6 → 7 | wait for ecosystem; see [[#Why Prisma 6 (not 7)]] |
| NextAuth beta → stable v5 | re-test sign-in flow end-to-end; Prisma adapter API may shift |
| Tailwind v4 → v5 | unlikely for a while |
| shadcn primitives | `npx shadcn@latest add <component> --overwrite` |

Rule of thumb: **always run `npx next build` after a dependency upgrade** before deploying. Type errors in our code are common after major upgrades.

---

## Cross-references

- [[Authentication and Authorization]] — JWT details
- [[Architecture#Edge vs Node Boundary]] — runtime split
- [[Development Setup]] — version-pinning context
- Project memory: contains a record of every gotcha hit, kept for future sessions
