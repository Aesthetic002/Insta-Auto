import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canEditCreatorWorkspace, isCreatorOf } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { PostDetailEditor } from "@/components/post-detail-editor";
import { PostScheduleCard } from "@/components/post-schedule-card";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { id } = await params;

  const post = await db.post.findUnique({
    where: { id },
    include: {
      igAccount: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!post) notFound();

  if (!(await canEditCreatorWorkspace(userId, post.userId))) {
    redirect("/posts");
  }
  const canActAsCreator = await isCreatorOf(userId, post.userId);
  const creatorLabel = post.user.name ?? post.user.email;

  const permalink =
    post.igPermalink ??
    (post.igMediaId ? `https://www.instagram.com/p/${post.igMediaId}/` : null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/posts"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to posts
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-black shadow-sm dark:border-zinc-800/80">
            <video
              controls
              src={post.videoUrl}
              poster={post.thumbnailUrl ?? undefined}
              className="aspect-square w-full bg-black object-contain"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Badge variant="outline">
              {post.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
            <span>·</span>
            <span>
              {post.igAccount.username
                ? `@${post.igAccount.username}`
                : "Instagram"}
            </span>
            {permalink && (
              <>
                <span>·</span>
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-fuchsia-600 hover:underline dark:text-fuchsia-400"
                >
                  View on Instagram
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
          {post.errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <strong>Last error:</strong> {post.errorMessage}
            </div>
          )}
          {!canActAsCreator && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              You&apos;re editing this post in{" "}
              <strong>{creatorLabel}</strong>&apos;s workspace. They handle
              scheduling, approvals and publishing.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <PostDetailEditor
            post={{
              id: post.id,
              status: post.status,
              caption: post.caption,
              outline: post.outline,
            }}
            canPublish={canActAsCreator}
          />
          {canActAsCreator && (
            <PostScheduleCard
              postId={post.id}
              status={post.status}
              scheduledAt={post.scheduledAt?.toISOString() ?? null}
              hasCaption={!!post.caption}
            />
          )}
        </div>
      </div>
    </div>
  );
}
