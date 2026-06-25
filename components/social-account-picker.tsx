"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Platform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "PINTEREST" | "YOUTUBE";

export interface SocialAccountOption {
  id: string;
  platform: Platform;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  PINTEREST: "Pinterest",
  YOUTUBE: "YouTube",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  INSTAGRAM: "from-fuchsia-500 to-rose-500",
  FACEBOOK: "from-blue-600 to-blue-700",
  LINKEDIN: "from-[#0A66C2] to-[#004182]",
  PINTEREST: "from-red-600 to-red-700",
  YOUTUBE: "from-red-500 to-red-600",
};

const PLATFORM_ICONS: Record<Platform, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
  PINTEREST: "📌",
  YOUTUBE: "▶️",
};

// Platforms that only accept video (no photo/carousel).
const VIDEO_ONLY: Platform[] = ["YOUTUBE"];

interface Props {
  postId: string;
  accounts: SocialAccountOption[];
  selectedAccountIds: string[];
  onSelect: (accounts: SocialAccountOption[]) => void;
  // When the post isn't a video, video-only platforms (YouTube) are hidden.
  mediaType?: "VIDEO" | "PHOTO" | "CAROUSEL";
}

export function SocialAccountPicker({ postId, accounts: allAccounts, selectedAccountIds, onSelect, mediaType }: Props) {
  // Hide video-only platforms for non-video posts.
  const accounts =
    mediaType && mediaType !== "VIDEO"
      ? allAccounts.filter((a) => !VIDEO_ONLY.includes(a.platform))
      : allAccounts;
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedAccountIds));

  const toggle = async (account: SocialAccountOption) => {
    const next = new Set(selected);
    if (next.has(account.id)) {
      next.delete(account.id);
    } else {
      next.add(account.id);
    }
    setSelected(next);

    setSaving(true);
    try {
      const accountIds = Array.from(next);
      const res = await fetch(`/api/posts/${postId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? errJson.message ?? `Server error ${res.status}`);
      }
      const selectedAccounts = accounts.filter((a) => next.has(a.id));
      onSelect(selectedAccounts);
      if (next.size === 0) {
        toast.info("No accounts selected.");
      } else if (next.size === 1) {
        const acc = selectedAccounts[0];
        const label = acc.username ? `@${acc.username}` : acc.displayName ?? PLATFORM_LABELS[acc.platform];
        toast.success(`Publishing to ${label}`);
      } else {
        toast.success(`Publishing to ${next.size} accounts`);
      }
    } catch (err) {
      // Revert on error
      setSelected(selected);
      const msg = err instanceof Error ? err.message : "Could not update target accounts";
      toast.error(msg);
      console.error("[account-picker] targets update failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No social accounts connected yet. Go to{" "}
        <a href="/settings" className="underline underline-offset-2">
          Settings
        </a>{" "}
        to connect.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Publish to</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Select one or more accounts</p>
        </div>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((acc) => {
          const isSelected = selected.has(acc.id);
          const label =
            acc.username && !acc.username.startsWith("board:")
              ? `@${acc.username}`
              : acc.displayName && !acc.displayName.startsWith("board:")
              ? acc.displayName
              : PLATFORM_LABELS[acc.platform];

          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => toggle(acc)}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? "border-transparent bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[10px]",
                  PLATFORM_COLORS[acc.platform]
                )}
              >
                {PLATFORM_ICONS[acc.platform]}
              </span>
              {label}
              {isSelected && <CheckCircle2 className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
      {selected.size > 1 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          This post will be published to {selected.size} accounts simultaneously.
        </p>
      )}
    </div>
  );
}
