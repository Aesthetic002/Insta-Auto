"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Mail,
  Sparkles,
  UploadCloud,
  Wand2,
  Zap,
} from "lucide-react";

import { signInWithGoogle } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Fade-up animation wrapper
// ------------------------------------------------------------------
function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Main page — client component so we can read session via hook
// For session-gated CTAs we use a simple fetch
// ------------------------------------------------------------------
export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setAuthed(!!s?.user))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {/* ── Background blobs ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-52 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-radial from-fuchsia-400/20 via-rose-300/10 to-transparent blur-3xl dark:from-fuchsia-600/15 dark:via-rose-500/8" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-700/15" />
        <div className="absolute -left-40 bottom-1/3 h-[400px] w-[400px] rounded-full bg-rose-300/20 blur-3xl dark:bg-rose-700/15" />
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-md shadow-rose-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-playfair text-xl font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
              Promote
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {authed === null ? (
              <div className="h-9 w-28 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            ) : authed ? (
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "sm" }), "rounded-full px-5")}
              >
                Dashboard <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            ) : (
              <GoogleSignInButton size="sm" label="Sign in" />
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-200/80 bg-fuchsia-50 px-4 py-1.5 text-xs font-medium text-fuchsia-700 dark:border-fuchsia-800/60 dark:bg-fuchsia-950/60 dark:text-fuchsia-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
          </span>
          Done-for-you marketing for professionals — starting with dental
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl md:text-7xl dark:text-zinc-50"
        >
          Marketing on{" "}
          <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-400 bg-clip-text text-transparent">
            autopilot
          </span>
          .
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-500 dark:text-zinc-400"
        >
          Pick a template built for your profession. Drop in your photos.
          Promote renders a polished ad and schedules it across every platform —
          no designer, no agency, no fuss.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {authed ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full px-8 shadow-xl shadow-rose-500/20"
              )}
            >
              Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <GoogleSignInButton size="lg" label="Get started free" />
          )}
          <a
            href="#how-it-works"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full px-7"
            )}
          >
            See how it works
          </a>
        </motion.div>

        {/* Platform badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3"
        >
          {PLATFORMS.map((p) => (
            <span
              key={p.label}
              className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-white", p.color)}>
                {p.icon}
              </span>
              {p.label}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── Feature cards ── */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 pb-24">
        <FadeUp className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Everything you need, nothing you don't
          </h2>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            The end-to-end posting workflow, without the n8n duct tape.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.07}>
              <FeatureCard {...f} />
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── How it works steps ── */}
      <section className="border-y border-zinc-200/60 bg-zinc-50/60 py-24 dark:border-zinc-800/60 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-6">
          <FadeUp className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Three steps to autopilot
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <FadeUp key={s.title} delay={i * 0.1}>
                <Step {...s} n={i + 1} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <FadeUp>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-500 p-px shadow-2xl shadow-rose-500/30">
            <div className="relative rounded-3xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-500 px-8 py-16 text-center text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.15),_transparent_60%)]" />
              <Zap className="mx-auto mb-4 h-8 w-8 opacity-90" />
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to stop posting manually?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">
                Join professionals who use Promote to design, approve, and publish ads across every platform — automatically.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {authed ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-rose-600 shadow-lg transition hover:bg-zinc-50"
                  >
                    Open dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <GoogleSignInButton size="lg" label="Start for free" light />
                )}
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200/60 py-10 dark:border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-playfair text-sm font-semibold text-zinc-700 dark:text-zinc-300">Promote</span>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Promote. Not affiliated with Meta, LinkedIn, or Pinterest.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Privacy</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------
const PLATFORMS = [
  {
    label: "Instagram",
    color: "from-fuchsia-500 to-rose-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    color: "from-blue-600 to-blue-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    color: "from-sky-600 to-sky-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    color: "from-red-600 to-red-500",
    icon: <PinterestIcon className="h-3 w-3" />,
  },
];

const features = [
  {
    icon: <UploadCloud className="h-5 w-5" />,
    title: "Upload once",
    body: "Drop in your photos or clips. Promote handles the rest — design, resize, format, and queue across all platforms.",
    gradient: "from-fuchsia-500/15 to-rose-500/15",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    ring: "ring-fuchsia-500/20",
  },
  {
    icon: <Wand2 className="h-5 w-5" />,
    title: "AI captions",
    body: "Gemini writes platform-native captions with hashtags in your tone. Edit before publish.",
    gradient: "from-violet-500/15 to-fuchsia-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Approve by email",
    body: "Get a thumbnail in your inbox. One-click Approve, Reject, or edit the caption.",
    gradient: "from-rose-500/15 to-orange-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Smart scheduling",
    body: "Drag posts onto exact times on the calendar. Auto-publish fires on schedule.",
    gradient: "from-orange-500/15 to-amber-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/20",
  },
];

const steps = [
  {
    title: "Connect your accounts",
    body: "Sign in with Google, then connect Instagram, Facebook, LinkedIn, or Pinterest through their official OAuth flows.",
  },
  {
    title: "Plan & let AI caption",
    body: "Schedule posts on a calendar. Gemini drafts captions tailored per-platform in seconds.",
  },
  {
    title: "Approve & ship",
    body: "Approve from your inbox or the dashboard. Promote publishes through each platform's API — on time, every time.",
  },
];

function FeatureCard({
  icon,
  title,
  body,
  gradient,
  iconColor,
  ring,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  gradient: string;
  iconColor: string;
  ring: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100", gradient)} />
      <div className="relative">
        <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 ring-1 transition-colors group-hover:bg-white dark:bg-zinc-800", ring, iconColor)}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-sm font-semibold text-white shadow-md shadow-rose-500/30">
          {n}
        </div>
        {n < 3 && <div className="w-px flex-1 bg-gradient-to-b from-rose-300 to-transparent dark:from-rose-800" />}
      </div>
      <div className="pb-10">
        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function GoogleSignInButton({
  size,
  label,
  light,
}: {
  size: "sm" | "lg";
  label: string;
  light?: boolean;
}) {
  return (
    <form action={signInWithGoogle}>
      <Button
        type="submit"
        size={size}
        className={cn(
          "rounded-full gap-2 shadow-lg shadow-rose-500/20",
          light && "bg-white text-rose-600 hover:bg-zinc-50 shadow-none",
          size === "lg" && "px-8"
        )}
      >
        <GoogleGlyph className="h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.84h5.34c-.23 1.27-1.65 3.71-5.34 3.71-3.21 0-5.83-2.66-5.83-5.94S8.79 5.87 12 5.87c1.83 0 3.05.78 3.75 1.46l2.55-2.46C16.71 3.5 14.55 2.6 12 2.6 6.91 2.6 2.8 6.71 2.8 11.81S6.91 21 12 21c6.93 0 9.18-4.86 9.18-7.41 0-.5-.05-.88-.12-1.26L12 10.2z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}
