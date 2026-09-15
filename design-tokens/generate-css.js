/*
 * Turns a TYPE_CONFIG object into CSS custom properties + utility classes.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 */
(function (root) {
  const SCALE_STEPS = [-2, -1, 0, 1, 2, 3, 4, 5, 6];

  const round = (n, places = 4) => Number(n.toFixed(places));
  const rem = (px) => `${round(px / 16)}rem`;

  function stepPx(config, step) {
    const { base, ratio, fluid } = config.scale;
    return {
      min: fluid.minBase * fluid.minRatio ** step,
      max: base * ratio ** step,
    };
  }

  function sizeValue(config, step, fluidUnit) {
    const { fluid } = config.scale;
    const { min, max } = stepPx(config, step);
    const span = fluid.maxViewport - fluid.minViewport;
    // Steps 0 and below (body text and smaller) stay fixed at the desktop value —
    // only headline-sized steps (+1 and up) scale with the viewport.
    if (!fluid.enabled || step <= 0 || span <= 0 || round(min, 3) === round(max, 3)) return rem(max);

    const slope = (max - min) / span;
    const intercept = min - slope * fluid.minViewport;
    const slopeValue = round(Math.abs(slope * 100));
    const sign = slope < 0 ? "-" : "+";
    return `clamp(${rem(Math.min(min, max))}, ${rem(intercept)} ${sign} ${slopeValue}${fluidUnit}, ${rem(Math.max(min, max))})`;
  }

  function fontFormat(file) {
    const ext = file.split(".").pop().toLowerCase();
    return { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" }[ext] || ext;
  }

  function familyStack(font) {
    return font.family ? `"${font.family}", ${font.fallback}` : font.fallback;
  }

  const stepName = (step) => `--font-size-${step}`;
  const tracking = (em) => (Number(em) === 0 ? "0" : `${em}em`);

  function generateTypographyCSS(config, options = {}) {
    const { fontsPath = "fonts/", fluidUnit = "vw", skipFontFaces = [] } = options;
    const out = [];
    const { base, ratio, fluid } = config.scale;

    out.push("/* Typography tokens. Generated from typography.config.js — do not edit by hand. */", "");

    for (const [slot, font] of Object.entries(config.fonts)) {
      if (!font.family || skipFontFaces.includes(slot)) continue;
      const faces = font.faces && font.faces.length
        ? font.faces
        : font.src
        ? [{ src: font.src, weight: font.weightRange, style: "normal" }]
        : [];
      for (const face of faces) {
        out.push(
          "@font-face {",
          `  font-family: "${font.family}";`,
          `  src: url("${fontsPath}${face.src}") format("${fontFormat(face.src)}");`,
          `  font-weight: ${face.weight};`,
          `  font-style: ${face.style || "normal"};`,
          "  font-display: swap;",
          "}",
          ""
        );
      }
    }

    out.push(":root {", "  /* Families */");
    for (const [slot, font] of Object.entries(config.fonts)) {
      out.push(`  --font-family-${slot}: ${familyStack(font)};`);
    }

    const scaleNote = fluid.enabled
      ? `${fluid.minBase}px × ${fluid.minRatio} @ ${fluid.minViewport}px → ${base}px × ${ratio} @ ${fluid.maxViewport}px`
      : `${base}px × ${ratio}`;
    out.push("", `  /* Size scale: ${scaleNote} */`);
    for (const step of SCALE_STEPS) {
      out.push(`  ${stepName(step)}: ${sizeValue(config, step, fluidUnit)};`);
    }

    out.push("", `  --measure: ${config.measure};`);

    for (const [name, role] of Object.entries(config.roles)) {
      out.push(
        "",
        `  /* ${name} */`,
        `  --text-${name}-font-family: var(--font-family-${role.font});`,
        `  --text-${name}-font-size: var(${stepName(role.step)});`,
        `  --text-${name}-font-weight: ${role.weight};`,
        `  --text-${name}-line-height: ${role.lineHeight};`,
        `  --text-${name}-letter-spacing: ${tracking(role.tracking)};`,
        `  --text-${name}-text-transform: ${role.transform};`
      );
    }
    out.push("}", "");

    for (const name of Object.keys(config.roles)) {
      out.push(
        `.text-${name} {`,
        `  font-family: var(--text-${name}-font-family);`,
        `  font-size: var(--text-${name}-font-size);`,
        `  font-weight: var(--text-${name}-font-weight);`,
        `  line-height: var(--text-${name}-line-height);`,
        `  letter-spacing: var(--text-${name}-letter-spacing);`,
        `  text-transform: var(--text-${name}-text-transform);`,
        "}",
        ""
      );
    }

    return out.join("\n");
  }

  const api = { generateTypographyCSS, stepPx, SCALE_STEPS };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
