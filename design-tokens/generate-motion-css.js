/*
 * Turns a MOTION_CONFIG object into CSS custom properties and the .reveal classes.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 *
 * Runtime behaviour (adding .is-revealed) lives in motion.js — this file only emits CSS.
 */
(function (root) {
  const round = (n, places = 4) => Number(n.toFixed(places));
  const rem = (px) => `${round(px / 16)}rem`;
  const ms = (n) => `${round(n, 0)}ms`;
  const bezier = (pts) => `cubic-bezier(${pts.join(", ")})`;

  function generateMotionCSS(config) {
    const { durations, easings, entrance, brands, activeBrand } = config;
    const out = [];
    out.push("/* Motion tokens. Generated from motion.config.js — do not edit by hand. */", "");

    out.push(":root {", "  /* Durations */");
    for (const [name, value] of Object.entries(durations)) out.push(`  --duration-${name}: ${ms(value)};`);
    out.push("", "  /* Easings */");
    for (const [name, pts] of Object.entries(easings)) out.push(`  --ease-${name}: ${bezier(pts)};`);
    out.push(
      "",
      "  /* Entrance (per-brand values below) */",
      `  --motion-stagger: ${ms(entrance.stagger)};`,
      `  --motion-stagger-max: ${entrance.maxStaggered}; /* reference: siblings past this share the last delay */`,
      `  --motion-threshold: ${round(entrance.threshold / 100)}; /* read by motion.js: fraction of the element visible before it reveals */`,
      "}", "");

    // Per-brand entrance — the rise distance (0 = fade only) and the reveal duration.
    for (const [brand, entry] of Object.entries(brands)) {
      const selector = brand === activeBrand ? `:root, [data-brand="${brand}"]` : `[data-brand="${brand}"]`;
      const duration = typeof entry.duration === "number" ? ms(entry.duration) : `var(--duration-${entry.duration})`;
      out.push(
        `${selector} {`,
        `  /* ${brand}: ${entry.rise ? "rise + fade" : "fade only"} */`,
        `  --motion-rise: ${entry.rise ? rem(entrance.rise) : "0rem"};`,
        `  --motion-reveal-duration: ${duration};`,
        "}", "");
    }

    out.push(
      "/* ---------- Reveal ----------",
      "   .reveal starts hidden and .is-revealed (added once by motion.js) animates it in. Only",
      "   opacity and transform are transitioned, so revealing never moves or resizes anything.",
      "   The hidden state applies only where scripting is enabled, so content is never stranded",
      "   invisible when JS can't run. .reveal-instant (elements already on screen at load) skips",
      "   the transition. */",
      "@media (scripting: enabled) {",
      "  .reveal { opacity: 0; transform: translateY(var(--motion-rise)); }",
      "}",
      ".reveal.is-revealed {",
      "  opacity: 1;",
      "  transform: none;",
      "  transition:",
      "    opacity var(--motion-reveal-duration) var(--ease-out),",
      "    transform var(--motion-reveal-duration) var(--ease-out);",
      "}",
      ".reveal.reveal-instant { transition: none; }",
      "",
      "/* Staggered children of a .reveal-group. The delay applies only to the revealed (entering) state,",
      "   so hiding an element again is never delayed. The first child has no delay; each sibling after it",
      `   waits one more --motion-stagger, up to ${entrance.maxStaggered} siblings — later ones share the last delay. */`);
    for (let n = 2; n <= entrance.maxStaggered; n++) {
      out.push(`.reveal-group > .reveal.is-revealed:nth-child(${n}) { transition-delay: calc(${n - 1} * var(--motion-stagger)); }`);
    }
    out.push(`.reveal-group > .reveal.is-revealed:nth-child(n + ${entrance.maxStaggered + 1}) { transition-delay: calc(${entrance.maxStaggered - 1} * var(--motion-stagger)); }`);

    const reduced = [
      "  .reveal, .reveal.is-revealed {",
      "    opacity: 1;",
      "    transform: none;",
      "    transition: none;",
      "  }",
    ];
    out.push(
      "",
      "/* Reduced motion: no transforms, no transitions — everything appears in its final state at once. */",
      "@media (prefers-reduced-motion: reduce) {", ...reduced, "}",
      "",
      "/* The same, forced by class (.motion-reduce on any ancestor) — for testing the accessible path",
      "   without changing OS settings. */",
      ".motion-reduce .reveal, .motion-reduce .reveal.is-revealed {",
      "  opacity: 1;",
      "  transform: none;",
      "  transition: none;",
      "}",
      "");
    return out.join("\n");
  }

  const api = { generateMotionCSS, rem, ms, bezier };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
