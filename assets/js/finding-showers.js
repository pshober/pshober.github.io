/* finding-showers.js — the four interactive widgets on /research/finding-showers/.
 *
 * No libraries. All plotting is 2D canvas. All similarity maths comes from
 * assets/js/d-criteria.js, which is a verified port of the published analysis code
 * (see scripts/verify-d/). Widgets 2-4 run on real data shipped in
 * assets/data/finding-showers/.
 *
 * Every widget: real form controls, a keyboard-reachable canvas with role="img",
 * and a live text summary so the page still works without canvas.
 */
(function () {
  "use strict";

  var D = window.DCriteria;
  var BASE = window.FS_DATA_BASE || "/assets/data/finding-showers/";

  // ---------------------------------------------------------------- utilities

  function $(id) { return document.getElementById(id); }
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  var C = {};
  function loadColors() {
    C.orange = css("--accent", "#ff6c40");
    C.yellow = css("--accent-2", "#ffc532");
    C.violet = css("--violet", "#b044fc");
    C.olive = css("--olive-bright", "#cfc47e");
    C.text = css("--text", "#ffffff");
    C.muted = css("--muted", "#cfc3e0");
    C.faint = css("--faint", "#a893c2");
    C.plate = css("--plate", "#14001f");
    C.grid = "rgba(255,255,255,0.10)";
  }

  function fitCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr; cv.height = h * dpr;
    }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function fmt(x, n) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    return Number(x).toFixed(n === undefined ? 3 : n);
  }
  function group(n) { return Math.round(n).toLocaleString("en-US"); }

  // Deterministic RNG so a given slider position always gives the same picture.
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function getJSON(name) {
    return fetch(BASE + name).then(function (r) {
      if (!r.ok) throw new Error(name + ": HTTP " + r.status);
      return r.json();
    });
  }

  function fail(el, err) {
    if (!el) return;
    el.textContent = "This interactive could not load (" + err.message + "). " +
      "The figures and the text around it tell the same story.";
    el.hidden = false;
  }

  /* =====================================================================
   * 1. Cumulative similarity distribution
   * ===================================================================== */
  var CSD = (function () {
    var cv, ctx, W, H, out, note, busy;
    var nullBand = null, nullKey = "";
    // Center the injected stream on the real M2026-A1 encounter geometry.
    var S = { U: 1.014, theta: 112.26, phi: 277.73, sol: 8.21 };
    var NBINS = 48, DMIN = 5e-3, DMAX = 2.0;

    function edges() {
      var e = [], lo = Math.log10(DMIN), hi = Math.log10(DMAX);
      for (var i = 0; i <= NBINS; i++) e.push(Math.pow(10, lo + (hi - lo) * i / NBINS));
      return e;
    }
    var EDGES = edges();

    // A synthetic sporadic background drawn uniformly in D_N's own four
    // coordinates. Uniform is the point: random points in d dimensions give
    // N(<D) proportional to D^d, so this must come out at a slope near 4.
    function sporadic(rand) {
      return {
        U: 0.15 + 1.20 * rand(),
        theta: Math.acos(1 - 2 * rand()) * 180 / Math.PI,
        phi: 360 * rand(),
        sol: 360 * rand()
      };
    }

    function build(M, k, err, seed) {
      var rand = mulberry(seed), i, m, list = [];
      for (i = 0; i < M - k; i++) list.push(sporadic(rand));
      for (i = 0; i < k; i++) {
        list.push({
          U: S.U + 0.004 * gauss(rand),
          theta: S.theta + 0.35 * gauss(rand),
          phi: S.phi + 0.70 * gauss(rand),
          sol: S.sol + 1.10 * gauss(rand)
        });
      }
      // Measurement error blurs every meteor, stream and sporadic alike.
      var comps = [];
      for (i = 0; i < list.length; i++) {
        m = list[i];
        comps.push(D.dnComponents({
          U: m.U + err * 0.05 * gauss(rand),
          theta: m.theta + err * 3.0 * gauss(rand),
          phi: m.phi + err * 3.0 * gauss(rand),
          sol: m.sol
        }));
      }
      return comps;
    }

    function csd(comps) {
      var counts = new Float64Array(NBINS), n = comps.length, i, j, d, b;
      for (i = 0; i < n; i++) {
        for (j = i + 1; j < n; j++) {
          d = D.dnFromComponents(comps[i], comps[j]);
          if (d < DMIN) { counts[0]++; continue; }
          if (d >= DMAX) continue;
          b = Math.floor(NBINS * (Math.log10(d) - Math.log10(DMIN)) /
                        (Math.log10(DMAX) - Math.log10(DMIN)));
          if (b >= 0 && b < NBINS) counts[b]++;
        }
      }
      var cum = new Float64Array(NBINS), run = 0;
      for (i = 0; i < NBINS; i++) { run += counts[i]; cum[i] = run; }
      return cum;
    }

    function ensureNull(M, err) {
      var key = M + "|" + err;
      if (nullKey === key && nullBand) return nullBand;
      var R = 24, all = [], r;
      for (r = 0; r < R; r++) all.push(csd(build(M, 0, err, 9001 + r * 137)));
      var lo = new Float64Array(NBINS), hi = new Float64Array(NBINS),
          mid = new Float64Array(NBINS);
      for (var b = 0; b < NBINS; b++) {
        var s = 0, s2 = 0;
        for (r = 0; r < R; r++) { s += all[r][b]; s2 += all[r][b] * all[r][b]; }
        var mu = s / R, sd = Math.sqrt(Math.max(0, s2 / R - mu * mu));
        mid[b] = mu; lo[b] = Math.max(0, mu - 3 * sd); hi[b] = mu + 3 * sd;
      }
      var sl = [], sv;
      for (r = 0; r < R; r++) { sv = slope(all[r]); if (sv !== null) sl.push(sv); }
      var slMean = null, slSd = null;
      if (sl.length > 1) {
        slMean = sl.reduce(function (x, y) { return x + y; }, 0) / sl.length;
        var acc = 0;
        sl.forEach(function (v) { acc += (v - slMean) * (v - slMean); });
        slSd = Math.sqrt(acc / (sl.length - 1));
      }

      nullKey = key;
      nullBand = { lo: lo, hi: hi, mid: mid, slope: slMean, slopeSd: slSd };
      return nullBand;
    }

    // Least-squares slope of log N vs log D, over whatever range is actually
    // populated and still in the power-law regime (before the curve saturates).
    function slope(cum) {
      var total = cum[NBINS - 1] || 1;
      var xs = [], ys = [], i;
      for (i = 0; i < NBINS; i++) {
        if (cum[i] < 5) continue;
        if (cum[i] > Math.max(60, 0.01 * total)) break;
        var dmid = Math.sqrt(EDGES[i] * EDGES[i + 1]);
        xs.push(Math.log10(dmid)); ys.push(Math.log10(cum[i]));
      }
      if (xs.length < 4) return null;
      var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
      var den = n * sxx - sx * sx;
      return den === 0 ? null : (n * sxy - sx * sy) / den;
    }

    function draw(obs, band, M) {
      var f = fitCanvas(cv); ctx = f.ctx; W = f.w; H = f.h;
      var L = 52, Rp = 10, T = 12, B = 34;
      var ymax = Math.max(10, M * M / 2);
      function px(d) { return L + (Math.log10(d) - Math.log10(DMIN)) /
        (Math.log10(DMAX) - Math.log10(DMIN)) * (W - L - Rp); }
      function py(v) {
        var y = Math.log10(Math.max(v, 0.5)), y0 = Math.log10(0.5), y1 = Math.log10(ymax);
        return T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
      }

      ctx.fillStyle = C.plate; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.fillStyle = C.faint; ctx.font = "11px system-ui, sans-serif";
      function sup(n) {
        var m = { "-": "\u207B", "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
                  "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
                  "8": "\u2078", "9": "\u2079" };
        return String(n).split("").map(function (c) { return m[c] || c; }).join("");
      }
      var dec;
      for (dec = -3; dec <= 1; dec++) {
        var x = px(Math.pow(10, dec));
        if (x < L - 1 || x > W - Rp + 1) continue;
        ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText("10" + sup(dec), x, H - B + 15);
      }
      for (dec = 0; dec <= 8; dec++) {
        var v = Math.pow(10, dec); if (v > ymax) break;
        var y = py(v);
        ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - Rp, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(dec === 0 ? "1" : "10" + sup(dec), L - 6, y + 4);
      }
      ctx.textAlign = "center";
      ctx.fillStyle = C.muted;
      ctx.fillText("Dₙ  (dissimilarity — smaller means more alike)", (L + W - Rp) / 2, H - 6);
      ctx.save(); ctx.translate(12, (T + H - B) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText("pairs closer than Dₙ", 0, 0); ctx.restore();

      // 3-sigma envelope for pure chance
      ctx.beginPath();
      var i, dm;
      for (i = 0; i < NBINS; i++) {
        dm = Math.sqrt(EDGES[i] * EDGES[i + 1]);
        if (i === 0) ctx.moveTo(px(dm), py(band.hi[i])); else ctx.lineTo(px(dm), py(band.hi[i]));
      }
      for (i = NBINS - 1; i >= 0; i--) {
        dm = Math.sqrt(EDGES[i] * EDGES[i + 1]);
        ctx.lineTo(px(dm), py(band.lo[i]));
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(176,68,252,0.28)"; ctx.fill();

      ctx.beginPath();
      var started = false;
      for (i = 0; i < NBINS; i++) {
        if (obs[i] < 1) continue;               // nothing is that similar yet
        dm = Math.sqrt(EDGES[i] * EDGES[i + 1]);
        if (!started) { ctx.moveTo(px(dm), py(obs[i])); started = true; }
        else ctx.lineTo(px(dm), py(obs[i]));
      }
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2.2; ctx.stroke();
    }

    function run() {
      var M = +$("fs-csd-m").value, k = +$("fs-csd-k").value, err = +$("fs-csd-err").value / 100;
      $("fs-csd-m-v").textContent = M;
      $("fs-csd-k-v").textContent = k;
      $("fs-csd-err-v").textContent = err === 0 ? "none"
        : "\u00B1" + (err * 0.05 * 29.78).toFixed(1) + " km/s, \u00B1" + (err * 3).toFixed(1) + "\u00B0";
      if (k > M) { $("fs-csd-k").value = M; k = M; $("fs-csd-k-v").textContent = k; }

      busy.hidden = false;
      setTimeout(function () {
        try {
          var band = ensureNull(M, err);
          var obs = csd(build(M, k, err, 4242));
          draw(obs, band, M);

          var a = slope(obs);
          var total = obs[NBINS - 1] || 1;
          var above = 0, firstD = null;
          for (var i = 0; i < NBINS; i++) {
            // low-D regime only: where chance still predicts very few pairs
            if (band.mid[i] > 0.01 * total) break;
            if (obs[i] > band.hi[i] && obs[i] >= 3) {
              above++;
              if (firstD === null) firstD = Math.sqrt(EDGES[i] * EDGES[i + 1]);
            }
          }
          var aNull = band.slope;
          $("fs-csd-slope").textContent = a === null ? "—" : a.toFixed(2);
          $("fs-csd-slope-null").textContent = aNull === null ? "—"
            : aNull.toFixed(2) + (band.slopeSd ? " \u00B1 " + band.slopeSd.toFixed(2) : "");
          $("fs-csd-verdict").textContent = above >= 2
            ? "Excess: the curve breaks above the chance envelope below Dₙ ≈ " + firstD.toFixed(3) + "."
            : "No excess: the curve stays inside the chance envelope, and stays straight.";
          $("fs-csd-verdict").className = above >= 2 ? "fs-verdict is-hit" : "fs-verdict";
          out.textContent = M + " meteors (" + k + " of them a planted stream), " +
            group(M * (M - 1) / 2) + " pairs. Small-D slope " +
            (a === null ? "undefined" : a.toFixed(2)) + ", against " +
            (aNull === null ? "undefined" : aNull.toFixed(2) +
              (band.slopeSd ? " plus or minus " + band.slopeSd.toFixed(2) : "")) +
            " for chance alone. " +
            (above >= 2 ? above + " bins rise above the 3-sigma chance envelope."
                        : "No bin rises above the 3-sigma chance envelope.");
          note.textContent = "";
        } catch (e) { note.textContent = "Error: " + e.message; }
        busy.hidden = true;
      }, 16);
    }

    return {
      init: function () {
        cv = $("fs-csd-canvas"); if (!cv) return;
        out = $("fs-csd-summary"); note = $("fs-csd-note"); busy = $("fs-csd-busy");
        ["fs-csd-m", "fs-csd-k", "fs-csd-err"].forEach(function (id) {
          $(id).addEventListener("input", run);
        });
        $("fs-csd-reset").addEventListener("click", function () {
          $("fs-csd-m").value = 250; $("fs-csd-k").value = 0; $("fs-csd-err").value = 0; run();
        });
        window.addEventListener("resize", debounce(run, 200));
        run();
      }
    };
  })();

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* =====================================================================
   * 2. Spot the cluster  (+ the pair-count counter)
   * ===================================================================== */
  var Haystack = (function () {
    var cv, bg = null, members = null, revealed = false, guess = null;
    var QLO = 0.05, QHI = 0.42, ILO = 0, IHI = 45, PAD = { l: 46, r: 10, t: 10, b: 32 };
    var cx, cyi; // cluster centroid

    function draw() {
      var f = fitCanvas(cv), ctx = f.ctx, W = f.w, H = f.h;
      function px(q) { return PAD.l + (q - QLO) / (QHI - QLO) * (W - PAD.l - PAD.r); }
      function py(i) { return H - PAD.b - (i - ILO) / (IHI - ILO) * (H - PAD.t - PAD.b); }

      ctx.fillStyle = C.plate; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.fillStyle = C.faint; ctx.font = "11px system-ui, sans-serif";
      var t;
      for (t = 0.1; t <= QHI + 1e-9; t += 0.1) {
        ctx.beginPath(); ctx.moveTo(px(t), PAD.t); ctx.lineTo(px(t), H - PAD.b); ctx.stroke();
        ctx.textAlign = "center"; ctx.fillText(t.toFixed(1), px(t), H - PAD.b + 15);
      }
      for (t = 0; t <= IHI; t += 15) {
        ctx.beginPath(); ctx.moveTo(PAD.l, py(t)); ctx.lineTo(W - PAD.r, py(t)); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(String(t), PAD.l - 6, py(t) + 4);
      }
      ctx.fillStyle = C.muted; ctx.textAlign = "center";
      ctx.fillText("perihelion distance q (au)", (PAD.l + W - PAD.r) / 2, H - 4);
      ctx.save(); ctx.translate(11, (PAD.t + H - PAD.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText("inclination (°)", 0, 0); ctx.restore();

      ctx.fillStyle = "rgba(207,195,224,0.45)";
      for (var i = 0; i < bg.length; i++) ctx.fillRect(px(bg[i][0]) - 0.6, py(bg[i][1]) - 0.6, 1.4, 1.4);

      if (revealed) {
        ctx.fillStyle = C.orange;
        for (var j = 0; j < members.length; j++) {
          ctx.beginPath();
          ctx.arc(px(members[j].q), py(members[j].i), 2.1, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.strokeStyle = C.yellow; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(px(cx), py(cyi), 26, 0, 2 * Math.PI); ctx.stroke();
      }
      if (guess) {
        ctx.strokeStyle = revealed ? C.olive : C.yellow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px(guess.q), py(guess.i), 9, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px(guess.q) - 13, py(guess.i)); ctx.lineTo(px(guess.q) + 13, py(guess.i));
        ctx.moveTo(px(guess.q), py(guess.i) - 13); ctx.lineTo(px(guess.q), py(guess.i) + 13);
        ctx.stroke();
      }
    }

    function say(msg) { $("fs-hay-msg").textContent = msg; }

    function summarize() {
      $("fs-hay-summary").textContent =
        bg.length.toLocaleString("en-US") + " sporadic meteors from the Global Meteor Network, " +
        "plotted by perihelion distance and inclination. Hidden among them are the " +
        members.length + " members of M2026-A1, which sit near q = " + cx.toFixed(2) +
        " au and i = " + cyi.toFixed(0) + " degrees." +
        (revealed ? " They are currently shown in orange." : " They are currently hidden.");
    }

    function onClick(ev) {
      var r = cv.getBoundingClientRect(), W = r.width, H = r.height;
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      var q = QLO + (x - PAD.l) / (W - PAD.l - PAD.r) * (QHI - QLO);
      var i = ILO + (H - PAD.b - y) / (H - PAD.t - PAD.b) * (IHI - ILO);
      if (q < QLO || q > QHI || i < ILO || i > IHI) return;
      guess = { q: q, i: i };
      var dq = (q - cx) / (QHI - QLO), di = (i - cyi) / (IHI - ILO);
      var miss = Math.sqrt(dq * dq + di * di);
      say(miss < 0.05 ? "That is it. The cluster is right there."
        : miss < 0.13 ? "Close. You are within a whisker of it."
        : miss < 0.3 ? "Not quite — it is somewhere else in the field."
        : "A long way off. Try again, or reveal it.");
      draw(); summarize();
    }

    return {
      init: function () {
        cv = $("fs-hay-canvas"); if (!cv) return;
        Promise.all([getJSON("background.json"), getJSON("cluster.json")])
          .then(function (res) {
            bg = res[0].points;
            members = res[1].members;
            var sq = 0, si = 0;
            members.forEach(function (m) { sq += m.q; si += m.i; });
            cx = sq / members.length; cyi = si / members.length;
            cv.addEventListener("click", onClick);
            cv.addEventListener("keydown", function (e) {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("fs-hay-reveal").click(); }
            });
            $("fs-hay-reveal").addEventListener("click", function () {
              revealed = !revealed;
              this.textContent = revealed ? "Hide the stream" : "Reveal the stream";
              say(revealed
                ? "There it is: 282 meteors, about one in every 430 in this field of view."
                : "Hidden again. Click anywhere on the chart to guess.");
              draw(); summarize();
            });
            window.addEventListener("resize", debounce(draw, 200));
            draw(); summarize();
          })
          .catch(function (e) { fail($("fs-hay-note"), e); });
      }
    };
  })();

  /* =====================================================================
   * 2b. How many pairs?  (the birthday-paradox counter)
   * ===================================================================== */
  var Pairs = (function () {
    var MARKS = [
      { n: 50, label: "meteorite falls with orbits" },
      { n: 824, label: "European Fireball Network fireballs" },
      { n: 122943, label: "GMN meteors in the 2026 paper" }
    ];
    function run() {
      var n = Math.round(Math.pow(10, +$("fs-pairs-n").value));
      var pairs = n * (n - 1) / 2;
      var p = Math.pow(10, -(+$("fs-pairs-p").value));
      var fp = pairs * p;
      $("fs-pairs-n-v").textContent = group(n);
      $("fs-pairs-p-v").textContent = "1 in " + group(1 / p);
      $("fs-pairs-out").textContent = group(pairs);
      $("fs-pairs-fp").textContent = fp < 1 ? fp.toFixed(2) : group(fp);
      var near = MARKS.reduce(function (a, b) {
        return Math.abs(Math.log10(b.n) - Math.log10(n)) < Math.abs(Math.log10(a.n) - Math.log10(n)) ? b : a;
      });
      $("fs-pairs-mark").textContent =
        Math.abs(Math.log10(near.n) - Math.log10(n)) < 0.12 ? "≈ " + near.label : "";
      $("fs-pairs-summary").textContent =
        group(n) + " objects make " + group(pairs) + " possible pairs. If one pair in " +
        group(1 / p) + " looks like a match purely by chance, that is " +
        (fp < 1 ? fp.toFixed(2) : group(fp)) + " false matches before any real stream exists.";
    }
    return {
      init: function () {
        if (!$("fs-pairs-n")) return;
        $("fs-pairs-n").addEventListener("input", run);
        $("fs-pairs-p").addEventListener("input", run);
        run();
      }
    };
  })();

  /* =====================================================================
   * 3. The (U, lambda_sun) pair-excess map — real data
   * ===================================================================== */
  var Grid = (function () {
    var cv, data, mode = "z", k = 3, sel = null, hover = null;
    var PAD = { l: 54, r: 12, t: 10, b: 34 };

    function val(b) {
      return mode === "obs" ? b.obs : mode === "mu" ? b.mu : (b.z === null ? 0 : b.z);
    }
    function ramp(t) { // dark plate -> violet -> orange -> yellow
      t = Math.max(0, Math.min(1, t));
      var stops = [[20, 0, 31], [72, 22, 110], [176, 68, 252], [255, 108, 64], [255, 197, 50]];
      var x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
      var a = stops[i], b = stops[i + 1];
      return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," +
                      Math.round(a[1] + (b[1] - a[1]) * f) + "," +
                      Math.round(a[2] + (b[2] - a[2]) * f) + ")";
    }

    function draw() {
      var f = fitCanvas(cv), ctx = f.ctx, W = f.w, H = f.h;
      var nx = data.nx, ny = data.ny;
      var pw = (W - PAD.l - PAD.r) / nx, ph = (H - PAD.t - PAD.b) / ny;
      var vmax = 0;
      data.bins.forEach(function (b) { vmax = Math.max(vmax, val(b)); });
      if (vmax <= 0) vmax = 1;

      ctx.fillStyle = C.plate; ctx.fillRect(0, 0, W, H);
      data.bins.forEach(function (b) {
        var x = PAD.l + b.ix * pw, y = H - PAD.b - (b.iy + 1) * ph;
        ctx.fillStyle = ramp(val(b) / vmax);
        ctx.fillRect(x, y, Math.ceil(pw) + 0.5, Math.ceil(ph) + 0.5);
        if (b.sd > 0 && b.obs > b.mu + k * b.sd) {
          ctx.strokeStyle = C.yellow; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
        }
        if (sel && sel.ix === b.ix && sel.iy === b.iy) {
          ctx.strokeStyle = C.text; ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
        }
      });

      ctx.fillStyle = C.faint; ctx.font = "11px system-ui, sans-serif";
      var i;
      for (i = 0; i <= nx; i += 4) {
        var b0 = data.bins.find(function (b) { return b.ix === Math.min(i, nx - 1); });
        var uu = i >= nx ? b0.x1 : b0.x0;
        ctx.textAlign = "center";
        ctx.fillText(uu.toFixed(1), PAD.l + i * pw, H - PAD.b + 15);
      }
      for (i = 0; i <= ny; i += 4) {
        var yy = H - PAD.b - i * ph;
        ctx.textAlign = "right";
        ctx.fillText(String(i * 18), PAD.l - 6, yy + 4);
      }
      ctx.fillStyle = C.muted; ctx.textAlign = "center";
      ctx.fillText("U  (geocentric speed ÷ Earth's 29.78 km/s)", (PAD.l + W - PAD.r) / 2, H - 4);
      ctx.save(); ctx.translate(12, (PAD.t + H - PAD.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText("solar longitude (°)", 0, 0); ctx.restore();
    }

    function info(b) {
      if (!b) {
        $("fs-grid-info").innerHTML = "<em>Pick a cell to see its numbers.</em>";
        return;
      }
      var sig = b.sd > 0 && b.obs > b.mu + k * b.sd;
      $("fs-grid-info").innerHTML =
        "<b>U " + b.x0.toFixed(3) + "–" + b.x1.toFixed(3) +
        "</b> &middot; <b>λ<sub>☉</sub> " + b.y0 + "–" + b.y1 + "°</b><br>" +
        "observed <b>" + b.obs + "</b> pairs &middot; chance predicts <b>" + fmt(b.mu, 2) +
        " ± " + fmt(b.sd, 2) + "</b><br>z = <b>" + fmt(b.z, 2) + "</b> " +
        (sig ? "<span class='fs-tag is-hit'>above " + k + "σ</span>"
             : "<span class='fs-tag'>consistent with chance</span>");
    }

    function lookElsewhere() {
      var m = Math.round(+$("fs-grid-m").value);
      var zmax = 0;
      data.bins.forEach(function (b) { if (b.z !== null && b.z > zmax) zmax = b.z; });
      // one-sided normal tail, Abramowitz & Stegun 26.2.17
      function tail(z) {
        var t = 1 / (1 + 0.2316419 * z);
        var d = 0.3989422804014327 * Math.exp(-z * z / 2);
        return d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
               t * (-1.821255978 + t * 1.330274429))));
      }
      var pl = tail(zmax);
      var pg = 1 - Math.pow(1 - pl, m);
      function sigmaOf(p) { // invert the tail, coarse bisection
        var lo = 0, hi = 12;
        for (var it = 0; it < 200; it++) {
          var mid = (lo + hi) / 2;
          if (tail(mid) > p) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      }
      $("fs-grid-m-v").textContent = m;
      $("fs-grid-plocal").textContent = pl.toExponential(1);
      $("fs-grid-pglobal").textContent = pg.toExponential(1);
      $("fs-grid-sigma").textContent = sigmaOf(pg).toFixed(1) + "σ";
    }

    function counts() {
      var n = 0;
      data.bins.forEach(function (b) { if (b.sd > 0 && b.obs > b.mu + k * b.sd) n++; });
      $("fs-grid-count").textContent = n;
      $("fs-grid-summary").textContent =
        "A " + data.nx + " by " + data.ny + " grid of geocentric speed against solar longitude, " +
        "holding " + data.bins.length + " cells. At a " + k + "-sigma threshold, " + n +
        " cell" + (n === 1 ? "" : "s") + " hold more close pairs than chance predicts. " +
        "The strongest sits at U 0.967 to 1.061 and solar longitude 0 to 18 degrees, " +
        "with 135 observed pairs against about 38.9 expected — z = 6.32.";
    }

    function pick(ev) {
      var r = cv.getBoundingClientRect();
      var pw = (r.width - PAD.l - PAD.r) / data.nx, ph = (r.height - PAD.t - PAD.b) / data.ny;
      var ix = Math.floor((ev.clientX - r.left - PAD.l) / pw);
      var iy = Math.floor((r.height - PAD.b - (ev.clientY - r.top)) / ph);
      var b = data.bins.find(function (q) { return q.ix === ix && q.iy === iy; });
      if (b) { sel = b; info(b); draw(); }
    }

    return {
      init: function () {
        cv = $("fs-grid-canvas"); if (!cv) return;
        getJSON("grid2d.json").then(function (d) {
          data = d;
          cv.addEventListener("click", pick);
          Array.prototype.forEach.call(document.querySelectorAll("[name=fs-grid-mode]"),
            function (r) {
              r.addEventListener("change", function () { mode = this.value; draw(); });
            });
          $("fs-grid-k").addEventListener("input", function () {
            k = +this.value; $("fs-grid-k-v").textContent = k;
            counts(); info(sel); draw();
          });
          $("fs-grid-m").addEventListener("input", lookElsewhere);
          window.addEventListener("resize", debounce(draw, 200));
          // Open on the detection so the first thing seen is the real result.
          sel = data.bins.find(function (b) { return b.ix === 9 && b.iy === 0; }) || null;
          info(sel); counts(); lookElsewhere(); draw();
        }).catch(function (e) { fail($("fs-grid-note"), e); });
      }
    };
  })();

  /* =====================================================================
   * 4. The two-meteor D calculator
   * ===================================================================== */
  var Calc = (function () {
    var FIELDS = ["q", "e", "i", "w", "O", "sol", "ra", "dec", "vg"];
    var presets = null, active = null, edited = false;

    // What the numbers cannot tell you. Shown whenever the inputs are not a preset
    // with a published, population-level verdict attached.
    var GENERIC =
      "These four numbers are not a verdict. Whether a pair is significant depends on the " +
      "population it came from — how many objects, how many pairs that makes, and how many " +
      "of those pairs chance alone would put at or below this D. None of that is in the numbers " +
      "above. Steps 2 and 5 are where it comes from.";

    function read(side) {
      var o = {};
      FIELDS.forEach(function (f) { o[f] = parseFloat($("fs-calc-" + side + "-" + f).value); });
      return o;
    }
    function write(side, o) {
      FIELDS.forEach(function (f) {
        if (o[f] !== undefined && o[f] !== null) $("fs-calc-" + side + "-" + f).value = o[f];
      });
      $("fs-calc-" + side + "-label").textContent = o.label || "";
      $("fs-calc-" + side + "-note").textContent = o.note || "";
    }

    function run() {
      var a = read("a"), b = read("b"), bad = false;
      FIELDS.forEach(function (f) {
        if (!isFinite(a[f]) || !isFinite(b[f])) bad = true;
      });
      if (bad) { $("fs-calc-summary").textContent = "Fill in every field to compute."; return; }

      var vals = {
        D_N: D.D_N({ ra: a.ra, dec: a.dec, sol: a.sol, v_g: a.vg },
                   { ra: b.ra, dec: b.dec, sol: b.sol, v_g: b.vg }),
        D_SH: D.D_SH(a.q, a.e, a.i, a.w, a.O, b.q, b.e, b.i, b.w, b.O),
        D_prime: D.D_prime(a.q, a.e, a.i, a.w, a.O, b.q, b.e, b.i, b.w, b.O),
        D_H: D.D_H(a.q, a.e, a.i, a.w, a.O, b.q, b.e, b.i, b.w, b.O)
      };
      var parts = [];
      ["D_N", "D_SH", "D_prime", "D_H"].forEach(function (kk) {
        var v = vals[kk];
        $("fs-calc-" + kk).textContent = isFinite(v) ? v.toFixed(4) : "—";
        parts.push(kk.replace("_", " ") + " " + (isFinite(v) ? v.toFixed(4) : "undefined"));
      });

      var el = $("fs-calc-verdict");
      if (active && !edited) {
        el.innerHTML = active.verdict;
        el.className = "fs-verdict is-sourced";
      } else {
        el.textContent = GENERIC;
        el.className = "fs-verdict";
      }
      $("fs-calc-summary").textContent = parts.join("; ") + ". " + el.textContent;
    }

    function markEdited() {
      if (!edited) {
        edited = true;
        Array.prototype.forEach.call($("fs-calc-presets").children, function (c) {
          c.classList.remove("is-on");
        });
        $("fs-calc-blurb").textContent = "Edited by hand — no published verdict applies to these inputs.";
      }
      run();
    }

    return {
      init: function () {
        if (!$("fs-calc-a-q")) return;
        getJSON("presets.json").then(function (d) {
          presets = d.pairs;
          var host = $("fs-calc-presets");
          presets.forEach(function (p, idx) {
            var btn = document.createElement("button");
            btn.type = "button"; btn.className = "fs-chip"; btn.textContent = p.name;
            btn.addEventListener("click", function () {
              Array.prototype.forEach.call(host.children, function (c) { c.classList.remove("is-on"); });
              btn.classList.add("is-on");
              active = p; edited = false;
              write("a", p.a); write("b", p.b);
              $("fs-calc-blurb").textContent = p.blurb;
              run();
            });
            host.appendChild(btn);
            if (idx === 0) setTimeout(function () { btn.click(); }, 0);
          });
        }).catch(function (e) { fail($("fs-calc-note"), e); });

        ["a", "b"].forEach(function (side) {
          FIELDS.forEach(function (f) {
            $("fs-calc-" + side + "-" + f).addEventListener("input", markEdited);
          });
        });
      }
    };
  })();

  // ---------------------------------------------------------------- boot
  function boot() {
    if (!D) return;
    loadColors();
    CSD.init(); Haystack.init(); Pairs.init(); Grid.init(); Calc.init();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
