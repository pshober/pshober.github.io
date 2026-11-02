/* Meteorite-falls page: sorting and filtering the table, and the "Ask about a fireball" form.
   The form only composes a message (sent through site.falls_inquiry.endpoint when one is set, otherwise
   through the visitor's email app); nothing here can run the detector. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ table
  var table = document.getElementById("falls-table");
  if (table) {
    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    var search = document.getElementById("falls-q");
    var count = document.getElementById("falls-count");
    var state = { det: "all", rec: "all", text: "" };
    var RANK = {
      auto: { found: 0, missed: 1, none: 2 },
      human: { verified: 0 },
      rec: { yes: 0, unknown: 1, no: 2 }
    };

    var apply = function () {
      var words = state.text.toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      rows.forEach(function (tr) {
        var d = tr.dataset;
        var ok = true;
        if (state.det === "found") ok = d.auto === "found";
        else if (state.det === "verified") ok = d.human === "verified";
        else if (state.det === "pending") ok = d.human !== "verified";
        if (ok && state.rec === "yes") ok = d.rec === "yes";
        if (ok && words.length) ok = words.every(function (w) { return d.q.indexOf(w) !== -1; });
        tr.hidden = !ok;
        if (ok) shown += 1;
      });
      count.textContent = shown === rows.length ? rows.length + " falls" : shown + " of " + rows.length + " falls";
    };

    Array.prototype.forEach.call(document.querySelectorAll(".falls-chips .chip"), function (chip) {
      chip.addEventListener("click", function () {
        var group = chip.parentNode;
        Array.prototype.forEach.call(group.querySelectorAll(".chip"), function (c) {
          c.classList.toggle("is-on", c === chip);
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        state[chip.dataset.filter] = chip.dataset.value;
        apply();
      });
    });
    if (search) search.addEventListener("input", function () { state.text = search.value; apply(); });

    var sortKey = "date";
    var sortDir = -1;
    var keyOf = function (tr, k) {
      var d = tr.dataset;
      if (k === "date") return d.date;
      if (k === "name") return d.name;
      if (k === "papers") return Number(d.papers) || 0;
      var ranks = RANK[k] || {};
      var v = k === "auto" ? d.auto : k === "human" ? d.human : d.rec;
      return v in ranks ? ranks[v] : 9;
    };
    Array.prototype.forEach.call(table.tHead.querySelectorAll("th[data-sort] button"), function (btn) {
      btn.addEventListener("click", function () {
        var th = btn.parentNode;
        var k = th.dataset.sort;
        sortDir = k === sortKey ? -sortDir : (k === "date" || k === "papers" ? -1 : 1);
        sortKey = k;
        rows.sort(function (a, b) {
          var x = keyOf(a, k), y = keyOf(b, k);
          if (x !== y) return (x < y ? -1 : 1) * sortDir;
          return a.dataset.date < b.dataset.date ? 1 : -1;      // ties: newest first
        });
        rows.forEach(function (tr) { tbody.appendChild(tr); });
        Array.prototype.forEach.call(table.tHead.querySelectorAll("th[data-sort]"), function (h) {
          if (h === th) h.setAttribute("aria-sort", sortDir < 0 ? "descending" : "ascending");
          else h.removeAttribute("aria-sort");
        });
      });
    });

    // the whole row opens the fall's page (links inside the row keep their own targets)
    rows.forEach(function (tr) {
      var link = tr.querySelector(".c-fall a");
      if (!link) return;
      tr.addEventListener("click", function (e) {
        if (e.target.closest("a, button")) return;
        window.location.href = link.href;
      });
    });
    apply();
  }

  // ------------------------------------------------------------------ inquiry form
  var form = document.getElementById("falls-form");
  if (!form) return;
  var $ = function (name) { return form.elements[name]; };
  var tzSel = document.getElementById("ff-tz");
  var utcOut = document.getElementById("ff-utc");
  var status = document.getElementById("ff-status");
  var WINDOW_DEG = 1.0;     // eyewitness-only search window, +-1.0 deg around the reported point

  var localTz = "UTC";
  try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { /* old browser */ }
  var addTz = function (value, label) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    tzSel.appendChild(o);
  };
  addTz(localTz, "My time zone (" + localTz.replace(/_/g, " ") + ")");
  if (localTz !== "UTC") addTz("UTC", "UTC");
  var zones = [];
  try { zones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; } catch (e) { zones = []; }
  zones.forEach(function (z) { if (z !== localTz && z !== "UTC") addTz(z, z.replace(/_/g, " ")); });

  // minutes east of UTC that the time zone `tz` shows at instant `ms`
  var offsetMin = function (tz, ms) {
    var parts = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(new Date(ms)).forEach(function (p) { parts[p.type] = p.value; });
    var wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour) % 24, +parts.minute, +parts.second);
    return Math.round((wall - ms) / 60000);
  };
  // a wall-clock date and time in `tz` -> the UTC instant (two passes settle daylight-saving edges)
  var toUtc = function (date, time, tz) {
    var d = date.split("-").map(Number), t = time.split(":").map(Number);
    var guess = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
    var ms = guess - offsetMin(tz, guess) * 60000;
    return new Date(guess - offsetMin(tz, ms) * 60000);
  };
  var iso = function (dt) { return dt.toISOString().slice(0, 16).replace("T", " "); };

  var span = function () {
    var date = $("date").value, a = $("start").value, b = $("end").value, tz = tzSel.value;
    if (!date || !a || !b) return null;
    var t0 = toUtc(date, a, tz), t1 = toUtc(date, b, tz);
    if (t1 <= t0) t1 = new Date(t1.getTime() + 86400000);    // the range runs past midnight
    return { t0: t0, t1: t1, minutes: Math.round((t1 - t0) / 60000), local: date + " " + a + "–" + b + " " + tz };
  };
  var showUtc = function () {
    var s = span();
    if (!s) { utcOut.textContent = ""; return; }
    utcOut.textContent = "In UTC: " + iso(s.t0) + " to " + iso(s.t1).slice(11) + (iso(s.t1).slice(0, 10) !== iso(s.t0).slice(0, 10) ? " (next day)" : "") +
      " · " + s.minutes + " min" + (s.minutes > 240 ? " · please narrow it to a few hours if you can" : "");
  };
  ["date", "start", "end"].forEach(function (n) { $(n).addEventListener("input", showUtc); });
  tzSel.addEventListener("change", showUtc);

  // ---- picking the place
  var map = null, marker = null;
  var setPoint = function (lat, lon, pan) {
    $("lat").value = lat.toFixed(4);
    $("lon").value = lon.toFixed(4);
    if (map) {
      if (marker) marker.setLatLng([lat, lon]); else marker = window.L.marker([lat, lon]).addTo(map);
      if (pan) map.setView([lat, lon], Math.max(map.getZoom(), 8));
    }
  };
  var loadLeaflet = function (cb) {
    if (window.L) { cb(); return; }
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    var s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = cb;
    s.onerror = function () { status.textContent = "The map could not be loaded; please type the latitude and longitude."; };
    document.head.appendChild(s);
  };
  document.getElementById("ff-map-btn").addEventListener("click", function () {
    var box = document.getElementById("ff-map");
    box.hidden = false;
    loadLeaflet(function () {
      if (map) { map.invalidateSize(); return; }
      var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
      var has = isFinite(lat) && isFinite(lon);
      map = window.L.map(box).setView(has ? [lat, lon] : [39.5, -97], has ? 8 : 4);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 15, attribution: "© OpenStreetMap contributors"
      }).addTo(map);
      if (has) setPoint(lat, lon, false);
      map.on("click", function (e) { setPoint(e.latlng.lat, e.latlng.lng, false); });
    });
  });
  document.getElementById("ff-geo-btn").addEventListener("click", function () {
    if (!navigator.geolocation) { status.textContent = "Your browser cannot share its location; please type it."; return; }
    status.textContent = "Asking your browser for your location…";
    navigator.geolocation.getCurrentPosition(function (p) {
      setPoint(p.coords.latitude, p.coords.longitude, true);
      status.textContent = "";
    }, function () { status.textContent = "Location not available; please type it or pick it on the map."; },
    { enableHighAccuracy: false, timeout: 10000 });
  });
  ["lat", "lon"].forEach(function (n) {
    $(n).addEventListener("change", function () {
      var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
      if (map && isFinite(lat) && isFinite(lon)) setPoint(lat, lon, true);
    });
  });

  // ---- composing and sending
  var compose = function () {
    var s = span();
    var lat = parseFloat($("lat").value), lon = parseFloat($("lon").value);
    var email = $("email").value.trim();
    var errors = [];
    if (!s) errors.push("the date and the time range");
    if (!(isFinite(lat) && Math.abs(lat) <= 90 && isFinite(lon) && Math.abs(lon) <= 180)) errors.push("a latitude and longitude");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("your email address");
    if (errors.length) { status.textContent = "Please add " + errors.join(", ") + "."; return null; }
    var r = function (x) { return (Math.round(x * 100) / 100).toFixed(2); };
    var subject = "Fireball inquiry: " + iso(s.t0) + "–" + iso(s.t1).slice(11) + " UTC near " + lat.toFixed(2) + ", " + lon.toFixed(2);
    var body = [
      "Fireball inquiry from planetarypat.com/meteorite-falls",
      "",
      "When (UTC):  " + iso(s.t0) + " to " + iso(s.t1) + "  (" + s.minutes + " min; entered as " + s.local + ")",
      "Where:       " + lat.toFixed(4) + ", " + lon.toFixed(4),
      "Window:      lat " + r(lat - WINDOW_DEG) + " to " + r(lat + WINDOW_DEG) + ", lon " + r(lon - WINDOW_DEG) + " to " +
        r(lon + WINDOW_DEG) + " (±" + WINDOW_DEG.toFixed(1) + "°, eyewitness report)",
      "",
      "Name:        " + ($("name").value.trim() || "(not given)"),
      "Email:       " + email,
      "",
      "What they saw or heard:",
      $("notes").value.trim() || "(nothing added)"
    ].join("\n");
    return { subject: subject, body: body, email: email };
  };

  var to = form.dataset.to + "@" + form.dataset.domain;
  var showFallback = function (msg) {
    var href = "mailto:" + to + "?subject=" + encodeURIComponent(msg.subject) + "&body=" + encodeURIComponent(msg.body);
    status.innerHTML = "";
    var p = document.createElement("p");
    p.innerHTML = "Your email app should now open with the message ready to send. If it did not, copy the message " +
      "below and send it to <a></a>.";
    var a = p.querySelector("a");
    a.href = "mailto:" + to;
    a.textContent = to;
    var ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.rows = 10;
    ta.className = "ff-copy";
    ta.value = "Subject: " + msg.subject + "\n\n" + msg.body;
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn btn--ghost ff-small";
    copy.textContent = "Copy message";
    copy.addEventListener("click", function () {
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { copy.textContent = "Copied"; });
      else if (ok) copy.textContent = "Copied";
    });
    status.appendChild(p);
    status.appendChild(ta);
    status.appendChild(copy);
    window.location.href = href;
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("_gotcha").value) return;            // a bot filled the hidden field
    var msg = compose();
    if (!msg) return;
    var endpoint = form.dataset.endpoint;
    if (!endpoint) { showFallback(msg); return; }
    var fd = new FormData();
    fd.append("email", msg.email);
    fd.append("_replyto", msg.email);
    fd.append("_subject", msg.subject);
    fd.append("message", msg.body);
    status.textContent = "Sending…";
    fetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        status.textContent = "Thank you, your message was sent. If the radar shows something, I will reply to " + msg.email + ".";
        form.reset();
        showUtc();
      })
      .catch(function () { showFallback(msg); });
  });
})();
