/*
 * Color dimension. Depends on shell.js and the globals from color.config.js /
 * generate-color-css.js (COLOR_CONFIG, generateColorCSS, resolvePalette,
 * contrastRatio, BRANDS, NEUTRAL_STEPS, ACCENT_STEPS, STATUS_NAMES) and, for the
 * contrast classification, typography's TYPE_CONFIG/stepPx.
 */
(function (PG) {
  const { h, row, slider, select, group } = PG;
  const KEY = "color";
  const state = () => PG.dimensions[KEY].state;

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  const ACCENT_PRESETS = [
    [0.64, 0.17, 45, "Warm terracotta"],
    [0.72, 0.11, 240, "Calm blue"],
    [0.921, 0.201, 125, "Acid lime"],
    [0.62, 0.19, 350, "Hot pink"],
    [0.55, 0.15, 280, "Violet"],
  ];

  function swatchRowFor(spec) {
    return h("div", { class: "pg-swatchrow", "data-swatchrow": spec });
  }

  function refreshSwatchRows(root) {
    const palette = resolvePalette(state());
    (root || document).querySelectorAll("[data-swatchrow]").forEach((node) => {
      const spec = node.dataset.swatchrow;
      const [kind, key] = spec.includes(":") ? spec.split(":") : [null, spec];
      const isNeutral = kind === "neutral";
      const steps = isNeutral ? NEUTRAL_STEPS : ACCENT_STEPS;
      const scale = isNeutral ? palette.scales.neutrals[key] : palette.scales[key];
      node.replaceChildren(...steps.map((step) => {
        const hex = scale[step];
        return h("div", {},
          h("div", { class: "pg-swatch-chip", style: `background:${hex};`, title: hex }),
          h("div", { class: "pg-swatch-label" }, `${step}`));
      }));
    });
  }

  function seedControls(seed, presets) {
    const rows = [
      row("Lightness", slider(seed.lightness, { min: 0.1, max: 0.95, step: 0.005 }, (v) => update(() => (seed.lightness = v)))),
      row("Chroma", slider(seed.chroma, { min: 0, max: 0.35, step: 0.005 }, (v) => update(() => (seed.chroma = v)))),
      row("Hue", slider(seed.hue, { min: 0, max: 360, step: 1 }, (v) => update(() => (seed.hue = v)))),
    ];
    if (presets) {
      rows.push(row("Presets", select("", [["", "Presets…"], ...presets.map((p, i) => [String(i), p[3]])], (v) => {
        if (v === "") return;
        const [lightness, chroma, hue] = presets[Number(v)];
        update(() => { seed.lightness = lightness; seed.chroma = chroma; seed.hue = hue; });
        PG.renderStep();
      })));
    }
    return rows;
  }

  function scaleStepControl(current, onChange) {
    const scaleNames = ["neutral", "accent", "red", "amber", "green", "blue"];
    const stepsFor = (name) => (name === "neutral" ? NEUTRAL_STEPS : ACCENT_STEPS);
    const [scaleName, step] = current;
    const wrap = h("div", { class: "pg-control" });
    const stepSel = h("select", { onchange: (e) => onChange([scaleName, Number(e.target.value)]) },
      stepsFor(scaleName).map((s) => h("option", { value: s, selected: s === step }, s)));
    const scaleSel = h("select", {
      onchange: (e) => {
        const newScale = e.target.value;
        const steps = stepsFor(newScale);
        const newStep = steps.includes(step) ? step : steps[Math.floor(steps.length / 2)];
        onChange([newScale, newStep]);
      },
    }, scaleNames.map((n) => h("option", { value: n, selected: n === scaleName }, n)));
    wrap.append(scaleSel, stepSel);
    return wrap;
  }

  const STEPS = () => [
    {
      title: "1 · Neutrals",
      hint: "Each brand gets its own hue for the whole neutral scale — nearly gray, just enough tint to feel intentional. Chroma stays constant across every step.",
      render: () => BRANDS.flatMap((brand) => {
        const n = state().primitives.neutrals[brand];
        return [
          group(`${brand} neutral`,
            row("Hue", slider(n.hue, { min: 0, max: 360, step: 1 }, (v) => update(() => (n.hue = v)))),
            row("Chroma", slider(n.chroma, { min: 0, max: 0.03, step: 0.0005 }, (v) => update(() => (n.chroma = v)))),
            swatchRowFor(`neutral:${brand}`)),
        ];
      }),
    },
    {
      title: "2 · Accents",
      hint: "Each brand gets one seed. Hue is fixed across the scale; chroma peaks near the seed's lightness and tapers toward both ends.",
      render: () => [
        group("Portfolio", ...seedControls(state().primitives.accents.portfolio, ACCENT_PRESETS), swatchRowFor("portfolio")),
        group("FeelScience", ...seedControls(state().primitives.accents.feelscience, ACCENT_PRESETS), swatchRowFor("feelscience")),
      ],
    },
    {
      title: "3 · Status colors",
      hint: "Same generation rule as accents: peak chroma at the seed's lightness, tapering toward the ends.",
      render: () => STATUS_NAMES.map((name) =>
        group(name, ...seedControls(state().primitives.status[name]), swatchRowFor(name))),
    },
    {
      title: "4 · Semantic mapping",
      hint: "Pick which primitive step each role points to, separately for light and dark. Roles (or individual modes) marked <b>computed</b> are resolved automatically.",
      render: () => {
        const rows = [];
        for (const [name, role] of Object.entries(state().semantic)) {
          if (role.alias) continue;
          for (const mode of ["light", "dark"]) {
            const value = role[mode];
            rows.push(row(`${name} · ${mode}`, Array.isArray(value)
              ? scaleStepControl(value, (v) => update(() => (role[mode] = v)))
              : h("p", { class: "pg-note" }, "computed automatically")));
          }
        }
        return [group("Role → scale + step", ...rows)];
      },
    },
    {
      title: "5 · Client accents",
      hint: "Case study pages can adopt a client's color with <code>data-accent=\"name\"</code>. It's build-time: each entry gets a full scale and the same contrast-driven accent roles as a brand accent, per brand and mode. Add or remove entries in color.config.js.",
      render: () => {
        const names = Object.keys(state().clientAccents);
        return [
          group("Preview on frames",
            row("Client accent", PG.select(PG.activeClientAccent() || "", [["", "None"], ...names.map((n) => [n, n])], (v) => {
              PG.shared.clientAccent = v || null;
              PG.persist();
              PG.renderStage();
            }))),
          ...names.map((name) => group(name,
            row("Hex", PG.text(state().clientAccents[name].hex, "#rrggbb", (v) => {
              if (/^#[0-9a-fA-F]{6}$/.test(v)) update(() => (state().clientAccents[name].hex = v.toLowerCase()));
            })),
            swatchRowFor(name),
            h("div", { "data-client-readout": name }))),
        ];
      },
    },
  ];

  // Resolved roles + contrast for one client accent, for every brand + mode it can sit on.
  function refreshClientReadouts(root) {
    (root || document).querySelectorAll("[data-client-readout]").forEach((node) => {
      const name = node.dataset.clientReadout;
      const palette = resolvePalette(state());
      const client = palette.clientAccents[name];
      if (!client) return;
      const cell = (hex, on) => `${hex} · ${contrastRatio(hex, on).toFixed(2)}:1`;
      node.replaceChildren(...BRANDS.flatMap((brand) => MODES.map((mode) => {
        const r = client.semanticHex[brand][mode];
        const bg = palette.semanticHex[brand][mode].bg;
        const fill = client.fillInfo[brand][mode];
        const text = client.textInfo[brand][mode];
        const flag = fill.ok && text.ok ? "" : " — RULE NOT MET (fallback in use)";
        return h("p", { class: "pg-note", style: "margin: 0 0 6px;" },
          h("b", {}, `${brand} · ${mode}${flag}`), h("br"),
          `accent ${cell(r.accent, bg)} vs bg (step ${fill.step})`, h("br"),
          `label ${cell(r["text-on-accent"], r.accent)} on accent`, h("br"),
          `accent-text ${cell(r["accent-text"], bg)} (need ${text.target}:1, step ${text.step})`);
      })));
    });
  }

  function afterStepRender() {
    refreshSwatchRows(PG.$("step"));
    refreshClientReadouts(PG.$("step"));
  }

  // ---------- inspect view: full palette swatches + contrast table ----------
  function textThresholdFor(roleName) {
    const role = TYPE_CONFIG.roles[roleName];
    const px = stepPx(TYPE_CONFIG, role.step).max;
    const bold = role.weight >= 700;
    const large = bold ? px >= 18.66 : px >= 24;
    return {
      threshold: large ? 3 : 4.5,
      reason: `${large ? "large" : "normal"} text — role "${roleName}", ${px.toFixed(1)}px${bold ? " bold" : ""} — needs ${large ? 3 : 4.5}:1`,
    };
  }
  const BOUNDARY = { threshold: 3, reason: "non-text UI boundary (WCAG 1.4.11) needs 3:1" };
  const BASE_COMBOS = [["portfolio", "light"], ["portfolio", "dark"], ["feelscience", "light"], ["feelscience", "dark"]];
  // Brand accents first, then each client accent on every brand + mode it can sit on —
  // a third element names the client accent. Recomputed per render: the registry is editable.
  const contrastCombos = () => [
    ...BASE_COMBOS,
    ...Object.keys(state().clientAccents || {}).flatMap((name) => BASE_COMBOS.map(([brand, mode]) => [brand, mode, name])),
  ];
  const comboLabel = ([brand, mode, accent]) => (accent ? `${accent} on ${brand} · ${mode}` : `${brand} · ${mode}`);

  // The palette as seen from one combo. For a client accent, the accent roles (and the
  // fill info the "known exception" check reads) come from that client's resolution; every
  // other role is the brand's own — a client accent leaves neutrals untouched.
  function paletteFor(palette, [brand, mode, accent]) {
    if (!accent) return palette;
    const client = palette.clientAccents[accent];
    return {
      ...palette,
      semanticHex: { [brand]: { [mode]: { ...palette.semanticHex[brand][mode], ...client.semanticHex[brand][mode] } } },
      accentFillInfo: { [brand]: client.fillInfo[brand] },
    };
  }

  const CONTRAST_PAIRS = [
    { id: "body-bg", label: "Body text on bg", used: true, ...textThresholdFor("body"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-primary"], p.semanticHex[b][m].bg) },
    { id: "body-surface", label: "Body text on surface", used: true, ...textThresholdFor("body"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-primary"], p.semanticHex[b][m].surface) },
    { id: "secondary-surface-raised", label: "Secondary text on surface-raised", used: true, ...textThresholdFor("caption"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-secondary"], p.semanticHex[b][m]["surface-raised"]) },
    { id: "link-bg", label: "Link (accent-text) in a paragraph", used: true, ...textThresholdFor("body"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["accent-text"], p.semanticHex[b][m].bg) },
    { id: "button-label", label: "Primary button label on accent fill", used: true, ...textThresholdFor("action"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-on-accent"], p.semanticHex[b][m].accent) },
    { id: "outline-border", label: "Outline button border", used: true, ...BOUNDARY,
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-primary"], p.semanticHex[b][m].bg) },
    { id: "card-border", label: "Card border on bg", used: true, ...BOUNDARY,
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["border-subtle"], p.semanticHex[b][m].bg) },
    { id: "tag", label: "Tag on accent-subtle", used: true, ...textThresholdFor("label"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["accent-text"], p.semanticHex[b][m]["accent-subtle"]) },
    { id: "status", label: "Status message (success)", used: true, ...textThresholdFor("body-sm"),
      ratioFor: (b, m, p) => contrastRatio(p.scales.green[700], p.scales.green[100]) },
    { id: "secondary-bg", label: "Secondary text on bg (labels, byline)", used: true, ...textThresholdFor("body-sm"),
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m]["text-secondary"], p.semanticHex[b][m].bg) },
    { id: "accent-fill-bg", label: "Accent fill on bg (the button itself)", used: true, ...BOUNDARY,
      ratioFor: (b, m, p) => contrastRatio(p.semanticHex[b][m].accent, p.semanticHex[b][m].bg),
      exceptionFor: (b, m, p) => m === "dark" && p.accentFillInfo[b].dark.exception },
    { id: "primary-accent", label: "text-primary on accent", used: false, ...textThresholdFor("body"),
      reasonNotUsed: "text-primary never sits directly on an accent fill — that's what text-on-accent is for." },
    { id: "secondary-surface", label: "text-secondary on surface", used: false, ...textThresholdFor("body-sm"),
      reasonNotUsed: "no design use of secondary text directly on the surface token." },
    { id: "secondary-accent", label: "text-secondary on accent", used: false, ...textThresholdFor("body-sm"),
      reasonNotUsed: "secondary text never sits on an accent fill." },
    { id: "accenttext-surface", label: "accent-text on surface", used: false, ...textThresholdFor("body"),
      reasonNotUsed: "links/accented text render on bg, not on the surface token." },
    { id: "accenttext-accent", label: "accent-text on accent", used: false, ...textThresholdFor("body"),
      reasonNotUsed: "accent-colored text on an accent fill would be illegible by construction — never used." },
    { id: "onaccent-bg", label: "text-on-accent on bg", used: false, ...textThresholdFor("action"),
      reasonNotUsed: "text-on-accent is defined only for use on the accent fill itself." },
    { id: "onaccent-surface", label: "text-on-accent on surface", used: false, ...textThresholdFor("action"),
      reasonNotUsed: "same as above — only ever paired with accent." },
  ];

  function fullPaletteSwatches() {
    const palette = resolvePalette(state());
    const rows = [
      ...BRANDS.map((brand) => [`${brand} neutral`, `neutral:${brand}`, NEUTRAL_STEPS, palette.scales.neutrals[brand]]),
      ...BRANDS.map((brand) => [`${brand} accent`, brand, ACCENT_STEPS, palette.scales[brand]]),
      ...STATUS_NAMES.map((name) => [name, name, ACCENT_STEPS, palette.scales[name]]),
      ...Object.keys(palette.clientAccents).map((name) => [`${name} (client accent)`, name, ACCENT_STEPS, palette.scales[name]]),
    ];
    return h("div", {}, rows.map(([label, spec, steps, scale]) =>
      h("div", { class: "pg-group" },
        h("p", { class: "pg-group-title" }, label),
        h("div", { class: "pg-swatchrow", "data-swatchrow": spec },
          steps.map((step) => h("div", {},
            h("div", { class: "pg-swatch-chip", style: `background:${scale[step]};`, title: scale[step] }),
            h("div", { class: "pg-swatch-label" }, `${step}`)))))));
  }

  function contrastTableView() {
    const palette = resolvePalette(state());
    const usedPairs = CONTRAST_PAIRS.filter((p) => p.used);
    const unusedPairs = CONTRAST_PAIRS.filter((p) => !p.used);

    const usedTable = h("table", { class: "pg-contrast-table" },
      h("thead", {}, h("tr", {},
        h("th", {}, "Pair"), h("th", {}, "Threshold"),
        ...contrastCombos().map((combo) => h("th", {}, comboLabel(combo))))),
      h("tbody", {}, usedPairs.map((pair) =>
        h("tr", {},
          h("td", {}, pair.label),
          h("td", {}, `${pair.threshold}:1`, h("div", { class: "pg-note", style: "margin:2px 0 0;" }, pair.reason)),
          ...contrastCombos().map((combo) => {
            const [brand, mode] = combo;
            const view = paletteFor(palette, combo);
            const ratio = pair.ratioFor(brand, mode, view);
            const isException = pair.exceptionFor && pair.exceptionFor(brand, mode, view);
            const pass = ratio >= pair.threshold;
            return h("td", {}, `${ratio.toFixed(2)}:1`,
              h("div", { class: isException ? "pg-exception" : pass ? "pg-pass" : "pg-fail" },
                isException ? "Known exception" : pass ? "AA pass" : "AA fail"));
          })))));

    const unusedTable = h("table", { class: "pg-contrast-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Pair"), h("th", {}, "Threshold"), h("th", {}, "Why it's not used"))),
      h("tbody", {}, unusedPairs.map((pair) =>
        h("tr", {}, h("td", {}, pair.label), h("td", {}, `${pair.threshold}:1`), h("td", {}, pair.reasonNotUsed)))));

    return h("div", {},
      h("p", { class: "pg-group-title" }, `Used pairs (${usedPairs.length})`),
      h("div", { class: "pg-contrast-wrap" }, usedTable),
      h("details", { class: "pg-note" },
        h("summary", {}, `Not used (${unusedPairs.length}) — the design never renders these, so they can't read as failures`),
        h("div", { class: "pg-contrast-wrap" }, unusedTable)));
  }

  function inspectView() {
    return h("div", {},
      h("p", { class: "pg-group-title" }, "Swatches"),
      fullPaletteSwatches(),
      h("p", { class: "pg-group-title", style: "margin-top: 24px;" }, "Contrast"),
      contrastTableView());
  }

  // ---------- annotate: role labels on marked elements ----------
  function annotate(root) {
    root.classList.add("pg-annotate-active");
    root.querySelectorAll("[data-color-role]").forEach((el) => el.setAttribute("data-annotate", el.dataset.colorRole));
  }

  PG.registerDimension(KEY, {
    name: "Color",
    config: COLOR_CONFIG,
    generate: generateColorCSS,
    cssFileName: "color.css",
    configFileName: "color.config.js",
    globalName: "COLOR_CONFIG",
    steps: STEPS,
    inspectView,
    annotate,
    afterStepRender,
    afterUpdate: () => { refreshSwatchRows(PG.$("step")); refreshClientReadouts(PG.$("step")); },
  });
})(window.PG);
