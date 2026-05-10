import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-64 rounded-full" />
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
        {Array.from({ length: 7 + 35 }).map((_, i) => (
          <div
            key={i}
            className={
              i < 7
                ? "bg-zinc-50 p-2 dark:bg-zinc-950"
                : "min-h-28 bg-white p-2 dark:bg-zinc-900"
            }
          >
            <Skeleton className={i < 7 ? "h-3 w-8" : "h-5 w-5"} />
          </div>
        ))}
      </div>
    </div>
  );
}
