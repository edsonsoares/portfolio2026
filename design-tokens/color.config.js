/*
 * Color source of truth, shared by Portfolio2026 and FeelScience.
 *
 * Primitives store only *seeds* — a hue/chroma for the neutral scale, and one
 * OKLCH seed per accent/status scale. generate-color-css.js derives every step
 * (50–950, plus 0/1000 for neutral) from a shared lightness ladder and a chroma
 * envelope that peaks in the middle steps and tapers toward the ends. Keeping
 * only seeds here means editing one number (say, a brand's hue) reshapes its
 * whole 11-step scale consistently.
 *
 * Edit values here (or tweak them in design-foundations-playground.html and
 * paste the copied config back into this file), then run:
 *   node design-tokens/build.js
 */
const COLOR_CONFIG = {
  primitives: {
    // One hue for the entire neutral scale — warm, nearly gray.
    // Seeds: light #f4f2ef ≈ oklch(96.2% 0.005 78)  → neutral-50
    //        dark  #28282a ≈ oklch(27.8% 0.004 286) → neutral-900
    // The dark seed's own hue (286) is measurement noise — at chroma this low,
    // hue is nearly imperceptible, so the whole scale is pinned to one hue (78)
    // per the "one hue for the whole scale" rule; the dark anchor still lands
    // within a couple of RGB units of #28282a.
    neutral: { hue: 78, chroma: 0.005 },

    // Brand accent scales. Each seed's hue is used for every step in that scale;
    // its chroma is the *peak* of the scale's chroma envelope (see generate-color-css.js).
    // `lightness` is kept for reference/preview only — the actual per-step lightness
    // always comes from the shared ladder, not from the seed.
    accents: {
      portfolio: { hue: 45, chroma: 0.17, lightness: 0.64 }, // PLACEHOLDER: warm terracotta
      feelscience: { hue: 240, chroma: 0.11, lightness: 0.72 }, // PLACEHOLDER: calm blue
    },
    // Brand used where CSS can't yet see a [data-brand] attribute.
    activeBrand: "portfolio",

    // Status scales — same generation rule as accents (peak chroma + shared ladder).
    status: {
      red: { hue: 29, chroma: 0.19, lightness: 0.595 },
      amber: { hue: 80, chroma: 0.16, lightness: 0.78 },
      green: { hue: 145, chroma: 0.14, lightness: 0.64 },
      blue: { hue: 240, chroma: 0.13, lightness: 0.6 },
    },
  },

  // Semantic roles: each names a primitive scale + step for light and dark mode.
  // "accent" resolves against whichever brand is active (via [data-brand]).
  // A few roles can't be a plain scale/step pick:
  //   - `alias`    copies whatever another role resolves to.
  //   - `computed` is resolved by generate-color-css.js (see resolvePalette).
  semantic: {
    bg: { light: ["neutral", 50], dark: ["neutral", 900] },
    surface: { light: ["neutral", 0], dark: ["neutral", 1000] },
    "surface-raised": { light: ["neutral", 100], dark: ["neutral", 800] },
    "text-primary": { light: ["neutral", 900], dark: ["neutral", 50] },
    "text-secondary": { light: ["neutral", 600], dark: ["neutral", 400] },
    "border-subtle": { light: ["neutral", 200], dark: ["neutral", 800] },
    "border-strong": { light: ["neutral", 400], dark: ["neutral", 600] },
    accent: { light: ["accent", 500], dark: ["accent", 400] },
    "accent-hover": { light: ["accent", 600], dark: ["accent", 300] },
    "accent-subtle": { light: ["accent", 100], dark: ["accent", 900] },
    "accent-text": { light: ["accent", 700], dark: ["accent", 300] },
    // Whichever of neutral-0 / neutral-900 contrasts more against that mode's accent.
    "text-on-accent": { computed: "text-on-accent" },
    // Same value as accent-text, in both modes.
    "focus-ring": { alias: "accent-text" },
  },
};

if (typeof module !== "undefined") module.exports = COLOR_CONFIG;
