---
layout: default
title: Research
permalink: /research/
description: "Research interests of Patrick M. Shober — planetary defense, sensor fusion, meteorite recovery, small-body dynamics, and the perihelion filtering of the meteorite record."
---
<div class="container">
  <header class="page-head">
    <div class="eyebrow">What I work on</div>
    <h1>Research</h1>
    <p class="lede">I study how small bodies deliver matter and information to Earth —
      connecting telescopic surveys, the fireballs that wide-field camera networks
      catch, and the meteorites we analyse in the lab. The throughline: <em>what
      reaches the ground is a strongly filtered sample of what's actually out there.</em></p>
    <div class="hero__topics" style="margin-top:1.2rem">
      {% for t in site.data.research.interests %}<span class="pill">{{ t }}</span>{% endfor %}
    </div>
  </header>

  <div class="grid grid--cards">
    {% for d in site.data.research.deep_dives %}
    <article class="card">
      <div class="card__kicker">{{ d.kicker }}</div>
      <h3>{{ d.title }}</h3>
      <p>{{ d.blurb }}</p>
      <div class="card__links"><a href="{{ d.link | relative_url }}">Read more &rarr;</a></div>
    </article>
    {% endfor %}
  </div>

  <section class="section">
    <div class="section-head"><h2>Tools &amp; demos</h2></div>
    <div class="callout">
      <strong>MetDetect</strong> — live detection results for the ACM&nbsp;2026 poster are at
      <a href="{{ '/acm2026/' | relative_url }}">/acm2026</a>; an interactive in-browser
      viewer is planned at <a href="{{ '/detect/' | relative_url }}">/detect</a>. And for
      fun, see where my namesake asteroid is right now at
      <a href="{{ '/asteroid/' | relative_url }}">/asteroid</a>.
    </div>
  </section>
</div>
