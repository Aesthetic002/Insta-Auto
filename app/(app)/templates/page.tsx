import Link from "next/link";
import { Wand2 } from "lucide-react";

import { TEMPLATES } from "@/lib/templates";

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Video templates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick a template, drop in your clips, and we&apos;ll render it for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Link
            key={t.id}
            href={`/templates/${t.id}`}
            className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-zinc-900">
              {t.previewUrl ? (
                t.kind === "video" ? (
                  <video
                    src={t.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.previewUrl}
                    alt={t.name}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-500">
                  <Wand2 className="h-10 w-10 text-white/80" />
                </div>
              )}
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                {t.category}
              </span>
            </div>
            <div className="p-4">
              <div className="font-semibold">{t.name}</div>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                {t.description}
              </p>
              <div className="mt-3 text-[11px] text-zinc-400">
                {t.slots.length} {t.kind === "video" ? "clip" : "photo"}
                {t.slots.length === 1 ? "" : "s"} ·{" "}
                {t.kind === "video"
                  ? `${(t.durationInFrames / t.fps).toFixed(0)}s`
                  : "image"}{" "}
                · {t.width}×{t.height}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
