/*
 * Turns a RADIUS_CONFIG object into CSS custom properties.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 */
(function (root) {
  const round = (n, places = 4) => Number(n.toFixed(places));
  const rem = (px) => `${round(px / 16)}rem`;

  function generateRadiusCSS(config) {
    const { scale, roles, activeBrand } = config;
    const out = [];
    out.push("/* Radius tokens. Generated from radius.config.js — do not edit by hand. */", "");

    out.push(":root {", "  /* Scale */");
    for (const step of scale.steps) {
      out.push(`  --radius-${step}: ${rem(step)}; /* ${step}px */`);
    }
    out.push(`  --radius-full: ${scale.full}px;`);
    out.push(
      "",
      "  /* Nested radius: a role's own radius minus one padding step, floored at 0 so an",
      "     inner element's curve never goes negative when its parent's radius is small.",
      "     Depends on --space-8 from spacing.config.js — load spacing.css alongside this. */",
      "  --radius-nested-card: max(calc(var(--radius-card) - var(--space-8)), 0rem);"
    );
    out.push("}", "");

    // Semantic roles alias to whichever brand is active. Attribute selectors match
    // <html> and any nested element alike, so a section can re-scope its own subtree —
    // same mechanism as --color-accent-* in generate-color-css.js.
    for (const [brand, roleMap] of Object.entries(roles)) {
      const selector = brand === activeBrand ? `:root, [data-brand="${brand}"]` : `[data-brand="${brand}"]`;
      out.push(`${selector} {`, `  /* ${brand} */`);
      for (const [role, value] of Object.entries(roleMap)) {
        const ref = value === "full" ? "var(--radius-full)" : `var(--radius-${value})`;
        out.push(`  --${role}: ${ref};`);
      }
      out.push("}", "");
    }

    return out.join("\n");
  }

  const api = { generateRadiusCSS, rem, round };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
