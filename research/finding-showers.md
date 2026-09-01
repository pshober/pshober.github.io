---
layout: research
title: "Finding meteor showers that aren't there"
permalink: /research/finding-showers/
eyebrow: "Methods · How the search actually works"
lede: "Any big enough pile of orbits contains clumps. The hard part isn't finding a clump — it's proving one isn't a coincidence. Here's the machinery, and the shower it turned up."
description: "A plain-language guide to searching for faint meteor showers and asteroid pairs: similarity criteria, kernel-density background models, cumulative similarity distributions, and localized pair-excess maps — with four interactive tools built on the real data."
papers:
  - title: "Asteroidal activity among meteor datasets: confirmed new 'rock-comet' stream and search for a tidal-disruption signature"
    venue: "The Astrophysical Journal, 1000, 254 (2026)"
    doi: "10.3847/1538-4357/ae4bde"
  - title: "Determining the statistical significance of meteorite–asteroid pairs using geocentric parameters"
    venue: "Astronomy & Astrophysics, 702, A36 (2025)"
    doi: "10.1051/0004-6361/202555857"
  - title: "Near-Earth stream decoherence revisited: the limits of orbital similarity"
    venue: "Astronomy & Astrophysics, 693, A23 (2025)"
    doi: "10.1051/0004-6361/202452123"
  - title: "A generalizable method for estimating meteor shower false positives"
    venue: "Astronomy & Astrophysics, 686, A130 (2024)"
    doi: "10.1051/0004-6361/202349024"
---

<style>
.fs-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:1.1rem 1.15rem 1.25rem;margin:2rem 0}
.fs-box h3{margin:0 0 .2rem;font-size:1.05rem;color:var(--accent-2);
  font-family:Righteous,system-ui,sans-serif;font-weight:400;letter-spacing:.02em}
.fs-box .fs-kicker{color:var(--faint);font-size:.82rem;margin:0 0 .9rem}
.fs-canvas-wrap{position:relative;background:var(--plate);border:1px solid var(--border);
  border-radius:10px;overflow:hidden}
.fs-box canvas{display:block;width:100%;height:340px;outline:none}
.fs-box canvas:focus-visible{outline:2px solid var(--accent-2);outline-offset:-2px}
.fs-busy{position:absolute;inset:auto .6rem .5rem auto;font-size:.75rem;color:var(--faint);
  background:rgba(20,0,31,.85);padding:.15rem .5rem;border-radius:6px}
.fs-ctrls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
  gap:.7rem 1.1rem;margin:.9rem 0 .2rem}
.fs-ctrl{display:flex;flex-direction:column;gap:.25rem;font-size:.83rem;color:var(--muted)}
.fs-ctrl b{color:var(--text);font-weight:700}
.fs-ctrl input[type=range]{width:100%;accent-color:var(--accent)}
.fs-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.8rem 0 0}
.fs-chip,.fs-btn{font:inherit;font-size:.82rem;cursor:pointer;border-radius:999px;
  padding:.35rem .85rem;background:transparent;color:var(--text);
  border:1px solid var(--border-strong);transition:border-color .15s,color .15s}
.fs-chip:hover,.fs-btn:hover{border-color:var(--accent);color:var(--accent-2)}
.fs-chip.is-on{border-color:var(--accent);color:var(--accent-ink);background:var(--accent-2)}
.fs-hint{color:var(--faint);font-size:.78rem;margin:.55rem 0 0}
.fs-readout{margin:.85rem 0 0;font-size:.88rem;color:var(--muted)}
.fs-readout b{color:var(--text)}
.fs-verdict{margin:.7rem 0 0;font-size:.9rem;color:var(--muted);border-left:3px solid var(--border-strong);
  padding-left:.7rem}
.fs-verdict.is-hit{border-left-color:var(--accent-2);color:var(--text)}
.fs-verdict.is-sourced{border-left-color:var(--accent-2);color:var(--text)}
.fs-verdict a{color:var(--accent)}
.callout ol{margin:.5rem 0 .6rem;padding-left:1.3rem}
.callout li{margin-bottom:.3rem}
.fs-verdict.is-warn{border-left-color:var(--accent)}
.fs-tag{font-size:.72rem;border:1px solid var(--border-strong);border-radius:999px;
  padding:.1rem .5rem;color:var(--faint)}
.fs-tag.is-hit{border-color:var(--accent-2);color:var(--accent-2)}
.fs-legend{display:flex;flex-wrap:wrap;gap:.9rem;margin:.7rem 0 0;font-size:.78rem;color:var(--faint)}
.fs-legend span::before{content:"";display:inline-block;width:11px;height:11px;border-radius:3px;
  margin-right:.35rem;vertical-align:-1px;background:currentColor}
.fs-modes{display:flex;flex-wrap:wrap;gap:.9rem;font-size:.83rem;color:var(--muted)}
.fs-modes label{display:flex;align-items:center;gap:.3rem;cursor:pointer}
.fs-modes input{accent-color:var(--accent)}
.fs-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem}
.fs-calc-in{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem}
.fs-calc-in label{display:flex;flex-direction:column;gap:.15rem;font-size:.74rem;color:var(--faint)}
.fs-calc-in label span{white-space:nowrap}
.fs-calc-in input{width:100%;font:inherit;font-size:.82rem;padding:.3rem .4rem;border-radius:6px;
  background:var(--plate);border:1px solid var(--border);color:var(--text)}
