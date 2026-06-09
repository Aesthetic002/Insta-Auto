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

// Keys that pre-fill from the user's saved BusinessProfile. Adding a key here
// means the profile form must collect it and the pre-fill map must resolve it.
export type ProfileKey =
  | "clinicName"
  | "phone"
  | "logoUrl"
  | "service1"
  | "service2"
  | "service3"
  | "service4";

// Where a field's value comes from:
//   "profile" — auto-filled from BusinessProfile (collected once at onboarding).
//               Shown pre-filled + editable, but the user rarely touches it.
//   "post"    — campaign-specific, entered fresh each time (with a placeholder
//               as a sensible default). This is the default when omitted.
export type FieldSource = "profile" | "post";

export interface TemplateSlot {
  id: string;          // matches a Remotion prop, e.g. "clip1Url"
  label: string;       // shown above the uploader
  kind: SlotKind;
  maxSeconds?: number; // video slots only — clip duration cap
  // Media slots always pull from the saved library (pick) or a new upload.
  // No profileKey needed — the library picker handles reuse generically.
}

export interface TemplateTextInput {
  id: string;          // matches a Remotion prop, e.g. "headline"
  label: string;
  maxChars: number;
  placeholder?: string;
  source?: FieldSource;     // default "post"
  profileKey?: ProfileKey;  // required when source === "profile"
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

const DENTAL_TEMPLATES: Template[] = [
  {
    id: "dental-before-after-reel",
    name: "Before / After · Reel",
    description:
      "Two clips with a clean swipe between BEFORE and AFTER, treatment name + clinic footer. Best for transformations like whitening, ortho, smile makeover.",
    kind: "video",
    profession: "DENTAL",
    category: "BEFORE_AFTER",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 210,
    previewUrl: "/template-previews/dental/dental-before-after-reel.mp4",
    slots: [
      { id: "beforeUrl", label: "Before clip", kind: "video", maxSeconds: 3 },
      { id: "afterUrl",  label: "After clip",  kind: "video", maxSeconds: 4 },
    ],
    textInputs: [
      { id: "treatment",  label: "Treatment",   maxChars: 30, placeholder: "Smile Makeover" },
      { id: "clinicName", label: "Clinic name", maxChars: 40, placeholder: "Bright Smile Dental" },
    ],
  },
  {
    id: "dental-offer-card",
    name: "Dental Care · Service Card",
    description:
      "Bold blue Canva-style ad. Headline + circular photo cutout + service checklist + Book Now pill. Best for general service promotion.",
    kind: "image",
    profession: "DENTAL",
    category: "OFFER_CARD",
    width: 1080,
    height: 1350,
    previewUrl: "/template-previews/dental/dental-offer-card.png",
    slots: [
      { id: "imageUrl", label: "Clinic / treatment photo", kind: "image" },
    ],
    textInputs: [
      { id: "headlineLine1", label: "Headline line 1", maxChars: 12, placeholder: "Dental" },
      { id: "headlineLine2", label: "Headline line 2", maxChars: 12, placeholder: "Care" },
      { id: "service1",      label: "Service 1",       maxChars: 28, placeholder: "Teeth Whitening" },
      { id: "service2",      label: "Service 2",       maxChars: 28, placeholder: "Braces & Aligners" },
      { id: "service3",      label: "Service 3",       maxChars: 28, placeholder: "Dental Implants" },
      { id: "service4",      label: "Service 4",       maxChars: 28, placeholder: "Regular Checkups" },
      { id: "clinicName",    label: "Clinic name",     maxChars: 24, placeholder: "Bright Smile" },
      { id: "phone",         label: "Phone",           maxChars: 20, placeholder: "+1 555-123-4567" },
    ],
  },
  {
    id: "dental-mega-promo",
    name: "Mega Promo · Full Ad",
    description:
      "Teal Canva-style flagship ad. Asymmetric photo cutout, tagline, full service block, halftone accents, contact strip. Highest impact.",
    kind: "image",
    profession: "DENTAL",
    category: "OFFER_CARD",
    width: 1080,
    height: 1350,
    previewUrl: "/template-previews/dental/dental-mega-promo.png",
    slots: [
      { id: "imageUrl", label: "Hero photo (clinic or treatment)", kind: "image" },
    ],
    textInputs: [
      { id: "headlineLine1", label: "Headline line 1", maxChars: 12, placeholder: "Dental" },
      { id: "headlineLine2", label: "Headline line 2", maxChars: 12, placeholder: "Care" },
      { id: "tagline",       label: "Tagline (quote)", maxChars: 120, placeholder: "Brighten your smile with expert dental care, book your appointment today!" },
      { id: "service1",      label: "Service 1",       maxChars: 30, placeholder: "Preventive Care" },
      { id: "service2",      label: "Service 2",       maxChars: 30, placeholder: "Cosmetic Dentistry" },
      { id: "service3",      label: "Service 3",       maxChars: 30, placeholder: "Restorative Treatments" },
      { id: "service4",      label: "Service 4",       maxChars: 30, placeholder: "Orthodontic Services" },
      { id: "clinicName",    label: "Clinic name",     maxChars: 24, placeholder: "Bright Smile" },
      { id: "phone",         label: "Phone",           maxChars: 20, placeholder: "+1 555-123-4567" },
    ],
  },
  {
    id: "dental-service-explainer",
    name: "Service Explainer · Reel",
    description:
      "Big hook headline (\"Why Invisalign?\") then 3 benefit bullets animating in over a clip. Reads like a quick ad. ~11 seconds.",
    kind: "video",
    profession: "DENTAL",
    category: "EXPLAINER",
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 330,
    previewUrl: "/template-previews/dental/dental-service-explainer.mp4",
    slots: [
      { id: "clipUrl", label: "Background clip", kind: "video", maxSeconds: 9 },
    ],
    textInputs: [
      { id: "hookLine",   label: "Hook (top headline)", maxChars: 20, placeholder: "Why Invisalign?" },
      { id: "point1",     label: "Benefit 1",            maxChars: 30, placeholder: "Almost invisible" },
      { id: "point2",     label: "Benefit 2",            maxChars: 30, placeholder: "Removable for meals" },
      { id: "point3",     label: "Benefit 3",            maxChars: 30, placeholder: "Faster than braces" },
      { id: "clinicName", label: "Clinic name",          maxChars: 40, placeholder: "Bright Smile Dental" },
    ],
  },
  {
    id: "dental-testimonial-card",
    name: "Testimonial · Square Card",
    description:
      "1080×1080 Instagram post. Big quote, 5-star rating, patient photo circle + name. Lift trust from real patient reviews.",
    kind: "image",
    profession: "DENTAL",
    category: "TESTIMONIAL",
    width: 1080,
    height: 1080,
    previewUrl: "/template-previews/dental/dental-testimonial-card.png",
    slots: [
      { id: "patientPhotoUrl", label: "Patient photo", kind: "image" },
    ],
    textInputs: [
      { id: "quote",       label: "Patient quote", maxChars: 180, placeholder: "Best dental experience I've ever had." },
      { id: "patientName", label: "Patient name",  maxChars: 30,  placeholder: "Sarah Mitchell" },
      { id: "rating",      label: "Star rating (1-5)", maxChars: 1, placeholder: "5" },
      { id: "clinicName",  label: "Clinic name",   maxChars: 40,  placeholder: "Bright Smile Dental" },
    ],
  },
];

// ---------- Public API ----------

// Inputs whose `id` exactly matches one of these auto-fill from the user's
// BusinessProfile. Keeps the template definitions terse — we don't repeat
// `source: "profile", profileKey: "..."` on every clinicName/phone/serviceN.
const AUTO_PROFILE_KEYS: ProfileKey[] = [
  "clinicName",
  "phone",
  "logoUrl",
  "service1",
  "service2",
  "service3",
  "service4",
];

function tagProfileFields(template: Template): Template {
  const textInputs = template.textInputs.map((input) => {
    if (input.source) return input; // respect explicit tagging
    if ((AUTO_PROFILE_KEYS as string[]).includes(input.id)) {
      return {
        ...input,
        source: "profile" as const,
        profileKey: input.id as ProfileKey,
      };
    }
    return input;
  });
  return { ...template, textInputs } as Template;
}

export const TEMPLATES: Template[] = [
  ...DENTAL_TEMPLATES,
  ...GENERIC_VIDEO_TEMPLATES,
].map(tagProfileFields);

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// Shape the studio form pre-fills from. Mirrors the BusinessProfile columns
// plus the flattened services. Built server-side and passed to the client.
export interface ProfilePrefill {
  clinicName?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  services?: string[];
}

// Given a template + a user's profile data, return the initial text values
// keyed by input id. Profile-sourced fields get the saved value; everything
// else is left empty (the form falls back to placeholders).
export function buildPrefillValues(
  template: Template,
  profile: ProfilePrefill | null
): Record<string, string> {
  const values: Record<string, string> = {};
  if (!profile) return values;

  const serviceFromIndex = (i: number) => profile.services?.[i] ?? "";

  for (const input of template.textInputs) {
    if (input.source !== "profile" || !input.profileKey) continue;
    switch (input.profileKey) {
      case "clinicName":
        if (profile.clinicName) values[input.id] = profile.clinicName;
        break;
      case "phone":
        if (profile.phone) values[input.id] = profile.phone;
        break;
      case "logoUrl":
        if (profile.logoUrl) values[input.id] = profile.logoUrl;
        break;
      case "service1":
        if (serviceFromIndex(0)) values[input.id] = serviceFromIndex(0);
        break;
      case "service2":
        if (serviceFromIndex(1)) values[input.id] = serviceFromIndex(1);
        break;
      case "service3":
        if (serviceFromIndex(2)) values[input.id] = serviceFromIndex(2);
        break;
      case "service4":
        if (serviceFromIndex(3)) values[input.id] = serviceFromIndex(3);
        break;
    }
  }
  return values;
}

export function listTemplatesForProfession(
  profession: Profession | null
): Template[] {
  if (!profession) return TEMPLATES;
  return TEMPLATES.filter(
    (t) => t.profession === profession || t.profession === null
  );
}
