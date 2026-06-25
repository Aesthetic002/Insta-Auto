"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cloud, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProviderState {
  connected: boolean;
  displayName: string | null;
}

interface StorageState {
  dropbox: ProviderState;
  drive: ProviderState;
}

export function StorageCard({ dropbox, drive }: StorageState) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const disconnect = async (provider: "dropbox" | "drive", label: string) => {
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/${provider}/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`${label} disconnected`);
      router.refresh();
    } catch {
      toast.error("Could not disconnect");
      setDisconnecting(null);
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
        <ProviderRow
          provider="dropbox"
          label="Dropbox"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600"
          subtitle="Imports from your app folder"
          state={dropbox}
          disconnecting={disconnecting === "dropbox"}
          onDisconnect={() => disconnect("dropbox", "Dropbox")}
        />
        <ProviderRow
          provider="drive"
          label="Google Drive"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
          subtitle="Import videos & photos from your Drive"
          state={drive}
          disconnecting={disconnecting === "drive"}
          onDisconnect={() => disconnect("drive", "Google Drive")}
        />
      </div>
    </section>
  );
}

function ProviderRow({
  provider,
  label,
  iconBg,
  iconColor,
  subtitle,
  state,
  disconnecting,
  onDisconnect,
}: {
  provider: "dropbox" | "drive";
  label: string;
  iconBg: string;
  iconColor: string;
  subtitle: string;
  state: ProviderState;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Cloud className={`h-5 w-5 ${iconColor}`} />
        </span>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-zinc-500">
            {state.connected
              ? state.displayName
                ? `Connected · ${state.displayName}`
                : "Connected"
              : subtitle}
          </div>
        </div>
      </div>
      {state.connected ? (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
        </Button>
      ) : (
        <a href={`/api/${provider}/connect`}>
          <Button size="sm" className="rounded-full">Connect</Button>
        </a>
      )}
    </div>
  );
}
