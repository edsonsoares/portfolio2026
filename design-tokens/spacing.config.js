/*
 * Spacing source of truth, shared by Portfolio2026 and FeelScience.
 *
 * `scale.steps` are multiples of `baseUnit` — not raw px — so changing the base
 * unit rescales every step and every role that points at one consistently.
 * Tokens are named by their *computed* px value (base unit × multiplier), rounded
 * to the nearest integer, e.g. baseUnit 4 + multiplier 2 → --space-8.
 *
 * Edit values here (or tweak them in design-foundations-playground.html and
 * paste the copied config back into this file), then run:
 *   node design-tokens/build.js
 */
const SPACING_CONFIG = {
  scale: {
    baseUnit: 4, // px
    // 0, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192 at the default base unit.
    steps: [0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48],
  },

  // Same viewport range as typography.config.js's fluid type, so spacing and text
  // scale together. Each entry is a raw min/max in px — clamp()'d between them.
  fluid: {
    minViewport: 360,
    maxViewport: 1280,
    entries: {
      "container-gutter": { min: 16, max: 32 },
      "section-gap": { min: 48, max: 96 },
    },
  },

  // Semantic roles: each names a scale step (a multiplier, matched against
  // scale.steps) or a fluid entry by name.
  roles: {
    "stack-tight": { step: 2 }, // 8px — closely related elements
    stack: { step: 4 }, // 16px — default vertical rhythm
    "stack-loose": { step: 8 }, // 32px — separated groups
    inline: { step: 3 }, // 12px — row gaps: buttons, tags
    "card-padding": { step: 6 }, // 24px
    "container-gutter": { fluid: "container-gutter" },
    "section-gap": { fluid: "section-gap" },
  },

  // Text-flow spacing, kept in em so it scales with the text it belongs to.
  textFlow: {
    "paragraph-gap": 0.75,
    "heading-space-before": 1.5,
    "heading-space-after": 0.5,
  },
};

if (typeof module !== "undefined") module.exports = SPACING_CONFIG;
