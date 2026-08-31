// Autoplay video loops: pause off-screen, honor prefers-reduced-motion.
(function () {
  "use strict";
  var vids = document.querySelectorAll("video[loop]");
  if (!vids.length) return;

  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");

  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (mq.matches) { e.target.pause(); return; }
        if (e.isIntersecting) { playSafe(e.target); } else { e.target.pause(); }
      });
    }, { threshold: 0.2 });
  }

  function applyMotionPref() {
    vids.forEach(function (v) {
      if (mq.matches) {
        v.removeAttribute("autoplay");
        v.pause();
      } else if (!io) {
        playSafe(v);
      }
    });
  }

  vids.forEach(function (v) { if (io) io.observe(v); });
  if (mq.addEventListener) mq.addEventListener("change", applyMotionPref);
  applyMotionPref();
})();
