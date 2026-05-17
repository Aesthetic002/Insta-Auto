"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Platform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "PINTEREST";

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
};

const PLATFORM_COLORS: Record<Platform, string> = {
  INSTAGRAM: "from-fuchsia-500 to-rose-500",
  FACEBOOK: "from-blue-600 to-blue-700",
  LINKEDIN: "from-[#0A66C2] to-[#004182]",
  PINTEREST: "from-red-600 to-red-700",
};

const PLATFORM_ICONS: Record<Platform, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
  PINTEREST: "📌",
};

interface Props {
  postId: string;
  accounts: SocialAccountOption[];
  selectedAccountId: string | null;
  onSelect: (account: SocialAccountOption) => void;
}

export function SocialAccountPicker({
  postId,
  accounts,
  selectedAccountId,
  onSelect,
}: Props) {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (account: SocialAccountOption) => {
    if (account.id === selectedAccountId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialAccountId: account.id, platform: account.platform }),
      });
      if (!res.ok) throw new Error("Failed to update");
      onSelect(account);
      toast.success(`Publishing to ${PLATFORM_LABELS[account.platform]}`);
    } catch {
      toast.error("Could not update target account");
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
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Publish to
        </p>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          const label =
            acc.username
              ? `@${acc.username}`
              : acc.displayName ?? PLATFORM_LABELS[acc.platform];

          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleSelect(acc)}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? "border-transparent bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[10px]",
                PLATFORM_COLORS[acc.platform]
              )}>
                {PLATFORM_ICONS[acc.platform]}
              </span>
              {label}
              {isSelected && <CheckCircle2 className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
