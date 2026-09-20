/*
 * Layout source of truth, shared by Portfolio2026 and FeelScience.
 *
 * Mobile-first: the base range needs no query, every breakpoint is a min-width that
 * layers on top of the one below. Gutters and margins are not new values — each is
 * the *name* of an existing spacing token (16 → --space-16), so they stay in step
 * with spacing.config.js.
 *
 * Edit values here (or tweak them in design-foundations-playground.html and
 * paste the copied config back into this file), then run:
 *   node design-tokens/build.js
 */
const LAYOUT_CONFIG = {
  // min-width breakpoints in px. `sm` is here but off: only enable it if a real
  // layout change happens at that width — an unused breakpoint is dead weight.
  breakpoints: {
    sm: { min: 480, enabled: false },
    md: { min: 768, enabled: true },
    lg: { min: 1024, enabled: true },
    xl: { min: 1280, enabled: true },
  },

  // Grid per range (4 / 12 / 12 / 12 columns). gutter / margin are spacing-token names (px). margin "auto"
  // means the content is centered by the container's max-width instead; the
  // padding stays at the previous range's margin as the floor. `sm` only applies
  // when the sm breakpoint is enabled.
  grid: {
    base: { columns: 4, gutter: 16, margin: 16 },
    sm: { columns: 4, gutter: 16, margin: 16 },
    md: { columns: 12, gutter: 24, margin: 24 },
    lg: { columns: 12, gutter: 24, margin: 32 },
    xl: { columns: 12, gutter: 32, margin: "auto" },
  },

  // Container max-widths. `content` is px. `narrow` is for prose (typography's
  // --measure); `wide` is full bleed (no max-width, no side padding).
  containers: {
    content: 1440,
    narrow: "var(--measure)",
    wide: "none",
  },

  // Container-query sizes for components, in px. Custom properties can't be used
  // inside @container conditions, so these are reference tokens: write the literal
  // value (in rem) in the query, and keep it in step with this list.
  containerQueries: {
    sm: 360,
    md: 560,
    lg: 800,
  },

  // The two-column section pattern (.l-section): a title on the left, content on the
  // right, from `from` up; below that everything stacks full width. Columns are 1-based
  // grid lines of the page grid. Change the
  // rhythm here and every section built on the pattern follows.
  sectionPattern: {
    from: "md",
    titleSpan: 3, // title: columns 1–3
    bodyStart: 5, // content starts at column 5 ...
    bodySpan: 8, //  ... and spans 8 (columns 5–12), leaving column 4 as the gap
    rowFallbackColumns: 3, // .l-section-row columns where subgrid isn't supported
  },

  // Media blocks: a figure of one or more images in the section body's columns (or full
  // bleed), stacked at base and laid out per variant from the section pattern's range up.
  // `className` is the block's class in the template; variants are [start, span] pairs in
  // the body's columns (bodySpan wide) — 1-based, must fit inside bodySpan. "bleed" is
  // built in: the block escapes to the full width, its caption staying in the body column.
  mediaBlocks: {
    className: "cs-media",
    variants: {
      single: [[1, 8]], // one image filling the column
      duo: [[1, 4], [5, 4]], // two equal images
      asymmetric: [[1, 3], [4, 5]], // ~1/3 + 2/3
      trio: [[1, 2], [4, 2], [7, 2]], // three smaller images, a column apart
    },
  },

  // Defaults baked into the layout primitives; each can still be overridden per
  // element through its custom property (--l-grid-min, --l-sidebar-width, ...).
  primitives: {
    gridMin: 220, // px — .l-grid minimum column width before it wraps
    sidebarWidth: 320, // px — .l-sidebar side column's preferred width
    sidebarContentMin: 50, // % — the content column wraps below this share of the row
    frameRatio: "16 / 9", // .l-frame aspect ratio
  },
};

if (typeof module !== "undefined") module.exports = LAYOUT_CONFIG;
