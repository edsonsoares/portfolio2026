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

  // The accent step whose ladder lightness is closest to a given target lightness —
  // used both to place the chroma envelope's peak and as each brand's "anchor" step
  // (the truest rendition of its seed color).
  function nearestStepTo(lightness, steps = ACCENT_STEPS) {
    let best = steps[0], bestDist = Infinity;
    for (const s of steps) {
      const d = Math.abs(LIGHTNESS_LADDER[s] - lightness);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    return best;
  }

  // Chroma envelope for accent/status scales: 1.0 (the seed's own chroma) at whichever
  // step's ladder lightness is closest to the seed's `lightness` (defaults to the
  // middle step, 500, if omitted), tapering to 28% of it at the scale's ends. This is
  // what makes the seed's lightness meaningful even though the lightness *ladder*
  // itself is fixed — it shifts where the scale is most saturated.
  function chromaEnvelope(step, peakLightness) {
    const steps = ACCENT_STEPS;
    const centerIdx = steps.indexOf(typeof peakLightness === "number" ? nearestStepTo(peakLightness) : 500);
    const i = steps.indexOf(step);
    const maxDist = Math.max(centerIdx, steps.length - 1 - centerIdx) || 1;
    const dist = Math.abs(i - centerIdx) / maxDist;
    const base = 0.28;
    return base + (1 - base) * (1 - Math.pow(dist, 1.3));
  }

  // Chroma envelope for NEUTRAL scales only (accent/status keep chromaEnvelope above).
  // A light bg/surface reads as tinted much more easily than a mid-tone one, so the
  // lightest steps are pulled toward pure gray and the seed's tint builds up through
  // the middle/dark steps instead, tapering slightly again at the very darkest step.
  const NEUTRAL_CHROMA_ENVELOPE = {
    0: 0.2, 50: 0.2,
    100: 0.4,
    200: 0.7, 300: 0.7,
    400: 1, 500: 1, 600: 1, 700: 1, 800: 1, 900: 1, 950: 1,
    1000: 0.6,
  };
  function neutralChromaEnvelope(step) {
    return NEUTRAL_CHROMA_ENVELOPE[step];
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
    const scales = { neutrals: {} };
    for (const brand of BRANDS) {
      const seed = primitives.neutrals[brand];
      scales.neutrals[brand] = {};
      for (const step of NEUTRAL_STEPS) {
        scales.neutrals[brand][step] = oklchToHex(LIGHTNESS_LADDER[step], seed.chroma * neutralChromaEnvelope(step), seed.hue);
      }
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
      if (scaleName === "accent") return scales[brand];
      if (scaleName === "neutral") return scales.neutrals[brand];
      return scales[scaleName];
    }

    // The accent step closest to the brand's seed lightness — the truest rendition of
    // the brand's color (e.g. terracotta ~500, Klein blue ~700).
    function anchorStepFor(brand) {
      return nearestStepTo(primitives.accents[brand].lightness);
    }

    function accentAnchor(brand) {
      const step = anchorStepFor(brand);
      return { step, hex: scales[brand][step] };
    }

    // Best label color for a given fill, chosen from neutral-0/900/950/1000 — not just
    // white/near-black — since a vivid, fairly light accent (e.g. an orange-red seed) can
    // land where near-black narrowly misses 4.5:1 but a truly black neutral step clears it
    // with room to spare. Picks whichever candidate that reaches `target` has the most
    // headroom above it; if none do, falls back to the single highest-contrast candidate.
    function bestTextOn(brand, hex, target = 4.5) {
      const candidates = [0, 900, 950, 1000].map((step) => scales.neutrals[brand][step]);
      const scored = candidates.map((c) => ({ hex: c, contrast: contrastRatio(c, hex) }));
      const passing = scored.filter((c) => c.contrast >= target);
      const pool = passing.length ? passing : scored;
      return pool.sort((a, b) => b.contrast - a.contrast)[0].hex;
    }

    // The accent fill step for a mode: prefers the anchor (the truest brand color). Among
    // steps that would work at all, a step where a WHITE label reaches 4.5:1 always wins
    // over one that only works with a dark label — closest to the anchor first, most
    // white-contrast headroom as the tiebreak — since a dark label reads as an odd,
    // unbranded choice next to an otherwise vivid accent. Only if no step lets white reach
    // 4.5:1 (with, in dark mode, the fill also clearing 3:1 against bg) does the search
    // fall back to the best-of-4 label from bestTextOn. Falls back further to the best
    // bg-contrast step (flagged via `ok: false`) if nothing clears both at all.
    //
    // A brand can opt out entirely via `darkFillException: true` on its accent seed: dark
    // mode then keeps the anchor regardless, with a forced white label, as a deliberate,
    // documented trade-off rather than a search result.
    const FILL_MIN_TEXT_CONTRAST = 4.5;
    const FILL_MIN_BG_CONTRAST_DARK = 3;
    function accentFillStep(brand, mode) {
      const anchor = anchorStepFor(brand);
      if (mode === "dark" && primitives.accents[brand].darkFillException) {
        const hex = scales[brand][anchor];
        const textHex = scales.neutrals[brand][0];
        const bgHex = resolveRole("bg", brand, "dark");
        return {
          step: anchor,
          hex,
          textHex,
          bgContrast: contrastRatio(hex, bgHex),
          textContrast: contrastRatio(textHex, hex),
          lightnessDist: 0,
          ok: true,
          exception: true,
        };
      }
      const anchorLightness = LIGHTNESS_LADDER[anchor];
      const bgHex = resolveRole("bg", brand, mode);
      const minBg = mode === "dark" ? FILL_MIN_BG_CONTRAST_DARK : 0;
      const white = scales.neutrals[brand][0];
      const candidates = ACCENT_STEPS.map((step) => {
        const hex = scales[brand][step];
        const whiteContrast = contrastRatio(white, hex);
        const textHex = bestTextOn(brand, hex);
        return {
          step,
          hex,
          whiteContrast,
          textHex,
          textContrast: contrastRatio(textHex, hex),
          bgContrast: contrastRatio(hex, bgHex),
          lightnessDist: Math.abs(LIGHTNESS_LADDER[step] - anchorLightness),
        };
      });

      const whitePassing = candidates.filter(
        (c) => c.whiteContrast >= FILL_MIN_TEXT_CONTRAST && c.bgContrast >= minBg
      );
      if (whitePassing.length) {
        whitePassing.sort((a, b) => a.lightnessDist - b.lightnessDist || b.whiteContrast - a.whiteContrast);
        const chosen = whitePassing[0];
        return {
          step: chosen.step,
          hex: chosen.hex,
          textHex: white,
          bgContrast: chosen.bgContrast,
          textContrast: chosen.whiteContrast,
          lightnessDist: chosen.lightnessDist,
          ok: true,
          exception: false,
        };
      }

      const passing = candidates.filter(
        (c) => c.bgContrast >= minBg && c.textContrast >= FILL_MIN_TEXT_CONTRAST
      );
      if (passing.length) {
        passing.sort((a, b) => a.lightnessDist - b.lightnessDist || b.textContrast - a.textContrast);
        return { ...passing[0], ok: true, exception: false };
      }
      const fallback = [...candidates].sort((a, b) => b.bgContrast - a.bgContrast)[0];
      return { ...fallback, ok: false, exception: false };
    }

    // One step darker (higher step number) than the resolved light-mode fill, clamped to
    // the scale's end — kept visually coherent with whatever the fill actually renders as,
    // not the theoretical anchor (they can differ once accentFillStep adjusts for contrast).
    function accentHoverAnchor(brand) {
      const fillStep = accentFillStep(brand, "light").step;
      const i = ACCENT_STEPS.indexOf(fillStep);
      const step = ACCENT_STEPS[Math.min(i + 1, ACCENT_STEPS.length - 1)];
      return { step, hex: scales[brand][step] };
    }

    // Reuses accentFillStep's own label choice rather than recomputing it independently —
    // accentFillStep sometimes picks a step *because* white passes there even though a
    // dark label would have more headroom, and re-deriving the label here with a plain
    // "most headroom" rule would silently disagree and pick dark anyway. A brand with a
    // declared darkFillException instead keeps the true brand color for its dark fill and
    // forces white regardless of what either picker would say.
    function textOnAccent(brand, mode) {
      if (mode === "dark" && primitives.accents[brand].darkFillException) {
        return scales.neutrals[brand][0];
      }
      return accentFillStep(brand, mode).textHex;
    }

    // Picks the accent step closest to the brand's seed lightness (i.e. preferring the
    // anchor itself) among steps that reach the mode's target ratio against bg — 4.5:1 in
    // light mode, 7:1 in dark mode (small accent text needs the stricter target there).
    // Falls back to the highest-contrast step (flagged via `ok: false`) if none clear it.
    const ACCENT_TEXT_TARGET_RATIO = { light: 4.5, dark: 7 };
    function accentTextStep(brand, mode) {
      const bgHex = resolveRole("bg", brand, mode);
      const seedLightness = primitives.accents[brand].lightness;
      const target = ACCENT_TEXT_TARGET_RATIO[mode];
      const candidates = ACCENT_STEPS.map((step) => {
        const hex = scales[brand][step];
        return {
          step,
          hex,
          contrast: contrastRatio(hex, bgHex),
          lightnessDist: Math.abs(LIGHTNESS_LADDER[step] - seedLightness),
        };
      });
      const passing = candidates.filter((c) => c.contrast >= target);
      if (passing.length) {
        passing.sort((a, b) => a.lightnessDist - b.lightnessDist);
        return { ...passing[0], ok: true, target };
      }
      const fallback = [...candidates].sort((a, b) => b.contrast - a.contrast)[0];
      return { ...fallback, ok: false, target };
    }

    // Resolve one semantic role to a concrete hex for one brand + mode. Each mode's value
    // is either a plain [scaleName, step] pick or a { computed: "name" } marker.
    function resolveRole(name, brand, mode, seen = new Set()) {
      if (seen.has(name)) throw new Error(`Circular semantic alias: ${name}`);
      const role = semantic[name];
      if (role.alias) return resolveRole(role.alias, brand, mode, new Set(seen).add(name));
      const value = role[mode];
      if (Array.isArray(value)) {
        const [scaleName, step] = value;
        return scaleFor(scaleName, brand)[step];
      }
      switch (value.computed) {
        case "accent-fill": return accentFillStep(brand, mode).hex;
        case "accent-hover-anchor": return accentHoverAnchor(brand).hex;
        case "accent-text": return accentTextStep(brand, mode).hex;
        case "text-on-accent": return textOnAccent(brand, mode);
        default: throw new Error(`Unknown computed role: ${name}/${mode}`);
      }
    }

    const roleNames = Object.keys(semantic);
    const semanticHex = {}; // semanticHex[brand][mode][role] = hex
    const accentAnchorInfo = {}; // accentAnchorInfo[brand] = { step, hex } — the pure "truest color" step
    const accentFillInfo = {}; // accentFillInfo[brand][mode] = { step, hex, textHex, bgContrast, textContrast, ok, exception }
    const accentTextInfo = {}; // accentTextInfo[brand][mode] = { step, hex, contrast, lightnessDist, ok, target }
    for (const brand of BRANDS) {
      semanticHex[brand] = { light: {}, dark: {} };
      accentAnchorInfo[brand] = accentAnchor(brand);
      accentFillInfo[brand] = {};
      accentTextInfo[brand] = {};
      for (const mode of MODES) {
        for (const name of roleNames) semanticHex[brand][mode][name] = resolveRole(name, brand, mode);
        accentFillInfo[brand][mode] = accentFillStep(brand, mode);
        accentTextInfo[brand][mode] = accentTextStep(brand, mode);
      }
    }

    return { scales, semanticHex, roleNames, accentAnchorInfo, accentFillInfo, accentTextInfo, activeBrand: primitives.activeBrand };
  }

  // ---------- CSS generation ----------
  function generateColorCSS(config) {
    const { primitives, semantic } = config;
    const palette = resolvePalette(config);
    const { scales, roleNames } = palette;
    const out = [];
    out.push("/* Color tokens. Generated from color.config.js — do not edit by hand. */", "");

    out.push(":root {");
    for (const brand of BRANDS) {
      out.push("", `  /* ${brand} neutral */`);
      for (const step of NEUTRAL_STEPS) out.push(`  --color-neutral-${brand}-${step}: ${scales.neutrals[brand][step]};`);
    }
    for (const brand of BRANDS) {
      out.push("", `  /* ${brand} */`);
      for (const step of ACCENT_STEPS) out.push(`  --color-${brand}-${step}: ${scales[brand][step]};`);
    }
    for (const name of STATUS_NAMES) {
      out.push("", `  /* ${name} */`);
      for (const step of ACCENT_STEPS) out.push(`  --color-${name}-${step}: ${scales[name][step]};`);
    }
    out.push("}", "");

    // `neutral-*` and `accent-*` alias to whichever brand scale is active. Attribute
    // selectors match <html> and any nested element alike, so a section can re-scope
    // its own subtree.
    out.push(`:root, [data-brand="${primitives.activeBrand}"] {`, "  /* neutral + accent → active brand (default) */");
    for (const step of NEUTRAL_STEPS) out.push(`  --color-neutral-${step}: var(--color-neutral-${primitives.activeBrand}-${step});`);
    for (const step of ACCENT_STEPS) out.push(`  --color-accent-${step}: var(--color-${primitives.activeBrand}-${step});`);
    out.push("}", "");
    for (const brand of BRANDS) {
      if (brand === primitives.activeBrand) continue;
      out.push(`[data-brand="${brand}"] {`);
      for (const step of NEUTRAL_STEPS) out.push(`  --color-neutral-${step}: var(--color-neutral-${brand}-${step});`);
      for (const step of ACCENT_STEPS) out.push(`  --color-accent-${step}: var(--color-${brand}-${step});`);
      out.push("}", "");
    }

    // Semantic roles that resolve purely via var() indirection. Roles with a computed
    // value for this mode are skipped here and emitted as concrete hex below instead,
    // since plain var() indirection can't express "closest step that passes 4.5:1".
    const roleVar = (name) => `--color-${name}`;
    const scaleVar = (scaleName, step) => `var(--color-${scaleName === "accent" ? "accent" : scaleName}-${step})`;
    for (const mode of MODES) {
      const selector = mode === "light" ? `:root, [data-mode="light"]` : `[data-mode="dark"]`;
      out.push(`${selector} {`, `  /* semantic roles → ${mode} */`);
      for (const name of roleNames) {
        const role = semantic[name];
        if (role.alias) {
          out.push(`  ${roleVar(name)}: var(${roleVar(role.alias)});`);
          continue;
        }
        const value = role[mode];
        if (Array.isArray(value)) {
          const [scaleName, step] = value;
          out.push(`  ${roleVar(name)}: ${scaleVar(scaleName, step)};`);
        }
        // else: computed for this mode, emitted per brand+mode below.
      }
      out.push("}", "");
    }

    // Roles computed for at least one mode need a concrete hex per (brand, mode)
    // combination — plain var() indirection can't express contrast-driven picks.
    function isComputed(name, mode) {
      const value = semantic[name][mode];
      return !Array.isArray(value) && !!value && !!value.computed;
    }
    function annotate(name, brand, mode) {
      if (name === "accent-text") {
        const info = palette.accentTextInfo[brand][mode];
        return ` /* step ${info.step}, ${info.contrast.toFixed(2)}:1 vs bg${info.ok ? "" : ` — fallback, below ${info.target}:1`} */`;
      }
      if (name === "accent") {
        const info = palette.accentFillInfo[brand][mode];
        const anchor = palette.accentAnchorInfo[brand].step;
        const movedNote = info.step !== anchor ? `, moved from anchor ${anchor} for label contrast` : "";
        const note = info.exception
          ? " — known exception: true brand color kept below 3:1 vs bg by design"
          : info.ok ? movedNote : " — fallback, below target";
        return ` /* step ${info.step}, ${info.bgContrast.toFixed(2)}:1 vs bg, text ${info.textContrast.toFixed(2)}:1${note} */`;
      }
      return "";
    }
    for (const name of roleNames) {
      if (semantic[name].alias) continue;
      const computedModes = MODES.filter((mode) => isComputed(name, mode));
      if (!computedModes.length) continue;
      for (const mode of computedModes) {
        const selector = mode === "light" ? `:root, [data-mode="light"]` : `[data-mode="dark"]`;
        out.push(`${selector} {`, `  /* ${name} → active brand, ${mode} (default) */`,
          `  ${roleVar(name)}: ${palette.semanticHex[primitives.activeBrand][mode][name]};`, "}", "");
      }
      for (const brand of BRANDS) {
        for (const mode of computedModes) {
          out.push(`[data-brand="${brand}"][data-mode="${mode}"] {`,
            `  ${roleVar(name)}: ${palette.semanticHex[brand][mode][name]};${annotate(name, brand, mode)}`,
            "}", "");
        }
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
    neutralChromaEnvelope,
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
