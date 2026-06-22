import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarGrid, type CalendarPost } from "@/components/calendar-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const params = await searchParams;

  // Calendar is creator-only — editors don't have scheduling powers.
  const me = await db.user.findUnique({ where: { id: userId } });
  if (me?.role !== "CREATOR") redirect("/dashboard");

  // Defaults to the current UTC month — the client-side grid will translate to
  // the user's local timezone on render. y/m in URL are 1-based for month.
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getUTCFullYear();
  const month = params.m ? Number(params.m) - 1 : now.getUTCMonth();

  // Query a wide window: previous month start to next month end (UTC). This
  // ensures we don't miss posts that fall on the local edges of the month
  // (e.g. IST early-morning posts that are UTC late-night the previous day).
  const queryStart = new Date(Date.UTC(year, month - 1, 1));
  const queryEnd = new Date(Date.UTC(year, month + 2, 1));

  const posts = await db.post.findMany({
    where: {
      userId,
      OR: [
        { scheduledAt: { gte: queryStart, lt: queryEnd } },
        { postedAt: { gte: queryStart, lt: queryEnd } },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { postedAt: "asc" }],
    select: {
      id: true,
      outline: true,
      status: true,
      scheduledAt: true,
      postedAt: true,
      thumbnailUrl: true,
      mediaType: true,
      targets: { select: { socialAccount: { select: { platform: true } } } },
    },
  });

  const clientPosts: CalendarPost[] = [];
  for (const p of posts) {
    const when = p.scheduledAt ?? p.postedAt;
    if (!when) continue;
    const platforms = Array.from(
      new Set(p.targets.map((t) => t.socialAccount.platform))
    );
    clientPosts.push({
      id: p.id,
      outline: p.outline,
      status: p.status,
      whenIso: when.toISOString(),
      thumbnailUrl: p.thumbnailUrl,
      mediaType: p.mediaType,
      platforms,
      // Only future, not-yet-published posts can be dragged to a new time.
      draggable:
        (p.status === "SCHEDULED" || p.status === "PENDING_APPROVAL") &&
        !!p.scheduledAt,
    });
  }

  const prevMonth = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const nextMonth = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">
            What&apos;s scheduled and what&apos;s already gone out.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?y=${prevMonth.y}&m=${prevMonth.m}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-44 text-center text-sm font-medium">{monthLabel}</div>
          <Link
            href={`/calendar?y=${nextMonth.y}&m=${nextMonth.m}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full")}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/posts/new"
            className={cn(buttonVariants({ size: "sm" }), "ml-2 rounded-full px-4")}
          >
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </div>
      </header>

      <CalendarGrid year={year} month={month} posts={clientPosts} />

      <Legend />
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["scheduled", "bg-fuchsia-500"],
    ["publishing", "bg-violet-500"],
    ["posted", "bg-emerald-500"],
    ["failed", "bg-red-500"],
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      {items.map(([label, dot]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          {label}
        </span>
      ))}
    </div>
  );
}
