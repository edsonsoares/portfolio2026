/*
 * Typography dimension. Depends on shell.js (PG.h/row/slider/select/text/group,
 * PG.updateDim, PG.registerDimension) and the globals from typography.config.js /
 * generate-css.js (TYPE_CONFIG, generateTypographyCSS, stepPx, SCALE_STEPS).
 */
(function (PG) {
  const { h, row, slider, select, text, group } = PG;
  const KEY = "typography";
  const state = () => PG.dimensions[KEY].state;
  const roleNames = () => Object.keys(state().roles);

  const RATIOS = [
    [1.067, "Minor second"], [1.125, "Major second"], [1.2, "Minor third"], [1.25, "Major third"],
    [1.333, "Perfect fourth"], [1.414, "Augmented fourth"], [1.5, "Perfect fifth"], [1.618, "Golden ratio"],
  ];

  const SAMPLES = {
    display: "Calm interfaces for complex science",
    "display-editorial": "The quiet architecture of trust",
    "heading-lg": "Designing for how people actually feel",
    "heading-md": "What the research tells us",
    "heading-sm": "Methods and participants",
    "body-lg": "A short introduction that sets up the story and invites the reader to keep going.",
    body: "Body copy carries most of the reading. It needs a comfortable size, generous line height and a measure that keeps lines from running too long. Ação, coração, 38 °C, ±0.5 µg, H₂O, 10⁶.",
    prose: [
      "Long-form reading text favors a serif at a relaxed line height, so paragraphs stay comfortable across a wide measure. ",
      h("em", {}, "This sentence is set in italic to check the serif's italic face."),
      " The rest returns to upright text so the two can be compared side by side.",
    ],
    "body-sm": "Secondary information, metadata and supporting details — 12 min read · Sep 2026.",
    caption: "Figure 2. Heart-rate variability across participants (n = 48, p < 0.05).",
    label: "Read case study",
    action: "Continue",
    mono: "const hrv = rmssd(intervals); // 42.7 ms",
  };

  const px = (n) => `${Number(n.toFixed(2))}px`;
  const roleRows = (build) => roleNames().map((name) => row(name, build(state().roles[name], name)));

  // ---------- fonts ----------
  const faceStatus = {};
  const faceKey = (slot, face) => `${slot}:${face.src}`;
  const facesOf = (slot) => state().fonts[slot].faces || [];

  function weightsFor(slot) {
    const faces = facesOf(slot);
    if (faces.length) return [...new Set(faces.map((f) => f.weight))].sort((a, b) => a - b);
    return [100, 200, 300, 400, 500, 600, 700, 800, 900];
  }
  function nearestWeight(available, target) {
    return available.reduce((best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best), available[0]);
  }
  function weightRangeOf(slot) {
    for (const face of facesOf(slot)) {
      if (typeof face.weight === "string" && face.weight.trim().includes(" ")) {
        const [min, max] = face.weight.trim().split(/\s+/).map(Number);
        return [min, max];
      }
    }
    return null;
  }
  function checkWeightOf(face) {
    return typeof face.weight === "string" ? face.weight.trim().split(/\s+/)[0] : face.weight;
  }
  function facesList(slot) {
    const faces = facesOf(slot);
    if (!faces.length) return [h("p", { class: "pg-note" }, "No static faces configured — using the fallback stack.")];
    return faces.map((face, i) => {
      const label = `${face.src} — ${face.weight}${face.style === "italic" ? " italic" : ""}`;
      return h("p", { class: "pg-note", id: `facestatus-${slot}-${i}` }, `${label} — checking…`);
    });
  }
  function setFaceStatusNode(slot, i, face, status) {
    const node = PG.$(`facestatus-${slot}-${i}`);
    if (!node) return;
    const label = `${face.src} — ${face.weight}${face.style === "italic" ? " italic" : ""}`;
    node.textContent = `${label} — ${status}`;
    node.className = `pg-note ${status === "loaded" ? "ok" : "warn"}`;
  }
  async function checkFaces() {
    for (const slot of ["sans", "mono", "serif"]) {
      const font = state().fonts[slot];
      const faces = facesOf(slot);
      if (!font.family) continue;
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        const key = faceKey(slot, face);
        const spec = `${face.style === "italic" ? "italic " : ""}${checkWeightOf(face)} 16px "${font.family}"`;
        try {
          const result = await document.fonts.load(spec);
          faceStatus[key] = result.length > 0 ? "loaded" : "missing";
        } catch {
          faceStatus[key] = "missing";
        }
        setFaceStatusNode(slot, i, face, faceStatus[key]);
      }
    }
  }

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  const STEPS = () => [
    {
      title: "1 · Scale",
      hint: "Pick a <b>base size</b> for body text and a <b>ratio</b> between steps. Small ratios (1.125–1.2) suit dense, reading-heavy UIs; larger ones (1.25–1.333) give more dramatic headings.",
      render: () => [
        group("Scale",
          row("Base (px)", slider(state().scale.base, { min: 12, max: 24, step: 0.5 }, (v) => update(() => (state().scale.base = v)))),
          row("Ratio", ratioControl(state().scale.ratio, (v) => update(() => (state().scale.ratio = v))))),
      ],
    },
    {
      title: "2 · Mapping",
      hint: "Assign each role to a step on the scale. Roles can share a step and still differ through weight, line height or case.",
      render: () => [
        group("Step per role",
          ...roleRows((role) => select(role.step,
            SCALE_STEPS.map((s) => [s, `${s > 0 ? "+" : ""}${s}  ·  ${px(stepPx(state(), s).max)}`]),
            (v) => update(() => (role.step = Number(v)))))),
      ],
    },
    {
      title: "3 · Fonts & weight",
      hint: "Faces load automatically from <b>design-tokens/fonts/</b>, as listed in typography.config.js. Static fonts are limited to their available weights; variable fonts allow any weight in their range.",
      render: () => [
        ...["sans", "mono", "serif"].map((slot) => group(`${slot} font`,
          row("Family", text(state().fonts[slot].family, "e.g. Inter", (v) => update(() => (state().fonts[slot].family = v.trim())))),
          ...facesList(slot))),
        group("Weight per role",
          ...roleRows((role) => {
            const range = weightRangeOf(role.font);
            return range
              ? slider(role.weight, { min: range[0], max: range[1], step: 1 }, (v) => update(() => (role.weight = v)))
              : select(role.weight, weightsFor(role.font).map((w) => [w, w]), (v) => update(() => (role.weight = Number(v))));
          })),
        group("Font per role",
          ...roleRows((role) => select(role.font, [["sans", "sans"], ["mono", "mono"], ["serif", "serif"]], (v) => update(() => {
            role.font = v;
            const range = weightRangeOf(v);
            if (range) {
              role.weight = Math.min(Math.max(role.weight, range[0]), range[1]);
            } else {
              const avail = weightsFor(v);
              if (!avail.includes(role.weight)) role.weight = nearestWeight(avail, role.weight);
            }
          })))),
      ],
    },
    {
      title: "4 · Line height",
      hint: "Headings usually want tight line height (1.05–1.25); body text needs more (1.45–1.7). <b>Measure</b> caps the line length of running text.",
      render: () => [
        group("Line height per role",
          ...roleRows((role) => slider(role.lineHeight, { min: 0.9, max: 2, step: 0.05 }, (v) => update(() => (role.lineHeight = v))))),
        group("Measure",
          row("Max width (ch)", slider(parseFloat(state().measure), { min: 40, max: 90, step: 1 }, (v) => update(() => (state().measure = `${v}ch`))))),
      ],
    },
    {
      title: "5 · Letter spacing",
      hint: "Large type usually looks better slightly tightened (negative em). Small uppercase labels need positive tracking to stay legible.",
      render: () => [
        group("Tracking per role (em)",
          ...roleRows((role) => slider(role.tracking, { min: -0.06, max: 0.2, step: 0.005 }, (v) => update(() => (role.tracking = v))))),
        group("Case",
          ...roleRows((role) => select(role.transform,
            [["none", "none"], ["uppercase", "UPPERCASE"], ["lowercase", "lowercase"], ["capitalize", "Capitalize"]],
            (v) => update(() => (role.transform = v))))),
      ],
    },
    {
      title: "6 · Responsive",
      hint: "Turn on fluid sizing so large steps shrink on small screens while body text barely changes.",
      render: () => {
        const f = state().scale.fluid;
        return [
          group("Fluid type",
            row("Enabled", PG.checkbox(f.enabled, (v) => update(() => (f.enabled = v))))),
          group(`Mobile (at ${f.minViewport}px and below)`,
            row("Viewport", PG.number(f.minViewport, { min: 240, max: 900, step: 10 }, (v) => update(() => (f.minViewport = v)))),
            row("Base (px)", slider(f.minBase, { min: 12, max: 24, step: 0.5 }, (v) => update(() => (f.minBase = v)))),
            row("Ratio", ratioControl(f.minRatio, (v) => update(() => (f.minRatio = v))))),
          group(`Desktop (at ${f.maxViewport}px and above)`,
            row("Viewport", PG.number(f.maxViewport, { min: 600, max: 2400, step: 10 }, (v) => update(() => (f.maxViewport = v)))),
            h("p", { class: "pg-note" }, `Base ${state().scale.base}px × ratio ${state().scale.ratio} (set in step 1)`)),
        ];
      },
    },
  ];

  function ratioControl(value, onChange) {
    const wrap = slider(value, { min: 1, max: 1.8, step: 0.001 }, onChange);
    const sel = h("select", {
      onchange: (e) => {
        if (!e.target.value) return;
        wrap.querySelectorAll("input").forEach((i) => (i.value = e.target.value));
        onChange(Number(e.target.value));
      },
    }, h("option", { value: "" }, "Presets…"), RATIOS.map(([r, name]) => h("option", { value: r }, `${r} · ${name}`)));
    wrap.querySelector("input[type=range]").replaceWith(sel);
    return wrap;
  }

  // ---------- inspect view: specimen + scale ladder ----------
  const editable = (cls, content, tag = "p") => h(tag, { class: cls, contenteditable: "true", spellcheck: "false" }, content);

  function specimenView() {
    return h("div", { class: "pv-specimen" }, roleNames().map((name) =>
      h("div", { class: "pv-spec-row" },
        h("div", { class: "pv-meta", "data-meta": name }),
        editable(`text-${name}`, SAMPLES[name], name === "mono" ? "code" : "p"))));
  }

  function scaleView() {
    return h("div", {}, [...SCALE_STEPS].reverse().map((s) =>
      h("div", { class: "pv-ladder-row" },
        h("div", { class: "pv-meta", "data-step": s }),
        h("div", { class: "pv-ladder-sample", style: `font-size: var(--font-size-${s})`, contenteditable: "true", spellcheck: "false" },
          "Aa — The quick brown fox jumps over the lazy dog"))));
  }

  function refreshMeta(root) {
    root.querySelectorAll("[data-meta]").forEach((node) => {
      const name = node.dataset.meta;
      const role = state().roles[name];
      const sample = node.nextElementSibling;
      const size = sample ? parseFloat(getComputedStyle(sample).fontSize) : 0;
      node.replaceChildren(
        h("strong", {}, name),
        `step ${role.step} · ${px(size)}`, h("br"),
        `${role.font} ${role.weight} · lh ${role.lineHeight}`, h("br"),
        `tracking ${role.tracking}em${role.transform !== "none" ? ` · ${role.transform}` : ""}`);
    });
    root.querySelectorAll("[data-step]").forEach((node) => {
      const s = Number(node.dataset.step);
      const size = parseFloat(getComputedStyle(node.nextElementSibling).fontSize);
      const users = roleNames().filter((r) => state().roles[r].step === s);
      node.replaceChildren(
        h("strong", {}, `step ${s > 0 ? "+" : ""}${s}`),
        `${px(size)} · ${Number((size / 16).toFixed(3))}rem`, h("br"),
        users.length ? users.join(", ") : "—");
    });
  }

  function inspectView() {
    const root = h("div", {},
      h("p", { class: "pg-group-title" }, "Specimen"),
      specimenView(),
      h("p", { class: "pg-group-title", style: "margin-top: 24px;" }, "Scale"),
      scaleView());
    requestAnimationFrame(() => refreshMeta(root));
    return root;
  }

  // ---------- annotate: role name badges on text elements ----------
  function annotate(root) {
    root.classList.add("pg-annotate-active");
    root.querySelectorAll('[class*="text-"]').forEach((el) => {
      const cls = [...el.classList].find((c) => c.startsWith("text-"));
      if (cls) el.setAttribute("data-annotate", cls.slice(5));
    });
  }

  PG.registerDimension(KEY, {
    name: "Typography",
    config: TYPE_CONFIG,
    generate: generateTypographyCSS,
    cssFileName: "typography.css",
    configFileName: "typography.config.js",
    globalName: "TYPE_CONFIG",
    steps: STEPS,
    inspectView,
    annotate,
    afterUpdate: checkFaces,
    afterStepRender: checkFaces,
    afterRestore: (s, defaults) => {
      // Font files and families are static assets from typography.config.js — never
      // let a stale/edited copy from localStorage shadow them.
      s.fonts = structuredClone(defaults.fonts);
    },
  });
})(window.PG);
