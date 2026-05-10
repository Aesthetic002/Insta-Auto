"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Creator {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

export function CreatorPicker({
  creators,
  active,
}: {
  creators: Creator[];
  active: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const current = creators.find((c) => c.id === active) ?? creators[0];

  const pick = (id: string) => {
    document.cookie = `active_creator=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  };

  if (creators.length === 1) {
    return (
      <div className="rounded-xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-rose-50 p-3 dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:to-rose-950/20">
        <div className="text-[10px] font-medium uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
          Editing for
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar creator={current} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {current.name ?? current.email}
            </div>
            <div className="truncate text-[11px] text-zinc-500">
              {current.email}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group block w-full rounded-xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-rose-50 p-3 text-left transition-colors hover:border-fuchsia-300 dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:to-rose-950/20 dark:hover:border-fuchsia-800">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
            Editing for
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-fuchsia-500/70 group-hover:text-fuchsia-600" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar creator={current} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {current.name ?? current.email}
            </div>
            <div className="truncate text-[11px] text-zinc-500">
              {creators.length} workspaces · click to switch
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {creators.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => pick(c.id)}
            className="gap-2 py-2"
          >
            <Avatar creator={c} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {c.name ?? "Unnamed creator"}
              </div>
              <div className="text-xs text-zinc-500">{c.email}</div>
            </div>
            {c.id === active && (
              <Check className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ creator }: { creator: Creator }) {
  if (creator.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={creator.image}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white dark:ring-zinc-900"
      />
    );
  }
  const initial = (creator.name?.[0] ?? creator.email[0] ?? "?").toUpperCase();
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-sm font-semibold text-white ring-2 ring-white dark:ring-zinc-900">
      {initial}
    </div>
  );
}
