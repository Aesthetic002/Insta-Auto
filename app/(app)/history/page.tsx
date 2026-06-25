import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  XCircle,
} from "lucide-react";

import { LocalTime } from "@/components/local-time";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listAccessibleCreators } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
  YOUTUBE: "YouTube",
};

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
  PINTEREST: "📌",
  YOUTUBE: "▶️",
};

export default async function HistoryPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) redirect("/");

  // Determine which creator's history to show
  let creatorId = userId;
  if (me.role === "EDITOR") {
    const cookieStore = await cookies();
    const preferred = cookieStore.get("active_creator")?.value;
    const accessibleIds = await listAccessibleCreators(userId);
    creatorId = (preferred && accessibleIds.includes(preferred))
      ? preferred
      : accessibleIds[0] ?? userId;
  }

  const posts = await db.post.findMany({
    where: {
      userId: creatorId,
      status: { in: ["POSTED", "FAILED"] },
    },
    include: {
      socialAccount: true,
      targets: {
        include: { socialAccount: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const postedCount = posts.filter((p) => p.status === "POSTED").length;
  const failedCount = posts.filter((p) => p.status === "FAILED").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md shadow-indigo-500/30">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              History
            </h1>
            <p className="text-sm text-zinc-500">
              {postedCount} published · {failedCount} failed
            </p>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
          <History className="mb-4 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No history yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Posts will appear here after they are published or fail.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isPosted = post.status === "POSTED";
            const hasTargets = post.targets.length > 0;
            const postedAt = post.postedAt ?? post.updatedAt;
            const permalink = post.platformUrl ?? post.igPermalink ?? null;

            return (
              <div
                key={post.id}
                className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900"
              >
                <div className="flex gap-4 p-5">
                  {/* Thumbnail */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : post.mediaUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.mediaUrls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        {post.platform ? (PLATFORM_ICONS[post.platform] ?? "🎬") : "🎬"}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/posts/${post.id}`}
                          className="line-clamp-1 text-sm font-semibold text-zinc-900 hover:text-fuchsia-600 dark:text-zinc-50 dark:hover:text-fuchsia-400"
                        >
                          {post.outline}
                        </Link>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {isPosted ? "Published" : "Failed"}{" "}
                          <LocalTime date={postedAt.toISOString()} dateStyle="medium" timeStyle="short" />
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isPosted ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Caption snippet */}
                    {post.caption && (
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {post.caption}
                      </p>
                    )}

                    {/* Error message */}
                    {post.errorMessage && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {post.errorMessage}
                      </p>
                    )}

                    {/* Single-account result row */}
                    {!hasTargets && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {post.platform && (
                          <span className="inline-flex items-center gap-1">
                            <span>{PLATFORM_ICONS[post.platform] ?? "🌐"}</span>
                            {PLATFORM_LABELS[post.platform] ?? post.platform}
                          </span>
                        )}
                        {post.socialAccount?.username && (
                          <span>@{post.socialAccount.username}</span>
                        )}
                        {post.mediaType && (
                          <Badge variant="outline" className="text-[10px]">
                            {post.mediaType.toLowerCase()}
                          </Badge>
                        )}
                        {permalink && (
                          <a
                            href={permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-fuchsia-600 hover:underline dark:text-fuchsia-400"
                          >
                            View post
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Multi-target results */}
                {hasTargets && (
                  <div className="border-t border-zinc-100 px-5 pb-4 pt-3 dark:border-zinc-800">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Per-account results
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.targets.map((t) => {
                        const acc = t.socialAccount;
                        const label =
                          acc.username && !acc.username.startsWith("board:")
                            ? `@${acc.username}`
                            : acc.displayName && !acc.displayName.startsWith("board:")
                            ? acc.displayName
                            : PLATFORM_LABELS[acc.platform] ?? acc.platform;

                        return (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                              t.status === "POSTED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                                : t.status === "FAILED"
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                                : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                            )}
                          >
                            <span>{PLATFORM_ICONS[acc.platform] ?? "🌐"}</span>
                            <span className="font-medium">{label}</span>
                            {t.status === "POSTED" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : t.status === "FAILED" ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {t.platformUrl && (
                              <a
                                href={t.platformUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-0.5 inline-flex items-center gap-0.5 hover:underline"
                              >
                                View
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
