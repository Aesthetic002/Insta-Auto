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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/components/logo-uploader";
import { cn } from "@/lib/utils";

type Role = "CREATOR" | "EDITOR";
type Profession = "DENTAL"; // mirror of Prisma enum; expand alongside lib/templates.ts

type Step = "role" | "profession" | "profile";

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [profession, setProfession] = useState<Profession | null>(null);

  // Business profile (creators only)
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>(["", "", "", ""]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const advanceToProfession = () => {
    if (!role) return;
    setError(null);
    setStep("profession");
  };

  // After profession: creators go to the profile step, editors finish now.
  const advanceFromProfession = () => {
    if (!profession) return;
    setError(null);
    if (role === "CREATOR") {
      setStep("profile");
    } else {
      finish();
    }
  };

  const finish = (opts?: { skipProfile?: boolean }) => {
    if (!role || !profession) return;
    setError(null);
    startTransition(async () => {
      // 1. Save role + profession (marks user onboarded).
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

      // 2. For creators, save the business profile (unless they skipped).
      if (role === "CREATOR" && !opts?.skipProfile) {
        const cleanServices = services
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicName: clinicName.trim(),
            phone: phone.trim(),
            services: cleanServices,
            logoUrl,
          }),
        }).catch(() => {
          // Non-fatal: profile can be filled later in settings.
        });
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
  if (step === "profession")
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
          onClick={advanceFromProfession}
          disabled={!profession || pending}
          size="lg"
          className="rounded-full px-7 shadow-lg shadow-rose-500/20"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up…
            </>
          ) : role === "CREATOR" ? (
            "Continue"
          ) : (
            "Finish"
          )}
        </Button>
      </div>
    </div>
  );

  // Profile step (creators only)
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setStep("profession")}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Tell us about your clinic
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ll use this to auto-fill your templates so you never type it
          twice. You can change it anytime in Settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ob-clinic">Clinic name</Label>
          <Input
            id="ob-clinic"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="Bright Smile Dental"
            maxLength={40}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-phone">Phone</Label>
          <Input
            id="ob-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555-123-4567"
            maxLength={20}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label>Your main services</Label>
          <p className="text-xs text-zinc-500">
            Up to four. These pre-fill into service-list templates.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s, i) => (
              <Input
                key={i}
                value={s}
                onChange={(e) =>
                  setServices((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                placeholder={
                  ["Teeth Whitening", "Braces & Aligners", "Dental Implants", "Regular Checkups"][i]
                }
                maxLength={30}
                disabled={pending}
              />
            ))}
          </div>
        </div>

        <LogoUploader value={logoUrl} onChange={setLogoUrl} disabled={pending} />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => finish({ skipProfile: true })}
          disabled={pending}
          className="text-zinc-500"
        >
          Skip for now
        </Button>
        <Button
          onClick={() => finish()}
          disabled={pending}
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
