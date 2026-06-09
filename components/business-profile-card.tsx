"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  initial: {
    clinicName: string | null;
    phone: string | null;
    services: string[];
  };
}

export function BusinessProfileCard({ initial }: Props) {
  const [clinicName, setClinicName] = useState(initial.clinicName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [services, setServices] = useState<string[]>(() => {
    const s = [...initial.services];
    while (s.length < 4) s.push("");
    return s.slice(0, 4);
  });
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const cleanServices = services
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          phone: phone.trim(),
          services: cleanServices,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save profile.");
        return;
      }
      toast.success("Business profile saved.");
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-fuchsia-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Business profile
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          These auto-fill your templates so you never re-type them.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="bp-clinic">Clinic name</Label>
          <Input
            id="bp-clinic"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="Bright Smile Dental"
            maxLength={40}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-phone">Phone</Label>
          <Input
            id="bp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555-123-4567"
            maxLength={20}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label>Main services</Label>
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

        <div className="flex justify-end">
          <Button onClick={save} disabled={pending} className="rounded-full px-6">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
