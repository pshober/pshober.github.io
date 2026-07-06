/* MetDetect demo — a self-contained, client-side viewer for a precomputed
 * meteorite-fall radar detection. Loads a manifest + per-event {json, geojson}
 * from /assets/data/metdetect-demo/ and renders the flagged debris gates on a
 * Leaflet map. No build step, no server. Mirrors the asteroid.js pattern. */
(function () {
  "use strict";

  var BASE = (window.MTD_DATA_BASE || "/assets/data/metdetect-demo/");
  if (BASE.charAt(BASE.length - 1) !== "/") BASE += "/";

  function $(id) { return document.getElementById(id); }

  // Classic "jet" colormap (matches the desktop app's reflectivity scale):
  // dark blue (low) -> cyan -> green -> yellow -> red (high). t in [0,1].
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

  var map, tiles, layer;

  function initMap() {
    map = L.map("mtd-map", { scrollWheelZoom: true, worldCopyJump: false });
    // Dark basemap to match the site theme (CARTO dark matter, © OSM/CARTO).
    tiles = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }
    ).addTo(map);
    map.setView([40, -95], 4); // placeholder until an event loads
  }

  function renderEvent(ev, geo) {
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
      } else { // TP
        style = { radius: 5.5, color: "#eef", weight: 1, fillColor: col, fillOpacity: 0.95 };
      }
      var m = L.circleMarker(latlng, style);
      var zTxt = (p.z === null || p.z === undefined) ? "—" : p.z + " dBZ";
      m.bindPopup("<b>" + zTxt + "</b><br>" + (p.alt_m != null ? Math.round(p.alt_m) + " m altitude<br>" : "")
        + "role: " + role + (p.rhohv != null ? "<br>ρHV " + p.rhohv : ""));
      layer.addLayer(m);
    });

    // Radar site (✳) and detected-cluster centroid (◆).
    if (ev.radar_lat != null && ev.radar_lon != null) {
      divMarker([ev.radar_lat, ev.radar_lon], "&#x2733;", "mtd-radar",
        (ev.radar_icao || "radar")).addTo(layer)
        .bindPopup("<b>" + (ev.radar_icao || "radar") + "</b><br>NEXRAD site");
    }
    var bc = ev.best_cluster || {};
    if (bc.centroid_lat != null && bc.centroid_lon != null) {
      divMarker([bc.centroid_lat, bc.centroid_lon], "&#x25C6;", "mtd-centroid",
        "fall centroid").addTo(layer)
        .bindPopup("<b>Detected fall</b><br>" + (bc.centroid_alt_m != null ? Math.round(bc.centroid_alt_m) + " m altitude<br>" : "")
          + (bc.detection_prob != null ? "cluster confidence " + bc.detection_prob : ""));
    }

    if (ev.bounds) { map.fitBounds(ev.bounds, { padding: [24, 24] }); }
    updatePanel(ev, lo, hi);
  }

  function fmtPct(x) { return x == null ? "—" : (Math.round(x * 100) / 100).toFixed(2); }

  function updatePanel(ev, lo, hi) {
    $("mtd-title").textContent = ev.title || ev.id || "Fall event";
    $("mtd-date").textContent = ev.date_label || (ev.scene_time_utc || "");
    $("mtd-radar").textContent = ev.radar_icao || "—";
    var bc = ev.best_cluster || {};
    $("mtd-gates").textContent = (bc.n_gates != null ? bc.n_gates : ev.n_points) || "—";
    $("mtd-alt").textContent = bc.centroid_alt_m != null ? (Math.round(bc.centroid_alt_m) + " m") : "—";
    $("mtd-conf").textContent = fmtPct(ev.event_confidence);
    $("mtd-narrative").textContent = ev.narrative || "";

    var badge = $("mtd-badge"), conf = ev.event_confidence;
    var strong = ev.event_detected && conf != null && conf >= 0.8;
    badge.className = "mtd-badge " + (strong ? "is-hit" : "is-weak");
    badge.textContent = (ev.event_detected ? "DETECTED" : "WEAK") + " · confidence " + fmtPct(conf);

    // Legend gradient + range labels.
    var stops = [];
    for (var i = 0; i <= 8; i++) stops.push(jet(i / 8) + " " + (i / 8 * 100) + "%");
    $("mtd-bar").style.background = "linear-gradient(90deg," + stops.join(",") + ")";
    $("mtd-zlo").textContent = lo + " dBZ";
    $("mtd-zhi").textContent = hi + " dBZ";
  }

  function loadEvent(slug) {
    Promise.all([
      fetch(BASE + slug + ".json").then(function (r) { return r.json(); }),
      fetch(BASE + slug + ".geojson").then(function (r) { return r.json(); })
    ]).then(function (res) { renderEvent(res[0], res[1]); })
      .catch(function (e) {
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
    fetch(BASE + "manifest.json").then(function (r) { return r.json(); })
      .then(function (m) {
        var events = (m && m.events) || [];
        var sel = $("mtd-event");
        events.forEach(function (e) {
          var o = document.createElement("option");
          o.value = e.slug; o.textContent = e.title + (e.date_label ? " · " + e.date_label : "");
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
