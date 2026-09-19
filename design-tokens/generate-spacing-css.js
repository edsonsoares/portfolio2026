/*
 * Turns a SPACING_CONFIG object into CSS custom properties.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 */
(function (root) {
  const round = (n, places = 4) => Number(n.toFixed(places));
  const rem = (px) => `${round(px / 16)}rem`;

  // A scale "step" is a multiplier of baseUnit, not a raw px value — this is what
  // lets the whole scale rescale when baseUnit changes.
  function pxFor(scale, multiplier) {
    return multiplier * scale.baseUnit;
  }
  // Tokens are named by their computed px value, rounded to the nearest integer.
  function nameFor(scale, multiplier) {
    return round(pxFor(scale, multiplier), 0);
  }

  function fluidValue(entry, fluid, fluidUnit) {
    const { min, max } = entry;
    const span = fluid.maxViewport - fluid.minViewport;
    if (span <= 0 || round(min, 3) === round(max, 3)) return rem(max);
    const slope = (max - min) / span;
    const intercept = min - slope * fluid.minViewport;
    const slopeValue = round(Math.abs(slope * 100));
    const sign = slope < 0 ? "-" : "+";
    return `clamp(${rem(Math.min(min, max))}, ${rem(intercept)} ${sign} ${slopeValue}${fluidUnit}, ${rem(Math.max(min, max))})`;
  }

  function generateSpacingCSS(config, options = {}) {
    const { fluidUnit = "vw" } = options;
    const { scale, fluid, roles, textFlow } = config;
    const out = [];
    out.push("/* Spacing tokens. Generated from spacing.config.js — do not edit by hand. */", "");

    out.push(":root {", `  /* Scale — base unit ${scale.baseUnit}px */`);
    for (const multiplier of scale.steps) {
      const px = pxFor(scale, multiplier);
      out.push(`  --space-${nameFor(scale, multiplier)}: ${rem(px)}; /* ${round(px, 2)}px */`);
    }

    out.push("", `  /* Fluid: ${fluid.minViewport}px → ${fluid.maxViewport}px */`);
    for (const [name, entry] of Object.entries(fluid.entries)) {
      out.push(`  --space-${name}: ${fluidValue(entry, fluid, fluidUnit)}; /* ${entry.min}px → ${entry.max}px */`);
    }

    out.push("", "  /* Semantic roles */");
    for (const [name, role] of Object.entries(roles)) {
      if (role.fluid) {
        // Fluid roles already got their own token above under the same name.
        if (role.fluid === name) continue;
        out.push(`  --space-${name}: var(--space-${role.fluid});`);
      } else {
        out.push(`  --space-${name}: var(--space-${nameFor(scale, role.step)});`);
      }
    }

    out.push("", "  /* Text flow (em) */");
    for (const [name, em] of Object.entries(textFlow)) {
      out.push(`  --space-${name}: ${em}em;`);
    }

    out.push("}", "");
    return out.join("\n");
  }

  const api = { generateSpacingCSS, pxFor, nameFor, fluidValue, round, rem };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
