"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "CREATOR" | "EDITOR";

export function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!role) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message ?? "Could not save. Try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RoleCard
          icon={<Camera className="h-5 w-5" />}
          title="I'm a creator"
          body="I'll connect my Instagram and post reels. I want full control: scheduling, captions, approvals."
          selected={role === "CREATOR"}
          onClick={() => setRole("CREATOR")}
        />
        <RoleCard
          icon={<Pencil className="h-5 w-5" />}
          title="I'm an editor"
          body="I prepare drafts for creators. I'll upload videos and write captions, and they handle the rest."
          selected={role === "EDITOR"}
          onClick={() => setRole("EDITOR")}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={!role || pending}
          size="lg"
          className="rounded-full px-7 shadow-lg shadow-rose-500/20"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  body,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5",
        selected
          ? "border-fuchsia-400 bg-fuchsia-50 shadow-lg shadow-fuchsia-500/10 ring-2 ring-fuchsia-300/40 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:ring-fuchsia-800/40"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      )}
    >
      <div
        className={cn(
          "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg",
          selected
            ? "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </button>
  );
}
