/*
 * Turns a LAYOUT_CONFIG object into CSS custom properties, per-range grid tokens and
 * the l-* layout primitives.
 * Used by both design-foundations-playground.html (browser) and build.js (Node).
 *
 * options.live — playground preview only: emit @container queries (keyed to the
 * preview frame's own width, so the Width slider steps through the ranges) instead
 * of @media, and set the per-range tokens on .pg-frame2-body instead of :root.
 */
(function (root) {
  const round = (n, places = 4) => Number(n.toFixed(places));
  const rem = (px) => `${round(px / 16)}rem`;

  const RANGE_ORDER = ["base", "sm", "md", "lg", "xl"];

  // Ranges in ascending order, base first, skipping a disabled sm. Each carries the
  // breakpoint min (null for base) and its grid entry.
  function activeRanges(config) {
    return RANGE_ORDER
      .filter((name) => name === "base" || config.breakpoints[name]?.enabled)
      .map((name) => ({
        name,
        min: name === "base" ? null : config.breakpoints[name].min,
        grid: config.grid[name],
      }))
      .sort((a, b) => (a.min ?? -1) - (b.min ?? -1));
  }

  // The range a given width falls in — used by the playground's ruler and readout.
  function rangeAt(config, width) {
    const ranges = activeRanges(config);
    let active = ranges[0];
    for (const r of ranges) if (r.min !== null && width >= r.min) active = r;
    return active;
  }

  const gridDecls = (grid) => {
    const out = [`--layout-columns: ${grid.columns};`, `--layout-gutter: var(--space-${grid.gutter});`];
    if (grid.margin !== "auto") out.push(`--layout-margin: var(--space-${grid.margin});`);
    return out;
  };

  function generateLayoutCSS(config, options = {}) {
    const { live = false } = options;
    const { containers, containerQueries, primitives } = config;
    const ranges = activeRanges(config);
    const rangeSelector = live ? ".pg-frame2-body" : ":root";
    const queryFor = (min) => `@${live ? "container" : "media"} (min-width: ${rem(min)})`;
    const out = [];
    out.push("/* Layout tokens and primitives. Generated from layout.config.js — do not edit by hand. */", "");

    out.push(":root {");
    out.push("  /* Breakpoints (min-width). Reference only: custom properties can't be used inside @media. */");
    for (const [name, bp] of Object.entries(config.breakpoints)) {
      out.push(`  ${bp.enabled ? "" : "/* disabled */ "}--bp-${name}: ${rem(bp.min)}; /* ${bp.min}px */`);
    }
    out.push("", "  /* Container widths */");
    out.push(`  --container-content: ${rem(containers.content)}; /* ${containers.content}px */`);
    out.push(`  --container-narrow: ${containers.narrow};`);
    out.push(`  --container-wide: ${containers.wide};`);
    out.push("", "  /* Container-query sizes. Reference only: write the literal value in @container. */");
    for (const [name, px] of Object.entries(containerQueries)) {
      out.push(`  --cq-${name}: ${rem(px)}; /* ${px}px */`);
    }
    out.push("", `  /* Grid — base (no query) */`);
    for (const decl of gridDecls(ranges[0].grid)) out.push(`  ${decl}`);
    out.push("}", "");

    for (const r of ranges.slice(1)) {
      const auto = r.grid.margin === "auto";
      out.push(`/* Grid — ${r.name}, from ${r.min}px${auto ? "; margin auto: centered by the container's max-width, padding keeps the previous range's margin as its floor" : ""} */`);
      out.push(`${queryFor(r.min)} {`, `  ${rangeSelector} {`);
      for (const decl of gridDecls(r.grid)) out.push(`    ${decl}`);
      out.push("  }", "}", "");
    }

    out.push(`/* ---------- Primitives ---------- */`, "");

    const centerTracks = [
      "    [full-start] minmax(var(--layout-margin), 1fr)",
      "    [content-start] min(var(--l-content), 100% - 2 * var(--layout-margin))",
      "    [content-end] minmax(var(--layout-margin), 1fr)",
      "    [full-end]",
    ];
    out.push(
      "/* Centered container, built as a breakout grid: a full-width row with three tracks —",
      "   margin | content | margin. Children sit in the `content` track (capped at",
      "   --container-content, side margin = the range's --layout-margin); a child marked .l-bleed",
      "   takes the `full` span instead and escapes to the container's full width, with no negative",
      "   margins. Put .l-center at page level for a true full-viewport bleed. Add --narrow (prose,",
      "   exactly the reading measure) or --wide (full bleed, no margin). --stack-space sets the",
      "   row gap between children (0 if unset). */",
      ".l-center {",
      "  --l-content: calc(var(--container-content) - 2 * var(--layout-margin));",
      "  display: grid;",
      "  grid-template-columns:",
      ...centerTracks,
      "  ;",
      "  row-gap: var(--stack-space, 0);",
      "}",
      ".l-center > * { grid-column: content; }",
      ".l-center > .l-bleed { grid-column: full; }",
      ".l-center--narrow { --l-content: var(--container-narrow); }",
      ".l-center--wide { grid-template-columns: [full-start content-start] minmax(0, 1fr) [content-end full-end]; }",
      "",
      "/* Breakout group: a child of .l-center that spans the full width but keeps its margin | content |",
      "   margin tracks (a subgrid), so its own children can sit in `content` or break out with .l-bleed —",
      "   e.g. a section's title and text, then a full-bleed image, as one block with its own row gap.",
      "   Where subgrid isn't supported it rebuilds the same three tracks. */",
      ".l-center > .l-breakout {",
      "  grid-column: full;",
      "  display: grid;",
      "  grid-template-columns: subgrid;",
      "  row-gap: var(--stack-space, 0);",
      "}",
      ".l-breakout > * { grid-column: content; }",
      ".l-breakout > .l-bleed { grid-column: full; }",
      "@supports not (grid-template-columns: subgrid) {",
      "  .l-center > .l-breakout {",
      "    grid-template-columns:",
      ...centerTracks.map((t) => `  ${t}`),
      "    ;",
      "  }",
      "}",
      "");

    out.push(
      "/* Vertical rhythm. Override the gap per element with --stack-space. */",
      ".l-stack {",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: var(--stack-space, var(--space-stack));",
      "}",
      "");

    out.push(
      "/* Wrapping row. Override the gap with --cluster-space. */",
      ".l-cluster {",
      "  display: flex;",
      "  flex-wrap: wrap;",
      "  align-items: center;",
      "  gap: var(--cluster-space, var(--space-inline));",
      "}",
      "");

    out.push(
      "/* Auto-fit grid — no media queries. Override the minimum column width with --l-grid-min. */",
      ".l-grid {",
      "  display: grid;",
      `  grid-template-columns: repeat(auto-fit, minmax(min(var(--l-grid-min, ${primitives.gridMin}px), 100%), 1fr));`,
      "  gap: var(--layout-gutter);",
      "}",
      "");

    out.push(
      "/* Side column + content. The side column keeps --l-sidebar-width; the content wraps beneath it",
      "   on its own once it would drop below --l-sidebar-content-min of the row — no media queries.",
      "   The side column is the first child; add --end to put it after the content. */",
      ".l-sidebar {",
      "  display: flex;",
      "  flex-wrap: wrap;",
      "  gap: var(--layout-gutter);",
      "}",
      ".l-sidebar > :first-child {",
      `  flex-basis: var(--l-sidebar-width, ${primitives.sidebarWidth}px);`,
      "  flex-grow: 1;",
      "}",
      ".l-sidebar > :last-child {",
      "  flex-basis: 0;",
      "  flex-grow: 999;",
      `  min-inline-size: var(--l-sidebar-content-min, ${primitives.sidebarContentMin}%);`,
      "}",
      ".l-sidebar--end > :first-child { order: 2; }",
      "");

    out.push(
      "/* Aspect-ratio media box. Override with --l-frame-ratio. */",
      ".l-frame {",
      `  aspect-ratio: var(--l-frame-ratio, ${primitives.frameRatio});`,
      "  overflow: hidden;",
      "}",
      ".l-frame > img, .l-frame > video, .l-frame > iframe {",
      "  display: block;",
      "  inline-size: 100%;",
      "  block-size: 100%;",
      "  object-fit: cover;",
      "}",
      "");

    out.push(
      "/* Component container: makes container queries (--cq-sm/md/lg) usable inside it. */",
      ".l-container { container-type: inline-size; }",
      "");

    out.push(
      "/* Explicit grid: --layout-columns columns (4 / 12 / 12 / 12 by range) with the range's gutter.",
      "   Spans set only the END line and start/offset helpers set only the START line, so they combine",
      "   in any order: .l-offset-lg-1 .l-span-lg-6 is six columns beginning at column 2 from lg up.",
      "   All values are plain integers — grid lines don't take min()/var() everywhere — so each range",
      "   only gets the helpers its own column count allows (spans 1–N, offsets 0–N-1, starts 1–N).",
      "   Un-prefixed helpers are the base range; <range>-prefixed ones (md, lg, xl) apply from that",
      "   breakpoint up and take over from the base one. Pair a base class with a range class",
      "   (.l-span-4 .l-span-md-8) rather than stacking .l-span-full with a range span. */",
      ".l-columns {",
      "  display: grid;",
      "  grid-template-columns: repeat(var(--layout-columns), minmax(0, 1fr));",
      "  column-gap: var(--layout-gutter);",
      "  row-gap: var(--stack-space, var(--space-stack));",
      "}",
      ".l-span-full { grid-column: 1 / -1; }");
    const helpersFor = (r) => {
      const prefix = r.min === null ? "" : `${r.name}-`;
      const n = r.grid.columns;
      const lines = [];
      for (let i = 1; i <= n; i++) lines.push(`.l-span-${prefix}${i} { grid-column-end: span ${i}; }`);
      if (r.min !== null) lines.push(`.l-span-${prefix}full { grid-column: 1 / -1; }`);
      for (let i = 1; i <= n; i++) lines.push(`.l-start-${prefix}${i} { grid-column-start: ${i}; }`);
      for (let i = 0; i < n; i++) lines.push(`.l-offset-${prefix}${i} { grid-column-start: ${i + 1}; }`);
      if (r.min !== null) lines.push(`.l-start-${prefix}auto { grid-column-start: auto; }`);
      return lines;
    };
    out.push(...helpersFor(ranges[0]));
    for (const r of ranges.slice(1)) {
      out.push("", `${queryFor(r.min)} {`, ...helpersFor(r).map((line) => `  ${line}`), "}");
    }
    // ---- two-column section pattern ----
    const sp = config.sectionPattern;
    const from = ranges.find((r) => r.name === sp.from && r.min !== null);
    if (!from) throw new Error(`sectionPattern.from "${sp.from}" is not an enabled breakpoint`);
    const noSubgrid = "@supports not (grid-template-columns: subgrid)";
    out.push(
      "",
      `/* Two-column section pattern. .l-section is a grid on the page columns; from ${sp.from} up its`,
      `   .l-section-title takes columns 1–${sp.titleSpan} (aligned to the top, so it labels the content beside it)`,
      `   and .l-section-body takes columns ${sp.bodyStart}–${sp.bodyStart + sp.bodySpan - 1}. Below that both stack full width. The body`,
      "   is a subgrid, so its children — and any .l-section-row inside it — stay aligned to the page",
      "   columns. Children of the body are full width by default; the row's children use the span",
      "   helpers relative to the columns the body spans. Without subgrid support the body is a single",
      `   column and .l-section-row falls back to ${sp.rowFallbackColumns} equal columns. */`,
      ".l-section {",
      "  display: grid;",
      "  grid-template-columns: repeat(var(--layout-columns), minmax(0, 1fr));",
      "  column-gap: var(--layout-gutter);",
      "  row-gap: var(--stack-space, var(--space-stack));",
      "}",
      ".l-section-title, .l-section-body { grid-column: 1 / -1; }",
      ".l-section-body, .l-section-row {",
      "  display: grid;",
      "  grid-template-columns: subgrid;",
      "  row-gap: var(--stack-space, var(--space-stack));",
      "}",
      ".l-section-body > * { grid-column: 1 / -1; }",
      `${noSubgrid} {`,
      "  .l-section-body, .l-section-row { grid-template-columns: minmax(0, 1fr); column-gap: var(--layout-gutter); }",
      "  .l-section-row > * { grid-column: auto; }",
      "}",
      `${queryFor(from.min)} {`,
      `  .l-section-title { grid-column: 1 / span ${sp.titleSpan}; align-self: start; }`,
      `  .l-section-body { grid-column: ${sp.bodyStart} / span ${sp.bodySpan}; }`,
      `  ${noSubgrid} {`,
      `    .l-section-row { grid-template-columns: repeat(${sp.rowFallbackColumns}, minmax(0, 1fr)); }`,
      "  }",
      "}");
    // ---- media blocks ----
    const mb = config.mediaBlocks;
    if (mb) {
      const cn = mb.className;
      const cols = ranges[ranges.length - 1].grid.columns; // for the validation message only
      const start = sp.bodyStart - 1;
      // Horizontal placement of the body column inside the content track. Percentages resolve
      // against the content track, so this is exactly (N columns + N gutters) — no column tracks needed.
      const offset = `calc((100% + var(--layout-gutter)) * ${start} / var(--layout-columns))`;
      const width = `calc((100% + var(--layout-gutter)) * ${sp.bodySpan} / var(--layout-columns) - var(--layout-gutter))`;
      out.push(
        "",
        `/* Media block: <figure class="${cn} ${cn}--<variant>"> with a .${cn}-items row of images and one`,
        "   figcaption, inside a .l-breakout. Below the section pattern's range the images stack full width;",
        `   from ${sp.from} up the items row is ${sp.bodySpan} equal columns — the same tracks as the section body,`,
        "   so images line up with the page columns — and each variant places its images in them:",
        ...Object.entries(mb.variants).map(([name, items]) => `     --${name}: ${items.map(([st, sp2]) => `${st}/${sp2}`).join(", ")}  (start/span)`),
        `     --bleed: the block spans the full width; its caption stays in the body column.`,
        "   The caption always sits in the body column, so captions line up across every variant. */",
        `.${cn} { margin: 0; }`,
        `.${cn}-items { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--layout-gutter); }`,
        `.l-breakout > .${cn}--bleed { grid-column: full; display: grid; grid-template-columns: subgrid; }`,
        `.${cn}--bleed > .${cn}-items { grid-column: full; }`,
        `.${cn}--bleed > figcaption { grid-column: content; }`,
        `@supports not (grid-template-columns: subgrid) {`,
        `  .l-breakout > .${cn}--bleed {`,
        "    grid-template-columns:",
        ...centerTracks.map((t) => `  ${t}`),
        "    ;",
        "  }",
        "}",
        `${queryFor(from.min)} {`,
        `  .${cn}-items { grid-template-columns: repeat(${sp.bodySpan}, minmax(0, 1fr)); }`,
        `  .${cn}--bleed > .${cn}-items { grid-template-columns: minmax(0, 1fr); }`,
        `  .${cn}:not(.${cn}--bleed) > .${cn}-items, .${cn} > figcaption {`,
        `    margin-inline-start: ${offset};`,
        `    inline-size: ${width};`,
        "  }");
      for (const [name, items] of Object.entries(mb.variants)) {
        items.forEach(([st, span], i) => {
          if (st < 1 || st + span - 1 > sp.bodySpan) {
            throw new Error(`mediaBlocks.variants.${name}: item ${i + 1} (${st}/${span}) doesn't fit in ${sp.bodySpan} columns`);
          }
          out.push(`  .${cn}--${name} > .${cn}-items > :nth-child(${i + 1}) { grid-column: ${st} / span ${span}; }`);
        });
      }
      out.push("}");
    }
    out.push("");
    return out.join("\n");
  }

  const api = { generateLayoutCSS, activeRanges, rangeAt, rem };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(this);
