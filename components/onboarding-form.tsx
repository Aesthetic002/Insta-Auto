"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  Pencil,
  Stethoscope,
  Scissors,
  Home,
  Dumbbell,
  Utensils,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "CREATOR" | "EDITOR";
type Profession = "DENTAL"; // mirror of Prisma enum; expand alongside lib/templates.ts

type Step = "role" | "profession";

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [profession, setProfession] = useState<Profession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const advanceToProfession = () => {
    if (!role) return;
    setError(null);
    setStep("profession");
  };

  const submit = () => {
    if (!role || !profession) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, profession }),
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

  if (step === "role") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RoleCard
            icon={<Camera className="h-5 w-5" />}
            title="I'm a creator"
            body="I run the business and post content. Full control: scheduling, captions, approvals."
            selected={role === "CREATOR"}
            onClick={() => setRole("CREATOR")}
          />
          <RoleCard
            icon={<Pencil className="h-5 w-5" />}
            title="I'm an editor"
            body="I prepare drafts for creators. I upload media and write captions; they handle the rest."
            selected={role === "EDITOR"}
            onClick={() => setRole("EDITOR")}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={advanceToProfession}
            disabled={!role}
            size="lg"
            className="rounded-full px-7 shadow-lg shadow-rose-500/20"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Profession step
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setStep("role")}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          What kind of business is it?
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ll surface templates tailored to your profession. Don&apos;t
          see yours? Pick the closest — we&apos;ll add more soon.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ProfessionCard
          icon={<Stethoscope className="h-5 w-5" />}
          title="Dental clinic"
          available
          selected={profession === "DENTAL"}
          onClick={() => setProfession("DENTAL")}
        />
        <ProfessionCard
          icon={<Scissors className="h-5 w-5" />}
          title="Beauty / Salon"
          available={false}
        />
        <ProfessionCard
          icon={<Home className="h-5 w-5" />}
          title="Real estate"
          available={false}
        />
        <ProfessionCard
          icon={<Dumbbell className="h-5 w-5" />}
          title="Fitness studio"
          available={false}
        />
        <ProfessionCard
          icon={<Utensils className="h-5 w-5" />}
          title="Restaurant"
          available={false}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={!profession || pending}
          size="lg"
          className="rounded-full px-7 shadow-lg shadow-rose-500/20"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up…
            </>
          ) : (
            "Finish"
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

function ProfessionCard({
  icon,
  title,
  available,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  available: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={available ? onClick : undefined}
      disabled={!available}
      className={cn(
        "relative rounded-2xl border p-4 text-left transition-all",
        available && "hover:-translate-y-0.5",
        !available && "cursor-not-allowed opacity-60",
        selected
          ? "border-fuchsia-400 bg-fuchsia-50 shadow-lg shadow-fuchsia-500/10 ring-2 ring-fuchsia-300/40 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:ring-fuchsia-800/40"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      )}
    >
      <div
        className={cn(
          "mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg",
          selected
            ? "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}
      >
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {!available && (
        <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Coming soon
        </div>
      )}
    </button>
  );
}
