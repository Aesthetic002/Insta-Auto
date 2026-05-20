"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buildEditedUrl,
  originalUrl,
  DEFAULT_EDITS,
  FILTER_PRESETS,
  RATIO_PRESETS,
  type ImageEdits,
  type CropRatio,
} from "@/lib/cloudinary-edit";

interface Props {
  postId: string;
  mediaUrls: string[];
  onClose: () => void;
  onSaved: (urls: string[]) => void;
}

export function ImageEditor({ postId, mediaUrls, onClose, onSaved }: Props) {
  // Edit one image at a time; edited results accumulate in `urls`.
  const [urls, setUrls] = useState<string[]>(mediaUrls);
  const [activeIndex, setActiveIndex] = useState(0);
  const [edits, setEdits] = useState<ImageEdits>(DEFAULT_EDITS);
  const [saving, setSaving] = useState(false);

  // Live preview interaction state
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);

  // Always edit from the ORIGINAL asset so transforms don't stack.
  const base = useMemo(() => originalUrl(urls[activeIndex]), [urls, activeIndex]);
  // Full preview (text baked in) — used for Apply/Save.
  const preview = useMemo(() => buildEditedUrl(base, edits), [base, edits]);
  // Preview without the text layer — the base for the interactive HTML overlay,
  // so dragging the text is instant and doesn't re-fetch from Cloudinary.
  const previewNoText = useMemo(
    () => buildEditedUrl(base, { ...edits, text: null }),
    [base, edits]
  );

  // ── Drag to move text ───────────────────────────────────────────────────────
  const startDragText = (e: React.PointerEvent) => {
    // Ignore if the resize handle initiated it (handled separately).
    if ((e.target as HTMLElement).dataset.resize) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const box = previewBoxRef.current?.getBoundingClientRect();
    if (!box) return;

    const onMove = (ev: PointerEvent) => {
      const x = (ev.clientX - box.left) / box.width;
      const y = (ev.clientY - box.top) / box.height;
      setEdits((prev) => ({
        ...prev,
        textX: Math.min(1, Math.max(0, x)),
        textY: Math.min(1, Math.max(0, y)),
      }));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Drag handle to resize text ────────────────────────────────────────────────
  const startResizeText = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const box = previewBoxRef.current?.getBoundingClientRect();
    if (!box) return;
    const startSize = edits.textSize;
    const startY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      // Dragging down/right grows the text; scale by box height for stability.
      const deltaFrac = (ev.clientY - startY) / box.height;
      const next = Math.min(0.25, Math.max(0.02, startSize + deltaFrac * 0.5));
      setEdits((prev) => ({ ...prev, textSize: next }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const applyToCurrent = () => {
    setUrls((prev) => {
      const next = [...prev];
      next[activeIndex] = preview;
      return next;
    });
    toast.success("Edit applied to this image");
  };

  const resetCurrent = () => {
    setEdits(DEFAULT_EDITS);
    setUrls((prev) => {
      const next = [...prev];
      next[activeIndex] = originalUrl(prev[activeIndex]);
      return next;
    });
  };

  const switchTo = (i: number) => {
    setActiveIndex(i);
    setEdits(DEFAULT_EDITS); // start fresh; the stored URL keeps prior applied edits
  };

  const save = async () => {
    setSaving(true);
    // Make sure the currently-previewed edit is captured for the active image
    const finalUrls = [...urls];
    finalUrls[activeIndex] = preview;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrls: finalUrls }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? j.error ?? "Save failed");
      }
      onSaved(finalUrls);
      toast.success("Images saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save edits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-fuchsia-500" />
            <h2 className="text-sm font-semibold">Edit image</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_300px]">
          {/* Preview */}
          <div className="flex flex-col items-center justify-center gap-3 overflow-auto bg-zinc-100 p-6 dark:bg-zinc-900">
            <div
              ref={previewBoxRef}
              className="relative max-h-[50vh] max-w-full overflow-hidden rounded-lg shadow-md"
            >
              {/* Base image WITHOUT the text layer — text is an interactive overlay */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewNoText}
                alt="preview"
                className="block max-h-[50vh] max-w-full object-contain"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setBoxSize({ w: img.clientWidth, h: img.clientHeight });
                }}
              />

              {/* Draggable + resizable text overlay */}
              {edits.text && edits.text.trim() && boxSize.w > 0 && (
                <div
                  onPointerDown={startDragText}
                  style={{
                    position: "absolute",
                    // Top-left anchor to match Cloudinary's g_north_west placement.
                    left: `${edits.textX * 100}%`,
                    top: `${edits.textY * 100}%`,
                    color: `#${edits.textColor}`,
                    fontFamily: "Arial, sans-serif",
                    fontWeight: 700,
                    fontSize: `${edits.textSize * boxSize.w}px`,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    cursor: dragging ? "grabbing" : "grab",
                    userSelect: "none",
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    padding: "2px 6px",
                    border: "1px dashed rgba(255,255,255,0.7)",
                    borderRadius: 4,
                  }}
                >
                  {edits.text}
                  {/* Resize handle (bottom-right) */}
                  <span
                    data-resize="1"
                    onPointerDown={startResizeText}
                    style={{
                      position: "absolute",
                      right: -7,
                      bottom: -7,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#d946ef",
                      border: "2px solid white",
                      cursor: "nwse-resize",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              )}
            </div>

            {edits.text && edits.text.trim() && (
              <p className="text-[11px] text-zinc-400">
                Drag the text to move it · drag the pink dot to resize
              </p>
            )}

            {urls.length > 1 && (
              <div className="flex gap-2">
                {urls.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => switchTo(i)}
                    className={cn(
                      "h-12 w-12 overflow-hidden rounded-md border-2",
                      i === activeIndex ? "border-fuchsia-500" : "border-transparent opacity-70"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-5 overflow-y-auto border-l border-zinc-200 p-5 dark:border-zinc-800">
            {/* Aspect ratio */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Crop ratio</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {RATIO_PRESETS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEdits((e) => ({ ...e, ratio: r.id as CropRatio }))}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                      edits.ratio === r.id
                        ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Filter</Label>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_PRESETS.map((f) => {
                  const isActive = (edits.filter ?? "none") === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setEdits((e) => ({ ...e, filter: f.id === "none" ? null : f.id }))
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        isActive
                          ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adjustments */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Adjustments</Label>
              <Slider label="Brightness" value={edits.brightness} onChange={(v) => setEdits((e) => ({ ...e, brightness: v }))} />
              <Slider label="Contrast" value={edits.contrast} onChange={(v) => setEdits((e) => ({ ...e, contrast: v }))} />
              <Slider label="Saturation" value={edits.saturation} onChange={(v) => setEdits((e) => ({ ...e, saturation: v }))} />
            </div>

            {/* Text overlay */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Text overlay</Label>
              <input
                type="text"
                value={edits.text ?? ""}
                onChange={(e) => setEdits((prev) => ({ ...prev, text: e.target.value || null }))}
                placeholder="Add text…"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              {edits.text && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Color</span>
                    <input
                      type="color"
                      value={`#${edits.textColor}`}
                      onChange={(e) => setEdits((prev) => ({ ...prev, textColor: e.target.value.slice(1) }))}
                      className="h-7 w-9 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <Slider
                    label="Size"
                    min={2}
                    max={25}
                    value={Math.round(edits.textSize * 100)}
                    onChange={(v) => setEdits((prev) => ({ ...prev, textSize: v / 100 }))}
                    showSign={false}
                  />
                  <p className="text-[11px] text-zinc-400">
                    Drag the text on the image to position it, or drag the pink dot to resize.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={resetCurrent} className="flex-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={applyToCurrent} className="flex-1">
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">
            Edits are non-destructive — your original upload is preserved.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving} className="rounded-full px-5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = -50,
  max = 50,
  showSign = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  showSign?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className="tabular-nums">{showSign && value > 0 ? `+${value}` : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-fuchsia-500"
      />
    </div>
  );
}
