"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageIcon, FileVideo, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates";

interface Props {
  templates: Template[];
  activeKind: "image" | "video" | null;
}

export function StudioGallery({ templates, activeKind }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const setKind = (kind: "image" | "video" | null) => {
    const next = new URLSearchParams(params.toString());
    if (kind) next.set("kind", kind);
    else next.delete("kind");
    router.push(`/studio${next.toString() ? `?${next.toString()}` : ""}`);
  };

  return (
    <div className="space-y-6">
      {/* Kind tabs */}
      <div className="flex w-fit rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <TabButton
          label="All"
          icon={<Wand2 className="h-4 w-4" />}
          active={activeKind === null}
          onClick={() => setKind(null)}
        />
        <TabButton
          label="Images"
          icon={<ImageIcon className="h-4 w-4" />}
          active={activeKind === "image"}
          onClick={() => setKind("image")}
        />
        <TabButton
          label="Videos"
          icon={<FileVideo className="h-4 w-4" />}
          active={activeKind === "video"}
          onClick={() => setKind("video")}
        />
      </div>

      {/* Gallery grid */}
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No templates here yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/studio/${t.id}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div
                className={cn(
                  "relative overflow-hidden bg-zinc-900",
                  // Image vs video preview aspect ratios
                  t.kind === "video" || t.height > t.width
                    ? "aspect-[9/16]"
                    : t.height === t.width
                    ? "aspect-square"
                    : "aspect-[4/5]"
                )}
              >
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
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                  {t.kind === "video" ? (
                    <FileVideo className="h-3 w-3" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  {t.kind}
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
      )}
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
