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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PostShape {
  id: string;
  status: string;
  caption: string | null;
  outline: string;
}

export function PostDetailEditor({
  post,
  canPublish = true,
}: {
  post: PostShape;
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(post.caption ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, startDelete] = useTransition();

  const isTerminal = post.status === "POSTED";

  const generate = async () => {
    setError(null);
    setGenerating(true);
    const tid = toast.loading("Drafting caption with Gemini…");
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-caption`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message ?? json.error ?? "Caption generation failed");
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
    if (
      !confirm(
        "Publish this reel to Instagram now? This cannot be undone."
      )
    )
      return;
    setError(null);
    setPublishing(true);
    const tid = toast.loading("Publishing to Instagram… (can take up to a minute)");
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const res = await fetch(`/api/posts/${post.id}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Publish failed");
      }
      toast.success("Posted to Instagram 🎉", { id: tid });
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
      const res = await fetch(`/api/posts/${post.id}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Retry failed");
      }
      toast.success("Posted to Instagram 🎉", { id: tid });
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
    if (!confirm("Delete this post? The video stays in Cloudinary.")) return;
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

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs uppercase tracking-wide text-zinc-500">
          Outline
        </Label>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {post.outline}
        </p>
      </div>

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

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
            disabled={isWorking || isTerminal || !caption.trim()}
            className="rounded-full px-5 shadow-lg shadow-rose-500/20"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isTerminal ? "Already posted" : "Post to Instagram now"}
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
