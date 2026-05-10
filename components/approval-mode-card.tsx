"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Mode = "AUTO" | "EMAIL" | "MANUAL";

const MODES: Array<{ value: Mode; title: string; description: string }> = [
  {
    value: "AUTO",
    title: "Auto-publish",
    description: "Schedule and forget. We post on time without asking.",
  },
  {
    value: "EMAIL",
    title: "Email approval",
    description:
      "Get a thumbnail + caption in your inbox. One-click Approve / Reject / Edit.",
  },
  {
    value: "MANUAL",
    title: "Dashboard only",
    description:
      "Posts wait in a 'Pending' queue here. No emails — you check the dashboard.",
  },
];

export function ApprovalModeCard({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (next: Mode) => {
    setMode(next);
    startTransition(async () => {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalMode: next }),
      });
      setSavedAt(Date.now());
      toast.success(`Approval mode set to ${next.toLowerCase()}.`);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Approval mode</h2>
          <p className="mt-1 text-sm text-zinc-500">
            What happens when you schedule a post.
          </p>
        </div>
        {pending ? (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving
          </span>
        ) : savedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Saved
          </span>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => update(m.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-fuchsia-400 bg-fuchsia-50 ring-2 ring-fuchsia-300/40 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:ring-fuchsia-800/40"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{m.title}</span>
                {active && (
                  <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    Selected
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
