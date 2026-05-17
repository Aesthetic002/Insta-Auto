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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Platform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "PINTEREST";

const PLATFORM_META: Record<Platform, { label: string; color: string; connectHref: string }> = {
  INSTAGRAM: {
    label: "Instagram",
    color: "from-fuchsia-500 to-rose-500",
    connectHref: "/api/instagram/connect",
  },
  FACEBOOK: {
    label: "Facebook",
    color: "from-blue-600 to-blue-700",
    connectHref: "/api/facebook/connect",
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "from-sky-600 to-sky-700",
    connectHref: "/api/linkedin/connect",
  },
  PINTEREST: {
    label: "Pinterest",
    color: "from-red-600 to-red-700",
    connectHref: "/api/pinterest/connect",
  },
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  INSTAGRAM: <Camera className="h-4 w-4" />,
  FACEBOOK: <span className="text-sm font-bold">f</span>,
  LINKEDIN: <span className="text-xs font-bold">in</span>,
  PINTEREST: <span className="text-sm font-bold">P</span>,
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_code_or_state: "Meta did not return an authorization code. Please try again.",
  state_mismatch: "Security check failed. Please retry the connection.",
  no_ig_accounts:
    "No Instagram Business accounts found. Convert your IG to a Business account and link it to a Facebook Page first.",
  exchange_failed: "Meta rejected the token exchange. Check your META_APP_ID / META_APP_SECRET.",
  facebook_no_pages: "No Facebook Pages found. Make sure you manage at least one Page.",
  linkedin_exchange_failed: "LinkedIn authentication failed. Check LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET.",
  pinterest_exchange_failed: "Pinterest authentication failed. Check PINTEREST_APP_ID / PINTEREST_APP_SECRET.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    connected_platform?: string;
    disconnected?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const params = await searchParams;

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) return null;

  const isCreator = me.role === "CREATOR";

  const [socialAccounts, prefs, invites] = await Promise.all([
    isCreator
      ? db.socialAccount.findMany({
          where: { userId },
          orderBy: { connectedAt: "asc" },
        })
      : Promise.resolve([]),
    isCreator
      ? db.preferences.upsert({ where: { userId }, create: { userId }, update: {} })
      : Promise.resolve(null),
    loadInvites(userId, me.role!),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isCreator
            ? "Manage connected accounts, posting preferences, and editors."
            : "Manage your creator connections."}
        </p>
      </div>

      {/* Banners */}
      {params.connected && (
        <Banner kind="success">
          <CheckCircle2 className="h-4 w-4" />
          Connected {params.connected} Instagram account{Number(params.connected) === 1 ? "" : "s"}.
        </Banner>
      )}
      {params.connected_platform && (
        <Banner kind="success">
          <CheckCircle2 className="h-4 w-4" />
          {params.connected_platform} account connected successfully.
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
          {ERROR_MESSAGES[params.error] ?? `Connection failed: ${params.error.replace(/_/g, " ")}`}
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
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
            <header className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Connected accounts</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Anvaya publishes across platforms via their official APIs. Connect one or more accounts below.
              </p>
            </header>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(Object.keys(PLATFORM_META) as Platform[]).map((platform) => {
                const meta = PLATFORM_META[platform];
                const accounts = socialAccounts.filter((a) => a.platform === platform);
                const active = accounts.filter((a) => !a.disconnectedAt);

                return (
                  <div key={platform} className="px-6 py-5">
                    {/* Platform header row */}
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", meta.color)}>
                          {PLATFORM_ICONS[platform]}
                        </div>
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{meta.label}</span>
                        {active.length > 0 && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 text-[11px]">
                            {active.length} connected
                          </Badge>
                        )}
                      </div>
                      <Link
                        href={meta.connectHref}
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full px-4 text-xs gap-1")}
                      >
                        + Connect
                      </Link>
                    </div>

                    {accounts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/40">
                        No {meta.label} accounts connected yet.
                      </div>
                    ) : (
                      <ul className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
                        {accounts.map((acc) => {
                          const hasHandle =
                            acc.username &&
                            !acc.username.startsWith("board:") &&
                            platform !== "LINKEDIN";
                          const label = hasHandle
                            ? `@${acc.username}`
                            : acc.displayName && !acc.displayName.startsWith("board:")
                            ? acc.displayName
                            : `${meta.label} account`;

                          return (
                            <li
                              key={acc.id}
                              className="flex items-center justify-between gap-4 bg-white px-4 py-3 dark:bg-zinc-900"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-white ring-2 ring-white dark:ring-zinc-900", meta.color)}>
                                  {acc.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={acc.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    PLATFORM_ICONS[platform]
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
                                  <div className="text-xs text-zinc-500">
                                    {acc.disconnectedAt ? (
                                      <span className="text-amber-600 dark:text-amber-400">Disconnected</span>
                                    ) : (
                                      <>
                                        Connected {new Date(acc.connectedAt).toLocaleDateString()}
                                        {acc.tokenExpiresAt &&
                                          ` · expires ${new Date(acc.tokenExpiresAt).toLocaleDateString()}`}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!acc.disconnectedAt && (
                                <form action="/api/social/disconnect" method="POST">
                                  <input type="hidden" name="id" value={acc.id} />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                  >
                                    Disconnect
                                  </Button>
                                </form>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Docs link */}
            <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <a
                href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Read the Meta Graph API docs
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
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

function Banner({
  kind,
  children,
}: {
  kind: "success" | "info" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300",
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
  } as const;
  return (
    <div className={cn("mb-6 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", styles[kind])}>
      {children}
    </div>
  );
}
