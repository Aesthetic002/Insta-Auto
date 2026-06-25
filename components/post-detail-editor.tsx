"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SocialAccountPicker,
  type SocialAccountOption,
  type Platform,
} from "@/components/social-account-picker";
import { PlatformPreview } from "@/components/platform-preview";
import { ImageEditor } from "@/components/image-editor";
import { PostStepper } from "@/components/post-stepper";

interface PostShape {
  id: string;
  status: string;
  caption: string | null;
  outline: string;
  platform: Platform | null;
  socialAccountId: string | null;
  selectedAccountIds: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  mediaUrls: string[];
}

export function PostDetailEditor({
  post,
  accounts,
  canPublish = true,
}: {
  post: PostShape;
  accounts: SocialAccountOption[];
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(post.caption ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, startDelete] = useTransition();

  const [selectedAccounts, setSelectedAccounts] = useState<SocialAccountOption[]>(
    accounts.filter((a) => post.selectedAccountIds.includes(a.id))
  );

  // Edited media URLs (photos only). Updated live by the image editor.
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls);
  const [editorOpen, setEditorOpen] = useState(false);

  const isTerminal = post.status === "POSTED";
  const isPhoto = post.mediaType === "PHOTO" || post.mediaType === "CAROUSEL";
  const primaryAccount = selectedAccounts[0] ?? null;
  const PLATFORM_NAMES: Record<string, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", PINTEREST: "Pinterest" };
  const platformLabel = primaryAccount ? PLATFORM_NAMES[primaryAccount.platform] : "your platform";

  const generate = async () => {
    setError(null);
    setGenerating(true);
    const tid = toast.loading("Drafting caption with Gemini…");
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-caption`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Caption generation failed");
      setCaption(json.post.caption ?? "");
      setSavedAt(Date.now());
      toast.success("Caption ready — edit if you want.", { id: tid });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setGenerating(false);
    }
  };

  const saveCaption = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? json.error ?? "Save failed");
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const publishNow = async () => {
    if (!caption.trim()) {
      const msg = "Add or generate a caption before publishing.";
      setError(msg);
      toast.warning(msg);
      return;
    }
    if (selectedAccounts.length === 0) {
      const msg = "Pick at least one social account to publish to.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const accountSummary =
      selectedAccounts.length === 1
        ? platformLabel
        : `${selectedAccounts.length} accounts`;

    if (!confirm(`Publish this post to ${accountSummary} now? This cannot be undone.`)) return;

    setError(null);
    setPublishing(true);
    const tid = toast.loading(`Publishing to ${accountSummary}… (can take up to a minute)`);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const res = await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(json.message ?? json.error ?? "Publish failed");
      if (res.status === 207) {
        toast.warning(`Partially published — some accounts failed. Check the post for details.`, { id: tid });
      } else {
        toast.success(`Posted to ${accountSummary}!`, { id: tid });
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setPublishing(false);
    }
  };

  const retryFailed = async () => {
    setError(null);
    setPublishing(true);
    const tid = toast.loading("Retrying publish…");
    try {
      const res = await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(json.message ?? json.error ?? "Retry failed");
      toast.success(`Published!`, { id: tid });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setPublishing(false);
    }
  };

  const deletePost = () => {
    if (!confirm("Delete this post? Media files stay in Cloudinary.")) return;
    startDelete(async () => {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Post deleted");
        router.push("/posts");
        router.refresh();
      }
    });
  };

  const isWorking = generating || publishing || deleting;

  // ── Progress stepper ────────────────────────────────────────────────────
  // Derive each step's state from what's actually filled in / the post status.
  const hasMedia = post.mediaUrls.length > 0;
  const hasCaption = caption.trim().length > 0;
  const hasAccounts = selectedAccounts.length > 0;
  const isLive = post.status === "POSTED";
  const isScheduled = post.status === "SCHEDULED" || post.status === "PENDING_APPROVAL";

  const stepperSteps = (() => {
    type S = "done" | "current" | "upcoming";
    const order = ["media", "caption", "accounts", "publish", "live"] as const;
    const labels: Record<(typeof order)[number], { label: string; hint?: string }> = {
      media: { label: "Media", hint: "uploaded" },
      caption: { label: "Caption", hint: "write or generate one" },
      accounts: { label: "Accounts", hint: "pick where to post" },
      publish: { label: "Publish", hint: isScheduled ? "scheduled — waiting to go out" : "publish now or schedule" },
      live: { label: "Live" },
    };
    // Determine the first incomplete step.
    const completed: Record<(typeof order)[number], boolean> = {
      media: hasMedia,
      caption: hasCaption,
      accounts: hasAccounts,
      publish: isLive || isScheduled,
      live: isLive,
    };
    let currentAssigned = false;
    return order.map((key) => {
      let state: S;
      if (completed[key]) {
        state = "done";
      } else if (!currentAssigned) {
        state = "current";
        currentAssigned = true;
      } else {
        state = "upcoming";
      }
      return { key, ...labels[key], state };
    });
  })();

  return (
    <div className="space-y-6">
      <PostStepper
        steps={stepperSteps}
        busyKey={publishing ? "publish" : null}
      />

      {/* Outline */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-zinc-500">Outline</Label>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{post.outline}</p>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="caption">Caption</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={isWorking || isTerminal}
            className="rounded-full"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {caption ? "Regenerate" : "Generate with AI"}
          </Button>
        </div>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveCaption}
          placeholder="Click Generate to draft a caption, or write your own."
          rows={6}
          disabled={isWorking || isTerminal}
          className="resize-none"
        />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{caption.length} chars · {countHashtags(caption)} hashtags</span>
          {savedAt && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Edit images — photos/carousels only, before posting */}
      {canPublish && isPhoto && !isTerminal && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Edit images</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Crop, filter, adjust and add text — non-destructive.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditorOpen(true)}
            disabled={isWorking}
            className="rounded-full"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Open editor
          </Button>
        </div>
      )}

      {/* Account picker — shown to creators only */}
      {canPublish && (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <SocialAccountPicker
            postId={post.id}
            accounts={accounts}
            selectedAccountIds={selectedAccounts.map((a) => a.id)}
            onSelect={(accs) => setSelectedAccounts(accs)}
            mediaType={post.mediaType}
          />
        </div>
      )}

      {editorOpen && (
        <ImageEditor
          postId={post.id}
          mediaUrls={mediaUrls}
          onClose={() => setEditorOpen(false)}
          onSaved={(urls) => {
            setMediaUrls(urls);
            router.refresh();
          }}
        />
      )}

      {/* Live platform previews — one per selected account */}
      {selectedAccounts.length > 0 && (
        <div className="space-y-4">
          <Label className="text-xs uppercase tracking-wide text-zinc-500">Preview</Label>
          {selectedAccounts.map((acc) => (
            <div key={acc.id} className="space-y-1.5">
              {selectedAccounts.length > 1 && (
                <p className="text-xs font-medium text-zinc-500">
                  {acc.platform.charAt(0) + acc.platform.slice(1).toLowerCase()}
                  {acc.username ? ` · @${acc.username}` : acc.displayName ? ` · ${acc.displayName}` : ""}
                </p>
              )}
              <PlatformPreview
                platform={acc.platform}
                username={acc.username}
                displayName={acc.displayName}
                avatarUrl={acc.avatarUrl}
                caption={caption}
                mediaUrls={mediaUrls}
                mediaType={post.mediaType}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 pt-6 dark:border-zinc-800/70">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={deletePost}
          disabled={isWorking}
          className="text-zinc-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete draft
        </Button>

        {canPublish && post.status === "FAILED" && (
          <Button
            type="button"
            onClick={retryFailed}
            disabled={isWorking || !caption.trim()}
            variant="outline"
            className="rounded-full px-5"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Retry publish
          </Button>
        )}

        {canPublish && post.status !== "FAILED" && (
          <Button
            type="button"
            onClick={publishNow}
            disabled={isWorking || isTerminal || !caption.trim() || selectedAccounts.length === 0}
            className="rounded-full px-5 shadow-lg shadow-rose-500/20"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : isTerminal ? (
              "Already posted"
            ) : selectedAccounts.length === 0 ? (
              "Select an account above"
            ) : selectedAccounts.length === 1 ? (
              <>
                <Send className="h-4 w-4" />
                Post to {platformLabel} now
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post to {selectedAccounts.length} accounts now
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function countHashtags(text: string): number {
  return (text.match(/#\w+/g) ?? []).length;
}
