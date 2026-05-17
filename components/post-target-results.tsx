import { ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalTime } from "@/components/local-time";

type TargetStatus = "PENDING" | "PUBLISHING" | "POSTED" | "FAILED";

interface Target {
  id: string;
  status: TargetStatus;
  platformPostId: string | null;
  platformUrl: string | null;
  errorMessage: string | null;
  postedAt: Date | string | null;
  socialAccount: {
    platform: string;
    username: string | null;
    displayName: string | null;
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
};

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
  PINTEREST: "📌",
};

export function PostTargetResults({ targets }: { targets: Target[] }) {
  if (targets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-semibold">Publishing results</h3>
      <div className="space-y-3">
        {targets.map((t) => {
          const acc = t.socialAccount;
          const platform = PLATFORM_LABELS[acc.platform] ?? acc.platform;
          const label =
            acc.username && !acc.username.startsWith("board:")
              ? `@${acc.username}`
              : acc.displayName && !acc.displayName.startsWith("board:")
              ? acc.displayName
              : platform;
          const icon = PLATFORM_ICONS[acc.platform] ?? "🌐";
          const postedAt = t.postedAt ? new Date(t.postedAt) : null;

          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                t.status === "POSTED"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : t.status === "FAILED"
                  ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40"
              )}
            >
              <span className="mt-0.5 text-base">{icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-zinc-400">{platform}</span>
                </div>
                {postedAt && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Posted <LocalTime date={new Date(postedAt).toISOString()} dateStyle="medium" timeStyle="short" />
                  </p>
                )}
                {t.errorMessage && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {t.errorMessage}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t.status === "POSTED" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {t.status === "FAILED" && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                {(t.status === "PENDING" || t.status === "PUBLISHING") && (
                  <Clock className="h-4 w-4 text-zinc-400" />
                )}
                {t.platformUrl && (
                  <a
                    href={t.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    View post
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
