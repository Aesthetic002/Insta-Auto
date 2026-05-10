import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ApprovalModeCard } from "@/components/approval-mode-card";
import { CollaboratorsCard } from "@/components/collaborators-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code_or_state:
    "Meta did not return an authorization code. Please try again.",
  state_mismatch: "Security check failed. Please retry the connection.",
  no_ig_accounts:
    "We couldn't find any Instagram Business accounts linked to a Page you manage. Convert your IG account to a Business account and link it to a Facebook Page first.",
  exchange_failed:
    "Meta rejected the token exchange. Check your META_APP_ID / META_APP_SECRET and that the redirect URI is whitelisted.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const params = await searchParams;

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) return null;

  const isCreator = me.role === "CREATOR";

  const [igAccounts, prefs, invites] = await Promise.all([
    isCreator
      ? db.igAccount.findMany({
          where: { userId },
          orderBy: { connectedAt: "desc" },
        })
      : Promise.resolve([]),
    isCreator
      ? db.preferences.upsert({
          where: { userId },
          create: { userId },
          update: {},
        })
      : Promise.resolve(null),
    loadInvites(userId, me.role!),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {isCreator
            ? "Manage connected accounts, posting preferences, and editors."
            : "Manage your creator connections."}
        </p>
      </div>

      {params.connected && (
        <Banner kind="success">
          <CheckCircle2 className="h-4 w-4" />
          Connected {params.connected} Instagram account
          {Number(params.connected) === 1 ? "" : "s"}.
        </Banner>
      )}
      {params.disconnected && (
        <Banner kind="info">
          <CheckCircle2 className="h-4 w-4" />
          Account disconnected.
        </Banner>
      )}
      {params.error && (
        <Banner kind="error">
          <AlertTriangle className="h-4 w-4" />
          {ERROR_MESSAGES[params.error] ??
            `Connection failed: ${params.error.replace(/_/g, " ")}`}
        </Banner>
      )}

      <div className="space-y-6">
        <CollaboratorsCard
          myRole={me.role!}
          incoming={serialize(invites.incoming)}
          outgoing={serialize(invites.outgoing)}
          active={serialize(invites.active)}
        />

        {isCreator && prefs && <ApprovalModeCard initialMode={prefs.approvalMode} />}

        {isCreator && (
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Instagram accounts</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Reels Bot publishes through the Meta Graph API. You need an
                  Instagram Business account linked to a Facebook Page you manage.
                </p>
              </div>
              <Link
                href="/api/instagram/connect"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "rounded-full px-5"
                )}
              >
                <Camera className="h-4 w-4" />
                Connect Instagram
              </Link>
            </header>

            {igAccounts.length === 0 ? (
              <EmptyIgState />
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {igAccounts.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {acc.username
                            ? `@${acc.username}`
                            : `IG ${acc.igBusinessId}`}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {acc.disconnectedAt ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              Disconnected
                            </span>
                          ) : (
                            <>
                              Connected{" "}
                              {new Date(acc.connectedAt).toLocaleDateString()}
                              {acc.tokenExpiresAt &&
                                ` · token valid until ${new Date(
                                  acc.tokenExpiresAt
                                ).toLocaleDateString()}`}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {!acc.disconnectedAt && (
                      <form action="/api/instagram/disconnect" method="POST">
                        <input type="hidden" name="id" value={acc.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 hover:text-red-600"
                        >
                          Disconnect
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-xs text-zinc-500">
              <a
                href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                Read the Meta Instagram Graph API docs
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

async function loadInvites(userId: string, role: "CREATOR" | "EDITOR") {
  const [incoming, outgoing, active] = await Promise.all([
    db.editorAssignment.findMany({
      where: {
        status: "PENDING",
        ...(role === "CREATOR"
          ? { creatorId: userId, initiatedBy: "EDITOR" }
          : { editorId: userId, initiatedBy: "CREATOR" }),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        editor: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.editorAssignment.findMany({
      where: {
        status: "PENDING",
        ...(role === "CREATOR"
          ? { creatorId: userId, initiatedBy: "CREATOR" }
          : { editorId: userId, initiatedBy: "EDITOR" }),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        editor: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.editorAssignment.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ creatorId: userId }, { editorId: userId }],
      },
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        editor: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { respondedAt: "desc" },
    }),
  ]);
  return { incoming, outgoing, active };
}

interface RawAssignment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  initiatedBy: "CREATOR" | "EDITOR";
  message: string | null;
  createdAt: Date;
  creator: { id: string; name: string | null; email: string; image: string | null };
  editor: { id: string; name: string | null; email: string; image: string | null };
}

function serialize(items: RawAssignment[]) {
  return items.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
}

function EmptyIgState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
      <Camera className="mx-auto h-8 w-8 text-zinc-400" />
      <p className="mt-3 text-sm font-medium">No accounts connected yet</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
        Click <strong>Connect Instagram</strong> above and Meta will walk you
        through granting access to your Page and IG Business account.
      </p>
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "info" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300",
    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
  } as const;
  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        styles[kind]
      )}
    >
      {children}
    </div>
  );
}
