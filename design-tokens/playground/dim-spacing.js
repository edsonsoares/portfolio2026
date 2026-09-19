/*
 * Spacing dimension. Depends on shell.js and the globals from spacing.config.js /
 * generate-spacing-css.js (SPACING_CONFIG, generateSpacingCSS, pxFor, nameFor, rem).
 */
(function (PG) {
  const { h, row, slider, group } = PG;
  const KEY = "spacing";
  const state = () => PG.dimensions[KEY].state;

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  function refreshScaleList(root) {
    const node = (root || document).querySelector("#spacing-scale-list");
    if (!node) return;
    const s = state().scale;
    node.replaceChildren(...s.steps.map((m) => {
      const px = pxFor(s, m);
      const nm = nameFor(s, m);
      const usedBy = Object.entries(state().roles).filter(([, r]) => !r.fluid && r.step === m).map(([n]) => n);
      return h("p", { class: "pg-note" }, `${nm}px · ${rem(px)}${usedBy.length ? " · " + usedBy.join(", ") : ""}`);
    }));
  }

  const STEPS = () => [
    {
      title: "1 · Scale",
      hint: "Steps are multiples of the base unit, so changing it rescales every step — and every role that points at one — together.",
      render: () => {
        const s = state().scale;
        return [
          group("Base unit",
            row("Base unit (px)", slider(s.baseUnit, { min: 2, max: 8, step: 1 }, (v) => update(() => (s.baseUnit = v))))),
          group("Steps", h("div", { id: "spacing-scale-list" })),
        ];
      },
    },
    {
      title: "2 · Semantic roles",
      hint: "Pick a scale step for each role. <b>container-gutter</b> and <b>section-gap</b> are fluid, not fixed steps — set them in step 3.",
      render: () => {
        const rows = Object.entries(state().roles)
          .filter(([, role]) => !role.fluid)
          .map(([name, role]) => row(name, PG.select(role.step,
            state().scale.steps.map((m) => [m, `${nameFor(state().scale, m)}px`]),
            (v) => update(() => (role.step = Number(v))))));
        return [group("Step per role", ...rows)];
      },
    },
    {
      title: "3 · Fluid spacing",
      hint: "Mobile and desktop px values, clamped between them across the same viewport range as typography's fluid type (360px → 1280px).",
      render: () => Object.entries(state().fluid.entries).map(([name, entry]) =>
        group(name,
          row("Mobile (px)", slider(entry.min, { min: 0, max: 200, step: 1 }, (v) => update(() => (entry.min = v)))),
          row("Desktop (px)", slider(entry.max, { min: 0, max: 300, step: 1 }, (v) => update(() => (entry.max = v)))))),
    },
    {
      title: "4 · Text flow",
      hint: "Kept in em so these scale with whatever text size they sit next to, rather than a fixed px value.",
      render: () => [group("Text flow (em)",
        ...Object.entries(state().textFlow).map(([name, em]) =>
          row(name, slider(em, { min: 0, max: 3, step: 0.05 }, (v) => update(() => (state().textFlow[name] = v))))))],
    },
  ];

  function afterStepRender() {
    refreshScaleList(PG.$("step"));
  }

  // ---------- inspect view: ruler ----------
  function inspectView() {
    const scale = state().scale;
    const stepRows = scale.steps.map((m) => {
      const px = pxFor(scale, m);
      const nm = nameFor(scale, m);
      const usedBy = Object.entries(state().roles).filter(([, r]) => !r.fluid && r.step === m).map(([n]) => n);
      return h("div", { class: "pv-ladder-row" },
        h("div", { class: "pv-meta" }, h("strong", {}, `${nm}px`), ` · ${rem(px)}`, h("br"), usedBy.length ? usedBy.join(", ") : "—"),
        h("div", { style: `height: 18px; border-radius: 4px; background: var(--pv-accent); width: var(--space-${nm}); max-width: 100%;` }));
    });
    const fluidRows = Object.entries(state().fluid.entries).map(([name, entry]) =>
      h("div", { class: "pv-ladder-row" },
        h("div", { class: "pv-meta" }, h("strong", {}, name), ` · ${entry.min}px → ${entry.max}px`, h("br"), "fluid — resize Width to test"),
        h("div", { style: `height: 18px; border-radius: 4px; background: var(--pv-accent); width: var(--space-${name}); max-width: 100%;` })));
    return h("div", {}, ...stepRows, ...fluidRows);
  }

  // ---------- annotate: tinted gap/padding overlay with token names ----------
  function annotate(root) {
    root.classList.add("pg-annotate-active");
    root.querySelectorAll("[data-space]").forEach((el) => el.setAttribute("data-annotate", el.dataset.space));
  }

  PG.registerDimension(KEY, {
    name: "Spacing",
    config: SPACING_CONFIG,
    generate: generateSpacingCSS,
    cssFileName: "spacing.css",
    configFileName: "spacing.config.js",
    globalName: "SPACING_CONFIG",
    steps: STEPS,
    inspectView,
    annotate,
    afterStepRender,
  });
})(window.PG);
