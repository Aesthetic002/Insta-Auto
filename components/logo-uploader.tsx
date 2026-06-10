"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SignedParams {
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  uploadUrl: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — logos are small.

export function LogoUploader({
  value,
  onChange,
  disabled,
  label = "Clinic logo (optional)",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "uploading"; percent: number } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setState({ kind: "error", message: "Pick an image file." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "Logo too large. Max 5 MB." });
      return;
    }
    try {
      setState({ kind: "uploading", percent: 0 });
      const sigRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: "image" }),
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
          if (e.lengthComputable)
            setState({ kind: "uploading", percent: (e.loaded / e.total) * 100 });
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve((JSON.parse(xhr.responseText) as { secure_url: string }).secure_url);
            } catch {
              reject(new Error("Cloudinary returned invalid JSON"));
            }
          } else reject(new Error(`Cloudinary error ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });

      onChange(url);
      setState({ kind: "idle" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-zinc-50 dark:bg-zinc-900",
            value
              ? "border-emerald-300"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          {state.kind === "uploading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Logo" className="h-full w-full object-contain p-1.5" />
          ) : (
            <UploadCloud className="h-5 w-5 text-zinc-400" />
          )}
        </div>

        <div className="text-xs text-zinc-500">
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="inline-flex items-center gap-1 hover:text-red-600"
            >
              <X className="h-3 w-3" /> Remove logo
            </button>
          ) : (
            <>PNG with transparent background works best. Optional — we use a clean tooth mark if you skip it.</>
          )}
          {state.kind === "error" && (
            <div className="mt-1 text-red-600">{state.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
