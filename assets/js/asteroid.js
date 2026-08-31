/* (33964) Patrickshober: compute the asteroid's current heliocentric position
   from baked JPL elements, derive its geocentric sky position + apparent
   magnitude, and draw an interactive orbit diagram (drag to tilt, scroll/pinch
   to zoom) with the inner planets and Jupiter. All client-side; no API calls.
   astronomy-engine (if loaded) is used only for the constellation name. */
(function () {
  "use strict";
  var A = window.ASTEROID;
  if (!A || !A.elements) return;
  var el = A.elements;

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var OBLIQ = 23.4392911 * D2R;

  function nowJD() { return 2440587.5 + Date.now() / 86400000; }
  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  function solveKepler(M, e) { // M radians
    var E = M, d, i = 0;
    do { d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; i++; }
    while (Math.abs(d) > 1e-10 && i < 100);
    return E;
  }

  // Orbital plane → J2000 ecliptic, for radius r at argument of latitude u.
  function orbToEcl(r, u, om, i) {
    return {
      x: r * (Math.cos(om) * Math.cos(u) - Math.sin(om) * Math.sin(u) * Math.cos(i)),
      y: r * (Math.sin(om) * Math.cos(u) + Math.cos(om) * Math.sin(u) * Math.cos(i)),
      z: r * Math.sin(u) * Math.sin(i),
      r: r
    };
  }

  // ── planets ───────────────────────────────────────────────────────────────
  // JPL "Approximate Positions of the Planets" (Standish), valid 1800–2050.
  // Elements are referred to the J2000 ecliptic, matching the asteroid's, so
  // heliocentric positions can be differenced directly.
  // el = [a AU, e, I°, mean longitude L°, longitude of perihelion ϖ°, node Ω°]
  // rt = the same quantities' rates per Julian century.
  var PLANETS = [
    { name: "Mercury", color: "#b9aeb0", size: 2.2,
      el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
      rt: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
    { name: "Venus", color: "#f0d9a8", size: 2.8,
      el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
      rt: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
    { name: "Earth", color: "#5aa0e0", size: 3.2,
      el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
      rt: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
    { name: "Mars", color: "#d1553a", size: 2.8,
      el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
      rt: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
    { name: "Jupiter", color: "#b8814a", size: 4.4,
      el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
      rt: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] }
  ];
  var EARTH = PLANETS[2];

  function planetKepler(p, jd) {
    var T = (jd - 2451545.0) / 36525;
    var a = p.el[0] + p.rt[0] * T, e = p.el[1] + p.rt[1] * T;
    var I = p.el[2] + p.rt[2] * T, L = p.el[3] + p.rt[3] * T;
    var peri = p.el[4] + p.rt[4] * T, node = p.el[5] + p.rt[5] * T;
    return { a: a, e: e, i: I * D2R, w: (peri - node) * D2R,
             om: node * D2R, M: norm360(L - peri) * D2R };
  }
  function planetPos(p, jd) {
    var k = planetKepler(p, jd);
    var E = solveKepler(k.M, k.e);
    var nu = Math.atan2(Math.sqrt(1 - k.e * k.e) * Math.sin(E), Math.cos(E) - k.e);
    return orbToEcl(k.a * (1 - k.e * Math.cos(E)), k.w + nu, k.om, k.i);
  }
  function planetPath(p, jd) {
    var k = planetKepler(p, jd), pts = [];
    for (var nu = 0; nu <= 360; nu += 3) {
      var rr = k.a * (1 - k.e * k.e) / (1 + k.e * Math.cos(nu * D2R));
      pts.push(orbToEcl(rr, k.w + nu * D2R, k.om, k.i));
    }
    return pts;
  }

  // Asteroid heliocentric position (AU) in J2000 ecliptic, at Julian day jd.
  function astEcliptic(jd) {
    var a = el.a_au, e = el.e;
    var M = norm360(el.ma_deg + el.n_deg_day * (jd - el.epoch_jd)) * D2R;
    var E = solveKepler(M, e);
    var nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
    return orbToEcl(a * (1 - e * Math.cos(E)), el.w_deg * D2R + nu,
                    el.om_deg * D2R, el.i_deg * D2R);
  }

  // Earth heliocentric ecliptic (AU). Uses the same J2000 planet table as the
  // diagram: an earlier low-precision Sun formula returned longitudes measured
  // from the equinox of date, which is ~0.37° from J2000 and put the derived
  // sky position out by ~12 arcminutes.
  function earthEcliptic(jd) { return planetPos(EARTH, jd); }

  function eclToEqu(v) {
    return {
      x: v.x,
      y: v.y * Math.cos(OBLIQ) - v.z * Math.sin(OBLIQ),
      z: v.y * Math.sin(OBLIQ) + v.z * Math.cos(OBLIQ)
    };
  }

  function hgMag(H, r, delta, alpha) { // alpha radians
    var t = Math.tan(alpha / 2);
    var p1 = Math.exp(-3.33 * Math.pow(t, 0.63));
    var p2 = Math.exp(-1.87 * Math.pow(t, 1.22));
    var G = 0.15;
    return H + 5 * Math.log10(r * delta) - 2.5 * Math.log10((1 - G) * p1 + G * p2);
  }

  function fmtRA(deg) {
    var h = norm360(deg) / 15, hh = Math.floor(h), mm = (h - hh) * 60, m = Math.floor(mm);
    return hh + "h " + (m < 10 ? "0" : "") + m + "m";
  }
  function fmtDec(deg) {
    var s = deg < 0 ? "−" : "+", a = Math.abs(deg), d = Math.floor(a), m = Math.round((a - d) * 60);
    return s + d + "° " + (m < 10 ? "0" : "") + m + "'";
  }

  // ── live numbers ──────────────────────────────────────────────────────────
  function update() {
    var jd = nowJD();
    var ast = astEcliptic(jd), ea = earthEcliptic(jd);
    var geoEcl = { x: ast.x - ea.x, y: ast.y - ea.y, z: ast.z - ea.z };
    var geo = eclToEqu(geoEcl);
    var delta = Math.sqrt(geo.x * geo.x + geo.y * geo.y + geo.z * geo.z);
    var raDeg = norm360(Math.atan2(geo.y, geo.x) * R2D);
    var decDeg = Math.asin(geo.z / delta) * R2D;
    var R = ea.r, r = ast.r;
    var cosA = (r * r + delta * delta - R * R) / (2 * r * delta);
    cosA = Math.max(-1, Math.min(1, cosA));
    var V = hgMag(A.H, r, delta, Math.acos(cosA));

    set("ra", fmtRA(raDeg));
    set("dec", fmtDec(decDeg));
    set("dist", delta.toFixed(2) + " AU");
    set("mag", "≈ " + V.toFixed(1));

    var cons = "n/a";
    if (window.Astronomy && Astronomy.Constellation) {
      try { cons = Astronomy.Constellation(raDeg / 15, decDeg).name; } catch (e) {}
    }
    set("cons", cons);
    return { raDeg: raDeg, decDeg: decDeg, jd: jd };
  }
  function set(id, v) { var n = document.getElementById("ast-" + id); if (n) n.textContent = v; }

  // ── "where to look" from the visitor's location ─────────────────────────────
  function compass(az) {
    var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(norm360(az) / 45) % 8];
  }
  function altAz(raDeg, decDeg, jd, lat, lon) {
    var T = (jd - 2451545.0) / 36525;
    var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    var lst = (gmst + lon) * D2R;
    var ha = lst - raDeg * D2R;
    var dec = decDeg * D2R, la = lat * D2R;
    var alt = Math.asin(Math.sin(dec) * Math.sin(la) + Math.cos(dec) * Math.cos(la) * Math.cos(ha));
    var az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
    return { alt: alt * R2D, az: norm360(az * R2D) };
  }
  var locBtn = document.getElementById("ast-locate");
  if (locBtn && navigator.geolocation) {
    locBtn.addEventListener("click", function () {
      locBtn.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        var s = update();
        var aa = altAz(s.raDeg, s.decDeg, s.jd, pos.coords.latitude, pos.coords.longitude);
        var out = document.getElementById("ast-look");
        if (aa.alt > 0) out.textContent = "Up now, look " + compass(aa.az) + ", " +
          aa.alt.toFixed(0) + "° above the horizon (telescope needed).";
        else out.textContent = "Below your horizon right now (" + compass(aa.az) + " side). Try again later.";
        locBtn.textContent = "Use my location";
      }, function () { locBtn.textContent = "Location unavailable"; });
    });
  } else if (locBtn) { locBtn.style.display = "none"; }

  // ── interactive orbit diagram (drag to tilt, scroll/pinch to zoom) ─────────
  (function () {
    var cv = document.getElementById("orbit");
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var HOME = { az: 0, tilt: Math.PI / 2, zoom: 1 };
    var view = { az: HOME.az, tilt: HOME.tilt, zoom: HOME.zoom };
    var AST_COLOR = "#ff6c40", SUN_COLOR = "#ffc532";
    var ORBIT_COLOR = "rgba(255,255,255,0.14)";
    var src = A.source || {};

    // Asteroid orbit path in 3D ecliptic coordinates (AU) — fixed, so precompute.
    var path = [];
    (function () {
      var a = el.a_au, e = el.e;
      var w = el.w_deg * D2R, om = el.om_deg * D2R, inc = el.i_deg * D2R;
      for (var nu = 0; nu <= 360; nu += 2) {
        var rr = a * (1 - e * e) / (1 + e * Math.cos(nu * D2R));
        path.push(orbToEcl(rr, w + nu * D2R, om, inc));
      }
    })();

    var S = 600, cx = 300, cy = 300, k = 1;
    // Orthographic projection: yaw around the ecliptic pole, then tilt.
    // tilt = π/2 → classic top-down; tilt → 0 → edge-on (inclination visible).
    function project(p) {
      var ca = Math.cos(view.az), sa = Math.sin(view.az);
      var x1 = p.x * ca - p.y * sa, y1 = p.x * sa + p.y * ca;
      var sy = y1 * Math.sin(view.tilt) + p.z * Math.cos(view.tilt);
      return [cx + x1 * k, cy - sy * k];
    }
    function strokePath(pts, color, width) {
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var pt = project(pts[i]);
        if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
      }
      ctx.closePath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    function dot(p, r, color) {
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
    }
    // Labels are drawn in priority order and skipped when they would collide,
    // so a crowded inner system stays readable instead of overprinting.
    var placed = [];
    function label(p, text) {
      ctx.font = "11px system-ui";
      var x = p[0] + 6, y = p[1] - 5;
      var box = [x - 2, y - 12, x + ctx.measureText(text).width + 2, y + 3];
      for (var i = 0; i < placed.length; i++) {
        var b = placed[i];
        if (box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]) return;
      }
      placed.push(box);
      ctx.lineWidth = 3;                       // dark halo for legibility
      ctx.strokeStyle = "rgba(20,0,31,0.85)";
      ctx.strokeText(text, x, y);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(text, x, y);
    }
    function drawOrbit() {
      S = cv.clientWidth || 600; cx = S / 2; cy = S / 2;
      cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      k = ((S / 2 - 26) / 5.6) * view.zoom;
      ctx.clearRect(0, 0, S, S);
      var jd = nowJD();

      PLANETS.forEach(function (p) { strokePath(planetPath(p, jd), ORBIT_COLOR, 1); });
      strokePath(path, AST_COLOR, 1.8);

      dot(project({ x: 0, y: 0, z: 0 }), 4.5, SUN_COLOR);
      var marks = [];
      PLANETS.forEach(function (p) {
        var at = project(planetPos(p, jd));
        dot(at, p.size, p.color);
        // Only label a planet once its orbit is wide enough to read, so the
        // inner planets don't pile up on the Sun at low zoom.
        if (planetKepler(p, jd).a * k > 30) marks.push([at, p.name]);
      });
      var astAt = project(astEcliptic(jd));
      dot(astAt, 4.8, AST_COLOR);

      placed = [];
      label(astAt, "(33964)");                 // the subject always gets its label
      marks.forEach(function (m) { label(m[0], m[1]); });

      // Source credit, bottom-right corner of the diagram.
      if (src.short) {
        var credit = src.short + (src.solution_date ? " · solution " + src.solution_date : "");
        ctx.font = "10px system-ui";
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(168,147,194,0.75)";
        ctx.fillText(credit, S - 10, S - 10);
        ctx.textAlign = "left";
      }
    }

    // Legend is generated from the same colors the canvas draws with, so the
    // two can never drift apart.
    (function buildLegend() {
      var host = document.getElementById("ast-legend");
      if (!host) return;
      var items = [{ name: "Sun", color: SUN_COLOR, kind: "dot" }];
      PLANETS.forEach(function (p) { items.push({ name: p.name, color: p.color, kind: "dot" }); });
      items.push({ name: "(33964) Patrickshober", color: AST_COLOR, kind: "dot" });
      items.push({ name: "its orbit", color: AST_COLOR, kind: "line" });
      items.push({ name: "planet orbits", color: "rgba(255,255,255,0.5)", kind: "line" });
      host.innerHTML = items.map(function (it) {
        return '<li><i class="ast-key ast-key--' + it.kind +
               '" style="background:' + it.color + '"></i>' + it.name + '</li>';
      }).join("");
    })();

    // Interactions. touch-action none so pointer events own the gestures.
    cv.style.touchAction = "none";
    cv.style.cursor = "grab";
    var pointers = {}, lastPinch = null;
    cv.addEventListener("pointerdown", function (e) {
      pointers[e.pointerId] = [e.clientX, e.clientY];
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      cv.style.cursor = "grabbing";
    });
    cv.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {           // pinch zoom
        pointers[e.pointerId] = [e.clientX, e.clientY];
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastPinch) {
          view.zoom = Math.max(0.5, Math.min(5, view.zoom * dist / lastPinch));
          drawOrbit();
        }
        lastPinch = dist;
        return;
      }
      var prev = pointers[e.pointerId];
      pointers[e.pointerId] = [e.clientX, e.clientY];
      view.az += (e.clientX - prev[0]) * 0.008;
      view.tilt = Math.max(0.12, Math.min(Math.PI / 2, view.tilt + (e.clientY - prev[1]) * 0.008));
      drawOrbit();
    });
    function endPointer(e) { delete pointers[e.pointerId]; lastPinch = null; cv.style.cursor = "grab"; }
    cv.addEventListener("pointerup", endPointer);
    cv.addEventListener("pointercancel", endPointer);
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      view.zoom = Math.max(0.5, Math.min(5, view.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
      drawOrbit();
    }, { passive: false });
    cv.addEventListener("dblclick", function () {
      view.az = HOME.az; view.tilt = HOME.tilt; view.zoom = HOME.zoom;
      drawOrbit();
    });
    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(drawOrbit, 150);
    });

    drawOrbit();
    setInterval(drawOrbit, 60000);      // keep current positions moving
  })();

  window.__ASTEROID_TEST = { planetPos: planetPos, earthEcliptic: earthEcliptic,
                             astEcliptic: astEcliptic, eclToEqu: eclToEqu,
                             PLANETS: PLANETS, update: update };

  update();
  setInterval(update, 60000); // refresh the live panel each minute
})();
