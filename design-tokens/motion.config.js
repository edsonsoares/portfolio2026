/*
 * Motion source of truth, shared by Portfolio2026 and FeelScience.
 *
 * Only opacity and transform are ever animated — never layout properties — so motion
 * can't cause layout shift. Entrance ("reveal") behaviour is selected PER BRAND by
 * [data-brand], the same mechanism radius.config.js and color.config.js use.
 *
 * Edit values here (or tweak them in design-foundations-playground.html and
 * paste the copied config back into this file), then run:
 *   node design-tokens/build.js
 */
const MOTION_CONFIG = {
  durations: { // ms
    fast: 120,
    base: 200,
    slow: 320,
    reveal: 500,
  },

  easings: { // named --ease-<name>; cubic-bezier control points [x1, y1, x2, y2], x within 0–1
    out: [0.16, 1, 0.3, 1],
    "in-out": [0.65, 0, 0.35, 1],
  },

  entrance: {
    rise: 16, // px — how far a revealing element travels up from
    stagger: 60, // ms between siblings in a .reveal-group
    maxStaggered: 6, // siblings beyond this all share the last delay, so long lists don't drag
    threshold: 15, // % of the element that must be visible before it reveals
  },

  // Per-brand entrance. `rise: false` is a fade only. `duration` is either the name of
  // a duration above or a raw number of ms.
  activeBrand: "portfolio", // brand used where CSS can't yet see a [data-brand] attribute
  brands: {
    portfolio: { rise: true, duration: "reveal" }, // rise + fade
    feelscience: { rise: false, duration: 300 }, // fade only
  },
};

if (typeof module !== "undefined") module.exports = MOTION_CONFIG;
