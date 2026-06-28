---
layout: default
title: "Asteroid (33964) Patrickshober"
permalink: /asteroid/
description: "Where is asteroid (33964) Patrickshober right now? A live orbit diagram and current sky position, magnitude and constellation, computed in your browser."
---
<div class="container container--narrow">
  <header class="page-head">
    <div class="eyebrow">Named by the IAU · 2023</div>
    <h1>Asteroid (33964)&nbsp;Patrickshober</h1>
    <p class="lede">A ~2.4&nbsp;km main-belt asteroid — provisional designation
      <em>2000&nbsp;NS<sub>10</sub></em> — named after me by the International
      Astronomical Union in 2023. Here's where it is <em>right now</em>, computed in
      your browser from JPL orbital elements.</p>
  </header>

  <div class="ast-facts">
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.elements.a_au | round: 2 }}&nbsp;AU</span><span class="k">semi-major axis</span></div>
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.elements.e | round: 3 }}</span><span class="k">eccentricity</span></div>
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.elements.i_deg | round: 1 }}°</span><span class="k">inclination</span></div>
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.period_years }}&nbsp;yr</span><span class="k">orbital period</span></div>
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.diameter_km }}&nbsp;km</span><span class="k">diameter</span></div>
    <div class="ast-fact"><span class="v">{{ site.data.asteroid.H }}</span><span class="k">abs. magnitude (H)</span></div>
  </div>

  <div class="ast-grid">
    <div class="ast-canvas-wrap">
      <canvas id="orbit" width="600" height="600" role="img"
        aria-label="Top-down diagram of the orbit of asteroid 33964 Patrickshober relative to Earth, Mars and Jupiter"></canvas>
    </div>
    <div class="ast-now">
      <h2>Right now</h2>
      <dl>
        <dt>Right ascension</dt><dd id="ast-ra">…</dd>
        <dt>Declination</dt><dd id="ast-dec">…</dd>
        <dt>Constellation</dt><dd id="ast-cons">…</dd>
        <dt>Distance from Earth</dt><dd id="ast-dist">…</dd>
        <dt>Apparent magnitude</dt><dd id="ast-mag">…</dd>
      </dl>
      <p class="ast-now-look" style="margin:1rem 0 0.6rem; color:var(--muted); font-size:0.92rem">
        <span id="ast-look">Far too faint for the naked eye — a telescope's needed.</span>
      </p>
      <button id="ast-locate" class="btn btn--ghost" type="button">Use my location</button>
    </div>
  </div>

  <div class="prose" style="margin-top:2rem">
    <p>The orbit and physical data come from NASA/JPL's
      <a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=33964">Small-Body
      Database</a>; the live sky position, distance and magnitude above are propagated
      and projected in your browser (no servers involved), so they update as you watch.
      Want the full 3D view? Explore it in
      <a href="https://eyes.nasa.gov/apps/asteroids/">NASA's Eyes on Asteroids</a>.</p>
    <p style="color:var(--faint);font-size:0.9rem">Discovered in 2000; named in 2023
      following the Asteroids, Comets, Meteors conference, in recognition of
      contributions to planetary science and small-body research.</p>
  </div>
</div>

<script>
  window.ASTEROID = {{ site.data.asteroid | jsonify }};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/astronomy-engine@2/astronomy.browser.min.js"></script>
<script defer src="{{ '/assets/js/asteroid.js' | relative_url }}"></script>
