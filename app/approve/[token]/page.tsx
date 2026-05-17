import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { db } from "@/lib/db";
import { verifyApprovalToken } from "@/lib/crypto/tokens";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = verifyApprovalToken(token);

  if (!result.ok) {
    return (
      <Shell>
        <Card kind="error">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-3 text-xl font-semibold">Link invalid</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {result.reason === "expired"
              ? "This approval link expired. Open the post in your dashboard and resend approval."
              : "We couldn't verify this approval link. Try the dashboard instead."}
          </p>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "default" }), "mt-5 rounded-full px-5")}
          >
            Open dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  const { pid, act } = result.payload;
  const post = await db.post.findUnique({
    where: { id: pid },
    include: { socialAccount: true },
  });

  if (!post) {
    return (
      <Shell>
        <Card kind="error">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-3 text-xl font-semibold">Post not found</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This post may have been deleted.
          </p>
        </Card>
      </Shell>
    );
  }

  // EDIT just bounces to the post detail page (which requires sign-in)
  if (act === "edit") {
    redirect(`/posts/${post.id}`);
  }

  // APPROVE / REJECT only act if the post is still PENDING_APPROVAL
  if (act === "approve") {
    if (post.status === "PENDING_APPROVAL") {
      // If scheduledAt is in the past, leave it — cron will pick it up immediately.
      await db.post.update({
        where: { id: post.id },
        data: { status: "SCHEDULED" },
      });
    }
    return (
      <Shell>
        <Card kind="success">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <h1 className="mt-3 text-xl font-semibold">Approved</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This post will publish to{" "}
            <strong>
              {post.socialAccount?.username
                ? `@${post.socialAccount.username}`
                : post.socialAccount?.displayName ?? "your account"}
            </strong>
            {post.scheduledAt
              ? ` at ${post.scheduledAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : " shortly"}
            .
          </p>
          <Link
            href={`/posts/${post.id}`}
            className={cn(buttonVariants({ size: "default" }), "mt-5 rounded-full px-5")}
          >
            Open post
          </Link>
        </Card>
      </Shell>
    );
  }

  // REJECT
  if (post.status === "PENDING_APPROVAL" || post.status === "SCHEDULED") {
    await db.post.update({
      where: { id: post.id },
      data: { status: "REJECTED", scheduledAt: null },
    });
  }
  return (
    <Shell>
      <Card kind="info">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-xl font-semibold">Rejected</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We won&apos;t publish this reel. You can edit and reschedule from the dashboard.
        </p>
        <Link
          href={`/posts/${post.id}`}
          className={cn(
            buttonVariants({ size: "default", variant: "outline" }),
            "mt-5 rounded-full px-5"
          )}
        >
          Open post
        </Link>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 px-6 py-16 dark:from-fuchsia-950/30 dark:via-black dark:to-rose-950/20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(244,114,182,0.15),_transparent_60%)]" />
      <div className="absolute left-6 top-6 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30">
          <Sparkles className="h-4 w-4" />
        </div>
        Anvaya
      </div>
      {children}
    </main>
  );
}

function Card({
  kind,
  children,
}: {
  kind: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const ring =
    kind === "success"
      ? "ring-emerald-200 dark:ring-emerald-900/40"
      : kind === "error"
        ? "ring-red-200 dark:ring-red-900/40"
        : "ring-amber-200 dark:ring-amber-900/40";
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white p-8 text-center shadow-xl ring-1 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900",
        ring
      )}
    >
      {children}
    </div>
  );
}

