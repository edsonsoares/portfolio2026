/*
 * Playground shell: layout orchestration, state, persistence (config-fingerprint
 * rule), export, and dimension/scene registries. Plain script, no bundler — must
 * load from file:// via ordinary <script> tags, so everything hangs off one shared
 * global, PG, that later scripts (scenes.js, frames.js, dim-*.js) add to.
 *
 * Load order matters: shell.js first (defines PG + registries), then scenes.js and
 * frames.js, then each dim-*.js (which call PG.registerDimension), then a final
 * inline `PG.boot()` call once everything above has registered itself.
 */
window.PG = window.PG || {};

(function (PG) {
  PG.$ = (id) => document.getElementById(id);

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k === "class") node.className = v;
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    }
    node.append(...children.flat().filter((c) => c !== null && c !== undefined));
    return node;
  }
  PG.h = h;

  // ---------- generic reusable control atoms (shared by every dim-*.js) ----------
  let uid = 0;
  PG.row = function row(label, control) {
    const id = `f${++uid}`;
    const first = control.querySelector("input, select");
    if (first) first.id = id;
    return h("div", { class: "pg-row" }, h("label", { for: id, title: label }, label), control);
  };

  PG.slider = function slider(value, { min, max, step }, onChange) {
    const range = h("input", { type: "range", min, max, step, value });
    const num = h("input", { type: "number", min, max, step, value });
    const commit = (v, from) => {
      if (v === "" || Number.isNaN(Number(v))) return;
      if (from !== range) range.value = v;
      if (from !== num) num.value = v;
      onChange(Number(v));
    };
    range.addEventListener("input", () => commit(range.value, range));
    num.addEventListener("input", () => commit(num.value, num));
    return h("div", { class: "pg-control" }, range, num);
  };

  PG.number = function number(value, attrs, onChange) {
    return h("div", { class: "pg-control" },
      h("input", { type: "number", value, ...attrs, oninput: (e) => e.target.value !== "" && onChange(Number(e.target.value)) }));
  };

  PG.text = function text(value, placeholder, onChange) {
    return h("div", { class: "pg-control" },
      h("input", { type: "text", value, placeholder, oninput: (e) => onChange(e.target.value) }));
  };

  PG.select = function select(value, options, onChange) {
    const sel = h("select", { onchange: (e) => onChange(e.target.value) },
      options.map(([v, label]) => h("option", { value: v, selected: String(v) === String(value) }, label)));
    return h("div", { class: "pg-control" }, sel);
  };

  PG.checkbox = function checkbox(checked, onChange) {
    return h("div", { class: "pg-control" },
      h("input", { type: "checkbox", checked, onchange: (e) => onChange(e.target.checked) }));
  };

  PG.group = (title, ...rows) => h("div", { class: "pg-group" }, h("p", { class: "pg-group-title" }, title), ...rows);

  // ---------- registries ----------
  PG.dimensions = {};
  PG.dimensionOrder = [];
  // def: { key, name, config (raw *_CONFIG object), generate (fn(config)->css text),
  //        cssFileName, configFileName, steps (fn()=>STEPS array, built lazily so it
  //        can close over dim.state), inspectView (fn()=>DOM), annotate (fn(root)),
  //        afterRestore (optional fn(state, defaults)) }
  PG.registerDimension = function registerDimension(key, def) {
    PG.dimensions[key] = Object.assign({ key }, def);
    PG.dimensionOrder.push(key);
  };

  PG.scenes = [];
  PG.registerScene = function registerScene(scene) {
    PG.scenes.push(scene);
  };

  // ---------- persistence: config-fingerprint rule ----------
  // Bumped from the pre-refactor key: the saved shape changed (per-dimension +
  // shared frames/scene state instead of one bag per old mode), so old saved state
  // would otherwise be silently misinterpreted rather than cleanly discarded.
  const STORAGE_KEY = "design-foundations-playground:v2";
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  };

  // Only keep stored values whose keys still exist in the config file.
  function mergeKnown(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : structuredClone(defaults);
    if (saved === null || typeof saved !== typeof defaults) return structuredClone(defaults);
    if (typeof defaults !== "object") return saved;
    const result = {};
    for (const key of Object.keys(defaults)) result[key] = mergeKnown(defaults[key], saved[key]);
    return result;
  }

  // A cheap hash of a config file's current contents. Saved alongside the user's
  // edited copy; if the file changes (a role added, a shape changed) the fingerprint
  // no longer matches and the stale saved copy is discarded instead of silently
  // shadowing the new file contents.
  function fingerprintOf(value) {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    return hash.toString(36);
  }

  function restoreSection(defaults, fingerprint, savedSection) {
    if (!savedSection || savedSection.fingerprint !== fingerprint) return structuredClone(defaults);
    return mergeKnown(defaults, savedSection.config ?? null);
  }

  PG.mergeKnown = mergeKnown;
  PG.fingerprintOf = fingerprintOf;
  PG.restoreSection = restoreSection;

  function persist() {
    const payload = { shared: PG.shared, dimUi: {} };
    for (const key of PG.dimensionOrder) {
      const dim = PG.dimensions[key];
      payload.dimUi[key] = dim.ui;
      payload[key] = { config: dim.state, fingerprint: dim.fingerprint };
    }
    store.set(STORAGE_KEY, payload);
  }
  PG.persist = persist;

  function updateDirty() {
    const dirty = PG.dimensionOrder.some((key) => {
      const dim = PG.dimensions[key];
      return JSON.stringify(dim.state) !== JSON.stringify(dim.defaults);
    });
    PG.$("dirty").hidden = !dirty;
  }
  PG.updateDirty = updateDirty;

  // Live preview uses container-query units (cqi) so the frames' own width drives
  // fluid tokens; the exported/build CSS (exportText below) uses the real default
  // (vw) — dims that have no fluid values just ignore the unused option. `live` also
  // lets layout key its ranges to the preview frame's width (@container) rather than
  // the page's viewport (@media), so the Width slider steps through them.
  function writeLiveTokens(key) {
    const dim = PG.dimensions[key];
    PG.$(`${key}Tokens`).textContent = dim.generate(dim.state, { fluidUnit: "cqi", live: true });
  }
  PG.writeLiveTokens = writeLiveTokens;

  // updateDim(key, mutate): the one entry point every dim-*.js step control calls.
  PG.updateDim = function updateDim(key, mutate) {
    const dim = PG.dimensions[key];
    mutate();
    writeLiveTokens(key);
    if (dim.afterUpdate) dim.afterUpdate(dim.state);
    updateDirty();
    persist();
    if (PG.shared.dimension === key) PG.renderStage();
  };

  // Frames (the shared side-by-side "Context" preview) live in frames.js — it defines
  // PG.FRAME_PRESETS and PG.renderFrames, consumed below by renderStage().

  // ---------- top-level render orchestration ----------
  function renderModeSwitch() {
    document.querySelectorAll("#modeswitch button").forEach((b) =>
      b.setAttribute("aria-current", b.dataset.dim === PG.shared.dimension ? "true" : "false"));
  }

  function renderStageSwitch() {
    document.querySelectorAll("#stageSwitch button").forEach((b) =>
      b.setAttribute("aria-selected", b.dataset.stage === PG.dimensions[PG.shared.dimension].ui.stage));
    const isContext = PG.dimensions[PG.shared.dimension].ui.stage === "context";
    PG.$("sceneSelectLabel").hidden = !isContext;
    PG.$("framesPresetLabel").hidden = !isContext;
    PG.$("annotateLabel").hidden = !isContext;
    PG.$("inspectThemeLabel").hidden = isContext;
    PG.$("reduceMotionLabel").hidden = PG.shared.dimension !== "motion";
    PG.$("reduceMotion").checked = PG.shared.reduceMotion;
  }

  // The client accent currently previewed (null = none). Stored in shared state so
  // every dimension's frames show it, and dropped if the registry no longer has it.
  PG.activeClientAccent = function activeClientAccent() {
    const name = PG.shared.clientAccent;
    return name && PG.dimensions.color?.state.clientAccents?.[name] ? name : null;
  };

  // Inspect content needs the same themed chrome as a Context frame — the --color-*
  // tokens only resolve under [data-brand][data-mode], so a bare container renders blank.
  function renderInspect(dim) {
    const { brand, mode } = PG.shared.inspect;
    return h("div", { class: "pg-frame2" },
      h("div", { class: "pg-frame2-head" },
        h("span", {}, `${brand} · ${mode}${PG.activeClientAccent() ? ` · accent: ${PG.activeClientAccent()}` : ""}`)),
      h("div", { class: "pg-frame2-body pv", "data-brand": brand, "data-mode": mode, "data-accent": PG.activeClientAccent() },
        dim.inspectView()));
  }

  function renderStepNav() {
    const dim = PG.dimensions[PG.shared.dimension];
    const steps = dim.steps();
    dim._steps = steps; // cache so renderStep/goToStep don't rebuild mid-interaction
    PG.$("stepnav").replaceChildren(...steps.map((s, i) =>
      h("button", { "aria-current": i === dim.ui.step ? "step" : null, onclick: () => goToStep(i) }, s.title)));
  }

  function renderStep() {
    const dim = PG.dimensions[PG.shared.dimension];
    const steps = dim._steps || dim.steps();
    const step = steps[dim.ui.step];
    PG.$("step").replaceChildren(
      h("h2", {}, step.title.replace(/^\d+ · /, "")),
      Object.assign(h("p", { class: "pg-hint" }), { innerHTML: step.hint || "" }),
      ...step.render());
    PG.$("step").scrollTop = 0;
    PG.$("prev").disabled = dim.ui.step === 0;
    PG.$("next").disabled = dim.ui.step === steps.length - 1;
    if (dim.afterStepRender) dim.afterStepRender();
  }

  PG.renderStep = renderStep;

  function goToStep(i) {
    const dim = PG.dimensions[PG.shared.dimension];
    dim.ui.step = i;
    renderStepNav();
    renderStep();
    persist();
  }
  PG.goToStep = goToStep;

  function renderScenePicker() {
    PG.$("sceneSelect").replaceChildren(...PG.scenes.map((s) =>
      h("option", { value: s.id, selected: s.id === PG.shared.scene }, s.label)));
  }

  function renderFramesPresetPicker() {
    PG.$("framesPreset").replaceChildren(...PG.FRAME_PRESET_LABELS.map(([key, label]) =>
      h("option", { value: key, selected: key === PG.shared.framesPreset }, label)));
  }

  function renderInspectPickers() {
    const fill = (id, values, current) => PG.$(id).replaceChildren(...values.map((v) =>
      h("option", { value: v, selected: v === current }, v)));
    fill("inspectBrand", ["portfolio", "feelscience"], PG.shared.inspect.brand);
    fill("inspectMode", ["light", "dark"], PG.shared.inspect.mode);
  }

  PG.renderStage = function renderStage() {
    const dim = PG.dimensions[PG.shared.dimension];
    const isContext = dim.ui.stage === "context";
    PG.$("stageContext").hidden = !isContext;
    PG.$("stageInspect").hidden = isContext;
    renderStageSwitch();
    // Forces the reduced-motion path (the .motion-reduce class in motion.css) for checking it
    // without changing OS settings — only while inspecting motion.
    PG.$("stage").classList.toggle("motion-reduce", PG.shared.dimension === "motion" && PG.shared.reduceMotion);
    if (isContext) PG.renderFrames();
    else PG.$("stageInspect").replaceChildren(renderInspect(dim));
    applyFrameWidth();
  };

  function applyFrameWidth() {
    // Both stages take the slider's width, so Inspect views (e.g. layout's ruler) can
    // be stepped through ranges too.
    for (const id of ["stageContext", "stageInspect"]) {
      PG.$(id).style.maxWidth = PG.shared.fit ? "" : `${PG.shared.width}px`;
    }
    PG.$("width").value = PG.shared.width;
    PG.$("width").disabled = PG.shared.fit;
    PG.$("fit").checked = PG.shared.fit;
    PG.$("annotate").checked = PG.shared.annotate;
    updateWidthOut();
  }

  function updateWidthOut() {
    const stage = PG.$("stageContext").hidden ? PG.$("stageInspect") : PG.$("stageContext");
    PG.$("widthOut").value = `${Math.round(stage.getBoundingClientRect().width)}px`;
  }

  // ---------- export ----------
  let exportKind = null;
  function exportTabsForDim(key) {
    const dim = PG.dimensions[key];
    return [[`${key}-config`, dim.configFileName], [`${key}-css`, dim.cssFileName]];
  }
  function allExportTabs() {
    return PG.dimensionOrder.flatMap(exportTabsForDim);
  }
  function configFileComment(dim) {
    return [
      "/*",
      ` * ${dim.name} source of truth, shared by Portfolio2026 and FeelScience.`,
      " *",
      " * Edit values here (or tweak them in design-foundations-playground.html and",
      " * paste the copied config back into this file), then run:  node design-tokens/build.js",
      " */",
      `const ${dim.globalName} = ${JSON.stringify(dim.state, null, 2)};`,
      "",
      `if (typeof module !== "undefined") module.exports = ${dim.globalName};`,
      "",
    ].join("\n");
  }
  function exportText() {
    const [key, kind] = exportKind.split("-");
    const dim = PG.dimensions[key];
    return kind === "css" ? dim.generate(dim.state) : configFileComment(dim);
  }
  function renderExport() {
    document.querySelectorAll("#exportTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.export === exportKind));
    const [key, kind] = exportKind.split("-");
    const dim = PG.dimensions[key];
    PG.$("exportHint").innerHTML = kind === "css"
      ? `Preview of what <code>node design-tokens/build.js</code> writes to <code>${dim.cssFileName}</code>.`
      : `Replace the contents of <code>design-tokens/${dim.configFileName}</code> with this, then press Reset (${dim.name}) so the page reloads from the file.`;
    PG.$("exportText").value = exportText();
    PG.$("copy").textContent = "Copy";
  }

  function renderExportTabs() {
    PG.$("exportTabs").replaceChildren(...allExportTabs().map(([key, label], i) =>
      h("button", { "data-export": key, "aria-selected": i === 0 }, label)));
    exportKind = allExportTabs()[0][0];
  }

  // ---------- reset ----------
  function resetCurrentDimension() {
    const dim = PG.dimensions[PG.shared.dimension];
    if (!confirm(`Discard your edits and reload the values from ${dim.configFileName}?`)) return;
    dim.state = structuredClone(dim.defaults);
    if (dim.afterRestore) dim.afterRestore(dim.state, dim.defaults);
    writeLiveTokens(dim.key);
    renderStepNav();
    renderStep();
    PG.renderStage();
    updateDirty();
    persist();
  }

  // ---------- boot ----------
  PG.boot = function boot() {
    const savedRaw = store.get(STORAGE_KEY) || {};

    for (const key of PG.dimensionOrder) {
      const dim = PG.dimensions[key];
      dim.defaults = structuredClone(dim.config);
      dim.fingerprint = fingerprintOf(dim.defaults);
      dim.state = restoreSection(dim.defaults, dim.fingerprint, savedRaw[key]);
      if (dim.afterRestore) dim.afterRestore(dim.state, dim.defaults);
      dim.ui = {
        step: savedRaw.dimUi?.[key]?.step ?? 0,
        stage: savedRaw.dimUi?.[key]?.stage ?? dim.defaultStage ?? "context",
      };
      writeLiveTokens(key);
    }

    PG.shared = {
      dimension: savedRaw.shared?.dimension ?? PG.dimensionOrder[0],
      scene: savedRaw.shared?.scene ?? PG.scenes[0].id,
      width: savedRaw.shared?.width ?? 1100,
      fit: savedRaw.shared?.fit ?? true,
      annotate: savedRaw.shared?.annotate ?? false,
      reduceMotion: savedRaw.shared?.reduceMotion ?? false,
      clientAccent: savedRaw.shared?.clientAccent ?? null,
      framesPreset: savedRaw.shared?.framesPreset ?? "mixed",
      inspect: { brand: "portfolio", mode: "light", ...savedRaw.shared?.inspect },
      frames: savedRaw.shared?.frames
        ? savedRaw.shared.frames
        : structuredClone(PG.FRAME_PRESETS[savedRaw.shared?.framesPreset ?? "mixed"]),
    };

    // ---- wire events ----
    PG.$("modeswitch").addEventListener("click", (e) => {
      const dimKey = e.target.dataset.dim;
      if (!dimKey || dimKey === PG.shared.dimension) return;
      PG.shared.dimension = dimKey;
      renderModeSwitch();
      renderStepNav();
      renderStep();
      PG.renderStage();
      persist();
    });

    PG.$("stageSwitch").addEventListener("click", (e) => {
      const stage = e.target.dataset.stage;
      if (!stage) return;
      PG.dimensions[PG.shared.dimension].ui.stage = stage;
      PG.renderStage();
      persist();
    });

    PG.$("sceneSelect").addEventListener("change", (e) => {
      PG.shared.scene = e.target.value;
      PG.renderStage();
      persist();
    });

    PG.$("framesPreset").addEventListener("change", (e) => {
      PG.shared.framesPreset = e.target.value;
      PG.shared.frames = structuredClone(PG.FRAME_PRESETS[e.target.value]);
      PG.renderStage();
      persist();
    });

    for (const [id, field] of [["inspectBrand", "brand"], ["inspectMode", "mode"]]) {
      PG.$(id).addEventListener("change", (e) => {
        PG.shared.inspect[field] = e.target.value;
        PG.renderStage();
        persist();
      });
    }

    PG.$("width").addEventListener("input", (e) => {
      PG.shared.width = Number(e.target.value);
      applyFrameWidth();
      persist();
    });
    PG.$("fit").addEventListener("change", (e) => {
      PG.shared.fit = e.target.checked;
      applyFrameWidth();
      persist();
    });
    PG.$("reduceMotion").addEventListener("change", (e) => {
      PG.shared.reduceMotion = e.target.checked;
      PG.renderStage();
      persist();
    });
    PG.$("annotate").addEventListener("change", (e) => {
      PG.shared.annotate = e.target.checked;
      PG.renderStage();
      persist();
    });

    PG.$("prev").addEventListener("click", () => {
      const dim = PG.dimensions[PG.shared.dimension];
      goToStep(Math.max(0, dim.ui.step - 1));
    });
    PG.$("next").addEventListener("click", () => {
      const dim = PG.dimensions[PG.shared.dimension];
      goToStep(Math.min((dim._steps || dim.steps()).length - 1, dim.ui.step + 1));
    });
    PG.$("reset").addEventListener("click", resetCurrentDimension);

    renderExportTabs();
    PG.$("export").addEventListener("click", () => { renderExport(); PG.$("exportDialog").showModal(); });
    PG.$("closeExport").addEventListener("click", () => PG.$("exportDialog").close());
    PG.$("exportTabs").addEventListener("click", (e) => {
      if (!e.target.dataset.export) return;
      exportKind = e.target.dataset.export;
      renderExport();
    });
    PG.$("copy").addEventListener("click", async () => {
      const area = PG.$("exportText");
      try {
        await navigator.clipboard.writeText(area.value);
      } catch {
        area.select();
        document.execCommand("copy");
      }
      PG.$("copy").textContent = "Copied";
    });

    const widthObserver = new ResizeObserver(updateWidthOut);
    widthObserver.observe(PG.$("stageContext"));
    widthObserver.observe(PG.$("stageInspect"));

    // ---- initial render ----
    renderModeSwitch();
    renderScenePicker();
    renderFramesPresetPicker();
    renderInspectPickers();
    renderStepNav();
    renderStep();
    PG.renderStage();
    updateDirty();
  };
})(window.PG);
