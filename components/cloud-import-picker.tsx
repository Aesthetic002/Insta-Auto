"use client";

// Modal picker for importing media from a connected cloud provider
// (Dropbox now; Drive reuses the same component via a different `provider`).
// Lists the user's media files, and on select imports the chosen file into
// Cloudinary, returning { mediaUrl, thumbnailUrl, mediaType } to the caller.

import { useEffect, useState } from "react";
import { FileVideo, ImageIcon, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ImportedMedia {
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: "VIDEO" | "PHOTO";
}

interface CloudFile {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  isVideo: boolean;
  isImage: boolean;
}

export type CloudProvider = "dropbox" | "drive";

const PROVIDER_LABEL: Record<CloudProvider, string> = {
  dropbox: "Dropbox",
  drive: "Google Drive",
};

export function CloudImportPicker({
  provider,
  open,
  onClose,
  onImported,
}: {
  provider: CloudProvider;
  open: boolean;
  onClose: () => void;
  onImported: (media: ImportedMedia) => void;
}) {
  const [files, setFiles] = useState<CloudFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingPath, setImportingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFiles(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/${provider}/files`);
        const json = await res.json();
        if (!res.ok) {
          setError(
            json.error === "not_connected"
              ? "not_connected"
              : json.message ?? "Could not load files"
          );
          return;
        }
        setFiles(json.files);
      } catch {
        setError("Could not load files");
      }
    })();
  }, [open, provider]);

  const importFile = async (file: CloudFile) => {
    setImportingPath(file.path);
    setError(null);
    try {
      const res = await fetch(`/api/${provider}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path, isVideo: file.isVideo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Import failed");
      onImported({
        mediaUrl: json.mediaUrl,
        thumbnailUrl: json.thumbnailUrl,
        mediaType: json.mediaType,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingPath(null);
    }
  };

  if (!open) return null;

  const label = PROVIDER_LABEL[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h3 className="font-semibold">Import from {label}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error === "not_connected" ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-zinc-500">
                {label} isn&apos;t connected yet.
              </p>
              <a href={`/api/${provider}/connect`}>
                <Button className="rounded-full px-5">Connect {label}</Button>
              </a>
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : files === null ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your files…
            </div>
          ) : files.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No videos or photos found in your {label} app folder. Add some, then
              refresh.
            </p>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={!!importingPath}
                    onClick={() => importFile(f)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800",
                      importingPath === f.path && "bg-fuchsia-50 dark:bg-fuchsia-950/30"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {f.isVideo ? (
                        <FileVideo className="h-4 w-4 text-fuchsia-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-sky-500" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="text-xs text-zinc-400">
                        {(f.sizeBytes / 1e6).toFixed(1)} MB · {f.isVideo ? "Video" : "Photo"}
                      </span>
                    </span>
                    {importingPath === f.path && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-fuchsia-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
