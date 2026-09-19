/*
 * Radius source of truth, shared by Portfolio2026 and FeelScience.
 *
 * Semantic roles are mapped PER BRAND (selected by [data-brand], the same
 * mechanism color.config.js uses for accent) — portfolio reads as sharp and
 * architectural, feelscience as soft and rounded, from the same five roles.
 *
 * Edit values here (or tweak them in design-foundations-playground.html and
 * paste the copied config back into this file), then run:
 *   node design-tokens/build.js
 */
const RADIUS_CONFIG = {
  scale: {
    steps: [0, 2, 4, 8, 12, 16, 24], // px — token named by value, e.g. --radius-8
    full: 9999, // px — token is --radius-full, kept in px (a rem value would be silly here)
  },

  // Each role's value is either a step from scale.steps, or the string "full".
  activeBrand: "portfolio", // brand used where CSS can't yet see a [data-brand] attribute
  roles: {
    portfolio: {
      "radius-control": 2,
      "radius-card": 4,
      "radius-surface": 8,
      "radius-media": 0,
      "radius-pill": "full",
    },
    feelscience: {
      "radius-control": "full",
      "radius-card": 16,
      "radius-surface": 24,
      "radius-media": 12,
      "radius-pill": "full",
    },
  },
};

if (typeof module !== "undefined") module.exports = RADIUS_CONFIG;
