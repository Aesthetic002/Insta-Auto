"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  postId: string;
  status: string;
  scheduledAt: string | null;
  hasCaption: boolean;
}

export function PostScheduleCard({
  postId,
  status,
  scheduledAt,
  hasCaption,
}: Props) {
  const router = useRouter();
  const isScheduled = status === "SCHEDULED";
  const isPosted = status === "POSTED";
  const isPublishing = status === "PUBLISHING";

  const [value, setValue] = useState<string>(
    scheduledAt ? toLocalInput(new Date(scheduledAt)) : suggestNextSlot()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const iso = new Date(value).toISOString();
      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: iso }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed");
      toast.success(
        json.requiresApproval
          ? "Scheduled. Approval email on its way."
          : "Scheduled. We'll publish it on time."
      );
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm("Cancel this schedule? The post will return to draft.")) return;
    setBusy(true);
    try {
      await fetch(`/api/posts/${postId}/schedule`, { method: "DELETE" });
      toast.success("Schedule cancelled.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (isPosted) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-fuchsia-500" />
        <h3 className="text-sm font-semibold">Schedule</h3>
      </div>

      {isScheduled && scheduledAt && (
        <div className="mb-4 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30 dark:text-fuchsia-300">
          Scheduled for{" "}
          <strong>
            {new Date(scheduledAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </strong>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Publish at</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy || isPublishing}
            min={toLocalInput(new Date(Date.now() + 60_000))}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={submit}
            disabled={!hasCaption || busy || isPublishing}
            size="sm"
            className="rounded-full"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarClock className="h-3.5 w-3.5" />
            )}
            {isScheduled ? "Reschedule" : "Schedule post"}
          </Button>
          {isScheduled && (
            <Button
              type="button"
              onClick={cancel}
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-zinc-500 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
              Cancel schedule
            </Button>
          )}
        </div>

        {!hasCaption && (
          <p className="text-xs text-zinc-500">
            Generate or write a caption above before scheduling.
          </p>
        )}
      </div>
    </div>
  );
}

// "YYYY-MM-DDTHH:mm" in user's local timezone, suitable for <input type="datetime-local">
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Default to next round hour, +1h
function suggestNextSlot(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalInput(d);
}
