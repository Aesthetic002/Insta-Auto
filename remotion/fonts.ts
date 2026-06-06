// Webfonts bundled into the Remotion render so the output matches the
// references (Canva uses Inter / Montserrat for the dental ad templates).
// Both load on first import; subsequent imports reuse the cached promise.

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";

const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
});
const montserrat = loadMontserrat("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
});

// Use these as the fontFamily prop. Falls back to system sans if loading
// fails mid-render (rare; just defensive).
export const INTER = `${inter.fontFamily}, system-ui, sans-serif`;
export const MONTSERRAT = `${montserrat.fontFamily}, system-ui, sans-serif`;
