import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canEditCreatorWorkspace, isCreatorOf } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { PostDetailEditor } from "@/components/post-detail-editor";
import { PostScheduleCard } from "@/components/post-schedule-card";
import { PostTargetResults } from "@/components/post-target-results";
import type { SocialAccountOption } from "@/components/social-account-picker";

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
};

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
      socialAccount: true,
      user: { select: { name: true, email: true } },
      targets: { include: { socialAccount: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!post) notFound();

  if (!(await canEditCreatorWorkspace(userId, post.userId))) {
    redirect("/posts");
  }
  const canActAsCreator = await isCreatorOf(userId, post.userId);
  const creatorLabel = post.user.name ?? post.user.email;

  // Load all connected social accounts for this creator (for the account picker)
  const rawAccounts = canActAsCreator
    ? await db.socialAccount.findMany({
        where: { userId: post.userId, disconnectedAt: null },
        orderBy: { connectedAt: "asc" },
      })
    : [];

  const accounts: SocialAccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    platform: a.platform as SocialAccountOption["platform"],
    username: a.username,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
  }));

  // IDs of accounts already selected as targets
  const selectedAccountIds = post.targets.map((t) => t.socialAccountId);

  const platformLabel =
    post.platform ? (PLATFORM_LABELS[post.platform] ?? post.platform) : null;

  const permalink = post.platformUrl ?? post.igPermalink ?? null;

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
          {/* Media preview */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-black shadow-sm dark:border-zinc-800/80">
            {post.mediaType === "VIDEO" ? (
              <video
                controls
                src={post.mediaUrl ?? undefined}
                poster={post.thumbnailUrl ?? undefined}
                className="w-full bg-black"
                style={{ maxHeight: "520px" }}
              />
            ) : post.mediaUrls.length === 1 ? (
              // Single photo — display at natural ratio, no forced crop
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrls[0]}
                alt=""
                className="w-full object-contain bg-black"
                style={{ maxHeight: "520px" }}
              />
            ) : post.mediaUrls.length > 1 ? (
              // Multiple photos — 2-col grid, each at natural ratio
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {post.mediaUrls.slice(0, 4).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-full object-contain bg-zinc-950"
                    style={{ maxHeight: "240px" }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Meta info */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Badge variant="outline">
              {post.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
            <Badge variant="outline">
              {post.mediaType.toLowerCase()}
            </Badge>
            {platformLabel && (
              <>
                <span>·</span>
                <span>{platformLabel}</span>
              </>
            )}
            {post.socialAccount?.username && (
              <>
                <span>·</span>
                <span>@{post.socialAccount.username}</span>
              </>
            )}
            {permalink && (
              <>
                <span>·</span>
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-fuchsia-600 hover:underline dark:text-fuchsia-400"
                >
                  View post
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
              platform: (post.platform as SocialAccountOption["platform"]) ?? null,
              socialAccountId: post.socialAccountId,
              selectedAccountIds,
              mediaType: post.mediaType as "VIDEO" | "PHOTO" | "CAROUSEL",
              mediaUrls: post.mediaUrls,
            }}
            accounts={accounts}
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
          {post.targets.length > 0 && (
            <PostTargetResults
              targets={post.targets.map((t) => ({
                id: t.id,
                status: t.status as "PENDING" | "PUBLISHING" | "POSTED" | "FAILED",
                platformPostId: t.platformPostId,
                platformUrl: t.platformUrl,
                errorMessage: t.errorMessage,
                postedAt: t.postedAt,
                socialAccount: {
                  platform: t.socialAccount.platform,
                  username: t.socialAccount.username,
                  displayName: t.socialAccount.displayName,
                },
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
