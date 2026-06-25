"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileVideo,
  ImagePlus,
  Loader2,
  UploadCloud,
  X,
  GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CloudImportPicker,
  type ImportedMedia,
  type CloudProvider,
} from "@/components/cloud-import-picker";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;  // 20 MB each
const MAX_PHOTOS = 10;

type MediaMode = "VIDEO" | "PHOTO";

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number; current: number; total: number }
  | { kind: "saving" }
  | { kind: "error"; message: string };

interface PhotoFile {
  id: string;
  file: File;
  previewUrl: string;
}

export function PostUploader() {
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<MediaMode>("VIDEO");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [outline, setOutline] = useState("");
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  // Media imported from cloud storage (already a Cloudinary URL — skips upload).
  const [importedMedia, setImportedMedia] = useState<ImportedMedia | null>(null);
  const [cloudPicker, setCloudPicker] = useState<CloudProvider | null>(null);

  const isWorking = state.kind === "uploading" || state.kind === "saving";

  // ── Video handlers ──────────────────────────────────────────────────────────

  const onPickVideo = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setState({ kind: "error", message: "Please select a video file." });
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setState({ kind: "error", message: `Video too large. Max 200 MB.` });
      return;
    }
    setVideoFile(f);
    setState({ kind: "idle" });
  };

  // ── Photo handlers ──────────────────────────────────────────────────────────

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const invalid = arr.filter((f) => !f.type.startsWith("image/"));
    if (invalid.length) {
      setState({ kind: "error", message: "Only image files are allowed." });
      return;
    }
    const tooBig = arr.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig.length) {
      setState({ kind: "error", message: `Each photo must be under 20 MB.` });
      return;
    }
    const next = [...photos, ...arr.map((f) => ({
      id: `${f.name}-${f.size}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))].slice(0, MAX_PHOTOS);
    setPhotos(next);
    setState({ kind: "idle" });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // ── Drag-reorder photos ─────────────────────────────────────────────────────

  const onDragStartPhoto = (index: number) => setDragIndex(index);

  const onDropPhoto = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  // ── Upload helpers ──────────────────────────────────────────────────────────

  const getSignature = async (resourceType: "video" | "image") => {
    const res = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType }),
    });
    if (!res.ok) throw new Error("Could not get upload signature");
    return res.json();
  };

  const uploadToCloudinary = (
    file: File,
    signed: SignedParams,
    onProgress: (pct: number) => void
  ): Promise<string> =>
    new Promise((resolve, reject) => {
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
        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
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

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (outline.trim().length < 3) {
      return setState({ kind: "error", message: "Add an outline (at least a few words)." });
    }

    try {
      // Imported from cloud storage — already a Cloudinary URL, skip upload.
      if (importedMedia) {
        setState({ kind: "saving" });
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: importedMedia.mediaUrl,
            mediaUrls: [importedMedia.mediaUrl],
            thumbnailUrl: importedMedia.thumbnailUrl,
            outline,
            mediaType: importedMedia.mediaType,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to save");
        toast.success("Saved as draft. Add a caption next.");
        router.push("/posts");
        router.refresh();
        return;
      }

      if (mode === "VIDEO") {
        if (!videoFile) return setState({ kind: "error", message: "Pick a video first." });

        const signed = await getSignature("video");
        const videoUrl = await uploadToCloudinary(videoFile, signed, (pct) =>
          setState({ kind: "uploading", percent: pct, current: 1, total: 1 })
        );
        const thumbnailUrl = videoUrl
          .replace("/video/upload/", "/video/upload/so_0,w_400,h_400,c_fill/")
          .replace(/\.[^.]+$/, ".jpg");

        setState({ kind: "saving" });
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaUrl: videoUrl, mediaUrls: [videoUrl], thumbnailUrl, outline, mediaType: "VIDEO" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to save");

      } else {
        if (photos.length === 0) return setState({ kind: "error", message: "Add at least one photo." });

        const uploadedUrls: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          const signed = await getSignature("image");
          const url = await uploadToCloudinary(photos[i].file, signed, (pct) =>
            setState({ kind: "uploading", percent: pct, current: i + 1, total: photos.length })
          );
          uploadedUrls.push(url);
        }

        setState({ kind: "saving" });
        const mediaType = uploadedUrls.length > 1 ? "CAROUSEL" : "PHOTO";
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: uploadedUrls[0],
            mediaUrls: uploadedUrls,
            thumbnailUrl: uploadedUrls[0],
            outline,
            mediaType,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? json.error ?? "Failed to save");
      }

      toast.success("Saved as draft. Add a caption next.");
      router.push("/posts");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setState({ kind: "error", message });
      toast.error(message);
    }
  };

  const hasMedia = !!importedMedia || (mode === "VIDEO" ? !!videoFile : photos.length > 0);

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(["VIDEO", "PHOTO"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setState({ kind: "idle" }); }}
            disabled={isWorking}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              mode === m
                ? "bg-white shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {m === "VIDEO" ? (
              <FileVideo className="h-4 w-4" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {m === "VIDEO" ? "Video" : "Photos"}
          </button>
        ))}
      </div>

      {/* Imported-from-cloud preview (replaces the dropzone when set) */}
      {importedMedia ? (
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Imported from cloud storage
          </div>
          {importedMedia.mediaType === "VIDEO" ? (
            <video src={importedMedia.mediaUrl} controls className="w-full max-w-xs rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={importedMedia.mediaUrl} alt="Imported" className="w-full max-w-xs rounded-xl" />
          )}
          <button
            type="button"
            onClick={() => setImportedMedia(null)}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      ) : (
      <>
      {/* Drop zone */}
      {mode === "VIDEO" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onPickVideo(e.dataTransfer.files[0] ?? null); }}
          onClick={() => videoInputRef.current?.click()}
          className={cn(
            "relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/20"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          )}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)}
          />
          {videoFile ? (
            <div className="flex flex-col items-center gap-2">
              <FileVideo className="h-8 w-8 text-fuchsia-500" />
              <div className="text-sm font-medium">{videoFile.name}</div>
              <div className="text-xs text-zinc-500">{(videoFile.size / 1e6).toFixed(1)} MB</div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = ""; }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="h-8 w-8 text-zinc-400" />
              <div className="text-sm font-medium">Drop a video here, or click to choose</div>
              <div className="text-xs text-zinc-500">MP4 / MOV up to 200 MB</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => onDragStartPhoto(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropPhoto(index)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 cursor-grab active:cursor-grabbing",
                    dragIndex === index && "opacity-50 border-fuchsia-400"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <GripVertical className="h-5 w-5 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-px text-[10px] text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add photos button */}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isWorking}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 py-8 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              <ImagePlus className="h-5 w-5" />
              {photos.length === 0
                ? "Click to add photos (up to 10)"
                : `Add more photos (${photos.length}/${MAX_PHOTOS})`}
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickPhotos(e.target.files)}
          />
          {photos.length > 0 && (
            <p className="text-xs text-zinc-500">
              Drag thumbnails to reorder. The first photo is the cover image.
            </p>
          )}
        </div>
      )}

      {/* Import from cloud storage */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs text-zinc-400">or import from</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isWorking}
          onClick={() => setCloudPicker("dropbox")}
          className="rounded-xl"
        >
          Dropbox
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isWorking}
          onClick={() => setCloudPicker("drive")}
          className="rounded-xl"
        >
          Google Drive
        </Button>
      </div>
      </>
      )}

      {cloudPicker && (
        <CloudImportPicker
          provider={cloudPicker}
          open={true}
          onClose={() => setCloudPicker(null)}
          onImported={(m) => {
            setImportedMedia(m);
            setVideoFile(null);
            setPhotos([]);
          }}
        />
      )}

      {/* Outline */}
      <div className="space-y-2">
        <Label htmlFor="outline">Outline / topic for the AI caption</Label>
        <Textarea
          id="outline"
          placeholder="e.g. 5 hidden Mac shortcuts every developer should know"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          rows={4}
          disabled={isWorking}
          className="resize-none"
        />
        <p className="text-xs text-zinc-500">
          We&apos;ll use this to draft a caption with Gemini in the next step. You can
          always edit before posting.
        </p>
      </div>

      {/* Progress */}
      {state.kind === "uploading" && (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              Step 1 of 2 · Uploading{" "}
              {state.total > 1 ? `photo ${state.current} of ${state.total}` : "your media"}
            </span>
            <span className="text-zinc-500">{Math.round(state.percent)}%</span>
          </div>
          <Progress value={state.percent} />
          <p className="text-[11px] text-zinc-400">Next: we&apos;ll save it as a draft, then you add a caption.</p>
        </div>
      )}
      {state.kind === "saving" && (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Step 2 of 2 · Saving draft
            </span>
            <span className="text-zinc-500">Almost there</span>
          </div>
          <Progress value={100} />
          <p className="text-[11px] text-zinc-400">Next: add a caption and pick where to post.</p>
        </div>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isWorking}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={!hasMedia || outline.trim().length < 3 || isWorking}
          className="rounded-full px-5"
        >
          {isWorking ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Working…</>
          ) : (
            "Save as draft"
          )}
        </Button>
      </div>
    </div>
  );
}

interface SignedParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  uploadUrl: string;
}
