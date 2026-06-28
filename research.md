---
layout: default
title: Research
permalink: /research/
description: "Research projects — radar meteorite detection, fireball networks, and the asteroid–meteorite connection."
---
<div class="container">
  <header class="page-head">
    <div class="eyebrow">What I work on</div>
    <h1>Research</h1>
    <p class="lede">From the national weather-radar network to the asteroid belt —
      finding meteorites, reconstructing their flight, and tracing them home.</p>
  </header>

  <div class="grid grid--cards">
    {% for p in site.data.projects.projects %}
    <article class="card">
      <div class="card__kicker">{{ p.kicker }}</div>
      <h3>{{ p.name }}</h3>
      <p>{{ p.summary }}</p>
      <div class="card__meta">{{ p.period }}</div>
      {% if p.links and p.links != empty %}
      <div class="card__links">
        {% for l in p.links %}{% if l.url != "" %}<a href="{{ l.url }}">{{ l.label }} &rarr;</a>{% endif %}{% endfor %}
      </div>
      {% endif %}
    </article>
    {% endfor %}
  </div>

  <section class="section">
    <div class="section-head"><h2>Tools &amp; demos</h2></div>
    <div class="callout">
      <strong>Interactive MetDetect viewer — coming soon.</strong>
      An in-browser tool to explore automatically detected radar fall signatures
      will live at <a href="{{ '/detect/' | relative_url }}">/detect</a>. The live
      results gallery for ACM&nbsp;2026 is at
      <a href="{{ '/acm2026/' | relative_url }}">/acm2026</a>.
    </div>
  </section>
</div>
