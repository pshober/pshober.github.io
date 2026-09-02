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
    var cv, data, ri = 0, eid = "e0", streamIn = true;
    var DCUT = 0.015;

    function rung() { return data.rungs[ri]; }
    function curve() {
      var r = rung();
      return streamIn ? r.obs[eid] : r.noStream;
    }

    function fmtBig(x) {
      if (x >= 1e9) return (x / 1e9).toFixed(1) + " billion";
      if (x >= 1e6) return (x / 1e6).toFixed(1) + " million";
      return group(x);
    }

    function slopeOf(y, nPairs) {
      var xs = [], ys = [];
      for (var i = 0; i < data.mids.length; i++) {
        var D = data.edges[i + 1];
        if (D < 0.03 || y[i] < 20) continue;
        if (D > 0.3 || y[i] > 0.02 * nPairs) break;
        xs.push(Math.log10(D)); ys.push(Math.log10(y[i]));
      }
      if (xs.length < 4) return null;
      var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
      var den = n * sxx - sx * sx;
      return den === 0 ? null : (n * sxy - sx * sy) / den;
    }

    function belowCut(y) {
      var E = data.edges;
      for (var i = 0; i < y.length - 1; i++) {
        var a = E[i + 1], b = E[i + 2];
        if (a <= DCUT && DCUT <= b) {
          if (y[i] <= 0 || y[i + 1] <= 0) return y[i];
          var f = (Math.log(DCUT) - Math.log(a)) / (Math.log(b) - Math.log(a));
          return Math.exp(Math.log(y[i]) + f * (Math.log(y[i + 1]) - Math.log(y[i])));
        }
      }
      return 0;
    }

    // Largest D at or below 0.02 where the curve clears the 3-sigma band with real
    // statistics behind it. Returns null when nothing does.
    function clears(y, r) {
      var hi = r.null.hi, best = null;
      for (var i = 0; i < data.mids.length; i++) {
        if (data.edges[i + 1] > 0.02) break;
        if (y[i] >= 10 && y[i] > hi[i]) best = data.edges[i + 1];
      }
      return best;
    }
    function breakout(r, e) { return clears(r.obs[e], r); }

    function draw() {
      var f = fitCanvas(cv), ctx = f.ctx, W = f.w, H = f.h;
      var r = rung(), obs = curve(), nl = r.null;
      var L = 62, Rp = 10, T = 12, B = 34;
      var xmin = data.edges[0], xmax = data.edges[data.edges.length - 1];
      var ymax = r.nPairs * 1.5;
      function px(d) { return L + (Math.log10(d) - Math.log10(xmin)) /
        (Math.log10(xmax) - Math.log10(xmin)) * (W - L - Rp); }
      function py(v) {
        var y = Math.log10(Math.max(v, 0.5)), y0 = Math.log10(0.5), y1 = Math.log10(ymax);
        return T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
      }

      ctx.fillStyle = C.plate; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.fillStyle = C.faint; ctx.font = "11px system-ui, sans-serif";
      function sup(n) {
        var m = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³",
                  "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
        return String(n).split("").map(function (c) { return m[c] || c; }).join("");
      }
      var dec;
      for (dec = -3; dec <= 0; dec++) {
        var x = px(Math.pow(10, dec));
        if (x < L - 1 || x > W - Rp + 1) continue;
        ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke();
        ctx.textAlign = "center"; ctx.fillText("10" + sup(dec), x, H - B + 15);
      }
      for (dec = 0; dec <= 10; dec++) {
        var v = Math.pow(10, dec); if (v > ymax) break;
        var y = py(v);
        ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - Rp, y); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(dec === 0 ? "1" : "10" + sup(dec), L - 6, y + 4);
      }
      ctx.textAlign = "center"; ctx.fillStyle = C.muted;
      ctx.fillText("Dₙ  of a pair  (smaller = more alike)", (L + W - Rp) / 2, H - 6);
      ctx.save(); ctx.translate(14, (T + H - B) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText("cumulative pairs with Dₙ,pair < Dₙ", 0, 0); ctx.restore();

      // the paper's pair cut
      var xc = px(DCUT);
      ctx.strokeStyle = C.olive; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xc, T); ctx.lineTo(xc, H - B); ctx.stroke();
      ctx.setLineDash([]);

      // chance band + mean
      ctx.beginPath();
      var i, started = false;
      for (i = 0; i < data.mids.length; i++) {
        var hv = Math.max(nl.hi[i], 0.5);
        if (!started) { ctx.moveTo(px(data.mids[i]), py(hv)); started = true; }
        else ctx.lineTo(px(data.mids[i]), py(hv));
      }
      for (i = data.mids.length - 1; i >= 0; i--) ctx.lineTo(px(data.mids[i]), py(Math.max(nl.lo[i], 0.5)));
      ctx.closePath();
      ctx.fillStyle = "rgba(176,68,252,0.28)"; ctx.fill();
      ctx.beginPath(); started = false;
      for (i = 0; i < data.mids.length; i++) {
        if (nl.mean[i] < 0.5) continue;
        if (!started) { ctx.moveTo(px(data.mids[i]), py(nl.mean[i])); started = true; }
        else ctx.lineTo(px(data.mids[i]), py(nl.mean[i]));
      }
      ctx.strokeStyle = "rgba(207,195,224,0.6)"; ctx.lineWidth = 1; ctx.stroke();

      // observed
      ctx.beginPath(); started = false;
      for (i = 0; i < data.mids.length; i++) {
        if (obs[i] < 1) continue;
        if (!started) { ctx.moveTo(px(data.mids[i]), py(obs[i])); started = true; }
        else ctx.lineTo(px(data.mids[i]), py(obs[i]));
      }
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2.2; ctx.stroke();
    }

    function update() {
      var r = rung(), obs = curve();
      $("fs-csd-n-v").textContent = r.label;
      $("fs-csd-n-note").textContent = fmtBig(r.nPairs) + " pairs · " +
        (streamIn ? r.nStream + " stream member" + (r.nStream === 1 ? "" : "s") + " in this draw"
                  : "stream removed");
      $("fs-csd-stream-note").textContent = streamIn
        ? "" : "the same draw with every member taken out";
      var e0 = eid;
      ["e0", "e1", "e2"].forEach(function (id) {
        var b = $("fs-csd-" + id);
        b.classList.toggle("is-on", streamIn && id === e0);
        b.disabled = !streamIn;
        b.style.opacity = streamIn ? 1 : 0.45;
      });

      var ob = belowCut(obs), nb = belowCut(rung().null.mean);
      $("fs-csd-below").textContent = ob < 10 ? ob.toFixed(1) : group(Math.round(ob));
      $("fs-csd-null-below").textContent = nb < 10 ? nb.toFixed(1) : group(Math.round(nb));
      var sl = slopeOf(r.null.mean, r.nPairs);
      $("fs-csd-chslope").textContent = sl === null ? "—" : sl.toFixed(2);

      var bo = streamIn ? breakout(r, eid) : null;
      var v = $("fs-csd-verdict");
      if (!streamIn) {
        var still = clears(r.noStream, r);
        if (still !== null) {
          v.textContent = "Stream removed, and an excess remains below Dₙ ≈ " + still.toFixed(3) +
            ". The 243 linked members were the biggest single contributor, not the whole surplus: " +
            "the stream's diffuser outskirts that DBSCAN's ε = 0.03 never linked, the two weaker " +
            "significant cells on the map, and — the paper's own caveat — possible near-simultaneous " +
            "detections are all still in the catalog. That is exactly why the localized test in " +
            "Step 6, not the global curve, is what identifies a stream.";
          v.className = "fs-verdict is-warn";
        } else {
          v.textContent = "Stream removed: the curve sits inside the chance band the whole way down. " +
            "This is what the null looks like.";
          v.className = "fs-verdict";
        }
      } else if (bo !== null) {
        v.textContent = "Detected: the observed curve clears the 3σ chance band below " +
          "Dₙ ≈ " + bo.toFixed(3) + ". The catalog is now big enough that chance itself " +
          "reaches past the cut — and the stream's tight pairs stand out against it.";
        v.className = "fs-verdict is-hit";
      } else if (eid !== "e0" && breakout(r, "e0") !== null) {
        v.textContent = "Erased by measurement error: the catalog is big enough and the stream is " +
          "in it, but this much extra scatter has pushed its tight pairs apart until they no longer " +
          "stand out. This is what fireball-precision orbits do to a stream.";
        v.className = "fs-verdict is-warn";
      } else {
        v.textContent = "No detection: the stream is in there — " + r.nStream + " member" +
          (r.nStream === 1 ? "" : "s") + " of it — but the chance floor still sits to the right " +
          "of the cut, so its tight pairs have nothing to stand out against.";
        v.className = "fs-verdict";
      }

      var first = null, last = data.rungs[data.rungs.length - 1];
      data.rungs.forEach(function (q) { if (first === null && breakout(q, "e0") !== null) first = q; });
      var prev = first ? data.rungs[Math.max(0, data.rungs.indexOf(first) - 1)] : null;
      $("fs-csd-first").textContent = !first ? ""
        : first === last
          ? "With these curves the excess clears the band only at the full catalog, " + group(first.n) +
            " meteors. At " + group(prev.n) + " it does not — the stream is in that draw too, but " +
            "chance had not yet reached far enough left."
          : "With these curves the excess first clears the band at " + group(first.n) + " meteors.";

      $("fs-csd-summary").textContent = r.label + " meteors, " + fmtBig(r.nPairs) +
        " pairs, stream " + (streamIn ? "included (" + r.nStream + " members in this draw)" : "removed") +
        ". Observed pairs below the 0.015 cut: " + group(ob) + " against " +
        (nb < 10 ? nb.toFixed(1) : group(Math.round(nb))) + " from chance. " + v.textContent;
      draw();
    }

    return {
      init: function () {
        cv = $("fs-csd-canvas"); if (!cv) return;
        getJSON("csd_real.json").then(function (d) {
          data = d;
          var sl = $("fs-csd-n");
          sl.max = d.rungs.length - 1;
          sl.value = 0;
          sl.addEventListener("input", function () { ri = +this.value; update(); });
          $("fs-csd-stream").addEventListener("change", function () {
            streamIn = this.checked; update();
          });
          ["e0", "e1", "e2"].forEach(function (id) {
            $("fs-csd-" + id).addEventListener("click", function () {
              if (!streamIn) return;
              eid = id; update();
            });
          });
          window.addEventListener("resize", debounce(update, 200));
          update();
        }).catch(function (e) { fail($("fs-csd-note"), e); });
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
    // A real, measured anchor rather than a made-up rate: the KDE null in the 2026
    // paper predicts ~1395 chance pairs below D_N = 0.015 among GMN's 7.56e9 pairs.
    var GMN = { n: 122943, nullBelow: 1394.6, dcut: 0.015 };
    GMN.pairs = GMN.n * (GMN.n - 1) / 2;
    GMN.rate = GMN.nullBelow / GMN.pairs;          // 1.85e-7, i.e. 1 in 5.4 million
    GMN.logInv = Math.log10(1 / GMN.rate);

    function oneIn(v) {
      if (v >= 1e6) return "1 in " + (v / 1e6).toFixed(v / 1e6 < 10 ? 1 : 0) + " million";
      if (v >= 1e3) return "1 in " + group(v);
      return "1 in " + Math.round(v);
    }

    function run() {
      var n = Math.round(Math.pow(10, +$("fs-pairs-n").value));
      var pairs = n * (n - 1) / 2;
      var p = Math.pow(10, -(+$("fs-pairs-p").value));
      var fp = pairs * p;
      $("fs-pairs-n-v").textContent = group(n);
      $("fs-pairs-p-v").textContent = oneIn(1 / p);
      $("fs-pairs-out").textContent = group(pairs);
      $("fs-pairs-fp").textContent = fp < 1 ? fp.toFixed(2) : group(fp);

      var near = MARKS.reduce(function (a, b) {
        return Math.abs(Math.log10(b.n) - Math.log10(n)) < Math.abs(Math.log10(a.n) - Math.log10(n)) ? b : a;
      });
      $("fs-pairs-mark").textContent =
        Math.abs(Math.log10(near.n) - Math.log10(n)) < 0.12 ? "≈ " + near.label : "";

      var atGmn = Math.abs(Math.log10(1 / p) - GMN.logInv) < 0.06;
      $("fs-pairs-pmark").textContent = atGmn
        ? "≈ GMN below Dₙ = 0.015, measured from that catalog's own null"
        : "measured from the catalog, never looked up";

      $("fs-pairs-summary").textContent =
        group(n) + " objects make " + group(pairs) + " possible pairs. At a chance rate of " +
        oneIn(1 / p) + " pairs, that is " + (fp < 1 ? fp.toFixed(2) : group(fp)) +
        " pairs expected under the cut from chance alone, before any real stream exists. " +
        "That rate is a property of the catalog and its observational biases, not of the D-criterion.";
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
   * 3. The (U, lambda_sun) pair-excess map — real data, as a 3D surface
   *    with the null threshold drawn as a wireframe you can raise and lower.
   *    Drag to rotate, shift-drag or two fingers to pan, ctrl/cmd-wheel to zoom.
   * ===================================================================== */
  var Grid = (function () {
    var cv, data, k = 3, sel = null, zmax = 1, nx = 20, ny = 20, U0 = 0, U1 = 2;
    var HOME = { yaw: -0.72, pitch: 0.62, zoom: 1, panX: 0, panY: 0 };
    var view = { yaw: HOME.yaw, pitch: HOME.pitch, zoom: 1, panX: 0, panY: 0 };
    var pointers = {}, lastPinch = 0, lastMid = null, moved = 0;
    var curW = 1, curH = 1, queued = false;
    var M_BINS = 400;                       // the scan is 20x20; it is not adjustable

    function ramp(t) {                      // dark plate -> violet -> orange -> yellow
      t = Math.max(0, Math.min(1, t));
      var stops = [[38, 12, 62], [72, 22, 110], [176, 68, 252], [255, 108, 64], [255, 197, 50]];
      var x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
      var a = stops[i], b = stops[i + 1];
      return [Math.round(a[0] + (b[0] - a[0]) * f),
              Math.round(a[1] + (b[1] - a[1]) * f),
              Math.round(a[2] + (b[2] - a[2]) * f)];
    }
    function rgb(c, al) {
      return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (al === undefined ? 1 : al) + ")";
    }
    function shade(c, f) { return [c[0] * f | 0, c[1] * f | 0, c[2] * f | 0]; }
    function thr(b) { return b.mu + k * b.sd; }
    function isSig(b) { return b.sd > 0 && b.obs > thr(b); }

    var TICK = 5;                           // label every 5th cell
    var LBL = 2.0, TK = 0.7;                // label / tick-mark offsets, in cells

    // Orthographic projection, then a 2D zoom+pan about the canvas centre.
    function makeProj(W, H) {
      var cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
      var cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
      var ZEX = 1.05;
      function raw(gx, gy, gz) {
        var x = (gx / nx) * 2 - 1, y = (gy / ny) * 2 - 1, z = (gz / zmax) * ZEX;
        var X1 = x * cy - y * sy, Y1 = x * sy + y * cy;
        return [X1, -(Y1 * sp + z * cp), Y1 * cp - z * sp];
      }
      // Front edges: the ones minimising Y1, since screen height goes as -(Y1*sp + z*cp).
      var eY = cy > 0 ? 0 : ny, eX = sy > 0 ? 0 : nx;
      var dY = cy > 0 ? -1 : 1, dX = sy > 0 ? -1 : 1;

      var xs = [], ys = [], c, a, b, t;
      for (a = 0; a <= 1; a++) for (b = 0; b <= 1; b++) {
        c = raw(a * nx, b * ny, 0); xs.push(c[0]); ys.push(c[1]);
      }
      if (data && data.bins) data.bins.forEach(function (q) {
        var top = Math.max(q.obs, q.mu + 6 * q.sd);
        if (top <= 0) return;
        c = raw(q.ix, q.iy, top); xs.push(c[0]); ys.push(c[1]);
        c = raw(q.ix + 1, q.iy + 1, top); xs.push(c[0]); ys.push(c[1]);
      });
      for (t = 0; t <= nx; t += TICK) { c = raw(t, eY + dY * LBL, 0); xs.push(c[0]); ys.push(c[1]); }
      for (t = 0; t <= ny; t += TICK) { c = raw(eX + dX * LBL, t, 0); xs.push(c[0]); ys.push(c[1]); }

      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
      var miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
      var pL = 26, pR = 26, pT = 12, pB = 30;
      var sc = Math.min((W - pL - pR) / (maxx - minx), (H - pT - pB) / (maxy - miny));
      var ox = (pL + W - pR) / 2 - (minx + maxx) * sc / 2;
      var oy = (pT + H - pB) / 2 - (miny + maxy) * sc / 2;
      var ccx = W / 2, ccy = H / 2, z = view.zoom;

      var f = function (gx, gy, gz) {
        var q = raw(gx, gy, gz);
        var bx = q[0] * sc + ox, by = q[1] * sc + oy;
        return [ccx + z * (bx - ccx) + view.panX, ccy + z * (by - ccy) + view.panY, q[2]];
      };
      f.edgeY = eY; f.edgeX = eX; f.dY = dY; f.dX = dX;
      f.nearX = sy < 0 ? 1 : 0;             // which cell face points at the camera
      f.nearY = cy < 0 ? 1 : 0;
      return f;
    }

    function quad(ctx, P, pts, fill, stroke, lw) {
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var p = P(pts[i][0], pts[i][1], pts[i][2]);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }
    function seg(ctx, P, a, b) {
      var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }

    function draw() {
      var f = fitCanvas(cv), ctx = f.ctx, W = f.w, H = f.h;
      curW = W; curH = H;
      var P = makeProj(W, H);
      ctx.fillStyle = C.plate; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
      var g;
      for (g = 0; g <= nx; g += TICK) seg(ctx, P, [g, 0, 0], [g, ny, 0]);
      for (g = 0; g <= ny; g += TICK) seg(ctx, P, [0, g, 0], [nx, g, 0]);

      var order = data.bins.slice().sort(function (a, b) {
        var pa = P(a.ix + 0.5, a.iy + 0.5, 0), pb = P(b.ix + 0.5, b.iy + 0.5, 0);
        return pb[2] - pa[2];                            // farthest first
      });

      order.forEach(function (b) {
        var x0 = b.ix, x1 = b.ix + 1, y0 = b.iy, y1 = b.iy + 1;
        var h = Math.max(0, thr(b)), o = b.obs, sig = isSig(b);
        var col = ramp(o / zmax);
        function column() {
          if (o <= 0) return;
          var fx = P.nearX ? x1 : x0, fy = P.nearY ? y1 : y0;
          quad(ctx, P, [[fx, y0, 0], [fx, y1, 0], [fx, y1, o], [fx, y0, o]], rgb(shade(col, 0.55)), null);
          quad(ctx, P, [[x0, fy, 0], [x1, fy, 0], [x1, fy, o], [x0, fy, o]], rgb(shade(col, 0.72)), null);
          quad(ctx, P, [[x0, y0, o], [x1, y0, o], [x1, y1, o], [x0, y1, o]],
               rgb(col), sig ? C.yellow : "rgba(0,0,0,0.30)", sig ? 1.6 : 0.6);
        }
        function mesh() {
          quad(ctx, P, [[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]],
               null, "rgba(255,255,255,0.34)", 1);
        }
        if (o > h) { mesh(); column(); } else { column(); mesh(); }
        if (sig) {
          var a = P(b.ix + 0.5, b.iy + 0.5, h), c2 = P(b.ix + 0.5, b.iy + 0.5, o);
          ctx.strokeStyle = C.yellow; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
          ctx.fillStyle = C.yellow;
          ctx.beginPath(); ctx.arc(c2[0], c2[1], 3.2, 0, 2 * Math.PI); ctx.fill();
        }
        if (sel && sel.ix === b.ix && sel.iy === b.iy) {
          var s2 = P(b.ix + 0.5, b.iy + 0.5, Math.max(o, h));
          ctx.strokeStyle = C.text; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(s2[0], s2[1], 7, 0, 2 * Math.PI); ctx.stroke();
        }
      });

      // Axis lines along the two front edges, with tick marks, so every label
      // sits on the division it belongs to.
      var eY = P.edgeY, eX = P.edgeX, oY = P.dY, oX = P.dX;
      ctx.strokeStyle = "rgba(255,255,255,0.34)"; ctx.lineWidth = 1.2;
      seg(ctx, P, [0, eY, 0], [nx, eY, 0]);
      seg(ctx, P, [eX, 0, 0], [eX, ny, 0]);

      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (g = 0; g <= nx; g += TICK) {
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        seg(ctx, P, [g, eY, 0], [g, eY + oY * TK, 0]);
        var lp = P(g, eY + oY * LBL, 0);
        ctx.fillStyle = C.faint;
        ctx.fillText((U0 + (U1 - U0) * g / nx).toFixed(1), lp[0], lp[1]);
      }
      for (g = 0; g <= ny; g += TICK) {
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        seg(ctx, P, [eX, g, 0], [eX + oX * TK, g, 0]);
        var mp = P(eX + oX * LBL, g, 0);
        ctx.fillStyle = C.faint;
        ctx.fillText(String(g * 18), mp[0], mp[1]);
      }

      var narrow = W < 460;
      ctx.fillStyle = C.muted;
      ctx.textAlign = "left";
      ctx.fillText(narrow ? "U" : "U  (geocentric speed ÷ 29.78 km/s)", 10, H - 12);
      ctx.textAlign = "right";
      ctx.fillText(narrow ? "λ☉ (°)" : "solar longitude (°)", W - 10, H - 12);
      ctx.textAlign = "center";
    }

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; draw(); });
    }

    function zoomAt(mx, my, fac) {
      var nz = Math.max(0.5, Math.min(6, view.zoom * fac));
      var r = nz / view.zoom, ccx = curW / 2, ccy = curH / 2;
      view.panX = mx - ccx - r * (mx - ccx - view.panX);
      view.panY = my - ccy - r * (my - ccy - view.panY);
      view.zoom = nz;
    }
    function zoomBy(f) { zoomAt(curW / 2, curH / 2, f); schedule(); }
    function reset() {
      view.yaw = HOME.yaw; view.pitch = HOME.pitch;
      view.zoom = 1; view.panX = 0; view.panY = 0;
      schedule();
    }

    function info(b) {
      if (!b) { $("fs-grid-info").innerHTML = "<em>Click a column to see its numbers.</em>"; return; }
      var sig = isSig(b);
      $("fs-grid-info").innerHTML =
        "<b>U " + b.x0.toFixed(3) + "–" + b.x1.toFixed(3) +
        "</b> &middot; <b>λ<sub>☉</sub> " + b.y0 + "–" + b.y1 + "°</b><br>" +
        "observed <b>" + b.obs + "</b> pairs &middot; chance predicts <b>" + fmt(b.mu, 2) +
        " ± " + fmt(b.sd, 2) + "</b>, so the mesh sits at <b>" + fmt(thr(b), 1) + "</b><br>" +
        "z = <b>" + fmt(b.z, 2) + "</b> " +
        (sig ? "<span class='fs-tag is-hit'>through the mesh at " + k + "σ</span>"
             : "<span class='fs-tag'>under the mesh</span>");
    }

    function tail(z) {                       // one-sided normal tail, A&S 26.2.17
      var t = 1 / (1 + 0.2316419 * z);
      var d = 0.3989422804014327 * Math.exp(-z * z / 2);
      return d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
             t * (-1.821255978 + t * 1.330274429))));
    }
    function sigmaOf(p) {
      var lo = 0, hi = 12;
      for (var i = 0; i < 200; i++) { var m = (lo + hi) / 2; if (tail(m) > p) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }

    function counts() {
      var n = 0, top = null;
      data.bins.forEach(function (b) {
        if (isSig(b)) n++;
        if (b.z !== null && (!top || b.z > top.z)) top = b;
      });
      $("fs-grid-count").textContent = n;
      var pl = tail(top.z), pg = 1 - Math.pow(1 - pl, M_BINS);
      $("fs-grid-plocal").textContent = pl.toExponential(1);
      $("fs-grid-pglobal").textContent = pg.toExponential(1);
      $("fs-grid-sigma").textContent = sigmaOf(pg).toFixed(1) + "σ";
      $("fs-grid-summary").textContent =
        "A 20 by 20 grid of geocentric speed against solar longitude, 400 cells. The solid " +
        "columns are the observed pair counts; the wireframe is what chance allows at " + k +
        " sigma. " + n + " column" + (n === 1 ? "" : "s") + " rise through it. The tallest is " +
        "M2026-A1, at U 0.967 to 1.061 and solar longitude 0 to 18 degrees, with 135 observed " +
        "pairs against about 38.9 expected — z = 6.32, which survives the 400-cell correction " +
        "as a 5.3 sigma detection.";
    }

    function pick(cx2, cy2) {
      var P = makeProj(curW, curH), best = null, bd = 1e9;
      data.bins.forEach(function (b) {
        var p = P(b.ix + 0.5, b.iy + 0.5, Math.max(b.obs, thr(b)));
        var d = (p[0] - cx2) * (p[0] - cx2) + (p[1] - cy2) * (p[1] - cy2);
        if (d < bd) { bd = d; best = b; }
      });
      if (best && bd < 900) { sel = best; info(best); schedule(); }
    }

    function pts() { return Object.keys(pointers).map(function (i) { return pointers[i]; }); }
    function pinchDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    return {
      init: function () {
        cv = $("fs-grid-canvas"); if (!cv) return;
        getJSON("grid2d.json").then(function (d) {
          data = d; nx = d.nx; ny = d.ny;
          var hi = 0; U0 = Infinity; U1 = -Infinity;
          d.bins.forEach(function (b) {
            hi = Math.max(hi, b.obs, b.mu + 6 * b.sd);
            U0 = Math.min(U0, b.x0); U1 = Math.max(U1, b.x1);
          });
          zmax = hi * 1.02;

          cv.addEventListener("pointerdown", function (e) {
            try { cv.setPointerCapture(e.pointerId); } catch (err) {}
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            moved = 0;
            var q = pts();
            if (q.length === 2) {
              lastPinch = pinchDist(q[0], q[1]);
              lastMid = { x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 };
            }
          });
          cv.addEventListener("pointermove", function (e) {
            if (!(e.pointerId in pointers)) return;
            var prev = pointers[e.pointerId];
            var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            moved += Math.abs(dx) + Math.abs(dy);
            var q = pts(), r = cv.getBoundingClientRect();
            if (q.length >= 2) {                       // two fingers: pinch + pan
              var dist = pinchDist(q[0], q[1]);
              var mid = { x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 };
              if (lastPinch > 0) zoomAt(mid.x - r.left, mid.y - r.top, dist / lastPinch);
              if (lastMid) { view.panX += mid.x - lastMid.x; view.panY += mid.y - lastMid.y; }
              lastPinch = dist; lastMid = mid;
            } else if (e.shiftKey) {                   // shift-drag: pan
              view.panX += dx; view.panY += dy;
            } else {                                   // drag: rotate
              view.yaw += dx * 0.009;
              view.pitch = Math.max(0.12, Math.min(1.35, view.pitch - dy * 0.007));
            }
            schedule();
          });
          function release(e) {
            var wasDrag = moved > 6;
            delete pointers[e.pointerId];
            if (pts().length < 2) { lastPinch = 0; lastMid = null; }
            if (!wasDrag && pts().length === 0) {
              var r = cv.getBoundingClientRect();
              pick(e.clientX - r.left, e.clientY - r.top);
            }
          }
          cv.addEventListener("pointerup", release);
          cv.addEventListener("pointercancel", release);

          // Plain wheel must keep scrolling the page; the widget is tall.
          cv.addEventListener("wheel", function (e) {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            var r = cv.getBoundingClientRect();
            zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 0.89);
            schedule();
          }, { passive: false });
          cv.addEventListener("dblclick", reset);

          cv.addEventListener("keydown", function (e) {
            var step = 0.12, pan = 24, used = true;
            if (e.key === "ArrowLeft") { if (e.shiftKey) view.panX -= pan; else view.yaw -= step; }
            else if (e.key === "ArrowRight") { if (e.shiftKey) view.panX += pan; else view.yaw += step; }
            else if (e.key === "ArrowUp") { if (e.shiftKey) view.panY -= pan; else view.pitch = Math.min(1.35, view.pitch + step * 0.6); }
            else if (e.key === "ArrowDown") { if (e.shiftKey) view.panY += pan; else view.pitch = Math.max(0.12, view.pitch - step * 0.6); }
            else if (e.key === "+" || e.key === "=") zoomBy(1.25);
            else if (e.key === "-" || e.key === "_") zoomBy(0.8);
            else if (e.key === "0") reset();
            else used = false;
            if (used) { e.preventDefault(); schedule(); }
          });

          $("fs-grid-k").addEventListener("input", function () {
            k = +this.value; $("fs-grid-k-v").textContent = k;
            counts(); info(sel); schedule();
          });
          var btn = function (id, fn) { var b = $(id); if (b) b.addEventListener("click", fn); };
          btn("fs-grid-zoom-in", function () { zoomBy(1.25); });
          btn("fs-grid-zoom-out", function () { zoomBy(0.8); });
          btn("fs-grid-reset", reset);
          window.addEventListener("resize", debounce(schedule, 200));

          sel = d.bins.filter(function (b) { return b.ix === 9 && b.iy === 0; })[0] || null;
          info(sel); counts(); draw();
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
