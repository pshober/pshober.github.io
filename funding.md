---
layout: default
title: Funding
description: "Competitive funding, fellowships, and scholarships won by Patrick M. Shober as Principal Investigator and scholar."
permalink: /funding/
---
<div class="container">
  <header class="page-head">
    <div class="eyebrow">Funding &amp; fellowships</div>
    <h1>Funding history</h1>
    <p class="lede">{{ site.data.funding.intro }}</p>
    <div class="cv-toolbar">
      <a class="btn btn--ghost" href="{{ '/cv/' | relative_url }}">Full CV</a>
      <a class="btn btn--ghost" href="{{ '/publications/' | relative_url }}">Publications</a>
    </div>
  </header>

  <ul class="stats" aria-label="Funding at a glance">
    <li class="stat"><span class="stat__num">€{{ site.data.metrics.funding_keuro }}k</span><span class="stat__label">competitive funding as PI</span></li>
    <li class="stat"><span class="stat__num">{{ site.data.metrics.fellowships }}</span><span class="stat__label">postdoctoral fellowships</span></li>
    {% assign award_count = 0 %}{% for sec in site.data.funding.sections %}{% assign award_count = award_count | plus: sec.entries.size %}{% endfor %}
    <li class="stat"><span class="stat__num">{{ award_count }}</span><span class="stat__label">competitive awards</span></li>
  </ul>

  {% for sec in site.data.funding.sections %}
  <section class="cv-section" style="margin-top:2.4rem">
    <h2>{{ sec.title }}</h2>
    {% for e in sec.entries %}
    <div class="cv-entry">
      <div class="cv-entry__date">{{ e.period }}</div>
      <div class="cv-entry__body">
        <div class="cv-entry__title">{{ e.title }}
          <span class="funding-amount">{{ e.amount }}</span>
          {% if e.status == 'active' %}<span class="badge">active</span>{% endif %}
        </div>
        <div class="cv-entry__sub">{{ e.funder }} · {{ e.role }}</div>
        {% if e.note %}<div class="cv-entry__note">{{ e.note }}{% if e.link %} <a href="{{ e.link | relative_url }}">Related work &rarr;</a>{% endif %}</div>{% endif %}
      </div>
    </div>
    {% endfor %}
  </section>
  {% endfor %}
</div>
