"use client";

// Calendar grid rendered in the user's local timezone.
// The server passes raw posts with ISO timestamps; the client decides which
// local day each post falls on, so a post scheduled at 9 AM IST shows up on
// the IST day, not the UTC day.

import Link from "next/link";
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

export interface CalendarPost {
  id: string;
  outline: string;
  status: string;
  whenIso: string; // scheduledAt ?? postedAt as ISO string
}

interface Props {
  year: number;
  month: number; // 0-11
  posts: CalendarPost[];
}

export function CalendarGrid({ year, month, posts }: Props) {
  // Group posts by local day key
  const byDay = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    const d = new Date(p.whenIso);
    const key = localDayKey(d);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  // Build the month grid in local time
  const today = new Date();
  const days = buildLocalMonthGrid(year, month);

  return (
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
        const key = localDayKey(date);
        const dayPosts = byDay.get(key) ?? [];
        const isToday =
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate();
        return (
          <div
            key={key}
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
                {date.getDate()}
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
                      {formatLocalTime(p.whenIso)} · {p.outline}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildLocalMonthGrid(
  year: number,
  month: number
): Array<{ date: Date; isCurrentMonth: boolean }> {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startDay + i);
    grid.push({ date: d, isCurrentMonth: d.getMonth() === month });
  }
  return grid;
}

function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
