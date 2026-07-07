/* MetDetect demo — self-contained client-side viewer for precomputed
 * meteorite-fall radar detections (current-cascade re-runs, honest RUN-30
 * preliminary LOEO scores). Loads a manifest + per-event {json, geojson} from
 * /assets/data/metdetect-demo/ and renders the top-ranked candidate's gates on
 * a 2D Leaflet map and (lazy-loaded) a 3D Plotly scatter. No build step. */
(function () {
  "use strict";

  var BASE = (window.MTD_DATA_BASE || "/assets/data/metdetect-demo/");
  if (BASE.charAt(BASE.length - 1) !== "/") BASE += "/";
  var PLOTLY_SRC = "https://cdn.plot.ly/plotly-gl3d-2.35.2.min.js";

  function $(id) { return document.getElementById(id); }

  // Classic "jet" colormap (matches the desktop app's reflectivity scale).
  function jet(t) {
    t = Math.max(0, Math.min(1, t));
    var r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3)));
    var g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2)));
    var b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1)));
    return "rgb(" + (r * 255 | 0) + "," + (g * 255 | 0) + "," + (b * 255 | 0) + ")";
  }
  function zColor(z, lo, hi) {
    if (z === null || z === undefined || isNaN(z)) return "#9fb0c7";
    return jet(hi > lo ? (z - lo) / (hi - lo) : 0.5);
  }

  function divMarker(latlng, glyph, cls, label) {
    return L.marker(latlng, {
      icon: L.divIcon({ className: "mtd-glyph " + cls, html: glyph,
        iconSize: [22, 22], iconAnchor: [11, 11] }),
      keyboard: false, title: label
    });
  }

  var map, layer, current = null, plotlyReady = false, plotDrawnFor = null;

  function initMap() {
    map = L.map("mtd-map", { scrollWheelZoom: true, worldCopyJump: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }
    ).addTo(map);
    map.setView([40, -95], 4);
  }

  // ----- 2D map -----
  function render2d(ev, geo) {
    if (layer) { map.removeLayer(layer); }
    layer = L.layerGroup().addTo(map);
    var zr = ev.z_range || [-11, 1], lo = zr[0], hi = zr[1];

    (geo.features || []).forEach(function (f) {
      var c = f.geometry && f.geometry.coordinates;
      if (!c) return;
      var p = f.properties || {}, latlng = [c[1], c[0]];
      var role = p.role || "TP", col = zColor(p.z, lo, hi), style;
      if (role === "FN") {
        style = { radius: 6, color: "#9fb0c7", weight: 2, fill: false };
      } else if (role === "FP") {
        style = { radius: 5, color: col, weight: 0, fillColor: col, fillOpacity: 0.9 };
      } else {
        style = { radius: 5.5, color: "#eef", weight: 1, fillColor: col, fillOpacity: 0.95 };
      }
      var m = L.circleMarker(latlng, style);
      var zTxt = (p.z === null || p.z === undefined) ? "—" : p.z + " dBZ";
      m.bindPopup("<b>" + zTxt + "</b><br>"
        + (p.alt_m != null ? Math.round(p.alt_m) + " m altitude<br>" : "")
        + "role: " + role + (p.rhohv != null ? "<br>ρHV " + p.rhohv : ""));
      layer.addLayer(m);
    });

    if (ev.radar_lat != null && ev.radar_lon != null) {
      divMarker([ev.radar_lat, ev.radar_lon], "&#x2733;", "mtd-radar",
        (ev.radar_icao || "radar")).addTo(layer)
        .bindPopup("<b>" + (ev.radar_icao || "radar") + "</b><br>NEXRAD site");
    }
    var bc = ev.best_cluster || {};
    if (bc.centroid_lat != null && bc.centroid_lon != null) {
      divMarker([bc.centroid_lat, bc.centroid_lon], "&#x25C6;", "mtd-centroid",
        "candidate centroid").addTo(layer)
        .bindPopup("<b>Top-ranked candidate</b><br>"
          + (bc.centroid_alt_m != null ? Math.round(bc.centroid_alt_m) + " m altitude<br>" : "")
          + (bc.n_gates != null ? bc.n_gates + " gates" : ""));
    }
    if (ev.bounds) { map.fitBounds(ev.bounds, { padding: [24, 24] }); }
  }

  // ----- 3D view (Plotly gl3d, lazy) -----
  function ensurePlotly(cb) {
    if (plotlyReady || typeof Plotly !== "undefined") { plotlyReady = true; cb(); return; }
    var el = $("mtd-3d");
    if (el) el.innerHTML = "<p style='padding:2rem;color:var(--muted)'>Loading 3D view…</p>";
    var s = document.createElement("script");
    s.src = PLOTLY_SRC;
    s.onload = function () { plotlyReady = true; cb(); };
    s.onerror = function () {
      if (el) el.innerHTML = "<p style='padding:2rem;color:var(--muted)'>3D library failed to load.</p>";
    };
    document.head.appendChild(s);
  }

  function render3d(ev, geo) {
    var el = $("mtd-3d");
    if (!el || !ev || !geo) return;
    el.innerHTML = "";
    var zr = ev.z_range || [-11, 1], lo = zr[0], hi = zr[1];
    var groups = { TP: { x: [], y: [], z: [], c: [], t: [] },
                   FP: { x: [], y: [], z: [], c: [], t: [] },
                   FN: { x: [], y: [], z: [], c: [], t: [] } };
    (geo.features || []).forEach(function (f) {
      var c = f.geometry && f.geometry.coordinates;
      if (!c) return;
      var p = f.properties || {}, g = groups[p.role] || groups.TP;
      g.x.push(c[0]); g.y.push(c[1]); g.z.push((p.alt_m || 0) / 1000);
      g.c.push(zColor(p.z, lo, hi));
      g.t.push((p.z != null ? p.z + " dBZ" : "—")
        + (p.alt_m != null ? "<br>" + Math.round(p.alt_m) + " m" : "")
        + "<br>" + (p.role || ""));
    });
    var traces = [
      { name: "matches truth (TP)", x: groups.TP.x, y: groups.TP.y, z: groups.TP.z,
        text: groups.TP.t, hoverinfo: "text", type: "scatter3d", mode: "markers",
        marker: { size: 3.5, color: groups.TP.c, line: { color: "#eef", width: 1 } } },
      { name: "false positive (FP)", x: groups.FP.x, y: groups.FP.y, z: groups.FP.z,
        text: groups.FP.t, hoverinfo: "text", type: "scatter3d", mode: "markers",
        marker: { size: 3, color: groups.FP.c, opacity: 0.75 } },
      { name: "missed truth (FN)", x: groups.FN.x, y: groups.FN.y, z: groups.FN.z,
        text: groups.FN.t, hoverinfo: "text", type: "scatter3d", mode: "markers",
        marker: { size: 4.5, color: "rgba(0,0,0,0)",
                  line: { color: "#9fb0c7", width: 2 }, symbol: "circle-open" } },
    ];
    if (ev.radar_lat != null) {
      traces.push({ name: "radar " + (ev.radar_icao || ""),
        x: [ev.radar_lon], y: [ev.radar_lat], z: [(ev.site_alt_m || 0) / 1000],
        type: "scatter3d", mode: "markers+text", text: ["✳ " + (ev.radar_icao || "radar")],
        textposition: "top center", textfont: { color: "#ff9e3d", size: 12 },
        hoverinfo: "name", marker: { size: 6, color: "#ff9e3d", symbol: "diamond" } });
    }
    // Translucent ground plane over the event bounds.
    if (ev.bounds) {
      var s = ev.bounds[0], n = ev.bounds[1];
      traces.push({ type: "mesh3d", name: "ground",
        x: [s[1], n[1], n[1], s[1]], y: [s[0], s[0], n[0], n[0]], z: [0, 0, 0, 0],
        i: [0, 0], j: [1, 2], k: [2, 3], color: "#16213b", opacity: 0.45,
        hoverinfo: "skip", showlegend: false });
    }
    Plotly.newPlot(el, traces, {
      paper_bgcolor: "rgba(0,0,0,0)",
      scene: {
        xaxis: { title: "lon", color: "#9fb0c7", gridcolor: "#26314b", zerolinecolor: "#26314b" },
        yaxis: { title: "lat", color: "#9fb0c7", gridcolor: "#26314b", zerolinecolor: "#26314b" },
        zaxis: { title: "alt km", color: "#9fb0c7", gridcolor: "#26314b", zerolinecolor: "#26314b" },
        aspectmode: "manual", aspectratio: { x: 1.4, y: 1, z: 0.55 },
        bgcolor: "rgba(0,0,0,0)",
        camera: { eye: { x: 1.4, y: -1.6, z: 0.7 } }
      },
      legend: { font: { color: "#9fb0c7" }, x: 0, y: 1 },
      margin: { l: 0, r: 0, t: 8, b: 0 },
      modebar: { color: "#9fb0c7", activecolor: "#ff9e3d", bgcolor: "rgba(0,0,0,0)",
                 orientation: "v" }
    }, {
      // Zoom must always work: scroll/pinch over the scene, plus a visible
      // toolbar (zoom / pan / orbit / reset / save-image) for poster visitors.
      responsive: true, scrollZoom: true, displaylogo: false,
      displayModeBar: true,
      modeBarButtonsToRemove: ["resetCameraLastSave3d", "tableRotation", "hoverClosest3d"]
    });
    plotDrawnFor = ev.slug;
  }

  // ----- tabs -----
  function showTab(which) {
    var is3d = which === "3d";
    $("mtd-map").style.display = is3d ? "none" : "";
    $("mtd-3d").style.display = is3d ? "" : "none";
    var hint = $("mtd-3d-hint"); if (hint) hint.style.display = is3d ? "" : "none";
    $("mtd-tab-2d").classList.toggle("is-active", !is3d);
    $("mtd-tab-3d").classList.toggle("is-active", is3d);
    if (is3d && current) {
      ensurePlotly(function () {
        if (plotDrawnFor !== current.ev.slug) { render3d(current.ev, current.geo); }
        else if (typeof Plotly !== "undefined") { Plotly.Plots.resize($("mtd-3d")); }
      });
    } else if (!is3d && map) { map.invalidateSize(); }
  }

  // ----- info panel -----
  function fmt2(x) { return x == null ? "—" : (Math.round(x * 100) / 100).toFixed(2); }

  function updatePanel(ev) {
    var det = ev.detector || {};
    $("mtd-title").textContent = ev.title || ev.id || "Fall event";
    $("mtd-date").textContent = ev.date_label || (ev.scene_time_utc || "");
    $("mtd-radar").textContent = ev.radar_icao || "—";
    var bc = ev.best_cluster || {};
    $("mtd-gates").textContent = (bc.n_gates != null ? bc.n_gates : ev.n_points) || "—";
    $("mtd-alt").textContent = bc.centroid_alt_m != null ? (Math.round(bc.centroid_alt_m) + " m") : "—";
    $("mtd-conf").textContent = fmt2(det.score);
    $("mtd-tau").textContent = det.tau != null
      ? (fmt2(det.tau) + (det.tau_label && det.tau_label !== "global" ? " (" + det.tau_label + ")" : " (global)"))
      : "—";
    $("mtd-narrative").textContent = ev.narrative || "";

    var badge = $("mtd-badge");
    badge.className = "mtd-badge " + (det.pass ? "is-hit" : "is-weak");
    badge.textContent = (det.pass ? "DETECTED" : "BELOW THRESHOLD")
      + " · score " + fmt2(det.score) + " vs τ " + fmt2(det.tau);

    var chip = $("mtd-truth-chip");
    if (chip) {
      chip.style.display = "";
      if (det.n_flagged > 0 && det.n_flagged_truth === det.n_flagged) {
        chip.textContent = "all " + det.n_flagged + " flagged candidates are real debris ✓";
        chip.className = "mtd-badge is-hit";
      } else if (det.n_flagged > 0) {
        chip.textContent = det.n_flagged_truth + " of " + det.n_flagged
          + " flagged candidates are real debris";
        chip.className = "mtd-badge " +
          (det.n_flagged_truth * 2 >= det.n_flagged ? "is-hit" : "is-weak");
      } else if (det.top_is_truth === true) {
        chip.textContent = "below threshold — but the top candidate IS the real debris";
        chip.className = "mtd-badge is-weak";
      } else if (det.top_is_truth === false) {
        chip.textContent = "top candidate ≠ truth";
        chip.className = "mtd-badge is-weak";
      } else { chip.style.display = "none"; }
    }

    // Legend gradient + range labels.
    var zr = ev.z_range || [-11, 1];
    var stops = [];
    for (var i = 0; i <= 8; i++) stops.push(jet(i / 8) + " " + (i / 8 * 100) + "%");
    $("mtd-bar").style.background = "linear-gradient(90deg," + stops.join(",") + ")";
    $("mtd-zlo").textContent = zr[0] + " dBZ";
    $("mtd-zhi").textContent = zr[1] + " dBZ";
  }

  function loadEvent(slug) {
    Promise.all([
      fetch(BASE + slug + ".json").then(function (r) { return r.json(); }),
      fetch(BASE + slug + ".geojson").then(function (r) { return r.json(); })
    ]).then(function (res) {
      current = { ev: res[0], geo: res[1] };
      plotDrawnFor = null;
      render2d(res[0], res[1]);
      updatePanel(res[0]);
      if ($("mtd-3d").style.display !== "none") {
        ensurePlotly(function () { render3d(current.ev, current.geo); });
      }
    }).catch(function (e) {
      var t = $("mtd-title"); if (t) t.textContent = "Could not load the demo data.";
      if (window.console) console.error("[metdetect-demo]", e);
    });
  }

  function boot() {
    if (typeof L === "undefined") {
      var t = $("mtd-title"); if (t) t.textContent = "Map library failed to load.";
      return;
    }
    initMap();
    $("mtd-tab-2d").addEventListener("click", function () { showTab("2d"); });
    $("mtd-tab-3d").addEventListener("click", function () { showTab("3d"); });
    fetch(BASE + "manifest.json").then(function (r) { return r.json(); })
      .then(function (m) {
        var events = (m && m.events) || [];
        var sel = $("mtd-event");
        events.forEach(function (e) {
          var o = document.createElement("option");
          o.value = e.slug;
          o.textContent = e.title + (e.date_label ? " · " + e.date_label : "");
          sel.appendChild(o);
        });
        if (sel) sel.addEventListener("change", function () { loadEvent(sel.value); });
        if (events.length) { loadEvent(events[0].slug); }
        else { $("mtd-title").textContent = "No demo events available."; }
      })
      .catch(function (e) {
        $("mtd-title").textContent = "Could not load the event list.";
        if (window.console) console.error("[metdetect-demo]", e);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
