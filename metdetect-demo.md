---
layout: default
title: "MetDetect: see a meteorite fall in the radar"
permalink: /metdetect-demo/
description: "Explore a real, automatically detected meteorite fall in NEXRAD Doppler weather radar — interactive, in your browser, no install."
sitemap: false
---
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<style>
  .mtd-controls { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin:0 0 1rem; }
  .mtd-controls label { color:var(--muted); font-size:0.92rem; display:flex; align-items:center; gap:0.5rem; }
  .mtd-controls select {
    background:var(--surface-2); color:var(--text); border:1px solid var(--border-strong);
    border-radius:8px; padding:0.4rem 0.6rem; font:inherit;
  }
  .mtd-badge {
    display:inline-flex; align-items:center; gap:0.4rem; font-weight:600; font-size:0.9rem;
    padding:0.3rem 0.7rem; border-radius:999px; border:1px solid var(--border-strong);
  }
  .mtd-badge.is-hit  { color:#8ef0b0; border-color:rgba(142,240,176,0.4); background:rgba(142,240,176,0.08); }
  .mtd-badge.is-weak { color:var(--accent-2); border-color:rgba(255,192,122,0.4); background:rgba(255,192,122,0.08); }
  .mtd-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:1.25rem; align-items:start; }
  @media (max-width:820px){ .mtd-grid { grid-template-columns:1fr; } }
  #mtd-map {
    height:520px; width:100%; border-radius:14px; border:1px solid var(--border);
    background:var(--surface); z-index:0;
  }
  .mtd-info { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:1.1rem 1.2rem; }
  .mtd-info h2 { margin:0 0 0.2rem; font-size:1.15rem; }
  .mtd-date { color:var(--faint); font-size:0.88rem; margin:0 0 0.9rem; }
  .mtd-facts { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem 1rem; margin:0 0 1rem; }
  .mtd-facts .k { display:block; color:var(--faint); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; }
  .mtd-facts .v { display:block; color:var(--text); font-size:1.02rem; font-weight:600; }
  .mtd-narrative { color:var(--muted); font-size:0.94rem; line-height:1.55; margin:0 0 1rem; }
  .mtd-legend { border-top:1px solid var(--border); padding-top:0.9rem; }
  .mtd-legend h3 { font-size:0.78rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--faint); margin:0 0 0.5rem; }
  .mtd-bar { height:12px; border-radius:6px; margin:0.2rem 0 0.2rem; }
  .mtd-bar-lab { display:flex; justify-content:space-between; color:var(--faint); font-size:0.74rem; }
  .mtd-roles { display:flex; gap:1rem; flex-wrap:wrap; margin-top:0.7rem; font-size:0.82rem; color:var(--muted); }
  .mtd-roles span { display:inline-flex; align-items:center; gap:0.35rem; }
  .mtd-dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
  .mtd-note { color:var(--faint); font-size:0.85rem; }
  /* Map glyph markers (radar ✳ / centroid ◆) — transparent, no default box */
  .mtd-glyph { background:transparent !important; border:none !important;
    display:flex; align-items:center; justify-content:center; line-height:1;
    text-shadow:0 0 4px #000, 0 0 2px #000; }
  .mtd-radar { color:var(--accent); font-size:20px; }
  .mtd-centroid { color:#ffffff; font-size:18px; }
  /* Keep Leaflet popups on-theme */
  .leaflet-popup-content-wrapper, .leaflet-popup-tip { background:var(--surface-2); color:var(--text); }
  .leaflet-popup-content { font:inherit; }
  .leaflet-container { font:inherit; background:var(--surface); }
</style>

<div class="container">
  <header class="page-head">
    <div class="eyebrow">Interactive demo · MetDetect</div>
    <h1>See a meteorite fall in the radar</h1>
    <p class="lede">When a meteorite fall's debris drifts to the ground it briefly shows up in
      NEXRAD Doppler weather radar. Fireball networks tell us <em>when and where</em> to look;
      <strong>MetDetect</strong> answers <em>which</em> radar echoes are the falling debris.
      Below is its top-ranked candidate for a real fall — false positives included — pan and
      zoom the map to explore. Everything runs in your browser.</p>
  </header>

  <div class="mtd-controls">
    <label for="mtd-event">Event
      <select id="mtd-event" aria-label="Choose a fall event"></select>
    </label>
    <span id="mtd-badge" class="mtd-badge">…</span>
  </div>

  <div class="mtd-grid">
    <div><div id="mtd-map" role="img" aria-label="Map of automatically detected meteorite-fall debris gates in weather radar"></div></div>
    <aside class="mtd-info">
      <h2 id="mtd-title">…</h2>
      <p id="mtd-date" class="mtd-date"></p>
      <div class="mtd-facts">
        <div><span class="k">Radar</span><span class="v" id="mtd-radar">—</span></div>
        <div><span class="k">Debris gates</span><span class="v" id="mtd-gates">—</span></div>
        <div><span class="k">Cluster altitude</span><span class="v" id="mtd-alt">—</span></div>
        <div><span class="k">Detector score</span><span class="v" id="mtd-conf">—</span></div>
      </div>
      <p id="mtd-narrative" class="mtd-narrative"></p>
      <div class="mtd-legend">
        <h3>Reflectivity (dBZ)</h3>
        <div id="mtd-bar" class="mtd-bar"></div>
        <div class="mtd-bar-lab"><span id="mtd-zlo">—</span><span id="mtd-zhi">—</span></div>
        <div class="mtd-roles">
          <span><i class="mtd-dot" style="background:#33d17a;border:2px solid #eef"></i> algorithm + confirmed (TP)</span>
          <span><i class="mtd-dot" style="background:#f6a"></i> algorithm only (FP)</span>
          <span><i class="mtd-dot" style="background:transparent;border:2px solid #9fb0c7"></i> missed (FN)</span>
        </div>
      </div>
    </aside>
  </div>

  <div class="prose" style="margin-top:2rem">
    <p><strong>What am I looking at?</strong> Each dot is a radar “gate” that MetDetect flagged as
      likely falling-meteorite debris, coloured by its reflectivity. Real falls appear as an
      elongated <em>streak</em> — the fragments strung out along the wind as they descend. The
      radar site is marked with a ✳; the ◆ marks the centroid of the detected fall.</p>
    <p>MetDetect scans public NEXRAD Level-II radar in a window placed on a fireball's reported
      time and location, and ranks candidate debris clusters with a null-trained detector — scores
      are reported against a detection threshold set at a 10% false-alarm rate on real no-fall
      radar windows (preliminary calibration). Read more on
      the <a href="{{ '/detect/' | relative_url }}">MetDetect</a> and
      <a href="{{ '/research/' | relative_url }}">research</a> pages.</p>
    <p class="mtd-note">This is a preloaded demo of a precomputed detection (the site is served as
      static pages). The full interactive tool — upload a fireball and search live — is planned as a
      companion app.</p>
  </div>
</div>

<script>
  window.MTD_DATA_BASE = {{ '/assets/data/metdetect-demo/' | relative_url | jsonify }};
</script>
<script defer src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script defer src="{{ '/assets/js/metdetect-demo.js' | relative_url }}"></script>
