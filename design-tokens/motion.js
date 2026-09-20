/*
 * Reveal-on-scroll behaviour for .reveal elements (see motion.css). Dependency-free and
 * loadable from file:// with a plain <script>. Auto-runs on DOMContentLoaded; pages or tools
 * that render content later can call Motion.init(scope) themselves.
 *
 *   - An element on screen at load is marked revealed immediately, with no animation
 *     (.reveal-instant), so nothing delays the first read.
 *   - Everything else reveals once, when --motion-threshold of it is visible, and is then
 *     unobserved — it never re-animates on scroll back.
 *   - With reduced motion, or without IntersectionObserver, everything is revealed at once.
 */
(function (root) {
  const revealNow = (el, instant) => {
    if (instant) el.classList.add("reveal-instant");
    el.classList.add("is-revealed");
  };

  function threshold() {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-threshold"));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.15;
  }

  function init(scope) {
    const els = Array.from((scope || document).querySelectorAll(".reveal:not(.is-revealed)"));
    if (!els.length) return;
    const reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in root)) {
      els.forEach((el) => revealNow(el, true));
      return;
    }

    const t = threshold();
    const viewportH = root.innerHeight || document.documentElement.clientHeight;
    const waiting = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // Above the fold on load: reveal now, no animation. (Anything scrolled past also counts.)
      if (r.top < viewportH && r.bottom > 0) revealNow(el, true);
      else if (r.bottom <= 0) revealNow(el, true);
      else waiting.push(el);
    }
    if (!waiting.length) return;

    // Many thresholds, not one: an element taller than 1/threshold viewports never reaches the
    // ratio, so we also accept "at least `t` of the viewport height is covered by it".
    const steps = Array.from({ length: 21 }, (_, i) => i / 20);
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const coversViewport = entry.rootBounds && entry.intersectionRect.height >= entry.rootBounds.height * t;
        if (entry.intersectionRatio >= t || coversViewport) {
          revealNow(entry.target, false);
          io.unobserve(entry.target);
        }
      }
    }, { threshold: steps });
    waiting.forEach((el) => io.observe(el));
  }

  // Marks everything in scope revealed with no animation (previews, printing, tests).
  function revealAll(scope) {
    (scope || document).querySelectorAll(".reveal").forEach((el) => revealNow(el, true));
  }

  // Runs the entrance again on one element or a whole scope (demos).
  function replay(scope) {
    const els = scope.matches && scope.matches(".reveal") ? [scope] : Array.from(scope.querySelectorAll(".reveal"));
    els.forEach((el) => el.classList.remove("is-revealed", "reveal-instant"));
    void document.documentElement.offsetWidth; // commit the hidden state before revealing again
    els.forEach((el) => el.classList.add("is-revealed"));
  }

  root.Motion = { init, revealAll, replay };
  if (!root.MOTION_MANUAL) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
    else init();
  }
})(window);
