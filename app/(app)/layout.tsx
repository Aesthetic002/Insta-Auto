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
import { ThemeToggle } from "@/components/theme-toggle";

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

  const sidebarTop = (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
      {/* Logo */}
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 shadow-md shadow-rose-500/30">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-playfair text-xl font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
          Anvaya
        </span>
      </Link>

      {/* Creator picker for editors */}
      {me.role === "EDITOR" && (
        <div className="mb-5">
          {availableCreators.length > 0 ? (
            <CreatorPicker creators={availableCreators} active={activeCreator!.id} />
          ) : (
            <Link
              href="/settings"
              className="block rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              No creators yet — connect in Settings.
            </Link>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 text-sm">
        <NavItem href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavItem>
        <NavItem href="/posts" icon={<ImageIcon className="h-4 w-4" />}>Posts</NavItem>
        {me.role === "CREATOR" && (
          <NavItem href="/calendar" icon={<Calendar className="h-4 w-4" />}>Calendar</NavItem>
        )}
        <NavItem href="/settings" icon={<Settings className="h-4 w-4" />}>Settings</NavItem>
      </nav>
    </div>
  );

  const sidebarBottom = (
    <div className="shrink-0 space-y-2 border-t border-zinc-200/80 p-5 pt-4 dark:border-zinc-800/80">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        {me.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.image}
            alt={me.name ?? ""}
            className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-800"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {me.name ?? "Guest"}
          </div>
          <div className="flex items-center gap-1.5">
            <RoleBadge role={me.role} />
          </div>
        </div>
        <ThemeToggle className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50" />
      </div>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </form>
    </div>
  );

  const sidebarContent = (
    <>
      {sidebarTop}
      {sidebarBottom}
    </>
  );

  return (
    <div className="flex min-h-screen flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile top bar */}
      <MobileNav>
        <div className="flex h-full flex-col">{sidebarContent}</div>
      </MobileNav>

      {/* Desktop sidebar — sticky, always full viewport height */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200/60 bg-white md:flex dark:border-zinc-800/60 dark:bg-zinc-900 sticky top-0 h-screen">
        {sidebarTop}
        {sidebarBottom}
      </aside>

      {/* Right content — scrollable */}
      <div className="flex flex-1 flex-col">
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
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-50"
    >
      <span className="text-zinc-400 transition-colors group-hover:text-fuchsia-500 dark:text-zinc-500 dark:group-hover:text-fuchsia-400">
        {icon}
      </span>
      {children}
    </Link>
  );
}

function RoleBadge({ role }: { role: "CREATOR" | "EDITOR" | null }) {
  if (!role) return null;
  return (
    <span
      className={
        role === "CREATOR"
          ? "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300"
          : "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
      }
    >
      {role}
    </span>
  );
}
