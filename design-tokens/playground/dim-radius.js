/*
 * Radius dimension. Depends on shell.js, the globals from radius.config.js /
 * generate-radius-css.js (RADIUS_CONFIG, generateRadiusCSS, rem), and BRANDS from
 * generate-color-css.js (radius roles are mapped per brand the same way accent is).
 */
(function (PG) {
  const { h, row, group } = PG;
  const KEY = "radius";
  const state = () => PG.dimensions[KEY].state;

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  const RADIUS_OPTIONS = () => [...state().scale.steps.map((v) => [v, `${v}px`]), ["full", "full"]];

  const STEPS = () => [
    {
      title: "1 · Scale",
      hint: "The full set of values roles can be mapped onto.",
      render: () => {
        const s = state().scale;
        const rows = s.steps.map((v) => h("p", { class: "pg-note" }, `${v}px · ${rem(v)}`));
        rows.push(h("p", { class: "pg-note" }, `full · ${s.full}px`));
        return [group("Values", ...rows)];
      },
    },
    {
      title: "2 · Roles per brand",
      hint: "Pick a scale value per role, separately for each brand — the two mappings sit side by side so the difference in character is easy to compare.",
      render: () => {
        const roleNames = Object.keys(state().roles[BRANDS[0]]);
        const rows = roleNames.map((name) =>
          row(name, h("div", { style: "display: flex; gap: 10px; width: 100%;" },
            ...BRANDS.map((brand) => h("div", { style: "flex: 1; min-width: 0;" },
              h("p", { class: "pg-note", style: "margin: 0 0 2px;" }, brand),
              PG.select(state().roles[brand][name], RADIUS_OPTIONS(),
                (v) => update(() => (state().roles[brand][name] = v === "full" ? "full" : Number(v)))))))));
        return [group("Role → value per brand", ...rows)];
      },
    },
  ];

  // ---------- inspect view: component sampler, both brands ----------
  function sampleSet(brand) {
    return h("div", { "data-brand": brand, style: "display: flex; flex-direction: column; gap: 16px;" },
      h("p", { class: "pg-group-title" }, brand),
      h("span", { class: "pv-button text-action", style: "border-radius: var(--radius-control); width: fit-content;" }, "Button"),
      h("input", {
        type: "text", placeholder: "Input",
        style: "border-radius: var(--radius-control); border: 1px solid var(--pv-line); padding: 8px 12px; font: inherit; background: var(--pv-bg); color: var(--pv-fg); width: 100%;",
      }),
      h("div", { style: "border-radius: var(--radius-card); border: 1px solid var(--pv-line); padding: 16px;" },
        h("p", { class: "text-body-sm" }, "Card")),
      h("div", { style: "border-radius: var(--radius-media); aspect-ratio: 16 / 9; background: linear-gradient(135deg, var(--pv-soft), var(--pv-line));" }),
      h("span", {
        class: "text-label",
        style: "display: inline-block; border-radius: var(--radius-pill); background: var(--pv-soft); padding: 4px 12px; width: fit-content;",
      }, "Badge"),
      h("div", {
        style: "border-radius: var(--radius-surface); border: 1px solid var(--pv-line); padding: 20px; background: var(--pv-bg); box-shadow: 0 4px 20px rgba(0,0,0,.08);",
      }, h("p", { class: "text-body-sm" }, "Modal")));
  }

  function inspectView() {
    return h("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 32px;" },
      ...BRANDS.map((brand) => sampleSet(brand)));
  }

  // ---------- annotate: corner markers with role + resolved value ----------
  function annotate(root) {
    root.classList.add("pg-annotate-active");
    root.querySelectorAll("[data-radius-role]").forEach((el) => {
      const role = el.dataset.radiusRole;
      const resolved = getComputedStyle(el).borderRadius;
      el.setAttribute("data-annotate", `${role} · ${resolved}`);
    });
  }

  PG.registerDimension(KEY, {
    name: "Radius",
    config: RADIUS_CONFIG,
    generate: generateRadiusCSS,
    cssFileName: "radius.css",
    configFileName: "radius.config.js",
    globalName: "RADIUS_CONFIG",
    steps: STEPS,
    inspectView,
    annotate,
  });
})(window.PG);
