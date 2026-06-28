---
layout: research
title: "Sensor fusion & radar meteorite detection"
permalink: /research/sensor-fusion/
eyebrow: "NASA · MetDetect · planetary defense"
lede: "Fusing radar, optical, infrasound and seismic data into one sequential estimate of a falling body — so we can characterise an event end to end, from telescopic discovery all the way to the meteorite on the ground."
description: "MetDetect: machine-learning detection of meteorite falls in NEXRAD Doppler radar, Kalman-filter multi-sensor fusion, closing the decametric gap, and end-to-end characterization for planetary defense and recovery."
papers:
  - title: "Comparing the data-reduction pipelines of FRIPON, DFN, WMPL, and AMOS: a case study of the Geminids"
    venue: "Astronomy & Astrophysics, 705, A65 (2026)"
    doi: "10.1051/0004-6361/202554364"
  - title: "Catastrophic disruption of asteroid 2023 CX1 and implications for planetary defence"
    venue: "Nature Astronomy, 9, 1624–1637 (2025)"
    doi: "10.1038/s41550-025-02659-8"
    arxiv: "2509.12362"
  - title: "What falls versus what we recover: quantifying search and recovery bias for orbital meteorites"
    venue: "Meteoritics & Planetary Science, 60(10), 2488–2503 (2025)"
    doi: "10.1111/maps.70041"
---

## MetDetect: meteorites in weather radar

At NASA Johnson Space Center (ARES) I'm building **MetDetect**, exploiting the U.S.
**NEXRAD** Doppler weather-radar network — a continent-scale, openly-available mesh
that can detect falling meteoritic debris. Working with Paul Abell and Mark Fries
(who pioneered the Doppler-radar meteorite method), the goal is to turn that network
into an **automatic, physically-interpretable detector of fresh meteorite falls.**

<figure class="fig" data-lightbox data-full="/assets/img/research/radar-detection.jpg" data-cap="NEXRAD reflectivity volume over a large meteorite fall off the Washington coast (8 March 2018) — the falling debris cloud lit up in the radar.">
  <img src="/assets/img/research/radar-detection.jpg" alt="3D NEXRAD weather-radar reflectivity showing the debris cloud of a meteorite fall off the Washington coast" loading="lazy" width="421" height="356">
  <figcaption>A meteorite fall caught in Doppler weather radar — the falling debris cloud over the Washington coast (8&nbsp;Mar&nbsp;2018). <span class="muted">Radar volume rendering.</span></figcaption>
</figure>

The detector ingests volumetric radar scans, suppresses weather noise, clusters
spatio-temporal echoes with unsupervised machine learning, and applies consistency
tests (altitude–time slope, fall-consistent apparent velocities, alignment with
winds, multi-scan persistence). Candidates get a calibrated confidence score, and
the strongest are flagged for rapid follow-up. In parallel I'm building a **radar-fall
simulator** that generates large, annotated synthetic datasets — both to train a
convolutional neural network for robust detection and to provide the forward model
for parameter inference. *See live results at [/acm2026](/acm2026/) and the planned
in-browser viewer at [/detect](/detect/).*

## Sensor fusion & sequential estimation

A single sensor only ever sees part of an entry. The real leverage comes from
**fusing them**: optical astrometry and photometry from camera networks, Doppler
**radar** (low-altitude debris, drift and terminal mass), **infrasound** and
**seismic** records (total energy and fragmentation altitudes), and **spectra /
radiometry** (composition and ablation regime). I treat each significant bolide as a
**multi-sensor inverse problem**, combining these heterogeneous streams with
**sequential Bayesian estimators — Kalman-type filters** — that update the
meteoroid's state (position, velocity, mass, density, fragmentation) and the
ablation/fragmentation model parameters as each observation is assimilated.

The payoff is **posterior distributions** — pre-atmospheric mass, bulk density,
strength, fragment size-frequency — rather than single best-fit numbers, with honest
uncertainties propagated all the way to the predicted fall ellipse. Coupling the
simulator/forward model to **hierarchical MCMC** lets these constraints be inferred
jointly across events.

## Closing the decametric gap {#decametric-gap}

<figure class="fig" data-lightbox data-full="/assets/img/research/decametric-gap.png" data-cap="Observational coverage of small bodies by size: telescopes constrain the large end, fireball networks the small end, leaving a poorly-sampled 10–100 m “gap in knowledge.”">
  <img src="/assets/img/research/decametric-gap.png" alt="Plot of peak dynamic pressure and albedo versus diameter showing meteors, fireballs and asteroids, with a 10-100 m gap in knowledge" loading="lazy" width="632" height="380">
  <figcaption>The 10–100&nbsp;m “decametric gap” between what fireball networks and telescopic surveys each sample. <span class="muted">Data: FRIPON, GMN, CAMS + NEO surveys.</span></figcaption>
</figure>

The **10–100 m size range** is the worst-characterised in the whole small-body
inventory: telescopic surveys become inefficient for objects this small and dark,
while fireball networks only sample what actually hits Earth. Yet this regime
dominates the impact flux responsible for **Chelyabinsk-type events** and probes the
transition between rubble-pile asteroids and individual meteoroids — a core
**planetary-defense** concern. Tying the multi-sensor bolide constraints to the
decametric NEO population revealed by upcoming infrared surveys (**NEO Surveyor**,
**NEOMIR**) is the path to closing this gap.

## Toward end-to-end events

<figure class="fig" data-lightbox data-full="/assets/img/research/dark-flight.png" data-cap="From orbit to the ground: a meteoroid pre-heats, ablates as a meteor/fireball, then falls dark to become a meteorite — each phase seen by a different sensor.">
  <img src="/assets/img/research/dark-flight.png" alt="Diagram of a meteoroid entering the atmosphere — orbit, pre-heating, meteor, fireball, dark flight, and meteorite on the ground" loading="lazy" width="1150" height="767">
  <figcaption>The atmospheric entry sequence — orbit → meteor/fireball → dark flight → meteorite — with each phase observed by a different sensor.</figcaption>
</figure>

With 11 asteroids already detected *before* impact, the endgame is **full-chain,
"telescope-to-ground" events**: telescopic discovery and spectroscopy → predicted
trajectory and impact energy → luminous flight in the camera networks → fragmentation
from infrasound/seismic → **dark flight in Doppler radar** → prediction and
**recovery** of the meteorites, with every step fused into one coherent, uncertainty-aware
estimate. Building that end-to-end pipeline — and preparing networks like FRIPON to
operate in this new regime — is the heart of my sensor-fusion program.
