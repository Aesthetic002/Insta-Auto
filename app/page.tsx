import Link from "next/link";
import {
  Calendar,
  CheckCheck,
  Mail,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";

import { auth } from "@/auth";
import { signInWithGoogle } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative isolate flex min-h-screen flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(244,114,182,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(244,114,182,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute -right-32 top-40 -z-10 h-[400px] w-[400px] rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-700/20" />
      <div className="pointer-events-none absolute -left-32 top-80 -z-10 h-[400px] w-[400px] rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-700/20" />

      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>Reels Bot</span>
        </Link>

        <nav className="flex items-center gap-2">
          {session?.user ? (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "default" }), "rounded-full px-4")}
            >
              Open dashboard
            </Link>
          ) : (
            <form action={signInWithGoogle}>
              <Button type="submit" variant="ghost" className="rounded-full">
                Sign in
              </Button>
            </form>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-20">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white/70 px-3 py-1 text-xs font-medium text-fuchsia-700 backdrop-blur dark:border-fuchsia-900/60 dark:bg-zinc-900/60 dark:text-fuchsia-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
          </span>
          New — AI captions + email approvals
        </span>

        <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl md:text-7xl dark:text-zinc-50">
          Instagram Reels,{" "}
          <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
            on autopilot
          </span>
          .
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Drop in a video, let AI write the caption, approve from your inbox, and we&apos;ll post
          it for you on schedule. The end-to-end posting workflow you&apos;ve been hand-rolling — without the n8n duct tape.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full px-7 shadow-lg shadow-rose-500/20"
              )}
            >
              Go to dashboard
            </Link>
          ) : (
            <form action={signInWithGoogle}>
              <Button
                type="submit"
                size="lg"
                className="rounded-full px-7 shadow-lg shadow-rose-500/20"
              >
                <GoogleGlyph className="h-4 w-4" />
                Continue with Google
              </Button>
            </form>
          )}

          <a
            href="#how-it-works"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full px-6"
            )}
          >
            How it works
          </a>
        </div>

        {/* Feature cards */}
        <div
          id="how-it-works"
          className="mt-24 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <FeatureCard
            icon={<UploadCloud className="h-5 w-5" />}
            title="Drop in videos"
            body="Upload reels directly or sync a Google Sheet — your existing flow keeps working."
          />
          <FeatureCard
            icon={<Wand2 className="h-5 w-5" />}
            title="AI captions"
            body="Gemini writes captions in your tone with the right hashtags. Edit before publish."
          />
          <FeatureCard
            icon={<Mail className="h-5 w-5" />}
            title="Approve by email"
            body="Get a thumbnail in your inbox. Approve, reject, or tweak the caption with one click."
          />
          <FeatureCard
            icon={<Calendar className="h-5 w-5" />}
            title="Per-post calendar"
            body="Drag posts onto exact times. Vercel cron picks them up and publishes through Meta."
          />
        </div>

        {/* How it works strip */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <Step n={1} title="Connect" body="Sign in with Google, then connect your Instagram Business account through Meta." />
          <Step n={2} title="Plan" body="Schedule reels on a calendar. AI drafts captions you can polish in seconds." />
          <Step n={3} title="Approve & ship" body="Approve from email or the dashboard. We publish through the IG Graph API." />
        </div>

        <p className="mt-16 inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
          <CheckCheck className="h-4 w-4 text-emerald-500" />
          Built on the same Meta Graph workflow you&apos;ve been running in n8n.
        </p>
      </section>

      <footer className="border-t border-zinc-200/60 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-500">
        © {new Date().getFullYear()} Reels Bot. Not affiliated with Meta or Instagram.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-6 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-fuchsia-900/60">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-rose-500/10 text-fuchsia-600 ring-1 ring-fuchsia-500/20 dark:text-fuchsia-300">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/50 p-5 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
        {n}
      </div>
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.84h5.34c-.23 1.27-1.65 3.71-5.34 3.71-3.21 0-5.83-2.66-5.83-5.94S8.79 5.87 12 5.87c1.83 0 3.05.78 3.75 1.46l2.55-2.46C16.71 3.5 14.55 2.6 12 2.6 6.91 2.6 2.8 6.71 2.8 11.81S6.91 21 12 21c6.93 0 9.18-4.86 9.18-7.41 0-.5-.05-.88-.12-1.26L12 10.2z"
      />
    </svg>
  );
}
