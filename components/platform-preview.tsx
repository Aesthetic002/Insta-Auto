"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type Platform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "PINTEREST";

interface PreviewProps {
  platform: Platform;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  caption: string;
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
}

export function PlatformPreview(props: PreviewProps) {
  switch (props.platform) {
    case "INSTAGRAM": return <InstagramPreview {...props} />;
    case "FACEBOOK":  return <FacebookPreview  {...props} />;
    case "LINKEDIN":  return <LinkedInPreview  {...props} />;
    case "PINTEREST": return <PinterestPreview {...props} />;
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Avatar({ src, fallback, className }: { src: string | null; fallback: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
          {fallback.replace("@", "").slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function TruncatedCaption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 120;
  if (text.length <= limit) return <span>{text}</span>;
  return (
    <span>
      {expanded ? text : text.slice(0, limit) + "…"}
      <button type="button" onClick={() => setExpanded((e) => !e)} className="ml-1 font-semibold">
        {expanded ? "less" : "more"}
      </button>
    </span>
  );
}

// Clamp a width/height ratio to Instagram's allowed range:
//   portrait max 4:5 (ratio = 0.8), landscape max 1.91:1 (ratio ≈ 1.91)
// Returns a CSS padding-bottom percentage that creates the right aspect box.
function igClampedPaddingBottom(naturalW: number, naturalH: number): string {
  const raw = naturalH / naturalW;           // height-to-width ratio
  const min = 1 / 1.91;                      // landscape limit  ≈ 0.524
  const max = 5 / 4;                         // portrait limit   = 1.25
  const clamped = Math.min(Math.max(raw, min), max);
  return `${(clamped * 100).toFixed(4)}%`;
}

// Renders actual media. For images, measures the natural dimensions of the
// first URL and derives the correct aspect ratio for the given platform rules.
function MediaBlock({
  mediaUrls,
  mediaType,
  clampToIg = false,   // apply Instagram's 4:5 – 1.91:1 clamp
  fixedAspect,         // e.g. "16/9" for video platforms — overrides measurement
}: {
  mediaUrls: string[];
  mediaType: "VIDEO" | "PHOTO" | "CAROUSEL";
  clampToIg?: boolean;
  fixedAspect?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  const src = mediaUrls[current] ?? null;
  const firstSrc = mediaUrls[0] ?? null;

  // Measure natural dimensions of the first image (only once per mediaUrls[0] change)
  useEffect(() => {
    if (mediaType === "VIDEO" || !firstSrc) return;
    setNaturalRatio(null);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0) setNaturalRatio(img.naturalHeight / img.naturalWidth);
    };
    img.src = firstSrc;
  }, [firstSrc, mediaType]);

  // Compute the padding-bottom that creates the correct aspect-ratio box
  function parsedFixedPaddingBottom(ratio: string): string {
    const [a, b] = ratio.split("/").map(Number);
    return `${((b / a) * 100).toFixed(4)}%`;
  }

  let paddingBottom: string;
  if (fixedAspect) {
    paddingBottom = parsedFixedPaddingBottom(fixedAspect);
  } else if (clampToIg) {
    // Use measured ratio once available; default to 1:1 while image loads
    paddingBottom = naturalRatio !== null
      ? igClampedPaddingBottom(1, naturalRatio)
      : "100%";
  } else {
    paddingBottom = "100%"; // fallback square
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ paddingBottom }}
    >
      <div className="absolute inset-0">
        {src ? (
          mediaType === "VIDEO" ? (
            <video src={src} controls playsInline className="h-full w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center text-zinc-500 text-xs">
            No media
          </div>
        )}

        {/* Carousel navigation */}
        {(mediaType === "CAROUSEL" || (mediaType === "PHOTO" && mediaUrls.length > 1)) && mediaUrls.length > 1 && (
          <>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
              {mediaUrls.map((_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 rounded-full transition-all", i === current ? "w-3 bg-white" : "w-1.5 bg-white/50")}
                />
              ))}
            </div>
            {current > 0 && (
              <button type="button" onClick={() => setCurrent((c) => c - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white text-sm shadow">‹</button>
            )}
            {current < mediaUrls.length - 1 && (
              <button type="button" onClick={() => setCurrent((c) => c + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white text-sm shadow">›</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Instagram ─────────────────────────────────────────────────────────────────
// Closely matches the real Instagram feed post / Reels UI

function InstagramPreview({ username, avatarUrl, caption, mediaUrls, mediaType }: PreviewProps) {
  const handle = username ? `@${username}` : "@your_account";

  return (
    <div className="w-full max-w-[360px] mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 font-sans">
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Avatar with IG gradient ring */}
        <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shrink-0">
          <div className="rounded-full p-[2px] bg-white dark:bg-zinc-950">
            <Avatar
              src={avatarUrl}
              fallback={handle}
              className="h-8 w-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate leading-tight">{handle}</div>
          <div className="text-[11px] text-zinc-400">Sponsored</div>
        </div>
        {/* Three-dot menu */}
        <svg className="h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </div>

      {/* Media — clamp to Instagram's 4:5 – 1.91:1 range; video stays 9:16 */}
      <MediaBlock
        mediaUrls={mediaUrls}
        mediaType={mediaType}
        clampToIg={mediaType !== "VIDEO"}
        fixedAspect={mediaType === "VIDEO" ? "9/16" : undefined}
      />

      {/* Action bar — SVG icons matching Instagram's style */}
      <div className="flex items-center gap-4 px-3 pt-3 pb-1">
        {/* Heart */}
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        {/* Comment */}
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {/* Share / paper plane */}
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        {/* Bookmark — pushed right */}
        <svg className="h-6 w-6 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <span className="text-[13px] font-semibold">1,234 likes</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-4">
        <p className="text-[13px] leading-snug">
          <span className="font-semibold mr-1">{handle.replace("@", "")}</span>
          <TruncatedCaption text={caption || "Your caption will appear here…"} />
        </p>
        <p className="mt-1.5 text-[11px] text-zinc-400 uppercase tracking-wide">just now</p>
      </div>
    </div>
  );
}

// ── Facebook ──────────────────────────────────────────────────────────────────

function FacebookPreview({ displayName, avatarUrl, caption, mediaUrls, mediaType }: PreviewProps) {
  const name = displayName ?? "Your Page";

  return (
    <div className="w-full max-w-[360px] mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 font-sans text-[#050505] dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <Avatar src={avatarUrl} fallback={name} className="h-10 w-10 rounded-full bg-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">{name}</div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <span>Just now</span>
            <span>·</span>
            {/* Globe icon */}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3a16.91 16.91 0 0 0-1.53-6.27A8 8 0 0 1 19.93 11zM13 4.07A15 15 0 0 1 14.9 11h-5.8A15 15 0 0 1 11 4.07a8.27 8.27 0 0 1 2 0zM8.6 4.73A16.91 16.91 0 0 0 7.07 11h-3a8 8 0 0 1 4.53-6.27zM4.07 13h3A16.91 16.91 0 0 0 8.6 19.27 8 8 0 0 1 4.07 13zm6.93 6.93A15 15 0 0 1 9.1 13h5.8A15 15 0 0 1 13 19.93a8.27 8.27 0 0 1-2 0zm2.4-.66A16.91 16.91 0 0 0 16.93 13h3a8 8 0 0 1-4.53 6.27z"/>
            </svg>
          </div>
        </div>
        <svg className="h-5 w-5 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </div>

      {caption && (
        <div className="px-3 pb-3 text-[14px] leading-snug">
          <TruncatedCaption text={caption} />
        </div>
      )}

      <MediaBlock mediaUrls={mediaUrls} mediaType={mediaType} fixedAspect="16/9" />

      {/* Reaction count row */}
      <div className="flex items-center justify-between px-3 py-2 text-[12px] text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-white text-[8px]">👍</span>
          <span>1.2K</span>
        </span>
        <span>48 comments · 12 shares</span>
      </div>

      {/* Action row */}
      <div className="flex">
        {[
          { label: "Like", icon: <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zm-7 11H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2v11z" /> },
          { label: "Comment", icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
          { label: "Share", icon: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
        ].map(({ label, icon }) => (
          <button key={label} type="button" className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg mx-0.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

function LinkedInPreview({ displayName, avatarUrl, caption, mediaUrls, mediaType }: PreviewProps) {
  const name = displayName ?? "Your Name";

  return (
    <div className="w-full max-w-[360px] mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 font-sans">
      <div className="flex items-start gap-2.5 px-3 py-3">
        <Avatar src={avatarUrl} fallback={name} className="h-12 w-12 rounded-full bg-[#0A66C2] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold leading-tight">{name}</div>
          <div className="text-[11px] text-zinc-400 leading-snug">1st · Connections</div>
          <div className="text-[11px] text-zinc-400">Just now · 🌐</div>
        </div>
        <button type="button" className="rounded-full border border-[#0A66C2] px-3 py-1 text-[13px] font-semibold text-[#0A66C2] leading-tight">
          + Follow
        </button>
      </div>

      <div className="px-3 pb-3 text-[14px] leading-snug text-zinc-800 dark:text-zinc-200">
        <TruncatedCaption text={caption || "Your post will appear here…"} />
      </div>

      {mediaUrls.length > 0 && (
        <MediaBlock mediaUrls={mediaUrls} mediaType={mediaType} fixedAspect="16/9" />
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between px-3 py-2 text-[12px] text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
        <span className="flex items-center gap-1">
          <span className="flex -space-x-0.5">
            {["💙","👏","💡"].map((e, i) => (
              <span key={i} className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[9px] bg-zinc-100">{e}</span>
            ))}
          </span>
          <span>1,204</span>
        </span>
        <span>48 comments · 12 reposts</span>
      </div>

      {/* Action row */}
      <div className="flex">
        {[
          { label: "Like",    icon: <><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 20H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2"/></> },
          { label: "Comment", icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
          { label: "Repost",  icon: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></> },
          { label: "Send",    icon: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
        ].map(({ label, icon }) => (
          <button key={label} type="button" className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Pinterest ─────────────────────────────────────────────────────────────────

function PinterestPreview({ displayName, avatarUrl, caption, mediaUrls }: PreviewProps) {
  const name = displayName ?? "Your Account";
  const src = mediaUrls[0] ?? null;

  return (
    <div className="w-full max-w-[260px] mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 font-sans">
      <div className="relative w-full overflow-hidden rounded-t-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "2/3" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400 text-xs">No image</div>
        )}
        <div className="absolute right-2 top-2">
          <button type="button" className="rounded-full bg-[#E60023] px-3 py-1.5 text-[13px] font-bold text-white shadow">
            Save
          </button>
        </div>
      </div>
      <div className="p-3">
        {caption && (
          <p className="mb-2 text-[13px] font-semibold leading-snug">
            <TruncatedCaption text={caption} />
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <Avatar src={avatarUrl} fallback={name} className="h-6 w-6 rounded-full bg-[#E60023] shrink-0" />
          <span className="text-[12px] font-medium truncate">{name}</span>
        </div>
      </div>
    </div>
  );
}
