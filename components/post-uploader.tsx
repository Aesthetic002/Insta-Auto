"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileVideo, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function PostUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [outline, setOutline] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  const submit = async () => {
    if (!file) return setState({ kind: "error", message: "Pick a video first." });
    if (outline.trim().length < 3)
      return setState({
        kind: "error",
        message: "Add an outline (at least a few words).",
      });
    if (file.size > MAX_BYTES)
      return setState({
        kind: "error",
        message: `File is too large (${(file.size / 1e6).toFixed(0)} MB). Max is 200 MB.`,
      });

    try {
      // 1) Get signed upload params
      const signRes = await fetch("/api/upload/sign", { method: "POST" });
      if (!signRes.ok) throw new Error("Could not get upload signature");
      const signed = await signRes.json();

      // 2) Upload directly to Cloudinary with XHR for progress
      const cloudinaryUrl = await uploadToCloudinary(file, signed, (percent) =>
        setState({ kind: "uploading", percent })
      );

      // 3) Create the DB post
      setState({ kind: "saving" });
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: cloudinaryUrl,
          // Cloudinary auto-generates a thumbnail at this URL pattern
          thumbnailUrl: cloudinaryUrl.replace(
            "/video/upload/",
            "/video/upload/so_0,w_400,h_400,c_fill/"
          ).replace(/\.[^.]+$/, ".jpg"),
          outline,
        }),
      });
      const postJson = await postRes.json();
      if (!postRes.ok) {
        throw new Error(postJson.message ?? postJson.error ?? "Failed to save");
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

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setState({ kind: "error", message: "Please select a video file." });
      return;
    }
    setFile(f);
    setState({ kind: "idle" });
  };

  const isWorking = state.kind === "uploading" || state.kind === "saving";

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/20"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileVideo className="h-8 w-8 text-fuchsia-500" />
            <div className="text-sm font-medium">{file.name}</div>
            <div className="text-xs text-zinc-500">
              {(file.size / 1e6).toFixed(1)} MB
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-zinc-400" />
            <div className="text-sm font-medium">
              Drop a video here, or click to choose
            </div>
            <div className="text-xs text-zinc-500">MP4 / MOV up to 200 MB</div>
          </div>
        )}
      </div>

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

      {state.kind === "uploading" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Uploading to Cloudinary…</span>
            <span>{Math.round(state.percent)}%</span>
          </div>
          <Progress value={state.percent} />
        </div>
      )}
      {state.kind === "saving" && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving draft…
        </p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isWorking}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={!file || outline.trim().length < 3 || isWorking}
          className="rounded-full px-5"
        >
          {isWorking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Working…
            </>
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

function uploadToCloudinary(
  file: File,
  signed: SignedParams,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
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
          const json = JSON.parse(xhr.responseText);
          resolve(json.secure_url as string);
        } catch {
          reject(new Error("Cloudinary returned invalid JSON"));
        }
      } else {
        reject(new Error(`Cloudinary error ${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
