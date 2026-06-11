"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileVideo, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { VideoTemplate } from "@/lib/templates";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB per slot — same as PostUploader.

interface SignedParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  uploadUrl: string;
}

type SlotState =
  | { kind: "empty" }
  | { kind: "uploading"; percent: number }
  | { kind: "done"; url: string; name: string }
  | { kind: "error"; message: string };

type RenderState =
  | { kind: "idle" }
  | { kind: "rendering"; jobId: string; status: string }
  | { kind: "done"; outputUrl: string; thumbnailUrl: string | null }
  | { kind: "error"; message: string };

export interface MediaAssetLite {
  id: string;
  url: string;
  label: string | null;
}

export function TemplateRender({
  template,
  prefillValues = {},
  mediaAssets = [],
}: {
  template: VideoTemplate;
  prefillValues?: Record<string, string>;
  mediaAssets?: MediaAssetLite[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Record<string, SlotState>>(
    Object.fromEntries(template.slots.map((s) => [s.id, { kind: "empty" } as SlotState]))
  );
  const [textValues, setTextValues] = useState<Record<string, string>>(
    Object.fromEntries(
      template.textInputs.map((t) => [t.id, prefillValues[t.id] ?? ""])
    )
  );
  const [render, setRender] = useState<RenderState>({ kind: "idle" });

  const allSlotsReady = template.slots.every(
    (s) => slots[s.id]?.kind === "done"
  );
  // Text fields are optional — blank ones fall back to placeholder defaults
  // server-side. Only media slots gate the render button.
  const isRendering = render.kind === "rendering";

  const uploadSlot = async (slotId: string, file: File) => {
    if (!file.type.startsWith("video/")) {
      setSlots((p) => ({
        ...p,
        [slotId]: { kind: "error", message: "Please pick a video file." },
      }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setSlots((p) => ({
        ...p,
        [slotId]: { kind: "error", message: "Video too large. Max 200 MB." },
      }));
      return;
    }

    try {
      setSlots((p) => ({ ...p, [slotId]: { kind: "uploading", percent: 0 } }));

      const sigRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: "video" }),
      });
      if (!sigRes.ok) throw new Error("Could not get upload signature");
      const signed = (await sigRes.json()) as SignedParams;

      const url = await new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("folder", signed.folder);
        form.append("public_id", signed.publicId);
        form.append("signature", signed.signature);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", signed.uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = (e.loaded / e.total) * 100;
            setSlots((p) => ({
              ...p,
              [slotId]: { kind: "uploading", percent: pct },
            }));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve((JSON.parse(xhr.responseText) as { secure_url: string }).secure_url);
            } catch {
              reject(new Error("Cloudinary returned invalid JSON"));
            }
          } else {
            reject(new Error(`Cloudinary error ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });

      setSlots((p) => ({
        ...p,
        [slotId]: { kind: "done", url, name: file.name },
      }));

      // Save the clip to the reusable library (best-effort).
      fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind: "VIDEO", label: file.name }),
      }).catch(() => {});
    } catch (err) {
      setSlots((p) => ({
        ...p,
        [slotId]: {
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        },
      }));
    }
  };

  const pickFromLibrary = (slotId: string, asset: MediaAssetLite) => {
    setSlots((p) => ({
      ...p,
      [slotId]: { kind: "done", url: asset.url, name: asset.label ?? "Saved clip" },
    }));
  };

  const startRender = async () => {
    const inputs: Record<string, string> = {};
    for (const s of template.slots) {
      const st = slots[s.id];
      if (st?.kind !== "done") return;
      inputs[s.id] = st.url;
    }
    for (const t of template.textInputs) {
      inputs[t.id] = textValues[t.id].trim();
    }

    try {
      setRender({ kind: "rendering", jobId: "", status: "QUEUED" });
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id, inputs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Render failed to start");
      setRender({ kind: "rendering", jobId: json.jobId, status: json.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      setRender({ kind: "error", message });
      toast.error(message);
    }
  };

  const activeJobId = render.kind === "rendering" ? render.jobId : "";
  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/render/${activeJobId}`);
        const j = await res.json();
        if (cancelled) return;
        if (j.status === "DONE") {
          setRender({
            kind: "done",
            outputUrl: j.outputUrl,
            thumbnailUrl: j.thumbnailUrl ?? null,
          });
          toast.success("Render ready");
        } else if (j.status === "FAILED") {
          setRender({ kind: "error", message: j.errorMessage ?? "Render failed" });
          toast.error(j.errorMessage ?? "Render failed");
        } else {
          setRender((prev) =>
            prev.kind === "rendering" ? { ...prev, status: j.status } : prev
          );
        }
      } catch {
        // network blip — keep polling
      }
    };
    const handle = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [activeJobId]);

  const useInNewPost = () => {
    if (render.kind !== "done") return;
    const qs = new URLSearchParams({
      mediaUrl: render.outputUrl,
      kind: "video",
      ...(render.thumbnailUrl ? { thumbnailUrl: render.thumbnailUrl } : {}),
    });
    router.push(`/posts/new?${qs.toString()}`);
  };

  return (
    <div className="space-y-6">
      {template.slots.map((slot) => (
        <SlotUploader
          key={slot.id}
          label={slot.label}
          maxSeconds={slot.maxSeconds ?? 6}
          state={slots[slot.id]}
          disabled={isRendering}
          library={mediaAssets}
          onFile={(f) => uploadSlot(slot.id, f)}
          onPick={(asset) => pickFromLibrary(slot.id, asset)}
          onClear={() =>
            setSlots((p) => ({ ...p, [slot.id]: { kind: "empty" } }))
          }
        />
      ))}

      {template.textInputs.map((t) => (
        <div key={t.id} className="space-y-2">
          <Label htmlFor={`txt-${t.id}`}>
            {t.label}{" "}
            <span className="text-xs font-normal text-zinc-400">· optional</span>
          </Label>
          <Input
            id={`txt-${t.id}`}
            value={textValues[t.id]}
            onChange={(e) =>
              setTextValues((p) => ({ ...p, [t.id]: e.target.value }))
            }
            placeholder={t.placeholder}
            maxLength={t.maxChars}
            disabled={isRendering}
          />
          <p className="text-xs text-zinc-500">
            {textValues[t.id]?.trim()
              ? `${textValues[t.id].length} / ${t.maxChars}`
              : t.placeholder
              ? `Leave blank to use "${t.placeholder}"`
              : `${textValues[t.id]?.length ?? 0} / ${t.maxChars}`}
          </p>
        </div>
      ))}

      {render.kind === "rendering" && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            {render.status === "QUEUED" && "Queued…"}
            {render.status === "RENDERING" && "Rendering your video…"}
            {render.status === "UPLOADING" && "Uploading rendered video…"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Hang on — this usually takes 20–60s for a 6-second template.
          </p>
        </div>
      )}

      {render.kind === "done" && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Your video is ready.
          </p>
          <video
            src={render.outputUrl}
            controls
            className="w-full max-w-xs rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={useInNewPost} className="rounded-full px-5">
              Use in a new post
            </Button>
            <a
              href={render.outputUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Open in new tab
            </a>
          </div>
        </div>
      )}

      {render.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {render.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isRendering}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={startRender}
          disabled={!allSlotsReady || isRendering || render.kind === "done"}
          className="rounded-full px-5"
        >
          {isRendering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rendering…
            </>
          ) : (
            "Render video"
          )}
        </Button>
      </div>
    </div>
  );
}

