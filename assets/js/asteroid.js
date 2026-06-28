/* (33964) Patrickshober — compute the asteroid's current heliocentric position
   from baked JPL elements, derive its geocentric sky position + apparent
   magnitude, and draw a top-down orbit diagram. All client-side; no API calls.
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

  // Asteroid heliocentric position (AU) in J2000 ecliptic, at Julian day jd.
  function astEcliptic(jd) {
    var a = el.a_au, e = el.e;
    var M = norm360(el.ma_deg + el.n_deg_day * (jd - el.epoch_jd)) * D2R;
    var E = solveKepler(M, e);
    var nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
    var r = a * (1 - e * Math.cos(E));
    var w = el.w_deg * D2R, om = el.om_deg * D2R, inc = el.i_deg * D2R;
    var u = w + nu;
    return {
      x: r * (Math.cos(om) * Math.cos(u) - Math.sin(om) * Math.sin(u) * Math.cos(inc)),
      y: r * (Math.sin(om) * Math.cos(u) + Math.cos(om) * Math.sin(u) * Math.cos(inc)),
      z: r * (Math.sin(u) * Math.sin(inc)),
      r: r
    };
  }

  // Earth heliocentric ecliptic (AU) — low-precision Sun model (Meeus), z~0.
  function earthEcliptic(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
          + 0.000289 * Math.sin(3 * M);
    var lon = (L0 + C) * D2R;           // Sun's geocentric ecliptic longitude
    var v = M + C * D2R;
    var ecc = 0.016708634 - 0.000042037 * T;
    var R = 1.000001018 * (1 - ecc * ecc) / (1 + ecc * Math.cos(v));
    // Earth heliocentric = opposite direction to Sun, distance R
    return { x: -R * Math.cos(lon), y: -R * Math.sin(lon), z: 0, r: R };
  }

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

    var cons = "—";
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
        if (aa.alt > 0) out.textContent = "Up now — look " + compass(aa.az) + ", " +
          aa.alt.toFixed(0) + "° above the horizon (telescope needed).";
        else out.textContent = "Below your horizon right now (" + compass(aa.az) + " side). Try again later.";
        locBtn.textContent = "Use my location";
      }, function () { locBtn.textContent = "Location unavailable"; });
    });
  } else if (locBtn) { locBtn.style.display = "none"; }

  // ── orbit diagram ───────────────────────────────────────────────────────────
  function drawOrbit() {
    var cv = document.getElementById("orbit");
    if (!cv || !cv.getContext) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), S = 600;
    cv.width = S * dpr; cv.height = S * dpr;
    var ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    var cx = S / 2, cy = S / 2, maxAU = 5.6, k = (S / 2 - 24) / maxAU;
    function px(x, y) { return [cx + x * k, cy - y * k]; }

    ctx.clearRect(0, 0, S, S);
    // reference planet orbits (circular approximation)
    [["Earth", 1.0, "#3b6ea5"], ["Mars", 1.524, "#a5532f"], ["Jupiter", 5.203, "#7a6b45"]]
      .forEach(function (p) {
        ctx.beginPath(); ctx.arc(cx, cy, p[1] * k, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "rgba(159,176,199,0.6)"; ctx.font = "11px system-ui";
        ctx.fillText(p[0], cx + 3, cy - p[1] * k - 3);
      });
    // asteroid orbit (projected to ecliptic x-y)
    ctx.beginPath();
    for (var nu = 0; nu <= 360; nu += 2) {
      var a = el.a_au, e = el.e, rr = a * (1 - e * e) / (1 + e * Math.cos(nu * D2R));
      var u = (el.w_deg + nu) * D2R, om = el.om_deg * D2R, inc = el.i_deg * D2R;
      var x = rr * (Math.cos(om) * Math.cos(u) - Math.sin(om) * Math.sin(u) * Math.cos(inc));
      var y = rr * (Math.sin(om) * Math.cos(u) + Math.cos(om) * Math.sin(u) * Math.cos(inc));
      var pt = px(x, y); nu === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]);
    }
    ctx.closePath(); ctx.strokeStyle = "#ff9e3d"; ctx.lineWidth = 1.6; ctx.stroke();

    // Sun
    var jd = nowJD();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fillStyle = "#ffd27a"; ctx.fill();
    // current Earth
    var ea = earthEcliptic(jd), ep = px(ea.x, ea.y);
    dot(ctx, ep, 3.5, "#5aa0e0", "Earth");
    // current asteroid
    var as = astEcliptic(jd), ap = px(as.x, as.y);
    dot(ctx, ap, 4.5, "#ff9e3d", "(33964)");
  }
  function dot(ctx, p, r, color, label) {
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = "rgba(230,236,245,0.85)"; ctx.font = "11px system-ui";
    ctx.fillText(label, p[0] + 6, p[1] - 5);
  }

  update();
  drawOrbit();
  setInterval(update, 60000); // refresh the live panel each minute
})();
