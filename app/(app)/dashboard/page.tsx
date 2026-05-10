import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Camera, CheckCircle2, ListChecks, Plus, UploadCloud, UserPlus } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Editor with no creators yet
  if (!ctx) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm text-zinc-500">
            Welcome, {me.name?.split(" ")[0] ?? "there"} 👋
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <NoCreatorsPrompt />
      </div>
    );
  }

  const [igCount, postCount, pendingPosts, scheduledCount, creator] =
    await Promise.all([
      db.igAccount.count({
        where: { userId: ctx.creatorId, disconnectedAt: null },
      }),
      db.post.count({ where: { userId: ctx.creatorId } }),
      ctx.isOwn
        ? db.post.findMany({
            where: { userId: ctx.creatorId, status: "PENDING_APPROVAL" },
            orderBy: { scheduledAt: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
      db.post.count({ where: { userId: ctx.creatorId, status: "SCHEDULED" } }),
      ctx.isOwn
        ? Promise.resolve(null)
        : db.user.findUnique({
            where: { id: ctx.creatorId },
            select: { name: true, email: true },
          }),
    ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {ctx.isOwn
              ? `Welcome back, ${me.name?.split(" ")[0] ?? "there"} 👋`
              : `Editing for ${creator?.name ?? creator?.email}`}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        {igCount > 0 && (
          <Link
            href="/posts/new"
            className={cn(
              buttonVariants({ size: "default" }),
              "rounded-full px-5 shadow-lg shadow-rose-500/20"
            )}
          >
            <Plus className="h-4 w-4" />
            New post
          </Link>
        )}
      </div>

      {igCount === 0 ? (
        ctx.isOwn ? (
          <ConnectIgPrompt />
        ) : (
          <NoIgPrompt creatorName={creator?.name ?? creator?.email ?? "this creator"} />
        )
      ) : (
        <Stats
          igCount={igCount}
          postCount={postCount}
          scheduledCount={scheduledCount}
        />
      )}

      {pendingPosts.length > 0 && <PendingApprovals posts={pendingPosts} />}
    </div>
  );
}

function NoCreatorsPrompt() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-rose-50 p-8 dark:border-fuchsia-900/40 dark:from-fuchsia-950/40 dark:to-rose-950/30">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-600/20" />
      <div className="relative flex flex-col gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-900">
          <UserPlus className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Connect with a creator
        </h2>
        <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t been linked to any creators yet. Either invite one by
          email from settings, or wait for a creator to invite you.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/settings"
            className={cn(buttonVariants({ size: "default" }), "rounded-full px-5")}
          >
            Open settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConnectIgPrompt() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-rose-50 p-8 dark:border-fuchsia-900/40 dark:from-fuchsia-950/40 dark:to-rose-950/30">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-600/20" />
      <div className="relative flex flex-col gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-900">
          <Camera className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Connect your Instagram
        </h2>
        <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          To start scheduling reels, link an Instagram Business account through
          Meta. You&apos;ll only need to do this once per account.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/settings"
            className={cn(buttonVariants({ size: "default" }), "rounded-full px-5")}
          >
            Connect Instagram
          </Link>
          <Button variant="ghost" className="rounded-full" disabled>
            Learn more
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoIgPrompt({ creatorName }: { creatorName: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
      <h2 className="font-semibold text-amber-900 dark:text-amber-200">
        {creatorName} hasn&apos;t connected an Instagram account yet
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        You can still upload drafts, but they can&apos;t be published until the
        creator connects their account.
      </p>
    </div>
  );
}

function Stats({
  igCount,
  postCount,
  scheduledCount,
}: {
  igCount: number;
  postCount: number;
  scheduledCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Instagram accounts"
        value={igCount}
        icon={<Camera className="h-4 w-4" />}
      />
      <StatCard
        label="Total posts"
        value={postCount}
        icon={<ListChecks className="h-4 w-4" />}
      />
      <StatCard
        label="Scheduled"
        value={scheduledCount}
        icon={<UploadCloud className="h-4 w-4" />}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span className="text-zinc-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
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
    <section className="mt-10 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-6 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-zinc-900">
      <header className="mb-5 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-base font-semibold">
          Pending approvals ({posts.length})
        </h2>
      </header>
      <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/posts/${p.id}`}
              className="flex items-center gap-4 py-3 transition-colors hover:bg-white/60 dark:hover:bg-zinc-800/40"
            >
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.outline}</div>
                <div className="text-xs text-zinc-500">
                  {p.scheduledAt
                    ? `Scheduled for ${p.scheduledAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}`
                    : "No time set"}
                </div>
              </div>
              <span className="text-xs text-zinc-500">Review →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
