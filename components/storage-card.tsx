"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cloud, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StorageState {
  dropbox: { connected: boolean; displayName: string | null };
}

export function StorageCard({ dropbox }: StorageState) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnectDropbox = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/dropbox/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Dropbox disconnected");
      router.refresh();
    } catch {
      toast.error("Could not disconnect");
      setDisconnecting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <header className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Cloud storage</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Connect cloud storage to import videos and photos straight into a post.
        </p>
      </header>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <Cloud className="h-5 w-5 text-blue-600" />
            </span>
            <div>
              <div className="text-sm font-medium">Dropbox</div>
              <div className="text-xs text-zinc-500">
                {dropbox.connected
                  ? dropbox.displayName
                    ? `Connected · ${dropbox.displayName}`
                    : "Connected"
                  : "Imports from your app folder"}
              </div>
            </div>
          </div>
          {dropbox.connected ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={disconnectDropbox}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
            </Button>
          ) : (
            <a href="/api/dropbox/connect">
              <Button size="sm" className="rounded-full">Connect</Button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
