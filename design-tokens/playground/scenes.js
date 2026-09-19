/*
 * Shared sample layouts, used by every dimension's Context stage via frames.js.
 * One set of markup, not four — typography, color, spacing and radius tokens all
 * apply to it simultaneously (see the .pv-* rules in the stylesheet), so switching
 * dimensions never changes what's on screen, only which tokens are being edited.
 *
 * Elements carry marker attributes so each dimension's annotate() can find the
 * elements it cares about:
 *   - typography reads the role straight off the element's own "text-*" class
 *   - data-space="<role>"       for spacing (gap/padding-bearing containers)
 *   - data-color-role="<role>"  for color (text/fill roles worth calling out)
 *   - data-radius-role="<role>" for radius (rounded corners)
 *
 * Depends only on shell.js's PG.h. Load after shell.js, before frames.js/dim-*.js
 * (frames.js reads PG.scenes when rendering).
 */
(function (PG) {
  const h = PG.h;
  const editable = (cls, content, tag = "p", extra = {}) =>
    h(tag, { class: cls, contenteditable: "true", spellcheck: "false", ...extra }, content);

  function heroScene() {
    return h("div", { class: "pv-context" },
      h("section", { class: "pv-hero", "data-space": "stack" },
        editable("text-label pv-eyebrow", "Case study · 2026", "p", { "data-color-role": "accent-text" }),
        editable("text-display", "Calm interfaces for complex science", "h1"),
        editable("text-body-lg", "How we turned years of physiological research into a product people open every morning — without dumbing down the science."),
        h("div", { class: "pv-actions", "data-space": "inline" },
          h("span", { class: "pv-button text-action", "data-color-role": "accent", "data-radius-role": "control" }, "Read case study"),
          h("span", { class: "pv-button ghost text-action", "data-radius-role": "control" }, "View prototype"))));
  }

  function articleScene() {
    return h("div", { class: "pv-context" },
      h("article", { class: "pv-article" },
        editable("text-heading-lg", "Why stress feels different in the body", "h2"),
        editable("text-body-sm pv-byline", "FeelScience Journal · 12 min read · September 2026"),
        editable("text-prose", "Heart-rate variability (HRV) describes the small changes in time between heartbeats. Higher variability is generally associated with a nervous system that adapts well to changing demands, while persistently low values can signal accumulated stress."),
        editable("text-prose", "In a six-week study, participants wore a sensor overnight and logged how rested they felt each morning. The relationship between the two was stronger than either the sensor or the self-report alone."),
        editable("text-heading-md", "What the research tells us", "h3"),
        editable("text-prose", "Across 48 participants, morning HRV predicted self-reported energy with a correlation of r = 0.62. Temperature changes of ±0.5 °C had a smaller but measurable effect."),
        h("figure", { class: "pv-figure", "data-space": "stack-tight" },
          h("div", { class: "pv-figure-img", role: "img", "aria-label": "Placeholder chart", "data-radius-role": "media" }),
          editable("text-caption", "Figure 2. Morning HRV versus self-reported energy (n = 48, p < 0.05).", "figcaption")),
        editable("text-heading-sm", "Methods and participants", "h4"),
        editable("text-prose", "Data were collected with a chest-strap sensor sampling at 1,000 Hz. RMSSD was computed over a five-minute window before waking:"),
        h("pre", { class: "pv-code", "data-color-role": "surface-raised" }, editable("text-mono", "const rmssd = Math.sqrt(mean(diffs.map((d) => d ** 2)));\n// median: 42.7 ms  ·  IQR: 31.2–58.9 ms", "code")),
        editable("text-body-sm pv-footnote", "¹ Values are illustrative. This preview uses placeholder content to show hierarchy, not real findings.")));
  }

  function cardsScene() {
    return h("div", { class: "pv-context" },
      h("section", { class: "pv-cards", "data-space": "stack" },
        ["Sleep", "Breathing", "Movement"].map((topic, i) =>
          h("div", { class: "pv-card", "data-color-role": "border-subtle", "data-radius-role": "card" },
            editable("text-label", `Module 0${i + 1}`),
            editable("text-heading-sm", `${topic} and recovery`, "h3"),
            editable("text-body-sm", "A short description that sits under a card title and wraps onto a second line.")))));
  }

  function controlsScene() {
    return h("div", { class: "pv-context" },
      h("section", { class: "pv-controls", "data-space": "stack" },
        h("div", { class: "pv-actions", "data-space": "inline" },
          h("span", { class: "pv-button text-action", "data-color-role": "accent", "data-radius-role": "control" }, "Primary"),
          h("span", { class: "pv-button ghost text-action", "data-radius-role": "control" }, "Secondary")),
        h("input", {
          type: "text", placeholder: "Input field", class: "pv-input", "data-radius-role": "control",
        }),
        h("div", { class: "pv-actions", "data-space": "inline" },
          h("span", { class: "text-label pv-tag", "data-color-role": "accent-subtle", "data-radius-role": "pill" }, "Tag one"),
          h("span", { class: "text-label pv-tag", "data-color-role": "accent-subtle", "data-radius-role": "pill" }, "Tag two")),
        h("div", { class: "pv-modal", "data-color-role": "surface", "data-radius-role": "surface" },
          editable("text-body-sm", "A raised panel — dialogs, popovers, menus.")),
        h("div", { class: "pv-ctx-surface-raised", "data-color-role": "surface-raised" },
          editable("text-caption", "Caption text on a raised panel — figure captions, table footnotes.")),
        h("div", { class: "pv-status-success", "data-color-role": "status-success" },
          editable("text-body-sm", "Changes saved successfully."))));
  }

  PG.registerScene({ id: "hero", label: "Hero", render: heroScene });
  PG.registerScene({ id: "article", label: "Article", render: articleScene });
  PG.registerScene({ id: "cards", label: "Cards", render: cardsScene });
  PG.registerScene({ id: "controls", label: "Controls", render: controlsScene });
})(window.PG);
