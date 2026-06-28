---
layout: default
title: Publications
permalink: /publications/
description: "Peer-reviewed publications of Patrick M. Shober — 28 refereed papers (14 first-author), with DOI and arXiv links."
---
<div class="container">
  <header class="page-head">
    <div class="eyebrow">Peer-reviewed work</div>
    <h1>Publications</h1>
    <p class="lede">28 refereed publications (14 first-author), including papers in
      <em>Nature Astronomy</em>, <em>Science Advances</em>, <em>A&amp;A</em>,
      <em>MNRAS</em>, <em>AJ</em>, <em>ApJ</em> and <em>MAPS</em>.</p>
    <div class="cv-toolbar">
      <a class="btn btn--primary" href="https://ui.adsabs.harvard.edu/search/q=orcid:{{ site.author.orcid }}&sort=date desc">NASA ADS profile</a>
      <a class="btn btn--ghost" href="{{ site.links.orcid }}">ORCID</a>
      <a class="btn btn--ghost" href="{{ site.links.scholar }}">Google Scholar</a>
      <a class="btn btn--ghost" href="https://arxiv.org/a/shober_p_1">arXiv</a>
    </div>
    <p class="card__meta">Each title links to the published version; <strong>DOI</strong> and
      <strong>arXiv</strong> links follow each entry. The three in-prep papers and the
      FRIPONMeter instrument paper don't have a journal DOI yet.</p>
  </header>

  {% include pub-list.html sections=site.data.publications.sections %}
</div>
