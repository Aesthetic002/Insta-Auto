import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  FileText,
  Plus,
  Share2,
  UserPlus,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocalTime } from "@/components/local-time";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) redirect("/");

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    userId,
    cookieStore.get("active_creator")?.value
  );

  if (!ctx) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageHeader greeting={`Welcome, ${me.name?.split(" ")[0] ?? "there"}`} title="Dashboard" />
        <EmptyState
          icon={<UserPlus className="h-6 w-6 text-fuchsia-500" />}
          title="Connect with a creator"
          body="You haven't been linked to any creators yet. Invite one by email from Settings, or wait for a creator to invite you."
          action={{ href: "/settings", label: "Open Settings" }}
        />
      </div>
    );
  }

  const [accountCount, postCount, pendingPosts, scheduledCount, publishedCount, creator] =
    await Promise.all([
      db.socialAccount.count({ where: { userId: ctx.creatorId, disconnectedAt: null } }),
      db.post.count({ where: { userId: ctx.creatorId } }),
      ctx.isOwn
        ? db.post.findMany({
            where: { userId: ctx.creatorId, status: "PENDING_APPROVAL" },
            orderBy: { scheduledAt: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
      db.post.count({ where: { userId: ctx.creatorId, status: "SCHEDULED" } }),
      db.post.count({ where: { userId: ctx.creatorId, status: "POSTED" } }),
      ctx.isOwn
        ? Promise.resolve(null)
        : db.user.findUnique({
            where: { id: ctx.creatorId },
            select: { name: true, email: true },
          }),
    ]);

  const greeting = ctx.isOwn
    ? `Welcome back, ${me.name?.split(" ")[0] ?? "there"}`
    : `Editing for ${creator?.name ?? creator?.email}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        greeting={greeting}
        title="Dashboard"
        action={
          accountCount > 0 ? (
            <Link
              href="/posts/new"
              className={cn(buttonVariants({ size: "default" }), "rounded-full px-5 shadow-lg shadow-rose-500/20 gap-1.5")}
            >
              <Plus className="h-4 w-4" /> New post
            </Link>
          ) : null
        }
      />

      {accountCount === 0 ? (
        ctx.isOwn ? (
          <EmptyState
            icon={<Camera className="h-6 w-6 text-fuchsia-500" />}
            title="Connect a social account"
            body="Connect Instagram, Facebook, LinkedIn, or YouTube to start scheduling and publishing posts."
            action={{ href: "/settings", label: "Connect accounts" }}
          />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">
              {creator?.name ?? creator?.email ?? "This creator"} hasn't connected any social accounts yet
            </h2>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              You can still upload drafts, but they can't be published until the creator connects an account.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Connected accounts"
            value={accountCount}
            icon={<Share2 className="h-4 w-4" />}
            color="from-fuchsia-500 to-rose-500"
          />
          <StatCard
            label="Total posts"
            value={postCount}
            icon={<FileText className="h-4 w-4" />}
            color="from-sky-500 to-blue-500"
          />
          <StatCard
            label="Scheduled"
            value={scheduledCount}
            icon={<CalendarClock className="h-4 w-4" />}
            color="from-violet-500 to-fuchsia-500"
          />
          <StatCard
            label="Published"
            value={publishedCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="from-emerald-500 to-teal-500"
          />
        </div>
      )}

      {pendingPosts.length > 0 && <PendingApprovals posts={pendingPosts} />}

      {accountCount > 0 && postCount === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={<Plus className="h-6 w-6 text-fuchsia-500" />}
            title="Create your first post"
            body="Upload a video or image, let AI write the caption, then schedule it for publishing."
            action={{ href: "/posts/new", label: "New post" }}
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function PageHeader({
  greeting,
  title,
  action,
}: {
  greeting: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{greeting} 👋</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className={cn("absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20", color)} />
      <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", color)}>
        {icon}
      </div>
      <div className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-rose-50/60 p-10 text-center dark:border-fuchsia-900/40 dark:from-fuchsia-950/40 dark:to-rose-950/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-600/15" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md dark:bg-zinc-900">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
        </div>
        <Link
          href={action.href}
          className={cn(buttonVariants({ size: "default" }), "rounded-full px-6 gap-1.5")}
        >
          {action.label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function PendingApprovals({
  posts,
}: {
  posts: Array<{
    id: string;
    outline: string;
    thumbnailUrl: string | null;
    scheduledAt: Date | null;
  }>;
}) {
  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-sm dark:border-amber-900/40 dark:bg-zinc-900">
      <header className="flex items-center gap-2.5 border-b border-amber-200/60 bg-amber-50/60 px-6 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </span>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Pending approvals
        </h2>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          {posts.length}
        </span>
      </header>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/posts/${p.id}`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnailUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {p.outline}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {p.scheduledAt ? (
                    <>
                      Scheduled for{" "}
                      <LocalTime date={p.scheduledAt.toISOString()} dateStyle="medium" timeStyle="short" />
                    </>
                  ) : (
                    "No time set"
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
