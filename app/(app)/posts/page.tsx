import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Plus, UploadCloud } from "lucide-react";
import type { PostStatus } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_META: Record<PostStatus, { label: string; className: string }> = {
  DRAFT:            { label: "Draft",            className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
  CAPTION_PENDING:  { label: "Caption pending",  className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900" },
  PENDING_APPROVAL: { label: "Needs approval",   className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
  SCHEDULED:        { label: "Scheduled",         className: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900" },
  PUBLISHING:       { label: "Publishing…",       className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900" },
  POSTED:           { label: "Posted",            className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" },
  REJECTED:         { label: "Rejected",          className: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800" },
  FAILED:           { label: "Failed",            className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900" },
};

export default async function PostsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    userId,
    cookieStore.get("active_creator")?.value
  );

  if (!ctx) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Posts</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connect with a creator from{" "}
          <Link href="/settings" className="text-fuchsia-600 hover:underline dark:text-fuchsia-400">
            Settings
          </Link>{" "}
          to view posts here.
        </p>
      </div>
    );
  }

  const posts = await db.post.findMany({
    where: { userId: ctx.creatorId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { socialAccount: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Posts</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {posts.length > 0 ? `${posts.length} post${posts.length === 1 ? "" : "s"} · drafts, scheduled, and published` : "Drafts, scheduled, and published posts"}
          </p>
        </div>
        <Link
          href="/posts/new"
          className={cn(buttonVariants({ size: "default" }), "rounded-full px-5 gap-1.5 shadow-lg shadow-rose-500/20")}
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const meta = STATUS_META[post.status];
            const accountLabel =
              post.socialAccount?.username && !post.socialAccount.username.startsWith("board:")
                ? `@${post.socialAccount.username}`
                : post.socialAccount?.displayName && !post.socialAccount.displayName.startsWith("board:")
                ? post.socialAccount.displayName
                : post.platform ?? "Draft";

            return (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="group block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-900"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UploadCloud className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    {/* Status badge */}
                    <div className="absolute left-3 top-3">
                      <Badge variant="outline" className={cn("backdrop-blur-sm text-[11px] font-medium", meta.className)}>
                        {meta.label}
                      </Badge>
                    </div>
                    {/* Review arrow on hover */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-800 opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-900/90 dark:text-zinc-100">
                      Review <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                      {post.outline || "Untitled post"}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
                      <span className="truncate">{accountLabel}</span>
                      <span className="shrink-0">
                        {post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                          : new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <UploadCloud className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No posts yet</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Upload a video or image and Anvaya will save it as a draft — captions and scheduling come next.
      </p>
      <Link
        href="/posts/new"
        className={cn(buttonVariants({ size: "default" }), "mt-6 rounded-full px-6 gap-1.5")}
      >
        <Plus className="h-4 w-4" />
        Create first post
      </Link>
    </div>
  );
}
