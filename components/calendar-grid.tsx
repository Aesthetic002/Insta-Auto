"use client";

// Calendar rendered in the user's local timezone with month / week / list
// views, post thumbnails, platform icons, status colors, drag-to-reschedule,
// and hover quick actions.
//
// The server passes raw posts with ISO timestamps; the client decides which
// local day each post falls on, so a post scheduled at 9 AM IST shows up on
// the IST day, not the UTC day.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarRange,
  List as ListIcon,
  Pencil,
  X,
  Loader2,
} from "lucide-react";

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

const STATUS_BAR_CLASS: Record<string, string> = {
  DRAFT: "border-l-zinc-400 bg-zinc-50 dark:bg-zinc-800/40",
  CAPTION_PENDING: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
  PENDING_APPROVAL: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
  SCHEDULED: "border-l-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30",
  PUBLISHING: "border-l-violet-500 bg-violet-50 dark:bg-violet-950/30",
  POSTED: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  REJECTED: "border-l-zinc-400 bg-zinc-50 dark:bg-zinc-800/40",
  FAILED: "border-l-red-500 bg-red-50 dark:bg-red-950/30",
};

export interface CalendarPost {
  id: string;
  outline: string;
  status: string;
  whenIso: string; // scheduledAt ?? postedAt as ISO string
  thumbnailUrl: string | null;
  mediaType: string;
  platforms: string[];
  draggable: boolean;
}

type View = "month" | "week" | "list";

interface Props {
  year: number;
  month: number; // 0-11
  posts: CalendarPost[];
}

export function CalendarGrid({ year, month, posts }: Props) {
  const [view, setView] = useState<View>("month");

  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <ViewTab label="Month" icon={<CalendarDays className="h-4 w-4" />} active={view === "month"} onClick={() => setView("month")} />
        <ViewTab label="Week" icon={<CalendarRange className="h-4 w-4" />} active={view === "week"} onClick={() => setView("week")} />
        <ViewTab label="List" icon={<ListIcon className="h-4 w-4" />} active={view === "list"} onClick={() => setView("list")} />
      </div>

      {view === "list" ? (
        <ListView posts={posts} />
      ) : (
        <GridView year={year} month={month} posts={posts} weekOnly={view === "week"} />
      )}
    </div>
  );
}

