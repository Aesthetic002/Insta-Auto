"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <Link
        href="/dashboard"
        className="flex items-center gap-2"
      >
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="font-playfair text-lg font-semibold tracking-wide">Promote</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div onClick={() => setOpen(false)}>{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