.fs-calc-in input:focus{outline:2px solid var(--accent);outline-offset:-1px}
.fs-dgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.7rem;margin:1rem 0 0}
.fs-dcell{background:var(--plate);border:1px solid var(--border);border-radius:10px;padding:.6rem .7rem}
.fs-dcell .fs-dname{font-size:.76rem;color:var(--faint)}
.fs-dval{font-size:1.25rem;font-family:Righteous,system-ui,sans-serif;color:var(--muted)}
.fs-dval.is-hit{color:var(--accent-2)}
.fs-side-label{font-size:.8rem;color:var(--accent-2);margin:0 0 .1rem}
.fs-side-note{font-size:.74rem;color:var(--faint);margin:0 0 .45rem;min-height:1.1em}
.fig video{width:100%;height:auto;display:block;border-radius:var(--radius);
  border:1px solid var(--border);background:var(--plate)}
.fs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:620px){
  .fs-grid2{grid-template-columns:1fr}
  .fs-calc-in{grid-template-columns:repeat(2,1fr)}
  .fs-box canvas{height:290px}
}
</style>

## A haystack made entirely of needles

A **meteoroid stream** is a family: fragments shed by one parent body, still traveling
close enough together that Earth plows through them on the same date each year. Find
a family, and you have found something real about how asteroids and comets fall apart.

