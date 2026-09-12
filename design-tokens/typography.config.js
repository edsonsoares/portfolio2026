/*
 * Typography source of truth, shared by Portfolio2026 and FeelScience.
 *
 * Edit values here (or tweak them in type-playground.html and paste the
 * copied config back into this file), then run:  node design-tokens/build.js
 */
const TYPE_CONFIG = {
  fonts: {
    // `faces` lists every static file in design-tokens/fonts/ for this family.
    // Each face's weight is read from the file's own OS/2.usWeightClass, not its name.
    sans: {
      family: "UnB Pro",
      faces: [
        { src: "unb_pro_light.otf", weight: 300, style: "normal" },
        { src: "unb_pro_regular.otf", weight: 400, style: "normal" },
        { src: "unb_pro_italic.otf", weight: 400, style: "italic" },
        { src: "unb_pro_bold.otf", weight: 700, style: "normal" },
        { src: "unb_pro_bold_italic.otf", weight: 700, style: "italic" },
        { src: "unb_pro_black.otf", weight: 900, style: "normal" },
      ],
      fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    },
    // `src` is a file name inside design-tokens/fonts/. Leave empty to use the fallback stack.
    mono: {
      family: "",
      src: "",
      weightRange: "100 900",
      fallback: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    // Variable font: a single face per style covers the whole weight axis (200–900).
    serif: {
      family: "Source Serif 4",
      faces: [
        { src: "Source-Serif-4.ttf", weight: "200 900", style: "normal" },
        { src: "Source-Serif-4-Italic.ttf", weight: "200 900", style: "italic" },
      ],
      fallback: "Georgia, 'Times New Roman', serif",
    },
  },

  // Sizes come from a modular scale: size(step) = base * ratio^step.
  // When fluid is on, the desktop (max) values are used at maxViewport and
  // above, the mobile (min) values at minViewport and below, interpolated between.
  scale: {
    base: 16,
    ratio: 1.25,
    fluid: {
      enabled: true,
      minViewport: 360,
      maxViewport: 1280,
      minBase: 16,
      minRatio: 1.15,
    },
  },

  measure: "65ch",

  roles: {
    display:      { font: "sans", step: 5,  weight: 700, lineHeight: 1.05, tracking: -0.03, transform: "none" },
    "display-editorial": { font: "serif", step: 5, weight: 500, lineHeight: 1.1, tracking: -0.01, transform: "none" },
    "heading-lg": { font: "sans", step: 3,  weight: 700, lineHeight: 1.15, tracking: -0.02, transform: "none" },
    "heading-md": { font: "sans", step: 2,  weight: 700, lineHeight: 1.2,  tracking: -0.01, transform: "none" },
    "heading-sm": { font: "sans", step: 1,  weight: 700, lineHeight: 1.3,  tracking: 0,     transform: "none" },
    "body-lg":    { font: "sans", step: 1,  weight: 400, lineHeight: 1.5,  tracking: 0,     transform: "none" },
    body:         { font: "sans", step: 0,  weight: 400, lineHeight: 1.6,  tracking: 0,     transform: "none" },
    prose:        { font: "serif", step: 0, weight: 400, lineHeight: 1.65, tracking: 0,     transform: "none" },
    "body-sm":    { font: "sans", step: -1, weight: 400, lineHeight: 1.5,  tracking: 0,     transform: "none" },
    caption:      { font: "sans", step: -1, weight: 400, lineHeight: 1.4,  tracking: 0.01,  transform: "none" },
    label:        { font: "sans", step: -1, weight: 700, lineHeight: 1.2,  tracking: 0.06,  transform: "uppercase" },
    mono:         { font: "mono", step: -1, weight: 400, lineHeight: 1.5,  tracking: 0,     transform: "none" },
  },
};

if (typeof module !== "undefined") module.exports = TYPE_CONFIG;
