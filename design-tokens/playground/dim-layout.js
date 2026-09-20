/*
 * Layout dimension. Depends on shell.js and the globals from layout.config.js /
 * generate-layout-css.js (LAYOUT_CONFIG, generateLayoutCSS, activeRanges, rangeAt, rem).
 * Gutter / margin options come from the spacing dimension's live scale (nameFor).
 *
 * The preview follows the Width slider because the live CSS (see generateLayoutCSS's
 * `live` option) keys its ranges to the frame's own width via @container, not to the
 * page's viewport.
 */
(function (PG) {
  const { h, row, slider, group } = PG;
  const KEY = "layout";
  const state = () => PG.dimensions[KEY].state;

  function update(mutate) {
    PG.updateDim(KEY, mutate);
  }

  // Spacing-token names (px) currently in the spacing scale, plus whatever value is
  // already set so an edited spacing scale never silently drops the current choice.
  function spacingOptions(current, { allowAuto = false } = {}) {
    const spacing = PG.dimensions.spacing?.state?.scale;
    const names = spacing ? spacing.steps.map((m) => nameFor(spacing, m)) : [0, 4, 8, 12, 16, 24, 32, 48];
    const unique = [...new Set([...names, ...(typeof current === "number" ? [current] : [])])].sort((a, b) => a - b);
    return [...unique.map((n) => [n, `${n}px · --space-${n}`]), ...(allowAuto ? [["auto", "auto (centered)"]] : [])];
  }

  const BP_NAMES = ["sm", "md", "lg", "xl"];
  const RANGE_LABEL = { base: "Base (no query)", sm: "sm", md: "md", lg: "lg", xl: "xl" };

  function refreshBreakpointWarning(root) {
    const node = (root || document).querySelector("#layout-bp-warning");
    if (!node) return;
    const enabled = BP_NAMES.filter((n) => state().breakpoints[n].enabled).map((n) => [n, state().breakpoints[n].min]);
    const bad = enabled.find(([, min], i) => i > 0 && min <= enabled[i - 1][1]);
    node.textContent = bad ? `${bad[0]} (${bad[1]}px) must be wider than the breakpoint below it.` : "";
    node.hidden = !bad;
  }

  const STEPS = () => [
    {
      title: "1 · Breakpoints",
      hint: "Min-width only, mobile-first: the base range needs no query. <b>sm</b> is off by default — enable it only if a real layout change happens there.",
      render: () => {
        const bps = state().breakpoints;
        return [
          group("Min-width (px)",
            row("sm", h("div", { class: "pg-control" },
              h("input", {
                type: "checkbox", checked: bps.sm.enabled,
                title: "Enabled",
                onchange: (e) => update(() => (bps.sm.enabled = e.target.checked)),
              }),
              h("input", {
                type: "number", min: 200, max: 3000, step: 1, value: bps.sm.min,
                oninput: (e) => e.target.value !== "" && update(() => (bps.sm.min = Number(e.target.value))),
              }))),
            ...["md", "lg", "xl"].map((n) => row(n, PG.number(bps[n].min, { min: 200, max: 3000, step: 1 },
              (v) => update(() => (bps[n].min = v)))))),
          h("p", { class: "pg-note", id: "layout-bp-warning", hidden: true, style: "color: #b25000;" }),
        ];
      },
    },
    {
      title: "2 · Grid per range",
      hint: "Columns, gutter and margin for each range. Gutter and margin are existing spacing tokens. Margin <b>auto</b> centers the content with the container's max-width instead.",
      render: () => [
        h("p", { class: "pg-note", id: "layout-columns-summary" }, columnsSummary()),
        ...gridGroups(),
      ],
    },
    STEP_CONTAINERS,
    STEP_PRIMITIVES,
  ];

  function columnsSummary() {
    const ranges = activeRanges(state());
    return `Columns by range: ${ranges.map((r) => r.grid.columns).join(" / ")}  (${ranges.map((r) => r.name).join(" / ")})`;
  }

  function gridGroups() {
    return activeRanges(state()).map((r) => {
        const g = state().grid[r.name];
        return group(r.min === null ? RANGE_LABEL.base : `${r.name} · from ${r.min}px`,
          row("Columns", slider(g.columns, { min: 1, max: 16, step: 1 }, (v) => update(() => (g.columns = v)))),
          row("Gutter", PG.select(g.gutter, spacingOptions(g.gutter), (v) => update(() => (g.gutter = Number(v))))),
          row("Margin", PG.select(g.margin, spacingOptions(g.margin, { allowAuto: r.name !== "base" }),
            (v) => update(() => (g.margin = v === "auto" ? "auto" : Number(v))))));
    });
  }

  const STEP_CONTAINERS = {
      title: "3 · Containers",
      hint: "Max-widths for the page container, and the size thresholds components use for container queries.",
      render: () => {
        const c = state().containers;
        const cq = state().containerQueries;
        return [
          group("Page container",
            row("content (px)", slider(c.content, { min: 640, max: 2560, step: 10 }, (v) => update(() => (c.content = v)))),
            h("p", { class: "pg-note" }, "narrow — prose width, follows typography's --measure"),
            h("p", { class: "pg-note" }, "wide — full bleed: no max-width, no side margin")),
          group("Container-query sizes (px)",
            ...Object.keys(cq).map((n) => row(n, slider(cq[n], { min: 200, max: 1200, step: 10 }, (v) => update(() => (cq[n] = v)))))),
        ];
      },
  };

  const STEP_PRIMITIVES = {
      title: "4 · Primitives",
      hint: "Defaults baked into the l-* primitives. Every one can still be overridden on a single element with its custom property.",
      render: () => {
        const p = state().primitives;
        const sp = state().sectionPattern;
        return [
          group(".l-grid",
            row("min column (px)", slider(p.gridMin, { min: 80, max: 600, step: 10 }, (v) => update(() => (p.gridMin = v))))),
          group(".l-sidebar",
            row("side width (px)", slider(p.sidebarWidth, { min: 120, max: 600, step: 10 }, (v) => update(() => (p.sidebarWidth = v)))),
            row("content min (%)", slider(p.sidebarContentMin, { min: 20, max: 90, step: 5 }, (v) => update(() => (p.sidebarContentMin = v))))),
          group(".l-section (two-column pattern)",
            row("title span", slider(sp.titleSpan, { min: 1, max: 6, step: 1 }, (v) => update(() => (sp.titleSpan = v)))),
            row("body starts at col", slider(sp.bodyStart, { min: 2, max: 8, step: 1 }, (v) => update(() => (sp.bodyStart = v)))),
            row("body span", slider(sp.bodySpan, { min: 2, max: 11, step: 1 }, (v) => update(() => (sp.bodySpan = v)))),
            h("p", { class: "pg-note" }, "Title and body must not overlap: the body should start after the title, and start + span stay within the columns.")),
          group(".l-frame",
            row("ratio", PG.select(p.frameRatio,
              ["16 / 9", "3 / 2", "4 / 3", "1 / 1", "3 / 4", "21 / 9"].map((v) => [v, v]),
              (v) => update(() => (p.frameRatio = v))))),
        ];
      },
  };

  function afterStepRender() {
    refreshBreakpointWarning(PG.$("step"));
  }

  // ---------- inspect view ----------
  const box = (text, extra = "") => h("div", { class: "pg-lbox", style: extra }, text);

  function gallery(title, cls, description, example) {
    return h("section", { class: "pg-lgallery" },
      h("div", { class: "pg-lgallery-head" }, h("code", {}, cls), h("span", {}, title)),
      h("p", { class: "pg-lgallery-desc" }, description),
      h("div", { class: "pg-lgallery-demo" }, example));
  }

  function ruler() {
    const cfg = state();
    const ranges = activeRanges(cfg);
    const top = Math.max(...ranges.map((r) => r.min ?? 0));
    const max = Math.ceil((top * 1.3) / 100) * 100;
    const pct = (px) => `${Math.min(100, (px / max) * 100)}%`;
    const marker = h("div", { class: "pg-ruler-marker" }, h("span", {}, ""));
    const readout = h("p", { class: "pg-note", style: "margin: 6px 0 0;" });
    const bar = h("div", { class: "pg-ruler" },
      ...ranges.map((r, i) => {
        const start = r.min ?? 0;
        const end = ranges[i + 1]?.min ?? max;
        const cols = r.grid.columns;
        return h("div", {
          class: "pg-ruler-seg", "data-range": r.name,
          style: `left: ${pct(start)}; width: ${(((end - start) / max) * 100).toFixed(3)}%;`,
        }, h("strong", {}, r.name === "base" ? "base" : r.name),
          h("span", {}, `${cols} col${r.min === null ? "" : ` · ${r.min}+`}`));
      }),
      marker);
    const wrap = h("div", {}, bar, readout);

    // Current width = the preview frame's own width, which the Width slider drives.
    const sync = () => {
      const frame = wrap.closest(".pg-frame2");
      if (!frame) return;
      const width = frame.clientWidth;
      const active = rangeAt(cfg, width);
      marker.style.left = pct(width);
      marker.firstChild.textContent = `${Math.round(width)}px`;
      marker.classList.toggle("pg-ruler-over", width > max);
      bar.querySelectorAll(".pg-ruler-seg").forEach((seg) =>
        seg.classList.toggle("pg-ruler-active", seg.dataset.range === active.name));
      readout.textContent = `Current width ${Math.round(width)}px → ${active.name} (${active.grid.columns} columns). Scale: 0 → ${max}px.`;
    };
    new ResizeObserver(sync).observe(wrap);
    return wrap;
  }

  function inspectView() {
    const p = state().primitives;
    // Base class (all four columns) plus the md class that takes over from 768px.
    const span = (n, text) => h("div", { class: `pg-lbox l-span-4 l-span-md-${n}` }, text || `span ${n} from md`);
    return h("div", { class: "pg-linspect" },
      h("p", { class: "pg-group-title" }, "Breakpoint ruler"),
      ruler(),
      h("p", { class: "pg-group-title", style: "margin-top: 28px;" }, "Primitives"),
      gallery("Center", ".l-center",
        "Caps the width at --container-content and keeps the range's side margin. --narrow follows the reading measure; --wide is full bleed.",
        h("div", { class: "l-stack", style: "--stack-space: 8px;" },
          h("div", { class: "l-center", style: "background: var(--pv-line);" }, box("content — max-width + margin")),
          h("div", { class: "l-center l-center--narrow", style: "background: var(--pv-line);" }, box("narrow — prose measure")),
          h("div", { class: "l-center l-center--wide", style: "background: var(--pv-line);" }, box("wide — full bleed")))),
      gallery("Stack", ".l-stack",
        "Vertical rhythm from --stack-space (defaults to the stack role). Try --stack-space: var(--space-stack-loose).",
        h("div", { class: "l-stack" }, box("One"), box("Two"), box("Three"))),
      gallery("Cluster", ".l-cluster",
        "A wrapping row with the inline gap. Needs no media query — items just wrap.",
        h("div", { class: "l-cluster" },
          ...["Design", "Research", "Engineering", "Science", "Writing", "Strategy", "Prototype"].map((t) =>
            h("span", { class: "pg-lbox", style: "border-radius: 999px; padding: 4px 12px;" }, t)))),
      gallery("Grid", ".l-grid",
        `Auto-fit columns of at least --l-grid-min (${p.gridMin}px) sharing the row. Column count follows the available width, not a breakpoint.`,
        h("div", { class: "l-grid" }, ...[1, 2, 3, 4, 5, 6].map((n) => box(`Item ${n}`, "min-height: 56px;")))),
      gallery("Sidebar", ".l-sidebar",
        `A ${p.sidebarWidth}px side column beside the content. When the content would fall under ${p.sidebarContentMin}% of the row, it wraps beneath — no media query.`,
        h("div", { class: "l-sidebar" }, box("Side", "min-height: 96px;"), box("Content", "min-height: 96px;"))),
      gallery("Frame", ".l-frame",
        `An aspect-ratio media box (${p.frameRatio}). Images and video inside fill it and crop to fit.`,
        h("div", { class: "l-frame", style: "max-width: 420px; border-radius: 8px; background: linear-gradient(135deg, var(--pv-soft), var(--pv-line));" })),
      gallery("Section", ".l-section",
        "Title on the left, content on the right, from md up; stacked below. The title stays at the top of its column. The body is a subgrid, so a .l-section-row inside it stays on the page columns.",
        h("div", { class: "l-section" },
          h("p", { class: "l-section-title pg-lbox" }, ".l-section-title"),
          h("div", { class: "l-section-body" },
            h("div", { class: "pg-lbox" }, ".l-section-body"),
            h("div", { class: "l-section-row" },
              h("div", { class: "pg-lbox l-span-4 l-span-md-2" }, "row · span 2"),
              h("div", { class: "pg-lbox l-span-4 l-span-md-2" }, "row · span 2"),
              h("div", { class: "pg-lbox l-span-4 l-span-md-2" }, "row · span 2"))))),
      gallery("Columns", ".l-columns",
        "The explicit grid: 4 / 12 / 12 columns by range with that range's gutter. Every item spans the whole 4-column row on base (.l-span-4) and the md class (.l-span-md-N) takes over from 768px.",
        h("div", { class: "l-columns" },
          span(12, "span 12 from md"), span(4), span(4), span(4), span(8), span(4), span(3), span(6), span(3))),
      gallery("Offsets", ".l-offset-* / .l-start-*",
        "Where content begins. .l-offset-1 skips one column (starts at column 2); .l-start-5 starts at column 5. Range-prefixed variants (.l-offset-lg-1, .l-start-md-5) apply from that breakpoint up, and combine with the span helpers in any order.",
        h("div", { class: "l-columns" },
          h("div", { class: "pg-lbox l-offset-1 l-span-3" }, ".l-offset-1 .l-span-3 — starts at column 2"),
          h("div", { class: "pg-lbox l-span-4 l-start-md-5 l-span-md-6" }, ".l-span-4 .l-start-md-5 .l-span-md-6 — full width on base, columns 5–10 from md"),
          h("div", { class: "pg-lbox l-span-2 l-start-2" }, ".l-start-2 .l-span-2"))),
      gallery("Bleed", ".l-bleed",
        "Inside .l-center, a child marked .l-bleed breaks out of the content column to the container's full width while its siblings stay contained. Built from breakout grid tracks, not negative margins.",
        h("div", { class: "l-center", style: "--stack-space: 12px; background: var(--pv-soft);" },
          h("div", { class: "pg-lbox" }, "Contained text — sits in the content column."),
          h("div", {
            class: "l-bleed l-frame",
            style: "--l-frame-ratio: 21 / 6; display: grid; place-items: center; background: repeating-linear-gradient(135deg, var(--pv-line) 0 10px, var(--pv-soft) 10px 20px); font: 12px ui-monospace, monospace; color: var(--pv-fg);",
          }, ".l-bleed — full-bleed media"),
          h("div", { class: "pg-lbox" }, "More contained text — back inside the content column."))));
  }

  // ---------- annotate: column overlay + active-range readout ----------
  function annotate(root) {
    root.classList.add("pg-annotate-active", "pg-layout-annotated");
    // The overlay is itself a .l-center breakout grid, so it draws the real tracks: the
    // columns sit in the content track, and a sample .l-bleed strip takes the full span to
    // show an element escaping the container while the columns stay inside it.
    const colsEl = h("div", { class: "pg-layout-cols" });
    const bleed = h("div", { class: "l-bleed pg-layout-bleed" }, ".l-bleed — escapes the container");
    const overlay = h("div", { class: "l-center pg-layout-overlay", "aria-hidden": "true" }, colsEl, bleed);
    const readout = h("div", { class: "pg-layout-readout" });
    root.append(overlay, readout);

    // Driven by the frame's own width (the Width slider), so stepping the slider
    // steps through the ranges.
    const sync = () => {
      const cfg = state();
      const width = root.clientWidth;
      const r = rangeAt(cfg, width);
      const count = r.grid.columns;
      if (colsEl.childElementCount !== count) {
        colsEl.replaceChildren(...Array.from({ length: count }, (_, i) => h("div", {}, String(i + 1))));
      }
      const container = Math.min(width, cfg.containers.content);
      const margin = r.grid.margin === "auto" ? "auto" : `${r.grid.margin}px`;
      readout.textContent =
        `${r.name} · ${count} cols · gutter ${r.grid.gutter}px · margin ${margin} · container ${Math.round(container)}px`;
    };
    new ResizeObserver(sync).observe(root);
    sync();
  }

  PG.registerDimension(KEY, {
    name: "Layout",
    config: LAYOUT_CONFIG,
    generate: generateLayoutCSS,
    cssFileName: "layout.css",
    configFileName: "layout.config.js",
    globalName: "LAYOUT_CONFIG",
    steps: STEPS,
    inspectView,
    annotate,
    afterStepRender,
    afterUpdate: () => {
      refreshBreakpointWarning(PG.$("step"));
      const summary = PG.$("layout-columns-summary");
      if (summary) summary.textContent = columnsSummary();
    },
  });
})(window.PG);