The trouble is that a catalog of a few hundred thousand meteor orbits contains
clumps everywhere, and almost all of them are accidents. In the four-network sample I
used for the 2026 paper — **235,271 meteors** from the Global Meteor Network, CAMS,
EDMOND and SonotaCo — GMN alone contributes 122,943 orbits. That is
[more than 10⁹ unique pairs](https://doi.org/10.3847/1538-4357/ae4bde), so, as I put it
there, *"even a small random-pair probability at D ∼ 0.05 produces a few hundred
thousand false positives."*

So the interesting question is never *are these two orbits similar?* It is **how much
similarity should I have expected anyway?** Everything below is machinery for answering
that second question.

## Step 1 — Put a number on "alike"

Orbital similarity is measured with a **D-criterion**: a distance-like function that is
zero for identical orbits and grows as they diverge. It's a *dis*similarity, so smaller
means more alike.

There are several, and they disagree. [Southworth & Hawkins
(1963)](https://ui.adsabs.harvard.edu/abs/1963SCoA....7..261S) built the original
*D*<sub>SH</sub> out of perihelion distance, eccentricity, and two angles.
[Drummond (1981)](https://doi.org/10.1016/0019-1035%2881%2990020-8) rebalanced the terms as
ratios. [Jopek (1993)](https://doi.org/10.1006/icar.1993.1195) split the difference. And
[Valsecchi, Jopek & Froeschlé (1999)](https://doi.org/10.1046/j.1365-8711.1999.02264.x)
did something smarter: their *D*<sub>N</sub> ignores orbital elements altogether and compares
four quantities you measure *directly* — the encounter speed, two angles describing the
direction the meteor came from, and the date. That matters, because orbital elements
drift over thousands of years while the encounter geometry does not.

<div class="fs-box">
  <h3>Are these two meteors related?</h3>
  <p class="fs-kicker">Four criteria, the same pair, real orbits. Edit any number &mdash; then read the verdict line, because the numbers alone don't carry one.</p>
  <div class="fs-row" id="fs-calc-presets"></div>
  <p class="fs-hint" id="fs-calc-blurb"></p>
  <div class="fs-grid2" style="margin-top:.7rem">
    <div>
      <p class="fs-side-label" id="fs-calc-a-label">Object A</p>
      <p class="fs-side-note" id="fs-calc-a-note"></p>
      <div class="fs-calc-in">
        <label><span>q (au)</span><input type="number" step="0.001" id="fs-calc-a-q"></label>
        <label><span>e</span><input type="number" step="0.001" id="fs-calc-a-e"></label>
        <label><span>i (°)</span><input type="number" step="0.01" id="fs-calc-a-i"></label>
        <label><span>ω (°)</span><input type="number" step="0.01" id="fs-calc-a-w"></label>
        <label><span>Ω (°)</span><input type="number" step="0.01" id="fs-calc-a-O"></label>
        <label><span>λ<sub>☉</sub> (°)</span><input type="number" step="0.01" id="fs-calc-a-sol"></label>
        <label><span>RA (°)</span><input type="number" step="0.01" id="fs-calc-a-ra"></label>
        <label><span>Dec (°)</span><input type="number" step="0.01" id="fs-calc-a-dec"></label>
        <label><span>V<sub>g</sub> (km/s)</span><input type="number" step="0.01" id="fs-calc-a-vg"></label>
      </div>
    </div>
    <div>
      <p class="fs-side-label" id="fs-calc-b-label">Object B</p>
      <p class="fs-side-note" id="fs-calc-b-note"></p>
      <div class="fs-calc-in">
        <label><span>q (au)</span><input type="number" step="0.001" id="fs-calc-b-q"></label>
        <label><span>e</span><input type="number" step="0.001" id="fs-calc-b-e"></label>
        <label><span>i (°)</span><input type="number" step="0.01" id="fs-calc-b-i"></label>
        <label><span>ω (°)</span><input type="number" step="0.01" id="fs-calc-b-w"></label>
        <label><span>Ω (°)</span><input type="number" step="0.01" id="fs-calc-b-O"></label>
        <label><span>λ<sub>☉</sub> (°)</span><input type="number" step="0.01" id="fs-calc-b-sol"></label>
        <label><span>RA (°)</span><input type="number" step="0.01" id="fs-calc-b-ra"></label>
        <label><span>Dec (°)</span><input type="number" step="0.01" id="fs-calc-b-dec"></label>
        <label><span>V<sub>g</sub> (km/s)</span><input type="number" step="0.01" id="fs-calc-b-vg"></label>
      </div>
    </div>
  </div>
  <div class="fs-dgrid">
    <div class="fs-dcell"><div class="fs-dname">D<sub>N</sub> · geocentric</div>
      <div class="fs-dval" id="fs-calc-D_N">—</div>
</div>
    <div class="fs-dcell"><div class="fs-dname">D<sub>SH</sub> · Southworth–Hawkins</div>
      <div class="fs-dval" id="fs-calc-D_SH">—</div>
</div>
    <div class="fs-dcell"><div class="fs-dname">D′ · Drummond</div>
      <div class="fs-dval" id="fs-calc-D_prime">—</div>
</div>
    <div class="fs-dcell"><div class="fs-dname">D<sub>H</sub> · Jopek</div>
      <div class="fs-dval" id="fs-calc-D_H">—</div>
</div>
  </div>
  <p class="fs-verdict" id="fs-calc-verdict"></p>
  <p class="fs-hint">Smaller means more alike. There is deliberately no "match" light: a D value has
    no threshold of its own, and the presets are chosen to show why. The code is a line-by-line port
    of the analysis code used in the papers &mdash; see the
    <a href="#printed-equations">note on the printed equations</a>.</p>
  <p class="fs-sr" id="fs-calc-summary" role="status"></p>
  <p class="fs-hint" id="fs-calc-note" hidden></p>
</div>

Try the Příbram–Neuschwanstein preset. Two meteorites fell 43 years apart, and the
meteoroids that delivered them were on orbits so alike that the pair was taken for years as
proof of a macroscopic meteoroid stream. Look at the four numbers, then switch back to the
two M2026-A1 members: they are the same size. One of those pairs sits inside a stream
detected at 5.3σ; the other is a coincidence. **Nothing in the D values distinguishes
them.** The verdict came from somewhere else entirely, and the rest of this page is about
where.

<div class="callout">
  <p><strong>A low D value is not evidence.</strong> To know whether a pair means anything you
  need three things the D value does not contain:</p>
  <ol>
    <li>how many objects are in the population the pair came from &mdash; and so how many pairs you
      implicitly compared;</li>
    <li>how many of those pairs chance alone would put at or below this D &mdash; for a criterion built
      from <em>d</em> measured quantities that number grows as <em>D<sup>d</sup></em>, so the
      background is a power law;</li>
    <li>whether the number you actually count sits significantly above that.</li>
  </ol>
  <p>Steps 2 to 6 below are those three things. A tiny D on its own &mdash; for any pair, from any
  catalog &mdash; establishes nothing. This is the mistake behind a great many published
  meteorite&ndash;asteroid "associations."</p>
</div>

## Step 2 — Remember how many pairs you looked at

The reason a low D value is weak evidence is combinatorial. A set of *n* objects contains
*n*(*n*&nbsp;−&nbsp;1)/2 pairs, and that grows as the square. This is the **birthday paradox**, and
[Pauls & Gladman (2005)](https://doi.org/10.1111/j.1945-5100.2005.tb00186.x) pointed it at
meteoroid orbits two decades ago: the intuition that fails is asking "what are the odds
*this* pair matches?" instead of "what are the odds *some* pair matches?"

<div class="fs-box">
  <h3>How many chances did you give yourself?</h3>
  <p class="fs-kicker">Every pair is another lottery ticket &mdash; and only the catalog can tell you the odds.</p>
  <div class="fs-ctrls">
    <label class="fs-ctrl">Objects in the catalog: <b id="fs-pairs-n-v">824</b>
      <input type="range" id="fs-pairs-n" min="1.3" max="5.3" step="0.001" value="2.916">
      <span class="fs-hint" id="fs-pairs-mark"></span></label>
    <label class="fs-ctrl">Rate at which chance alone puts a pair under your D cut: <b id="fs-pairs-p-v"></b>
      <input type="range" id="fs-pairs-p" min="3" max="9" step="0.01" value="6.734">
      <span class="fs-hint" id="fs-pairs-pmark"></span></label>
  </div>
  <p class="fs-readout">Possible pairs: <b id="fs-pairs-out">—</b> ·
    expected under the cut from chance alone: <b id="fs-pairs-fp">—</b></p>
  <p class="fs-hint">"Alike" only ever means <em>below whatever D cut you chose</em>. Neither number
    here is a property of the criterion: the left comes from how many objects you have, and the right
    has to be measured from that same catalog's own null. The slider starts at a real one &mdash; the
    2026 null predicts about 1,395 chance pairs below <em>D</em><sub>N</sub> = 0.015 among GMN's
    7.6 billion, or 1 in 5.4 million. Against that, 2,209 were actually observed.</p>
  <p class="fs-sr" id="fs-pairs-summary" role="status"></p>
</div>

That second number is where the reasoning usually breaks. **There is no universal rate at
which unrelated orbits land close together.** It is a property of the catalog, not of the
criterion. A survey's observational biases set it: which part of the sky its cameras watch,
what they are sensitive enough to catch, which hours and seasons they run, how precisely
they measure speed. Those biases pile orbits up in some regions of the space and empty out
others, and that lumpiness is exactly what decides how often two unrelated objects fall
close together. You cannot look the number up, and you cannot borrow it from a different
survey — which is what the next step is really about.

And a real cluster is not obvious to the eye. Below are 6,000 sporadic meteors from the
same shower-removed GMN catalog I analyzed, plotted by perihelion distance against
inclination. The 282 members of the stream I'll come to are hidden in there. Have a go
at finding them.

<div class="fs-box">
  <h3>Spot the stream</h3>
  <p class="fs-kicker">Click where you think the family is, then reveal it.</p>
  <div class="fs-canvas-wrap">
    <canvas id="fs-hay-canvas" role="img" tabindex="0"
      aria-label="Scatter plot of 6,000 sporadic meteors by perihelion distance and inclination, with 282 stream members hidden among them"></canvas>
  </div>
  <div class="fs-row">
    <button type="button" class="fs-btn" id="fs-hay-reveal">Reveal the stream</button>
    <span class="fs-hint" id="fs-hay-msg">Click anywhere on the chart to guess.</span>
  </div>
  <p class="fs-sr" id="fs-hay-summary" role="status"></p>
  <p class="fs-hint" id="fs-hay-note" hidden></p>
</div>

## Step 3 — Build the background you're testing against

To know whether a clump is surprising, you need a model of an unsurprising sky: a
**sporadic background**. The naive move is to scramble one coordinate — randomize the
date of each encounter and see how many matches survive. It's better than nothing, but
it assumes a uniform distribution that real sporadic meteors simply don't have. Weather,
camera coverage, seasons and resonances all leave their fingerprints.

The approach I use instead is **kernel density estimation**. Put a smooth bump on every
observed meteor, add them up, and you have a continuous probability density that keeps
the real correlations between speed, direction and date but smears out any small clumps.
Draw synthetic catalogs from that density and you have a fair null: a sky with the
same lumpy observational biases as the real one, but with no streams in it by
construction.

The word *same* is carrying real weight there. **The null has to be built from the very
dataset you are testing.** Fit the density to the catalog in hand, draw synthetic catalogs
from it, and its biases come along for the ride — which is the point, because the question
you are asking is whether *this* catalog holds more close pairs than *this* catalog should.
Borrow a null from a different survey, even a larger and more precise one, and you have
imported that survey's biases instead of your own: the synthetic population concentrates
differently, its cumulative similarity curve sits at a different level, and any excess you
measure against it is meaningless. That mistake can manufacture a detection as easily as it
can erase one.

<figure class="fig" data-lightbox data-full="/assets/img/research/fs-radiant-kde-on.webp" data-cap="The same radiant field with the density estimate on (left) and off (right). The KDE is what turns a scatter of points into a background you can sample from.">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
    <img src="/assets/img/research/fs-radiant-kde-on.webp" alt="Sky chart of the stream's radiant with a smooth kernel density estimate drawn as filled contours over the individual meteor radiants" loading="lazy" width="1200" height="1200" style="border-radius:10px">
    <img src="/assets/img/research/fs-radiant-kde-off.webp" alt="The same sky chart with the density contours removed, leaving only the individual meteors" loading="lazy" width="1200" height="1200" style="border-radius:10px">
  </div>
  <figcaption>Density estimate on, and off. The smoothing is the whole game: too little and
  noise becomes signal, too much and real structure dissolves. <span class="muted">Figure: P.&nbsp;Shober.</span></figcaption>
</figure>

How much to smooth is the one genuinely delicate choice. Too narrow a kernel and the
background inherits the very clumps you're testing; too wide and it flattens real
structure and makes everything look significant. In the 2024 paper I picked the width by
cross-validation; by 2025–26 the machinery had moved to a per-dimension bandwidth chosen
with the improved Sheather–Jones estimator, with the cyclic angles embedded as
sine–cosine pairs so that 359° and 1° are neighbors rather than opposites.

## Step 4 — Decide how loose is too loose

Once you can generate fake skies, you can ask the question that actually matters: at a
given D threshold, what fraction of "matches" are coincidences? That's the whole point of
[A&A 686, A130](https://doi.org/10.1051/0004-6361/202349024). For one specific question —
*which of 824 European Fireball Network fireballs belong to an established meteor shower?* —
the thresholds that keep false positives under 5% are:

| Criterion | Threshold for <5% false positives |
|---|---|
| *D*<sub>N</sub> (Valsecchi) | ≈ 0.15 |
| *D*<sub>H</sub> (Jopek) | ≈ 0.10 |
| *D*<sub>SH</sub> (Southworth–Hawkins) | ≈ 0.07 |
| *D*&prime; (Drummond) | < 0.05 |

**Those numbers belong to that dataset and that question, and nowhere else.** They describe
fireballs matched against known, dense showers, in a catalog of one particular size and
density. Change any of that — compare meteorites with asteroids, or fireballs with each
other, or use a catalog ten times larger — and the false-positive rate at a given D is a
different number, and the only way to learn it is to run the null test again on *that*
population. There is no universal threshold, and a D value quoted without its population
is not a result.

Within the EFN question, traditionally people used *D*<sub>SH</sub> &lt; 0.2. That is far too
generous. Applying the strict version, the genuinely shower-associated fraction converges to
**150–200 fireballs, about 18–25%** — against the up-to-45% previously attributed.

There's a sting in the tail, and it's worth quoting directly: *"the meteors that meet the
limiting requirement, irregardless of how low, could be spurious."* Between 6 and 11% of
fireballs with *D*<sub>N</sub> &lt; 0.2 are false positives — **and they are not the ones with the
largest D values**. You can never point at an individual pair and call it clean. You can
only ever quantify the proportion.

## Step 5 — Look at the whole population at once

Here is the move that makes weak streams detectable. Instead of judging pairs one at a
time, count *all* of them: plot the number of pairs closer than D, against D, on log–log
axes. This is the **cumulative similarity distribution**.

For a population with no streams in it, this curve is a straight line. That isn't a
convenient approximation — it's geometry. Random points in *d* dimensions give
*N*(&lt;*D*) &prop; *D*<sup>*d*</sup>, so *D*<sub>N</sub>, built from four measured quantities, should give a
slope near 4. Measured across six radiant catalogs in
[A&A 702, A36](https://doi.org/10.1051/0004-6361/202555857), the observed slopes are
3.75–3.88 with uncertainties of 0.21–0.30 — consistent with 4, as expected for pure
chance.

A real stream breaks the line. It adds a population of very-low-D pairs that chance
cannot supply, so the curve kinks upward at the small-D end. **You are looking for a bend,
not a number.**

<div class="fs-box">
  <h3>Plant a stream and watch the line bend</h3>
  <p class="fs-kicker">Synthetic sporadic sky, real D<sub>N</sub> code, every pair counted.</p>
  <div class="fs-canvas-wrap">
    <canvas id="fs-csd-canvas" role="img"
      aria-label="Log-log plot of the number of meteor pairs closer than a given dissimilarity, against that dissimilarity"></canvas>
    <span class="fs-busy" id="fs-csd-busy" hidden>computing…</span>
  </div>
  <div class="fs-legend">
    <span style="color:#ffc532">observed</span>
    <span style="color:#b044fc">3σ range from chance alone</span>
  </div>
  <div class="fs-ctrls">
    <label class="fs-ctrl">Meteors in the catalog: <b id="fs-csd-m-v">250</b>
      <input type="range" id="fs-csd-m" min="120" max="420" step="10" value="250"></label>
    <label class="fs-ctrl">Planted stream members: <b id="fs-csd-k-v">0</b>
      <input type="range" id="fs-csd-k" min="0" max="60" step="1" value="0"></label>
    <label class="fs-ctrl">Measurement error: <b id="fs-csd-err-v">none</b>
      <input type="range" id="fs-csd-err" min="0" max="100" step="5" value="0"></label>
  </div>
  <p class="fs-readout">Small-D slope — observed <b id="fs-csd-slope">—</b> ·
    chance alone <b id="fs-csd-slope-null">—</b>
    <span class="fs-hint">Four dimensions predict 4; chance lands just under it, as the real
    catalogs do. Note the scatter — a few hundred meteors cannot pin this slope down, which is
    exactly why the test is the <em>shape</em> of the curve against the envelope, not a number.</span></p>
  <p class="fs-verdict" id="fs-csd-verdict"></p>
  <div class="fs-row"><button type="button" class="fs-btn" id="fs-csd-reset">Reset</button></div>
  <p class="fs-hint">Start with no stream: a straight line. Add members and a kink appears at
    the left-hand end. Now turn up the measurement error and watch the kink dissolve — that is
    why fireball orbits, which are far less precise than asteroid orbits, hide streams so well.</p>
  <p class="fs-sr" id="fs-csd-summary" role="status"></p>
  <p class="fs-hint" id="fs-csd-note"></p>
</div>

The real thing looks like this. In GMN, the observed curve pulls away from the chance
envelope below *D*<sub>N</sub> &asymp; 2&nbsp;&times;&nbsp;10<sup>&minus;2</sup> and — crucially — stays above the band even
once the reported measurement uncertainties are folded in. Of the four networks, GMN is
the only one where the excess survives that test.

<figure class="fig" data-lightbox data-full="/assets/img/research/fs-csd-gmn.webp" data-cap="Cumulative similarity distribution for 122,943 GMN meteors. The black observed curve rises above both the KDE chance envelope (blue) and the measurement-uncertainty band (orange) at small D.">
  <img src="/assets/img/research/fs-csd-gmn.webp" alt="Log-log plot of cumulative pair counts against the D-N dissimilarity for GMN meteors. The observed black curve lies above the blue chance envelope and the orange uncertainty band below D-N of about 0.02." loading="lazy" width="1400" height="980">
  <figcaption>The same plot as the widget above, on 122,943 real meteors. <span class="muted">Figure: Shober 2026, ApJ 1000, 254 (CC&nbsp;BY).</span></figcaption>
</figure>

## Step 6 — Find out *where* the excess is

A bend in the cumulative curve tells you a surplus exists somewhere; it doesn't say
where. So the next step splits the sky into cells — encounter speed on one axis, date on
the other — and asks, cell by cell, how many close pairs it holds against how many the
null predicts. Each cell gets a z-score. Flag anything above 3σ.

Then comes the correction that most claimed detections skip. Scanning 400 cells means
taking 400 chances, so a 3σ local result is not a 3σ result. The **Dunn–Šidák**
adjustment converts a local p-value to a global one, *p*<sub>global</sub> = 1 &minus; (1 &minus; *p*<sub>local</sub>)<sup>*m*</sup>,
and it is brutal. Drag the slider below and watch a detection lose most of a sigma.

<div class="fs-box">
  <h3>The real pair-excess map</h3>
  <p class="fs-kicker">400 cells, 122,943 GMN meteors, D<sub>N</sub> &lt; 0.015. Actual published values.</p>
  <div class="fs-canvas-wrap">
    <canvas id="fs-grid-canvas" role="img"
      aria-label="Heat map of meteor pair counts across a 20 by 20 grid of geocentric speed against solar longitude"></canvas>
  </div>
  <div class="fs-modes" style="margin-top:.8rem">
    <label><input type="radio" name="fs-grid-mode" value="z" checked> z-score</label>
    <label><input type="radio" name="fs-grid-mode" value="obs"> observed pairs</label>
    <label><input type="radio" name="fs-grid-mode" value="mu"> predicted by chance</label>
  </div>
  <div class="fs-ctrls">
    <label class="fs-ctrl">Detection threshold: <b><span id="fs-grid-k-v">3</span>σ</b>
      <input type="range" id="fs-grid-k" min="1" max="6" step="0.5" value="3">
      <span class="fs-hint">cells above it: <b id="fs-grid-count">—</b></span></label>
    <label class="fs-ctrl">Cells searched: <b id="fs-grid-m-v">400</b>
      <input type="range" id="fs-grid-m" min="1" max="800" step="1" value="400">
      <span class="fs-hint">the look-elsewhere penalty</span></label>
  </div>
  <p class="fs-readout" id="fs-grid-info"></p>
  <p class="fs-readout">Strongest cell: local p = <b id="fs-grid-plocal">—</b> →
    after correction <b id="fs-grid-pglobal">—</b> = <b id="fs-grid-sigma">—</b></p>
  <p class="fs-hint">Click any cell. The published result is the cell this opens on:
    135 observed pairs against 38.9 expected, z = 6.32, which survives the 400-cell
    correction as a 5.3σ detection.</p>
  <p class="fs-sr" id="fs-grid-summary" role="status"></p>
  <p class="fs-hint" id="fs-grid-note" hidden></p>
</div>

<figure class="fig" data-lightbox data-full="/assets/img/research/fs-usol-surface.webp" data-cap="The same 400 cells as a surface: observed pair counts (solid) against the null mean plus 3 sigma (wireframe). The one tall spike is the detection.">
  <img src="/assets/img/research/fs-usol-surface.webp" alt="Three-dimensional surface plot of pair counts per cell over geocentric speed and solar longitude. A single narrow spike rises far above the surrounding wireframe surface that marks the chance threshold." loading="lazy" width="1400" height="1180">
  <figcaption>The same grid drawn as a surface: the wireframe is what chance allows, the solid
  surface is what was seen. One spike clears it by a mile. <span class="muted">Figure: P.&nbsp;Shober.</span></figcaption>
</figure>

Project the meteors from the significant cells back into orbital space and the surplus
resolves into one bright spot at low perihelion and low inclination.

<figure class="fig" data-lightbox data-full="/assets/img/research/fs-qi-excess.webp" data-cap="Meteors from statistically significant pair-excess cells, reprojected into perihelion distance against inclination. The bright cell near q = 0.25 au is the new stream.">
  <img src="/assets/img/research/fs-qi-excess.webp" alt="Heat map of perihelion distance against inclination. One bright yellow cell sits at perihelion 0.2 to 0.3 astronomical units and inclination below 18 degrees; fainter cells appear near perihelion 0.9 to 1.0 astronomical units." loading="lazy" width="1200" height="914">
  <figcaption>Where the surplus lives. The bright cell is M2026-A1; the faint cells near
  q&nbsp;≈&nbsp;1&nbsp;au are the tidal-disruption candidates that <em>didn't</em> hold up.
  <span class="muted">Figure: Shober 2026, ApJ 1000, 254 (CC&nbsp;BY).</span></figcaption>
</figure>

## Step 7 — Pull the members out

Only now, with a localized and globally corrected detection in hand, is it safe to
cluster. Running **DBSCAN** in *D*<sub>N</sub> space with ε = 0.03 and a minimum of two members
yields a connected group of **282 meteors** — 243 from GMN, 19 from SonotaCo, 10 from
CAMS, 10 from EDMOND. Four independent networks, built and run by different
teams, seeing the same thing.

<figure class="fig" data-lightbox data-full="/assets/img/research/fs-radiant-chart.webp" data-cap="The 282 members plotted on the sky: a coherent radiant in the Virginid region, with the density estimate showing the core.">
  <img src="/assets/img/research/fs-radiant-chart.webp" alt="Sky chart centered on the shower radiant showing 282 individual meteor radiants in cyan, a smooth density core, stylised meteor streaks, and constellation figures for Virgo, Corvus, Libra and Centaurus." loading="lazy" width="1499" height="1500">
  <figcaption>The radiant of M2026-A1, in the Virginid region — a coherent point of origin
  on the sky, which is what a real stream looks like once you have its members.
  <span class="muted">Figure: P.&nbsp;Shober.</span></figcaption>
</figure>

## What it turned out to be

The cluster is a **new meteor shower**, now on the IAU Meteor Data Center working list as
**M2026-A1**. Activity had been submitted once before, as candidate shower *87 Virginids*
(IAU #01185, code ESV), and subsequently removed; this is the first time its statistical
significance has been established.

Its orbit is the interesting part. Median values across the 282 members:
**q = 0.22 ± 0.01 au**, a = 1.29 ± 0.10 au, e = 0.83 ± 0.02, i = 12.3 ± 1.8°, and a
Tisserand parameter of 4.6 ± 0.3. *(Those ± figures are the spread of the members, not
error bars on the mean.)* A Tisserand parameter that high means **asteroidal**, not
cometary — there is no ice here to drive activity. And yet a perihelion of 0.22 au brings
the parent closer to the Sun than Mercury ever gets.

<figure class="fig">
  <video autoplay muted loop playsinline preload="none" width="1280" height="720"
    poster="/assets/img/research/stream-threepanel-poster.webp"
    aria-label="Animation of the M2026-A1 meteoroid stream seen from three angles — top-down, side-on and edge-on — as it sweeps through the inner solar system">
    <source src="/assets/video/stream-threepanel.mp4" type="video/mp4">
  </video>
  <figcaption>M2026-A1 from three angles. The side and edge views are stretched four times
  vertically so the stream's tilt reads; gold is the measured meteoroid orbits, cyan a
  representative stream. <span class="muted">Animation: P.&nbsp;Shober.</span></figcaption>
</figure>

That combination is what's known as a **rock comet**: a body shedding debris through
thermal fracture, dehydration cracking and mineral breakdown near the Sun rather than
through sublimating ice. (3200) Phaethon and the Geminids are the archetype. The
meteoroids' measured strength fits — weaker than Geminids, sturdier than cometary
material — consistent with a recent, thermally driven, near-Sun degradation pathway.

**No parent body has been identified.** It may have faded, fragmented, or come apart
entirely, leaving the debris as the only evidence it was ever there. NASA's NEO Surveyor,
which is built to see exactly this kind of small, dark, low-perihelion object, is the
obvious place to look next.

## The results that were nothing

Most of this work returns nulls, and they matter just as much.

The same machinery, pointed at the question of whether asteroids **tidally disrupted**
during close passes of Earth leave detectable debris families, finds nothing convincing.
At most 53 meteors out of 235,271 could plausibly be attributed to such an event — an
upper limit of ~2.3 × 10⁻⁴ — and they don't cluster coherently. The long-term signature
in the perihelion distribution that would confirm it is simply absent. *"Some process is
erasing or overwhelming the signal."*

Likewise, dozens of published claims linking specific meteorites to specific near-Earth
asteroids do not survive the null test. Across 46 recovered falls and 535 candidate
meteorite-dropping fireballs compared against six independent asteroid radiant
catalogs, [A&A 702, A36](https://doi.org/10.1051/0004-6361/202555857) finds no excess
at all: if meteorite streams exist, they account for **less than about 0.1%** of falls.

They don't cluster among *themselves*, either. In
[A&A 693, A23](https://doi.org/10.1051/0004-6361/202452123), 50 recovered falls, 616
probable meteorite-dropping fireballs, and 310 US Government sensor impacts all show pair
counts entirely consistent with random association — no statistically significant stream
in any of them, on any criterion. Their cumulative similarity curves are straight lines. The
one population with a genuine excess is the telescopic near-Earth asteroid catalog, and even
there the clustered fraction is at most a few percent. So when someone reports that a
meteorite's orbit is "very close" to an asteroid's, the honest response is not *how close?*
but *out of how many?* — and every time that question has been asked properly, the answer
has been *chance*.

## Why single pairs will never work

There is a hard physical limit underneath all of this, and it's the subject of
[A&A 693, A23](https://doi.org/10.1051/0004-6361/202452123). Near-Earth space is
chaotic. The **Lyapunov time** — the horizon beyond which two initially identical orbits
diverge unpredictably — is only **60 to 200 years** there. But the **decoherence time**,
the span over which a whole stream stays recognizable against the background, is
**10⁴ to 10⁵ years**.

The analogy in that paper is smoke from a chimney. Individual particles start wandering
apart almost immediately, driven by tiny air currents — that's the Lyapunov time. Yet the
cloud itself stays visibly a cloud for far longer as it drifts away — that's decoherence.
A stream can remain a discernible group long after its constituent members have stopped
being individually traceable.

The consequence is unforgiving, and it's the sentence I'd most like people to take away:

> Any association between a specific fireball, meteorite, and asteroid, based solely on
> orbital similarity, is likely coincidental rather than indicative of a true physical
> connection.

Streams of many objects: findable. Individual parent bodies from orbits alone: not.
Confirming one needs something else — composition, cosmic-ray exposure age, spectra.

## Other ways people search

Cumulative similarity plus a localized excess map is what I use, but it's one option
among several. Single-neighbor linking
([Lindblad 1971](https://ui.adsabs.harvard.edu/abs/1971SCoA...12....1L)) grows chains of
mutually similar orbits. Grouping around a mean orbit
([Sekanina 1970](https://doi.org/10.1016/0019-1035%2870%2990093-X)) iterates toward a stream
center. Density mapping ([Welch 2001](https://doi.org/10.1046/j.1365-8711.2001.04850.x))
looks for peaks directly. DBSCAN and HDBSCAN
([Sugar et al. 2017](https://doi.org/10.1111/maps.12856);
[Peña-Asensio & Ferrari 2025](https://doi.org/10.3847/1538-3881/adec8c)) find dense
regions without assuming a shape. Wavelet transforms are standard for radar radiant
surveys. For a survey of the field, see
[Courtot et al. 2026](https://doi.org/10.1016/j.pss.2025.106231).

They differ mostly in how they *cluster*. None of them removes the need for the null
model — whichever you pick, you still have to know what chance would have handed you.

## A note on the printed equations {#printed-equations}

Two of the D-criterion equations **as typeset in my papers** contain errors. They are
typographical: the code that produced every published result uses the correct forms, so no
result in any of these papers is affected. I'm noting them here because someone
reimplementing a criterion from the printed page would get wrong numbers and have no way to
know.

- **A&A 686, A130 eqs. (18) and (20)** — repeated in **A&A 702, A36 eqs. (4) and (6)** — print
  the second branch of Δξ as `2 sin((180° − φ₂ − φ₁)/2)`. The middle term should be
  `180° + φ₂ − φ₁` — a shifted *difference*, not a sum — as in
  [Valsecchi, Jopek & Froeschlé (1999)](https://doi.org/10.1046/j.1365-8711.1999.02264.x)
  eqs. (24) and (26). The sum form isn't rotation-invariant, and it contradicts the sentence
  printed directly beneath it in both papers — that Δξ is small when φ₁ − φ₂ and λ₁ − λ₂ are
  *both close to 180°*, the case of two meteors meeting Earth at the two nodes of essentially
  the same orbit.
- **A&A 686, A130 eq. (14)** prints the last term of *D*<sub>H</sub> as
  `((e_B + e_A)(2 sin(Π/2)))²`. The eccentricity sum should be halved:
  `((e_A + e_B)/2)² (2 sin(Π/2))²`. That is what eq. (6) for *D*<sub>SH</sub> in the same
  paper prints, and what
  [Courtot, Shober & Vaubaillon (2026)](https://doi.org/10.1016/j.pss.2025.106231) eq. (3)
  gives. As printed, the term is four times too large.

One thing that is not an error but reads like one: these papers use lowercase π for the angle
between perihelia, so `sin(π/2)` appears in the equations. That π is an angle, not 3.14159.

The calculator above uses the correct forms, and is
[checked against the analysis code](https://github.com/pshober/pshober.github.io/tree/main/scripts/verify-d)
over several thousand cases.

## Tools, data, and working together

The false-positive method has **[public code on
Zenodo](https://zenodo.org/records/10406556)**, and the 235,271-meteor dataset behind the
2026 paper is archived at **[doi.org/10.5281/zenodo.18664293](https://doi.org/10.5281/zenodo.18664293)**.

The larger analysis pipeline — the cumulative-similarity engine, the four D-criteria,
KDE null models with per-dimension bandwidths, the MPI pair streaming needed to get
through 10¹¹ comparisons, the (U, λ☉) grid search and the clustering — is not public yet,
along with the code that generates the animations on this page. If you'd like to use
either, extend them, or work on this together, **[email
me](mailto:planetarypat@gmail.com)**. I'd genuinely rather these got used than sat on a
disk.

If you want to try the approach yourself, you need four things and none of them are
exotic: a catalog of meteor orbits, a similarity criterion, a background model you
trust, and the discipline to test the null before you believe the signal. The last one is
the only hard part.

<script>
  window.FS_DATA_BASE = {{ '/assets/data/finding-showers/' | relative_url | jsonify }};
</script>
<script defer src="{{ '/assets/js/d-criteria.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
<script defer src="{{ '/assets/js/finding-showers.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
