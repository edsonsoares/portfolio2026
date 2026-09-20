/*
 * Motion dimension. Depends on shell.js and the globals from motion.config.js /
 * generate-motion-css.js (MOTION_CONFIG, generateMotionCSS, ms, bezier) and motion.js (Motion).
 *
 * Demos animate only transform and opacity, like the real .reveal class. "Simulate reduced
 * motion" (toolbar) puts .motion-reduce on the stage, which the generated CSS and the demo
 * rules below both honour.
 */
(function (PG) {
  const { h, row, slider, group } = PG;
  const KEY = "motion";
  const state = () => PG.dimensions[KEY].state;

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  const DURATION_NAMES = () => Object.keys(state().durations);

  const STEPS = () => [
    {
      title: "1 · Durations",
      hint: "How long a transition takes. Only opacity and transform are ever animated, so none of these can cause layout shift.",
      render: () => [group("Durations (ms)",
        ...DURATION_NAMES().map((name) =>
          row(name, slider(state().durations[name], { min: 0, max: 1500, step: 10 }, (v) => update(() => (state().durations[name] = v))))))],
    },
    {
      title: "2 · Easings",
      hint: "Cubic-bezier control points (x1, y1, x2, y2). x values must stay between 0 and 1.",
      render: () => Object.entries(state().easings).map(([name, pts]) =>
        group(`--ease-${name}`,
          ...["x1", "y1", "x2", "y2"].map((label, i) => {
            const isX = i % 2 === 0;
            return row(label, slider(pts[i], { min: isX ? 0 : -1, max: isX ? 1 : 2, step: 0.01 }, (v) => update(() => (pts[i] = v))));
          }))),
    },
    {
      title: "3 · Entrance",
      hint: "The reveal-on-scroll behaviour. Distance, stagger and threshold are shared; whether a brand rises and how long it takes is set per brand.",
      render: () => {
        const e = state().entrance;
        const brandGroups = Object.entries(state().brands).map(([brand, entry]) => {
          const tokenValue = typeof entry.duration === "number" ? "custom" : entry.duration;
          return group(brand,
            row("Rise", PG.checkbox(entry.rise, (v) => update(() => (entry.rise = v)))),
            row("Duration", PG.select(tokenValue, [...DURATION_NAMES().map((n) => [n, `${n} · ${state().durations[n]}ms`]), ["custom", "custom (ms)"]], (v) => {
              update(() => (entry.duration = v === "custom" ? state().durations.reveal : v));
              PG.renderStep();
            })),
            typeof entry.duration === "number"
              ? row("Custom ms", slider(entry.duration, { min: 0, max: 1500, step: 10 }, (v) => update(() => (entry.duration = v))))
              : null);
        });
        return [
          group("Entrance",
            row("Rise (px)", slider(e.rise, { min: 0, max: 64, step: 1 }, (v) => update(() => (e.rise = v)))),
            row("Stagger (ms)", slider(e.stagger, { min: 0, max: 300, step: 5 }, (v) => update(() => (e.stagger = v)))),
            row("Max staggered", slider(e.maxStaggered, { min: 1, max: 12, step: 1 }, (v) => update(() => (e.maxStaggered = v)))),
            row("Threshold (%)", slider(e.threshold, { min: 1, max: 100, step: 1 }, (v) => update(() => (e.threshold = v))))),
          ...brandGroups,
        ];
      },
    },
  ];

  // ---------- inspect view: replayable demos ----------
  function replayBar(demo) {
    demo.classList.add("is-reset");
    void demo.offsetWidth; // commit the reset state so the transition runs from it
    demo.classList.remove("is-reset");
  }

  function demoRow(label, sub, durationVar, easeVar) {
    const demo = h("div", { class: "pg-mdemo", style: `--d: ${durationVar}; --e: ${easeVar};` },
      h("div", { class: "pg-mdemo-fill" }));
    return h("div", { class: "pg-mrow" },
      h("div", { class: "pv-meta" }, h("strong", {}, label), sub),
      demo,
      h("button", { class: "pg-btn", onclick: () => replayBar(demo) }, "Replay"));
  }

  function inspectView() {
    const cfg = state();
    const brand = PG.shared.inspect.brand;
    const entry = cfg.brands[brand];
    const durationText = typeof entry.duration === "number" ? `${entry.duration}ms` : `${entry.duration} · ${cfg.durations[entry.duration]}ms`;

    const revealCard = h("div", { class: "reveal pg-mcard" },
      h("strong", {}, `${brand}: ${entry.rise ? "rise + fade" : "fade only"}`),
      h("span", { class: "pv-meta" }, `${entry.rise ? `${cfg.entrance.rise}px rise, ` : ""}${durationText}, --ease-out`));

    const groupEl = h("div", { class: "reveal-group pg-mgroup" },
      ...Array.from({ length: cfg.entrance.maxStaggered + 2 }, (_, i) =>
        h("div", { class: "reveal pg-mcard" }, `${i + 1}`)));

    const root = h("div", {},
      h("div", { class: "pg-mtoolbar" },
        h("button", { class: "pg-btn primary", onclick: () => { root.querySelectorAll(".pg-mdemo").forEach(replayBar); Motion.replay(revealCard); Motion.replay(groupEl); } }, "Replay all"),
        h("span", { class: "pv-meta" }, "Only opacity and transform animate. Use “Simulate reduced motion” in the toolbar to check the accessible path.")),
      h("p", { class: "pg-group-title" }, "Durations"),
      ...DURATION_NAMES().map((n) => demoRow(`--duration-${n}`, `${cfg.durations[n]}ms · --ease-out`, `var(--duration-${n})`, "var(--ease-out)")),
      h("p", { class: "pg-group-title", style: "margin-top: 24px;" }, "Easings (at --duration-slow)"),
      ...Object.entries(cfg.easings).map(([n, pts]) => demoRow(`--ease-${n}`, `cubic-bezier(${pts.join(", ")})`, "var(--duration-slow)", `var(--ease-${n})`)),
      h("p", { class: "pg-group-title", style: "margin-top: 24px;" }, "Entrance — current brand (change it in the toolbar)"),
      h("div", { class: "pg-mrow" }, revealCard, h("button", { class: "pg-btn", onclick: () => Motion.replay(revealCard) }, "Replay")),
      h("p", { class: "pg-group-title", style: "margin-top: 24px;" },
        `Staggered group — ${cfg.entrance.stagger}ms apart, capped at ${cfg.entrance.maxStaggered} (the last two share a delay)`),
      h("div", { class: "pg-mrow" }, groupEl, h("button", { class: "pg-btn", onclick: () => Motion.replay(groupEl) }, "Replay")));

    // Start visible: re-renders (any edit) must not hide the demos; Replay plays the entrance.
    Motion.revealAll(root);
    return root;
  }

  PG.registerDimension(KEY, {
    name: "Motion",
    config: MOTION_CONFIG,
    generate: generateMotionCSS,
    cssFileName: "motion.css",
    configFileName: "motion.config.js",
    globalName: "MOTION_CONFIG",
    steps: STEPS,
    inspectView,
    defaultStage: "inspect",
  });
})(window.PG);
