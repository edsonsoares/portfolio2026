/*
 * The shared side-by-side frame renderer. Two previews, each with its own brand +
 * mode, both showing whatever scene is currently selected — this is what lets any
 * dimension (not just color) be compared across brands. Depends on shell.js (PG.h,
 * PG.$, PG.shared, PG.dimensions, PG.persist) and scenes.js (PG.scenes) — load after
 * both, before dim-*.js.
 */
(function (PG) {
  const h = PG.h;

  PG.FRAME_PRESETS = {
    mixed: [{ brand: "portfolio", mode: "light" }, { brand: "feelscience", mode: "dark" }],
    "both-light": [{ brand: "portfolio", mode: "light" }, { brand: "feelscience", mode: "light" }],
    "both-dark": [{ brand: "portfolio", mode: "dark" }, { brand: "feelscience", mode: "dark" }],
    single: [{ brand: "portfolio", mode: "light" }],
  };

  PG.FRAME_PRESET_LABELS = [
    ["mixed", "Portfolio light / FeelScience dark"],
    ["both-light", "Both light"],
    ["both-dark", "Both dark"],
    ["single", "Single frame"],
  ];

  function frameHead(frame, frames) {
    return h("div", { class: "pg-frame2-head" },
      h("span", {}, `${frame.brand} · ${frame.mode}${PG.activeClientAccent() ? ` · accent: ${PG.activeClientAccent()}` : ""}`),
      h("button", {
        class: "pg-btn",
        onclick: () => {
          frame.mode = frame.mode === "light" ? "dark" : "light";
          PG.persist();
          PG.renderStage();
        },
      }, "Toggle mode"),
      frames.length > 1
        ? h("button", {
          class: "pg-btn",
          onclick: () => {
            const other = frames.find((f) => f !== frame);
            [frame.brand, other.brand] = [other.brand, frame.brand];
            PG.persist();
            PG.renderStage();
          },
        }, "Swap brand")
        : null);
  }

  PG.renderFrames = function renderFrames() {
    const scene = PG.scenes.find((s) => s.id === PG.shared.scene) || PG.scenes[0];
    const dim = PG.dimensions[PG.shared.dimension];
    const frames = PG.shared.frames;

    const container = h("div", { class: `pg-frames${frames.length === 1 ? " pg-frames-single" : ""}` },
      ...frames.map((frame) => {
        const body = h("div",
          { class: `pg-frame2-body pv${scene.flush ? " pv-flush" : ""}`, "data-brand": frame.brand, "data-mode": frame.mode, "data-accent": PG.activeClientAccent() },
          scene.render());
        return h("div", { class: "pg-frame2" }, frameHead(frame, frames), body);
      }));

    if (PG.shared.annotate && dim.annotate) {
      container.querySelectorAll(".pg-frame2-body").forEach((body) => dim.annotate(body));
    }

    PG.$("frames").replaceChildren(container);
    // Scenes carry .reveal (the case study): show them in their final state, never hidden
    // waiting on a scroll trigger, so editing tokens doesn't blank the preview.
    if (window.Motion) Motion.revealAll(container);
  };
})(window.PG);
