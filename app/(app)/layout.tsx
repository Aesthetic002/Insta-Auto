import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Calendar,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { signOutAction } from "@/app/actions/auth";
import { listAccessibleCreators } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { CreatorPicker } from "@/components/creator-picker";
import { MobileNav } from "@/components/mobile-nav";
import { WorkspaceBanner } from "@/components/workspace-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) redirect("/");
  if (!me.onboarded) redirect("/onboarding");

  let activeCreator: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null = null;
  let availableCreators: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }> = [];

  if (me.role === "EDITOR") {
    const creatorIds = await listAccessibleCreators(userId);
    if (creatorIds.length > 0) {
      const creators = await db.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, email: true, image: true },
        orderBy: { createdAt: "asc" },
      });
      availableCreators = creators;

      const cookieStore = await cookies();
      const preferred = cookieStore.get("active_creator")?.value;
      activeCreator =
        creators.find((c) => c.id === preferred) ?? creators[0];
    }
  }

  const sidebarContent = (
    <>
      <Link
        href="/dashboard"
        className="mb-6 hidden items-center gap-2 px-2 font-semibold tracking-tight md:flex"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30">
          <Sparkles className="h-4 w-4" />
        </div>
        <span>Reels Bot</span>
      </Link>

      {me.role === "EDITOR" && (
        <div className="mb-4 px-0 md:px-2">
          {availableCreators.length > 0 ? (
            <CreatorPicker
              creators={availableCreators}
              active={activeCreator!.id}
            />
          ) : (
            <Link
              href="/settings"
              className="block rounded-lg border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              No creators yet. Connect with one in Settings.
            </Link>
          )}
        </div>
      )}

      <nav className="flex flex-col gap-1 text-sm">
        <NavItem href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
          Dashboard
        </NavItem>
        <NavItem href="/posts" icon={<ImageIcon className="h-4 w-4" />}>
          Posts
        </NavItem>
        {me.role === "CREATOR" && (
          <NavItem href="/calendar" icon={<Calendar className="h-4 w-4" />}>
            Calendar
          </NavItem>
        )}
        <NavItem href="/settings" icon={<Settings className="h-4 w-4" />}>
          Settings
        </NavItem>
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200/80 pt-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-3 px-2">
          {me.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.image}
              alt={me.name ?? ""}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {me.name ?? "Guest"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <RoleBadge role={me.role} />
              <span className="truncate">{me.email}</span>
            </div>
          </div>
        </div>

        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 md:flex-row dark:bg-zinc-950">
      {/* Mobile top bar with drawer */}
      <MobileNav>
        <div className="flex h-full flex-col">{sidebarContent}</div>
      </MobileNav>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200/80 bg-white/60 p-4 backdrop-blur md:flex md:flex-col dark:border-zinc-800/80 dark:bg-zinc-900/40">
        {sidebarContent}
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {me.role === "EDITOR" && activeCreator && (
          <WorkspaceBanner
            creator={activeCreator}
            multipleCreators={availableCreators.length > 1}
          />
        )}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
    >
      <span className="text-zinc-400 group-hover:text-fuchsia-500 dark:text-zinc-500">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function RoleBadge({ role }: { role: "CREATOR" | "EDITOR" | null }) {
  if (!role) return null;
  return (
    <span
      className={
        role === "CREATOR"
          ? "rounded px-1 py-px text-[10px] font-medium uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300"
          : "rounded px-1 py-px text-[10px] font-medium uppercase tracking-wider text-blue-700 dark:text-blue-300"
      }
    >
      {role}
    </span>
  );
}
