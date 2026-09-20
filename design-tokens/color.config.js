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
    // One hue per brand's neutral scale — each nearly gray, just tinted toward
    // that brand's personality. Unlike accents, neutrals use a *light-end taper*
    // (see NEUTRAL_CHROMA_ENVELOPE in generate-color-css.js) instead of a flat
    // chroma: steps 0/50 sit at ~20% of this chroma so bg/surface read as nearly
    // pure gray, building up to 100% through the middle/dark steps and easing back
    // to ~60% at step 1000. The seed below is that full (100%) chroma, not what
    // the lightest steps actually render at.
    neutrals: {
      portfolio: { hue: 50, chroma: 0.003 },
      feelscience: { hue: 255, chroma: 0.005 },
    },

    // Brand accent scales. Each seed's hue is used for every step in that scale;
    // its chroma is the *peak* of the scale's chroma envelope (see generate-color-css.js).
    // `lightness` is kept for reference/preview only — the actual per-step lightness
    // always comes from the shared ladder, not from the seed.
    accents: {
      portfolio: { hue: 37, chroma: 0.207, lightness: 0.67 }, // Vivid orange-red: #F95721
      feelscience: {
        hue: 263, chroma: 0.195, lightness: 0.379, // International Klein Blue: #002FA7
        // Deliberate brand decision: dark-mode fill stays true Klein (the anchor step)
        // instead of picking a lighter, higher-contrast step. Klein-on-dark-bg is only
        // ~1.37:1 — below the 3:1 guideline for interface boundaries, so the button's
        // edge isn't distinguishable from the page. The label is what has to stay
        // legible, and white-on-Klein is 10.69:1, comfortably past AA — see
        // darkFillStep/textOnAccent in generate-color-css.js, which force the anchor
        // step and white text respectively when this flag is set, and the "known
        // exception" contrast-table entry in the playground.
        darkFillException: true,
      },
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

  // Client accents: a case study page can adopt a client's color by setting
  // data-accent="<name>" on any element. Build-time only — accent-text and
  // text-on-accent are picked by contrast from a generated scale, so an arbitrary hex
  // applied at runtime would get neither a scale nor any contrast check. Each entry
  // is turned into a full scale and the same accent roles as a brand accent (anchor
  // step for fills, contrast-driven accent-text, label chosen for 4.5:1), for every
  // brand + mode. It overrides only the accent roles; neutrals and mode are untouched.
  // A rule an entry can't satisfy in some brand/mode is reported by build.js instead
  // of the target being quietly lowered. Names must not collide with a brand, status
  // color, "neutral" or "accent".
  clientAccents: {
    aesop: { hex: "#7e7265" },
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
    // Fill prefers the brand's *anchor* step — the accent step whose lightness is closest
    // to that brand's seed lightness, i.e. the truest rendition of the brand color
    // (terracotta ~500, Klein blue ~700) — in both modes. If the anchor doesn't allow a
    // legible label (>= 4.5:1 with neutral-0 or neutral-900), accentFillStep in
    // generate-color-css.js searches outward for the nearest step that does (this is what
    // moves portfolio off its 500 anchor — 500 tops out at 4.25:1 either way). The primary
    // button has no border to fall back on, so dark mode also requires >= 3:1 against bg,
    // which is what moves feelscience off Klein normally — except feelscience declares
    // `darkFillException` below, keeping true Klein anyway as a deliberate trade-off.
    accent: { light: { computed: "accent-fill" }, dark: { computed: "accent-fill" } },
    // One step darker than the light anchor, so hover reads as a deepening of the true
    // brand color rather than an unrelated fixed step.
    "accent-hover": { light: { computed: "accent-hover-anchor" }, dark: ["accent", 300] },
    "accent-subtle": { light: ["accent", 100], dark: ["accent", 900] },
    // Contrast-driven, not a fixed step: prefers the anchor step itself if it clears the
    // mode's target ratio (4.5:1 in light, 7:1 in dark — small accent text needs the
    // stricter target), else the step closest to the seed lightness that does. Falls
    // back to the highest-contrast step (flagged in build output) if none clear it.
    "accent-text": { light: { computed: "accent-text" }, dark: { computed: "accent-text" } },
    // Whichever of neutral-0 / neutral-900 contrasts more against that mode's accent.
    "text-on-accent": { light: { computed: "text-on-accent" }, dark: { computed: "text-on-accent" } },
    // Same value as accent-text, in both modes.
    "focus-ring": { alias: "accent-text" },
  },
};

if (typeof module !== "undefined") module.exports = COLOR_CONFIG;
