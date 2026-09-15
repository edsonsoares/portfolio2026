/*
 * Turns a COLOR_CONFIG object into CSS custom properties.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 */
(function (root) {
  const NEUTRAL_STEPS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000];
  const ACCENT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const BRANDS = ["portfolio", "feelscience"];
  const STATUS_NAMES = ["red", "amber", "green", "blue"];
  const MODES = ["light", "dark"];

  // Lightness ladder shared by every scale (neutral uses the full range; accent/status
  // scales use the 50–950 subset). Tuned so neutral-50 ≈ 96.2% and neutral-900 ≈ 27.8%,
  // per the seed reference colors in color.config.js.
  const LIGHTNESS_LADDER = {
    0: 0.995, 50: 0.962, 100: 0.93, 200: 0.87, 300: 0.79, 400: 0.69,
    500: 0.595, 600: 0.5, 700: 0.415, 800: 0.34, 900: 0.278, 950: 0.205, 1000: 0.09,
  };

  // Chroma envelope for accent/status scales: 1.0 (the seed's own chroma) at whichever
  // step's ladder lightness is closest to the seed's `lightness` (defaults to the
  // middle step, 500, if omitted), tapering to 28% of it at the scale's ends. This is
  // what makes the seed's lightness meaningful even though the lightness *ladder*
  // itself is fixed — it shifts where the scale is most saturated.
  function chromaEnvelope(step, peakLightness) {
    const steps = ACCENT_STEPS;
    let centerIdx = 5; // step 500
    if (typeof peakLightness === "number") {
      let best = Infinity;
      steps.forEach((s, i) => {
        const d = Math.abs(LIGHTNESS_LADDER[s] - peakLightness);
        if (d < best) { best = d; centerIdx = i; }
      });
    }
    const i = steps.indexOf(step);
    const maxDist = Math.max(centerIdx, steps.length - 1 - centerIdx) || 1;
    const dist = Math.abs(i - centerIdx) / maxDist;
    const base = 0.28;
    return base + (1 - base) * (1 - Math.pow(dist, 1.3));
  }

  // ---------- OKLCH → sRGB (Björn Ottosson's OKLab matrices) ----------
  function oklabToLinearSrgb(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.089484177 * a - 1.291485548 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    };
  }

  function linearToSrgb(c) {
    const abs = Math.abs(c);
    return abs > 0.0031308 ? (c < 0 ? -1 : 1) * (1.055 * abs ** (1 / 2.4) - 0.055) : 12.92 * c;
  }

  function oklchToLinearSrgb(L, C, H) {
    const hRad = (H * Math.PI) / 180;
    return oklabToLinearSrgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const inGamut = (rgb, eps = 0.0005) =>
    [rgb.r, rgb.g, rgb.b].every((c) => c >= -eps && c <= 1 + eps);

  function toHex(linRgb) {
    const c = (v) => Math.round(clamp01(linearToSrgb(v)) * 255).toString(16).padStart(2, "0");
    return `#${c(linRgb.r)}${c(linRgb.g)}${c(linRgb.b)}`;
  }

  // Reduce chroma until the color fits in sRGB, then convert to hex.
  function oklchToHex(L, C, H) {
    let chroma = C;
    let lin = oklchToLinearSrgb(L, chroma, H);
    let guard = 0;
    while (!inGamut(lin) && chroma > 0 && guard < 40) {
      chroma *= 0.94;
      lin = oklchToLinearSrgb(L, chroma, H);
      guard++;
    }
    return toHex(lin);
  }

  // ---------- WCAG contrast ----------
  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  function srgbToLinearChannel(c) {
    const cs = c / 255;
    return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * srgbToLinearChannel(r) + 0.7152 * srgbToLinearChannel(g) + 0.0722 * srgbToLinearChannel(b);
  }

  function contrastRatio(hexA, hexB) {
    const a = relativeLuminance(hexA), b = relativeLuminance(hexB);
    const lighter = Math.max(a, b), darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ---------- palette resolution ----------
  // Computes every primitive step and resolves every semantic role, for both
  // brands and both modes. Shared by CSS generation and the playground's live UI
  // (contrast table, previews) so both always agree on the actual colors.
  function resolvePalette(config) {
    const { primitives, semantic } = config;
    const scales = { neutral: {} };
    for (const step of NEUTRAL_STEPS) {
      scales.neutral[step] = oklchToHex(LIGHTNESS_LADDER[step], primitives.neutral.chroma, primitives.neutral.hue);
    }
    for (const brand of BRANDS) {
      const seed = primitives.accents[brand];
      scales[brand] = {};
      for (const step of ACCENT_STEPS) {
        scales[brand][step] = oklchToHex(LIGHTNESS_LADDER[step], seed.chroma * chromaEnvelope(step, seed.lightness), seed.hue);
      }
    }
    for (const name of STATUS_NAMES) {
      const seed = primitives.status[name];
      scales[name] = {};
      for (const step of ACCENT_STEPS) {
        scales[name][step] = oklchToHex(LIGHTNESS_LADDER[step], seed.chroma * chromaEnvelope(step, seed.lightness), seed.hue);
      }
    }

    function scaleFor(scaleName, brand) {
      return scaleName === "accent" ? scales[brand] : scales[scaleName];
    }

    // Whichever of neutral-0 / neutral-900 contrasts more against `accent` in this mode.
    function textOnAccent(brand, mode) {
      const accentHex = scales[brand][mode === "light" ? 500 : 400];
      const white = scales.neutral[0], black = scales.neutral[900];
      return contrastRatio(white, accentHex) >= contrastRatio(black, accentHex) ? white : black;
    }

    // Resolve one semantic role to a concrete hex for one brand + mode.
    function resolveRole(name, brand, mode, seen = new Set()) {
      if (seen.has(name)) throw new Error(`Circular semantic alias: ${name}`);
      const role = semantic[name];
      if (role.alias) return resolveRole(role.alias, brand, mode, new Set(seen).add(name));
      if (role.computed === "text-on-accent") return textOnAccent(brand, mode);
      const [scaleName, step] = role[mode];
      return scaleFor(scaleName, brand)[step];
    }

    const roleNames = Object.keys(semantic);
    const semanticHex = {}; // semanticHex[brand][mode][role] = hex
    for (const brand of BRANDS) {
      semanticHex[brand] = { light: {}, dark: {} };
      for (const mode of MODES) {
        for (const name of roleNames) semanticHex[brand][mode][name] = resolveRole(name, brand, mode);
      }
    }

    return { scales, semanticHex, roleNames, activeBrand: primitives.activeBrand };
  }

  // ---------- CSS generation ----------
  function generateColorCSS(config) {
    const { primitives } = config;
    const { scales, roleNames } = resolvePalette(config);
    const out = [];
    out.push("/* Color tokens. Generated from color.config.js — do not edit by hand. */", "");

    out.push(":root {", "  /* Neutral */");
    for (const step of NEUTRAL_STEPS) out.push(`  --color-neutral-${step}: ${scales.neutral[step]};`);
    for (const brand of BRANDS) {
      out.push("", `  /* ${brand} */`);
      for (const step of ACCENT_STEPS) out.push(`  --color-${brand}-${step}: ${scales[brand][step]};`);
    }
    for (const name of STATUS_NAMES) {
      out.push("", `  /* ${name} */`);
      for (const step of ACCENT_STEPS) out.push(`  --color-${name}-${step}: ${scales[name][step]};`);
    }
    out.push("}", "");

    // `accent-*` aliases to whichever brand scale is active. Attribute selectors match
    // <html> and any nested element alike, so a section can re-scope its own subtree.
    out.push(`:root, [data-brand="${primitives.activeBrand}"] {`, "  /* accent → active brand (default) */");
    for (const step of ACCENT_STEPS) out.push(`  --color-accent-${step}: var(--color-${primitives.activeBrand}-${step});`);
    out.push("}", "");
    for (const brand of BRANDS) {
      if (brand === primitives.activeBrand) continue;
      out.push(`[data-brand="${brand}"] {`);
      for (const step of ACCENT_STEPS) out.push(`  --color-accent-${step}: var(--color-${brand}-${step});`);
      out.push("}", "");
    }

    // Semantic roles that resolve purely via var() indirection (everything except
    // text-on-accent, which needs a concrete precomputed value — see below).
    const roleVar = (name) => `--color-${name}`;
    const scaleVar = (scaleName, step) => `var(--color-${scaleName === "accent" ? "accent" : scaleName}-${step})`;
    for (const mode of MODES) {
      const selector = mode === "light" ? `:root, [data-mode="light"]` : `[data-mode="dark"]`;
      out.push(`${selector} {`, `  /* semantic roles → ${mode} */`);
      for (const name of roleNames) {
        const role = config.semantic[name];
        if (role.computed) continue; // emitted per brand+mode below
        if (role.alias) {
          out.push(`  ${roleVar(name)}: var(${roleVar(role.alias)});`);
          continue;
        }
        const [scaleName, step] = role[mode];
        out.push(`  ${roleVar(name)}: ${scaleVar(scaleName, step)};`);
      }
      out.push("}", "");
    }

    // text-on-accent depends on both the active brand's accent hue AND the mode, so it
    // needs a concrete hex per (brand, mode) combination — plain var() can't compute contrast.
    const palette = resolvePalette(config);
    out.push(`:root, [data-mode="light"] {`, "  /* text-on-accent → active brand, light (default) */",
      `  --color-text-on-accent: ${palette.semanticHex[primitives.activeBrand].light["text-on-accent"]};`, "}", "");
    out.push(`[data-mode="dark"] {`, "  /* text-on-accent → active brand, dark (default) */",
      `  --color-text-on-accent: ${palette.semanticHex[primitives.activeBrand].dark["text-on-accent"]};`, "}", "");
    for (const brand of BRANDS) {
      for (const mode of MODES) {
        out.push(`[data-brand="${brand}"][data-mode="${mode}"] {`,
          `  --color-text-on-accent: ${palette.semanticHex[brand][mode]["text-on-accent"]};`, "}", "");
      }
    }

    return out.join("\n");
  }

  const api = {
    generateColorCSS,
    resolvePalette,
    oklchToHex,
    contrastRatio,
    relativeLuminance,
    hexToRgb,
    chromaEnvelope,
    NEUTRAL_STEPS,
    ACCENT_STEPS,
    BRANDS,
    STATUS_NAMES,
    MODES,
    LIGHTNESS_LADDER,
  };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
