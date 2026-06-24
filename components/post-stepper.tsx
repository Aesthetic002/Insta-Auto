"use client";

// Visual progress stepper for the "publish a post" journey. Driven entirely by
// derived state (does it have media / caption / accounts / a terminal status),
// so it always reflects reality without its own state machine.
//
// Stages: Media → Caption → Accounts → Publish → Live
// Shows which steps are done, the current step, what's next, and an overall %.

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "upcoming";

export interface Step {
  key: string;
  label: string;
  hint?: string; // short "what to do" shown when this is the current step
}

interface Props {
  steps: Array<Step & { state: StepState }>;
  // When a step is actively running (uploading, publishing), pass its key to
  // show a spinner + an optional sub-progress percent.
  busyKey?: string | null;
  busyPercent?: number | null;
}

export function PostStepper({ steps, busyKey, busyPercent }: Props) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const overall = Math.round((doneCount / steps.length) * 100);
  const current = steps.find((s) => s.state === "current");
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const next = currentIdx >= 0 ? steps[currentIdx + 1] : undefined;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Overall bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium text-zinc-500">{overall}%</span>
      </div>

      {/* Step row */}
      <ol className="flex items-start justify-between gap-1">
        {steps.map((step, i) => {
          const isBusy = busyKey === step.key;
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {/* left connector */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0 ? "opacity-0" : steps[i - 1].state === "done" ? "bg-fuchsia-400" : "bg-zinc-200 dark:bg-zinc-700"
                  )}
                />
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    step.state === "done" && "border-fuchsia-500 bg-fuchsia-500 text-white",
                    step.state === "current" && "border-fuchsia-500 bg-white text-fuchsia-600 dark:bg-zinc-900",
                    step.state === "upcoming" && "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                  )}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : step.state === "done" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                {/* right connector */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === steps.length - 1 ? "opacity-0" : step.state === "done" ? "bg-fuchsia-400" : "bg-zinc-200 dark:bg-zinc-700"
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 text-[11px] font-medium",
                  step.state === "upcoming" ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-200"
                )}
              >
                {step.label}
              </span>
              {isBusy && typeof busyPercent === "number" && (
                <span className="text-[10px] text-fuchsia-500">{Math.round(busyPercent)}%</span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Current + next guidance */}
      {current && (
        <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-800/50">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            Now: {current.label}
            {current.hint && <span className="font-normal text-zinc-500"> — {current.hint}</span>}
          </div>
          {next && (
            <div className="mt-0.5 text-xs text-zinc-500">Next: {next.label}</div>
          )}
        </div>
      )}
      {!current && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          All done — your post is live. 🎉
        </div>
      )}
    </div>
  );
}
