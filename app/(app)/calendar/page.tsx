import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_DOT_CLASS: Record<string, string> = {
  DRAFT: "bg-zinc-400",
  CAPTION_PENDING: "bg-blue-500",
  PENDING_APPROVAL: "bg-amber-500",
  SCHEDULED: "bg-fuchsia-500",
  PUBLISHING: "bg-violet-500",
  POSTED: "bg-emerald-500",
  REJECTED: "bg-zinc-400",
  FAILED: "bg-red-500",
};

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

  // Use UTC-based "today" so the calendar is consistent regardless of server timezone.
  const now = new Date();
  const todayUtc = { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
  const year = params.y ? Number(params.y) : todayUtc.y;
  const month = params.m ? Number(params.m) - 1 : todayUtc.m;
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  const posts = await db.post.findMany({
    where: {
      userId,
      OR: [
        { scheduledAt: { gte: monthStart, lt: monthEnd } },
        { postedAt: { gte: monthStart, lt: monthEnd } },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { postedAt: "asc" }],
    include: { socialAccount: true },
  });

  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    const when = p.scheduledAt ?? p.postedAt;
    if (!when) continue;
    const key = dayKey(when);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  const days = buildMonthGrid(year, month);
  const prevMonth = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const nextMonth = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };

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
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "rounded-full"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-44 text-center text-sm font-medium">
            {monthStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </div>
          <Link
            href={`/calendar?y=${nextMonth.y}&m=${nextMonth.m}`}
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "rounded-full"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/posts/new"
            className={cn(
              buttonVariants({ size: "sm" }),
              "ml-2 rounded-full px-4"
            )}
          >
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 text-xs dark:border-zinc-800 dark:bg-zinc-800">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-zinc-50 p-2 text-center font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-950"
          >
            {d}
          </div>
        ))}

        {days.map(({ date, isCurrentMonth }) => {
          const key = dayKey(date);
          const dayPosts = byDay.get(key) ?? [];
          const isToday =
            date.getUTCFullYear() === todayUtc.y &&
            date.getUTCMonth() === todayUtc.m &&
            date.getUTCDate() === todayUtc.d;
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "min-h-28 bg-white p-2 dark:bg-zinc-900",
                !isCurrentMonth && "bg-zinc-50/70 text-zinc-400 dark:bg-zinc-950/40"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isToday &&
                      "bg-fuchsia-500 font-semibold text-white shadow-sm shadow-fuchsia-500/30"
                  )}
                >
                  {date.getUTCDate()}
                </span>
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-zinc-400">
                    +{dayPosts.length - 3}
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {dayPosts.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/posts/${p.id}`}
                      className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          STATUS_DOT_CLASS[p.status]
                        )}
                      />
                      <span className="truncate">
                        {utcTimeLabel(p.scheduledAt ?? p.postedAt!)}{" "}
                        · {p.outline}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

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

// All grid/key helpers use UTC so Vercel's server timezone doesn't shift dates.
function buildMonthGrid(
  year: number,
  month: number
): Array<{ date: Date; isCurrentMonth: boolean }> {
  const first = new Date(Date.UTC(year, month, 1));
  const startDay = first.getUTCDay(); // 0=Sun
  const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month, 1 - startDay + i));
    grid.push({ date: d, isCurrentMonth: d.getUTCMonth() === month });
  }
  return grid;
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// Format a UTC timestamp as local time string for display (browser-consistent on server via toISOString trick)
function utcTimeLabel(d: Date): string {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}
