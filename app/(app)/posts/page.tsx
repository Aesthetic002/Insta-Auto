import Link from "next/link";
import { cookies } from "next/headers";
import { Plus, UploadCloud } from "lucide-react";
import type { PostStatus } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connect with a creator from{" "}
          <Link href="/settings" className="text-fuchsia-600 hover:underline">
            settings
          </Link>{" "}
          to view their posts here.
        </p>
      </div>
    );
  }

  const posts = await db.post.findMany({
    where: { userId: ctx.creatorId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { igAccount: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drafts, scheduled, and posted reels.
          </p>
        </div>
        <Link
          href="/posts/new"
          className={cn(buttonVariants({ size: "default" }), "rounded-full px-5")}
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 group-hover:opacity-95 dark:bg-zinc-950">
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <UploadCloud className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={post.status} />
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {post.outline}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {post.igAccount.username
                        ? `@${post.igAccount.username}`
                        : "Instagram"}
                    </span>
                    <span>
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString()
                        : new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const styles: Record<PostStatus, string> = {
    DRAFT:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    CAPTION_PENDING:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    PENDING_APPROVAL:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    SCHEDULED:
      "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900",
    PUBLISHING:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    POSTED:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    REJECTED:
      "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
    FAILED:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  };
  return (
    <Badge variant="outline" className={cn("backdrop-blur-md", styles[status])}>
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
      <UploadCloud className="mx-auto h-10 w-10 text-zinc-400" />
      <h2 className="mt-4 text-lg font-semibold">No posts yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
        Upload a reel and we&apos;ll save it as a draft. Captions and scheduling
        come next.
      </p>
      <Link
        href="/posts/new"
        className={cn(
          buttonVariants({ size: "default" }),
          "mt-6 rounded-full px-5"
        )}
      >
        <Plus className="h-4 w-4" />
        Upload your first video
      </Link>
    </div>
  );
}
