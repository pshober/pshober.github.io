---
layout: default
title: "MetDetect: see a meteorite fall in the radar"
permalink: /metdetect-demo/
description: "Explore real, automatically detected meteorite falls in NEXRAD Doppler weather radar — interactive 2D + 3D, in your browser, no install."
sitemap: false
---
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<style>
  .mtd-controls { display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap; margin:0 0 1rem; }
  .mtd-controls label { color:var(--muted); font-size:0.92rem; display:flex; align-items:center; gap:0.5rem; }
  .mtd-controls select {
    background:var(--surface-2); color:var(--text); border:1px solid var(--border-strong);
    border-radius:8px; padding:0.4rem 0.6rem; font:inherit; max-width:min(420px, 78vw);
  }
  .mtd-badge {
    display:inline-flex; align-items:center; gap:0.4rem; font-weight:600; font-size:0.88rem;
    padding:0.3rem 0.7rem; border-radius:999px; border:1px solid var(--border-strong);
  }
  .mtd-badge.is-hit  { color:#8ef0b0; border-color:rgba(142,240,176,0.4); background:rgba(142,240,176,0.08); }
  .mtd-badge.is-weak { color:var(--accent-2); border-color:rgba(255,192,122,0.4); background:rgba(255,192,122,0.08); }
  .mtd-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:1.25rem; align-items:start; }
  @media (max-width:820px){ .mtd-grid { grid-template-columns:1fr; } }
  .mtd-tabs { display:flex; gap:0.4rem; margin:0 0 0.6rem; }
  .mtd-tab {
    background:var(--surface); color:var(--muted); border:1px solid var(--border-strong);
    border-radius:8px; padding:0.35rem 0.9rem; font:inherit; font-size:0.9rem; cursor:pointer;
  }
  .mtd-tab.is-active { background:var(--surface-2); color:var(--text); border-color:var(--accent); }
  .mtd-hint { color:var(--faint); font-size:0.8rem; align-self:center; }
  #mtd-map, #mtd-3d {
    height:520px; width:100%; border-radius:14px; border:1px solid var(--border);
    background:var(--surface); z-index:0;
  }
  @media (max-width:820px){ #mtd-map, #mtd-3d { height:70vh; } }
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
  .mtd-honest {
    background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent);
    border-radius:10px; padding:0.9rem 1.1rem; margin:1.4rem 0; color:var(--muted); font-size:0.92rem;
  }
  .mtd-how { margin-top:2.4rem; }
  .mtd-how h2 { font-size:1.3rem; }
  .mtd-how figure { margin:1.2rem 0; background:var(--surface); border:1px solid var(--border);
    border-radius:14px; padding:1rem; }
  .mtd-how figure img, .mtd-how figure object { max-width:100%; display:block; margin:0 auto; border-radius:8px; }
  .mtd-how figcaption { color:var(--faint); font-size:0.85rem; margin-top:0.6rem; text-align:center; }
  .mtd-how-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; }
  @media (max-width:820px){ .mtd-how-grid { grid-template-columns:1fr; } }
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
      Each event below shows every candidate the detector flags at its 10%-false-alarm
      operating point — false positives included — re-run with the current pipeline.
      Everything renders in your browser.</p>
  </header>

  <div class="mtd-controls">
    <label for="mtd-event">Event
      <select id="mtd-event" aria-label="Choose a fall event"></select>
    </label>
    <span id="mtd-badge" class="mtd-badge">…</span>
    <span id="mtd-truth-chip" class="mtd-badge" style="display:none"></span>
  </div>

  <div class="mtd-grid">
    <div>
      <div class="mtd-tabs" role="tablist">
        <button id="mtd-tab-2d" class="mtd-tab is-active" type="button" role="tab">2D map</button>
        <button id="mtd-tab-3d" class="mtd-tab" type="button" role="tab">3D view</button>
        <span id="mtd-3d-hint" class="mtd-hint" style="display:none">drag to rotate · scroll or pinch to zoom</span>
      </div>
      <div id="mtd-map" role="img" aria-label="Map of automatically detected meteorite-fall debris gates in weather radar"></div>
      <div id="mtd-3d" style="display:none" role="img" aria-label="3D view of the debris gates at their real altitudes"></div>
    </div>
    <aside class="mtd-info">
      <h2 id="mtd-title">…</h2>
      <p id="mtd-date" class="mtd-date"></p>
      <div class="mtd-facts">
        <div><span class="k">Radar</span><span class="v" id="mtd-radar">—</span></div>
        <div><span class="k">Flagged gates</span><span class="v" id="mtd-gates">—</span></div>
        <div><span class="k">Median altitude</span><span class="v" id="mtd-alt">—</span></div>
        <div><span class="k">Detector score</span><span class="v" id="mtd-conf">—</span></div>
        <div><span class="k">Threshold τ (10% FA)</span><span class="v" id="mtd-tau">—</span></div>
      </div>
      <p id="mtd-narrative" class="mtd-narrative"></p>
      <div class="mtd-legend">
        <h3>Reflectivity (dBZ)</h3>
        <div id="mtd-bar" class="mtd-bar"></div>
        <div class="mtd-bar-lab"><span id="mtd-zlo">—</span><span id="mtd-zhi">—</span></div>
        <div class="mtd-roles">
          <span><i class="mtd-dot" style="background:#33d17a;border:2px solid #eef"></i> matches ground truth (TP)</span>
          <span><i class="mtd-dot" style="background:#f6a"></i> false positive (FP)</span>
          <span><i class="mtd-dot" style="background:transparent;border:2px solid #9fb0c7"></i> missed truth (FN)</span>
        </div>
      </div>
    </aside>
  </div>

  <div class="mtd-honest">
    <strong>How to read the score.</strong> Each event's score comes from the current
    detector, trained on real <em>no-fall</em> radar windows and evaluated leave-one-event-out
    (the event's own data is never in its training set). A detection means the score clears a
    threshold set at a <strong>10% false-alarm rate</strong> on those no-fall windows
    (leave-one-out ROC AUC 0.865 against real nulls). Calibration is <strong>preliminary</strong> —
    the pre-registered held-out evaluation is still pending. Two hard cases are kept honestly:
    Hamburg's top candidate <em>is</em> the recovered debris but scores just below threshold in
    winter weather, and on the Washington coast nothing clears threshold — the real debris ranks
    second, a hair behind a rain cluster.
  </div>

  <div class="prose">
    <p><strong>What am I looking at?</strong> Each dot is a radar “gate” inside a candidate the
      detector flagged at its operating point, coloured by reflectivity. Real falls appear as an
      elongated <em>streak</em> — fragments strung out along the wind as they descend. The 3D view
      shows the same gates at their true altitudes. The radar site is marked ✳; ◆ marks the
      candidate's centroid. Rings around dots mark agreement with the manually identified truth.</p>
    <p class="mtd-note">This is a preloaded demo of precomputed results (the site is served as
      static pages; the desktop app can't run here). A live companion tool — upload a fireball,
      search the radar on demand — is planned. See the
      <a href="{{ '/detect/' | relative_url }}">MetDetect</a> and
      <a href="{{ '/research/' | relative_url }}">research</a> pages.</p>
  </div>

  <div class="mtd-how">
    <h2>How MetDetect works</h2>
    <p class="mtd-note" style="max-width:70ch">A window of raw NEXRAD Level-II radar (~10⁶ gates)
      is reduced, stage by stage, to a handful of candidate debris clusters, and a null-trained
      detector scores each against real no-fall radar behaviour.</p>
    <div class="mtd-how-grid">
      <figure>
        <img src="{{ '/assets/img/metdetect-demo/cascade.svg' | relative_url }}"
             alt="MetDetect data-reduction cascade flowchart" loading="lazy">
        <figcaption>The data-reduction cascade: radar volumes → polar cube → prefilters →
          KDE anomaly weighting → weighted clustering → physics gates → supervised pruning →
          candidates → null-trained detector.</figcaption>
      </figure>
      <div>
        <figure>
          <a href="{{ '/assets/img/research/metdetect-gui.png' | relative_url }}" data-lightbox>
            <img src="{{ '/assets/img/research/metdetect-gui.png' | relative_url }}"
                 alt="The MetDetect desktop application" loading="lazy"></a>
          <figcaption>The MetDetect desktop app — radar loading, cascade runs, and gate-level
            inspection. This page shows its outputs; the tool itself runs on the desktop.</figcaption>
        </figure>
        <figure>
          <a href="{{ '/assets/img/metdetect-demo/osceola_vertical.png' | relative_url }}" data-lightbox>
            <img src="{{ '/assets/img/metdetect-demo/osceola_vertical.png' | relative_url }}"
                 alt="Osceola fall: height vs range cross-section of the debris column" loading="lazy"></a>
          <figcaption>What the detector sees vertically: the Osceola debris column descending
            through the radar beams (diagnostic panel from the June 2026 analysis run; scores on
            this page use the current detector).</figcaption>
        </figure>
      </div>
    </div>
  </div>
</div>

<script>
  window.MTD_DATA_BASE = {{ '/assets/data/metdetect-demo/' | relative_url | jsonify }};
</script>
<script defer src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script defer src="{{ '/assets/js/metdetect-demo.js' | relative_url }}"></script>