function SlotUploader({
  label,
  maxSeconds,
  state,
  disabled,
  library,
  onFile,
  onPick,
  onClear,
}: {
  label: string;
  maxSeconds: number;
  state: SlotState;
  disabled: boolean;
  library: MediaAssetLite[];
  onFile: (file: File) => void;
  onPick: (asset: MediaAssetLite) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-xs font-normal text-zinc-500">· up to {maxSeconds}s shown</span></Label>

      {/* Saved clip library — pick instead of re-uploading */}
      {library.length > 0 && state.kind !== "done" && (
        <div className="space-y-1.5">
          <div className="text-xs text-zinc-500">Pick from your library</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {library.map((asset) => (
              <button
                key={asset.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(asset)}
                className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900 transition-all hover:ring-2 hover:ring-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
                title={asset.label ?? "Saved clip"}
              >
                <video
                  src={asset.url}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
                <FileVideo className="absolute h-5 w-5 text-white/70" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          state.kind === "done"
            ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        {state.kind === "done" && (
          <div className="flex flex-col items-center gap-1">
            <FileVideo className="h-6 w-6 text-emerald-500" />
            <div className="max-w-[12rem] truncate text-sm font-medium">
              {state.name}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600"
            >
              <X className="h-3 w-3" /> Replace
            </button>
          </div>
        )}
        {state.kind === "uploading" && (
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading… {Math.round(state.percent)}%
            </div>
            <Progress value={state.percent} />
          </div>
        )}
        {state.kind === "empty" && (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-6 w-6 text-zinc-400" />
            <div className="text-sm font-medium">Click to upload a clip</div>
            <div className="text-xs text-zinc-500">MP4 / MOV up to 200 MB</div>
          </div>
        )}
        {state.kind === "error" && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-sm font-medium text-red-600">{state.message}</div>
            <div className="text-xs text-zinc-500">Click to retry</div>
          </div>
        )}
      </div>
    </div>
  );
}
