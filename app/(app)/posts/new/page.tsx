import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { resolveActiveCreator } from "@/lib/permissions";
import { PostUploader } from "@/components/post-uploader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewPostPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    userId,
    cookieStore.get("active_creator")?.value
  );

  if (!ctx) {
    return (
      <Wrap>
        <NoCreatorPrompt />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <h1 className="text-3xl font-semibold tracking-tight">New post</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {ctx.isOwn
          ? "Upload a video or photos and describe what it's about. We'll save it as a draft you can review and schedule later."
          : "Upload to the creator's draft queue. They'll review, schedule and publish."}
      </p>
      <div className="mt-8">
        <PostUploader />
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/posts"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to posts
      </Link>
      {children}
    </div>
  );
}

function NoCreatorPrompt() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
      <h2 className="font-semibold text-amber-900 dark:text-amber-200">
        No creator workspace
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        Connect with a creator from settings to start uploading drafts.
      </p>
      <Link
        href="/settings"
        className={cn(
          buttonVariants({ size: "default" }),
          "mt-4 rounded-full px-5"
        )}
      >
        Open settings
      </Link>
    </div>
  );
}