function ViewTab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
        active ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function GridView({ year, month, posts, weekOnly }: { year: number; month: number; posts: CalendarPost[]; weekOnly: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const savingRef = useRef(false);

  const byDay = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    const key = localDayKey(new Date(p.whenIso));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  const today = new Date();
  const days = weekOnly ? buildLocalWeekGrid(today) : buildLocalMonthGrid(year, month);

  const reschedule = async (postId: string, targetDate: Date) => {
    if (savingRef.current) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    // Keep the original time-of-day, just move the date.
    const orig = new Date(post.whenIso);
    const next = new Date(targetDate);
    next.setHours(orig.getHours(), orig.getMinutes(), 0, 0);

    savingRef.current = true;
    try {
      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: next.toISOString() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? j.error ?? "Could not reschedule");
      }
      toast.success(`Moved to ${next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 text-xs dark:border-zinc-800 dark:bg-zinc-800">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="bg-zinc-50 p-2 text-center font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
          {d}
        </div>
      ))}

      {days.map(({ date, isCurrentMonth }) => {
        const key = localDayKey(date);
        const dayPosts = byDay.get(key) ?? [];
        const isToday = sameDay(date, today);
        const isOver = overKey === key;
        return (
          <div
            key={key}
            onDragOver={(e) => {
              if (dragId) {
                e.preventDefault();
                setOverKey(key);
              }
            }}
            onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) reschedule(dragId, date);
              setDragId(null);
              setOverKey(null);
            }}
            className={cn(
              "min-h-28 bg-white p-2 transition-colors dark:bg-zinc-900",
              !isCurrentMonth && !weekOnly && "bg-zinc-50/70 text-zinc-400 dark:bg-zinc-950/40",
              isOver && "bg-fuchsia-50 ring-2 ring-inset ring-fuchsia-300 dark:bg-fuchsia-950/30"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]", isToday && "bg-fuchsia-500 font-semibold text-white shadow-sm shadow-fuchsia-500/30")}>
                {date.getDate()}
              </span>
              {dayPosts.length > 3 && <span className="text-[10px] text-zinc-400">+{dayPosts.length - 3}</span>}
            </div>
            <ul className="space-y-1">
              {dayPosts.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <DayCell post={p} onDragStart={() => setDragId(p.id)} onDragEnd={() => { setDragId(null); setOverKey(null); }} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DayCell({ post, onDragStart, onDragEnd }: { post: CalendarPost; onDragStart: () => void; onDragEnd: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const cancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Unschedule this post? It'll go back to draft.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/schedule`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Unscheduled");
      router.refresh();
    } catch {
      toast.error("Could not unschedule");
      setBusy(false);
    }
  };

  return (
    <div
      draggable={post.draggable}
      onDragStart={post.draggable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800",
        post.draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <Link href={`/posts/${post.id}`} className="flex min-w-0 flex-1 items-center gap-1.5">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
        ) : (
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[post.status])} />
        )}
        <span className="min-w-0 flex-1 truncate">
          {formatLocalTime(post.whenIso)} · {post.outline}
        </span>
        <PlatformIcons platforms={post.platforms} />
      </Link>

      {/* Hover actions */}
      <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-white/90 px-1 shadow-sm group-hover:flex dark:bg-zinc-800/90">
        <Link href={`/posts/${post.id}`} title="Edit" className="rounded p-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <Pencil className="h-3 w-3" />
        </Link>
        {post.draggable && (
          <button type="button" title="Unschedule" onClick={cancel} disabled={busy} className="rounded p-0.5 text-zinc-500 hover:text-red-600">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function ListView({ posts }: { posts: CalendarPost[] }) {
  const sorted = [...posts].sort((a, b) => new Date(a.whenIso).getTime() - new Date(b.whenIso).getTime());
  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Nothing scheduled in this range.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      {sorted.map((p) => (
        <Link
          key={p.id}
          href={`/posts/${p.id}`}
          className={cn(
            "flex items-center gap-3 border-b border-l-4 border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
            STATUS_BAR_CLASS[p.status]
          )}
        >
          {p.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className={cn("h-10 w-10 shrink-0 rounded-lg", STATUS_DOT_CLASS[p.status])} />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{p.outline}</div>
            <div className="text-xs text-zinc-500">
              {new Date(p.whenIso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
          <PlatformIcons platforms={p.platforms} />
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {p.status.toLowerCase().replace(/_/g, " ")}
          </span>
        </Link>
      ))}
    </div>
  );
}

const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: "bg-gradient-to-br from-fuchsia-500 to-rose-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  PINTEREST: "bg-red-600",
};

function PlatformIcons({ platforms }: { platforms: string[] }) {
  if (platforms.length === 0) return null;
  return (
    <span className="flex shrink-0 -space-x-1">
      {platforms.map((pl) => (
        <span
          key={pl}
          title={pl}
          className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-white dark:ring-zinc-900", PLATFORM_COLOR[pl] ?? "bg-zinc-500")}
        >
          {pl[0]}
        </span>
      ))}
    </span>
  );
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildLocalMonthGrid(year: number, month: number): Array<{ date: Date; isCurrentMonth: boolean }> {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startDay + i);
    grid.push({ date: d, isCurrentMonth: d.getMonth() === month });
  }
  return grid;
}

function buildLocalWeekGrid(ref: Date): Array<{ date: Date; isCurrentMonth: boolean }> {
  const start = new Date(ref);
  start.setDate(ref.getDate() - ref.getDay()); // back to Sunday
  const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    grid.push({ date: d, isCurrentMonth: true });
  }
  return grid;
}

function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
