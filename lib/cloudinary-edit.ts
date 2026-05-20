// Build Cloudinary transformation URLs for non-destructive image editing.
//
// A Cloudinary delivery URL looks like:
//   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<version>/<public_id>.<ext>
//
// We edit by injecting a transformation segment right after "/upload/". To keep
// edits composable and reversible, we always strip any existing edit segment and
// rebuild from the original, so re-editing doesn't stack transforms.

export type CropRatio = "original" | "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1";

export interface ImageEdits {
  ratio: CropRatio;
  brightness: number; // -50..50  (Cloudinary e_brightness)
  contrast: number; // -50..50    (Cloudinary e_contrast)
  saturation: number; // -50..50  (Cloudinary e_saturation)
  filter: string | null; // art filter name e.g. "al_dente", or "grayscale", "sepia"
  text: string | null; // overlay text
  textColor: string; // hex without # e.g. "ffffff"
  textPosition: "north" | "south" | "center";
}

export const DEFAULT_EDITS: ImageEdits = {
  ratio: "original",
  brightness: 0,
  contrast: 0,
  saturation: 0,
  filter: null,
  text: null,
  textColor: "ffffff",
  textPosition: "south",
};

const RATIO_DIMS: Record<Exclude<CropRatio, "original">, string> = {
  "1:1": "ar_1:1,c_fill,g_auto",
  "4:5": "ar_4:5,c_fill,g_auto",
  "9:16": "ar_9:16,c_fill,g_auto",
  "16:9": "ar_16:9,c_fill,g_auto",
  "1.91:1": "ar_1.91:1,c_fill,g_auto",
};

const ART_FILTERS = new Set([
  "al_dente", "athena", "audrey", "aurora", "daguerre", "eucalyptus",
  "fes", "frost", "hairspray", "hokusai", "incognito", "linen",
  "peacock", "primavera", "quartz", "red_rock", "refresh", "sizzle",
  "sonnet", "ukulele", "zorro",
]);

// Split a Cloudinary URL into [prefixIncludingUpload, rest]. `rest` is whatever
// follows "/upload/" — may include an existing transform segment + version + id.
function splitUpload(url: string): { base: string; tail: string } | null {
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return {
    base: url.slice(0, idx + marker.length),
    tail: url.slice(idx + marker.length),
  };
}

// Strip a leading transform segment we previously added (heuristic: a segment
// that contains transform tokens like ar_, e_, c_, l_text, and is not a version
// "v123..." or the public_id). Returns the original asset path (version + id).
function stripExistingTransforms(tail: string): string {
  const parts = tail.split("/");
  // Keep dropping leading segments that look like transformations.
  while (parts.length > 1) {
    const seg = parts[0];
    const looksLikeTransform =
      /(^|,)(ar_|c_|g_|e_|w_|h_|l_|co_|fl_|b_|so_|q_|f_)/.test(seg);
    if (looksLikeTransform) {
      parts.shift();
    } else {
      break;
    }
  }
  return parts.join("/");
}

// Returns the original (un-edited) delivery URL for an asset.
export function originalUrl(url: string): string {
  const s = splitUpload(url);
  if (!s) return url;
  return s.base + stripExistingTransforms(s.tail);
}

// Build the edited URL from any (possibly already-edited) URL + edit settings.
export function buildEditedUrl(url: string, edits: ImageEdits): string {
  const s = splitUpload(url);
  if (!s) return url;
  const assetPath = stripExistingTransforms(s.tail);

  const transforms: string[] = [];

  // 0) Downscale first so we stay under Cloudinary's 25MP transform cap.
  //    c_limit only shrinks if larger; smaller images are untouched.
  transforms.push("w_2048,h_2048,c_limit");

  // 1) Crop / aspect ratio
  if (edits.ratio !== "original") {
    transforms.push(RATIO_DIMS[edits.ratio]);
  }

  // 2) Tone adjustments (combine into one effect segment each)
  const effects: string[] = [];
  if (edits.brightness !== 0) effects.push(`e_brightness:${edits.brightness}`);
  if (edits.contrast !== 0) effects.push(`e_contrast:${edits.contrast}`);
  if (edits.saturation !== 0) effects.push(`e_saturation:${edits.saturation}`);

  // 3) Filter
  if (edits.filter) {
    if (edits.filter === "grayscale") effects.push("e_grayscale");
    else if (edits.filter === "sepia") effects.push("e_sepia");
    else if (ART_FILTERS.has(edits.filter)) effects.push(`e_art:${edits.filter}`);
  }
  for (const e of effects) transforms.push(e);

  // 4) Text overlay
  if (edits.text && edits.text.trim()) {
    const encoded = encodeURIComponent(edits.text.trim()).replace(/%2C/g, "%252C");
    const gravity =
      edits.textPosition === "north" ? "g_north,y_40" :
      edits.textPosition === "center" ? "g_center" :
      "g_south,y_40";
    transforms.push(
      `l_text:Arial_48_bold:${encoded},co_rgb:${edits.textColor},${gravity}`
    );
  }

  const transformSegment = transforms.length > 0 ? transforms.join("/") + "/" : "";
  return s.base + transformSegment + assetPath;
}

export const FILTER_PRESETS: Array<{ id: string; label: string }> = [
  { id: "none", label: "None" },
  { id: "grayscale", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "al_dente", label: "Al Dente" },
  { id: "aurora", label: "Aurora" },
  { id: "frost", label: "Frost" },
  { id: "incognito", label: "Incognito" },
  { id: "peacock", label: "Peacock" },
  { id: "primavera", label: "Primavera" },
  { id: "sizzle", label: "Sizzle" },
];

export const RATIO_PRESETS: Array<{ id: CropRatio; label: string }> = [
  { id: "original", label: "Original" },
  { id: "1:1", label: "Square 1:1" },
  { id: "4:5", label: "Portrait 4:5" },
  { id: "9:16", label: "Story 9:16" },
  { id: "16:9", label: "Wide 16:9" },
  { id: "1.91:1", label: "Landscape" },
];
