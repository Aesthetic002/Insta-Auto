"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Inbox,
  Loader2,
  Send,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "CREATOR" | "EDITOR";

interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Assignment {
  id: string;
  creator: UserSummary;
  editor: UserSummary;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  initiatedBy: "CREATOR" | "EDITOR";
  message: string | null;
  createdAt: string;
}

interface Props {
  myRole: Role;
  incoming: Assignment[];
  outgoing: Assignment[];
  active: Assignment[];
}

export function CollaboratorsCard({
  myRole,
  incoming,
  outgoing,
  active,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const otherRole = myRole === "CREATOR" ? "EDITOR" : "CREATOR";
  const otherLabel = otherRole.toLowerCase();

  const counterpartyOf = (a: Assignment) =>
    myRole === "CREATOR" ? a.editor : a.creator;

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch("/api/editor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.message ?? json.error ?? "Failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      const sent = email;
      setSuccess(`Invite sent to ${sent}`);
      toast.success(`Invite sent to ${sent}`);
      setEmail("");
      router.refresh();
    });
  };

  const respond = (id: string, action: "accept" | "decline") => {
    startTransition(async () => {
      await fetch(`/api/editor-invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      toast.success(action === "accept" ? "Connected" : "Declined");
      router.refresh();
    });
  };

  const remove = (id: string, label: string) => {
    if (!confirm(`Remove ${label}?`)) return;
    startTransition(async () => {
      await fetch(`/api/editor-invites/${id}`, { method: "DELETE" });
      toast.success(`${label} removed`);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <header className="mb-5">
        <h2 className="text-lg font-semibold">
          {myRole === "CREATOR" ? "Editors" : "Creators"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {myRole === "CREATOR"
            ? "Editors you invite can upload videos and edit captions in your workspace. They cannot schedule, approve, or publish."
            : "Creators you've connected with. You can prepare drafts in their workspace; they handle scheduling, approval, and publishing."}
        </p>
      </header>

      {/* Invite form */}
      <div className="mb-6 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <Label htmlFor="invite-email" className="text-xs uppercase tracking-wider">
          Invite a {otherLabel} by email
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="invite-email"
            type="email"
            placeholder={`${otherLabel}@example.com`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="flex-1 min-w-48"
          />
          <Button
            type="button"
            onClick={submit}
            disabled={!email.includes("@") || pending}
            size="default"
            className="rounded-full"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send invite
          </Button>
        </div>
        {error && (
          <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Inbox className="h-3 w-3" />
            Incoming requests ({incoming.length})
          </h3>
          <ul className="space-y-2">
            {incoming.map((a) => {
              const cp = counterpartyOf(a);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/30"
                >
                  <Avatar user={cp} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {cp.name ?? cp.email}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {cp.email} · wants to be your {otherLabel}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      onClick={() => respond(a.id, "accept")}
                      disabled={pending}
                      size="sm"
                      className="rounded-full"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      onClick={() => respond(a.id, "decline")}
                      disabled={pending}
                      size="sm"
                      variant="ghost"
                      className="text-zinc-500"
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Awaiting response ({outgoing.length})
          </h3>
          <ul className="space-y-1.5">
            {outgoing.map((a) => {
              const cp = counterpartyOf(a);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
                >
                  <Avatar user={cp} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {cp.name ?? cp.email}
                    </div>
                    <div className="truncate text-xs text-zinc-500">{cp.email}</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => remove(a.id, cp.email)}
                    disabled={pending}
                    size="sm"
                    variant="ghost"
                    className="text-zinc-500 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Active connections */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Connected ({active.length})
        </h3>
        {active.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed bg-zinc-50/50 p-6 text-center dark:bg-zinc-950/30",
              "border-zinc-300 dark:border-zinc-700"
            )}
          >
            <UserPlus className="mx-auto h-6 w-6 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-500">
              {myRole === "CREATOR"
                ? "No editors yet. Invite one above."
                : "Not connected to any creators yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {active.map((a) => {
              const cp = counterpartyOf(a);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
                >
                  <Avatar user={cp} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {cp.name ?? cp.email}
                    </div>
                    <div className="truncate text-xs text-zinc-500">{cp.email}</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => remove(a.id, cp.name ?? cp.email)}
                    disabled={pending}
                    size="sm"
                    variant="ghost"
                    className="text-zinc-500 hover:text-red-600"
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Avatar({ user }: { user: UserSummary }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.image}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full"
      />
    );
  }
  const initial = (user.name?.[0] ?? user.email[0] ?? "?").toUpperCase();
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-sm font-semibold text-white">
      {initial}
    </div>
  );
}
