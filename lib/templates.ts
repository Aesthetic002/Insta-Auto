// Registry of code-defined templates (image + video).
//
// Each template lives in /remotion/templates/<slug>/ as a Remotion composition.
// Image templates are rendered with renderStill(); video templates with
// renderMedia(). Both share the same React/component model — the only
// difference is what the renderer produces.
//
// Templates are tagged with a `profession` (for /studio gallery filtering) and
// a `category` (for grouping within a profession). Templates with profession
// = null are shown to everyone (generic / cross-industry).

// Mirror of the Profession enum in prisma/schema.prisma. Re-declared here
// instead of imported because adding a new profession requires editing both
// places anyway, and this avoids a transitive Prisma type-import cost in
// client components.
export type Profession = "DENTAL";

export type TemplateKind = "video" | "image";
export type SlotKind = "video" | "image";

export type TemplateCategory =
  | "GENERIC"          // legacy / cross-profession templates
  | "BEFORE_AFTER"     // transformation reels / case showcases
  | "OFFER_CARD"       // promo / discount / appointment CTA
  | "EXPLAINER"        // service-explainer video
  | "TESTIMONIAL";     // patient review / 5-star card

export interface TemplateSlot {
  id: string;          // matches a Remotion prop, e.g. "clip1Url"
  label: string;       // shown above the uploader
  kind: SlotKind;
  maxSeconds?: number; // video slots only — clip duration cap
}

export interface TemplateTextInput {
  id: string;          // matches a Remotion prop, e.g. "headline"
  label: string;
  maxChars: number;
  placeholder?: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  kind: "video";
  profession: Profession | null;   // null = shown to all professions
  category: TemplateCategory;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  slots: TemplateSlot[];
  textInputs: TemplateTextInput[];
  // Pre-rendered preview shown in the gallery card. Lives in /public.
  previewUrl?: string;
  thumbnailUrl?: string;
}

export interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  kind: "image";
  profession: Profession | null;
  category: TemplateCategory;
  // Image templates use a single composition frame. Width/height define
  // the output PNG/JPG size.
  width: number;
  height: number;
  slots: TemplateSlot[];
  textInputs: TemplateTextInput[];
  previewUrl?: string;   // PNG/JPG preview
  thumbnailUrl?: string;
}

export type Template = VideoTemplate | ImageTemplate;

// ---------- Legacy generic video templates (kept for backward compat) ----------

const GENERIC_VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "beat-drop-3clip",
    name: "Beat Drop · 3 Clips",
    description:
      "Three quick cuts with a zoom-in and flash transitions. Headline lands on the last beat.",
    kind: "video",
    profession: null,
    category: "GENERIC",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 180,
    previewUrl: "/template-previews/beat-drop-3clip.mp4",
    slots: [
      { id: "clip1Url", label: "Clip 1", kind: "video", maxSeconds: 2 },
      { id: "clip2Url", label: "Clip 2", kind: "video", maxSeconds: 2 },
      { id: "clip3Url", label: "Clip 3", kind: "video", maxSeconds: 2 },
    ],
    textInputs: [
      { id: "headline", label: "Headline", maxChars: 60, placeholder: "Make it pop" },
    ],
  },
  {
    id: "slow-zoom",
    name: "Slow Zoom · 1 Clip",
    description:
      "Cinematic slow zoom with a fade-in headline. Drop in one clip and we'll do the rest.",
    kind: "video",
    profession: null,
    category: "GENERIC",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 180,
    previewUrl: "/template-previews/slow-zoom.mp4",
    slots: [
      { id: "clipUrl", label: "Your clip", kind: "video", maxSeconds: 6 },
    ],
    textInputs: [
      { id: "headline", label: "Headline", maxChars: 40, placeholder: "Sit with it" },
      { id: "subtitle", label: "Subtitle", maxChars: 80, placeholder: "A slower kind of scroll" },
    ],
  },
  {
    id: "before-after",
    name: "Before / After · 2 Clips",
    description:
      "Classic transformation reel. Two clips, a sharp swipe transition, big BEFORE/AFTER labels.",
    kind: "video",
    profession: null,
    category: "GENERIC",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 180,
    previewUrl: "/template-previews/before-after.mp4",
    slots: [
      { id: "beforeUrl", label: "Before clip", kind: "video", maxSeconds: 3 },
      { id: "afterUrl",  label: "After clip",  kind: "video", maxSeconds: 3 },
    ],
    textInputs: [],
  },
  {
    id: "countdown",
    name: "Countdown · 3 Clips",
    description:
      "Three clips with giant 3-2-1 numbers, then a headline drop. Great for top-3 lists.",
    kind: "video",
    profession: null,
    category: "GENERIC",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 210,
    previewUrl: "/template-previews/countdown.mp4",
    slots: [
      { id: "clip1Url", label: "Clip 3", kind: "video", maxSeconds: 2 },
      { id: "clip2Url", label: "Clip 2", kind: "video", maxSeconds: 2 },
      { id: "clip3Url", label: "Clip 1", kind: "video", maxSeconds: 2 },
    ],
    textInputs: [
      { id: "headline", label: "Final headline", maxChars: 30, placeholder: "Go" },
    ],
  },
  {
    id: "split-screen",
    name: "Split Screen · 2 Clips",
    description:
      "Two clips stacked top/bottom, framed text in the middle. Perfect for comparisons.",
    kind: "video",
    profession: null,
    category: "GENERIC",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 180,
    previewUrl: "/template-previews/split-screen.mp4",
    slots: [
      { id: "topUrl",    label: "Top clip",    kind: "video", maxSeconds: 6 },
      { id: "bottomUrl", label: "Bottom clip", kind: "video", maxSeconds: 6 },
    ],
    textInputs: [
      { id: "headline", label: "Center label", maxChars: 20, placeholder: "VS" },
    ],
  },
];

// ---------- Dental templates ----------
//
// Populated in Phase 4 — keep this empty for now. Each entry will follow the
// VideoTemplate / ImageTemplate shape above with profession: "DENTAL".

const DENTAL_TEMPLATES: Template[] = [];

// ---------- Public API ----------

export const TEMPLATES: Template[] = [
  ...DENTAL_TEMPLATES,
  ...GENERIC_VIDEO_TEMPLATES,
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function listTemplatesForProfession(
  profession: Profession | null
): Template[] {
  if (!profession) return TEMPLATES;
  return TEMPLATES.filter(
    (t) => t.profession === profession || t.profession === null
  );
}
