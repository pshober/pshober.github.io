/* Lightweight canvas starfield: a few hundred stars, gentle twinkle.
   No dependencies. Honors prefers-reduced-motion (renders static). */
(function () {
  "use strict";
  var canvas = document.getElementById("starfield");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stars = [];
  var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    // clientWidth/Height are read-only — assigning threw in strict mode and
    // silently killed the whole starfield. The canvas is CSS-sized (inset:0),
    // so just track the viewport.
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Density scales with viewport, capped so big screens stay cheap.
    var count = Math.min(220, Math.round((w * h) / 9000));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        base: Math.random() * 0.5 + 0.35,
        // a few warm brand-yellow stars for theme cohesion
        warm: Math.random() < 0.08,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.012 + 0.004
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = reduce ? s.base : s.base + Math.sin(s.tw + t * s.sp) * 0.3;
      if (a < 0.05) a = 0.05;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.warm
        ? "rgba(255,197,50," + a + ")"
        : "rgba(240,234,255," + a + ")";
      ctx.fill();
    }
  }

  var raf = null;
  function loop(t) { draw(t || 0); raf = requestAnimationFrame(loop); }

  function start() {
    resize();
    if (reduce) { draw(0); return; }   // static: draw once
    if (!raf) loop(0);
  }

  // Debounced resize
  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      start();
    }, 150);
  });

  // Pause when tab is hidden (saves battery)
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    } else if (!reduce) { start(); }
  });

  start();
})();
