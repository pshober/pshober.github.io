---
layout: research
title: "Sensor fusion & radar meteorite detection"
permalink: /research/sensor-fusion/
eyebrow: "NASA · MetDetect · planetary defense"
lede: "Working toward fusing radar, optical, infrasound and seismic data into one estimate of a falling body, so an event can be followed from the first telescopic detection through to the meteorite on the ground."
hero_image: /assets/img/research/multisensor-observation.jpg
hero_alt: "Schematic of the many sensors that observe a meteorite fall: telescope, fireball cameras, infrasound array, seismometer, Doppler weather radar, lightning-mapper satellite and casual footage"
hero_caption: "The many ways a single fall is recorded: an asteroid caught pre-impact, the luminous fireball and its fragmentation, then ground and space sensors (fireball cameras, infrasound arrays, seismometers, Doppler weather radar, lightning-mapper satellites and casual footage). Illustration: P. Shober."
hero_full: true
description: "MetDetect: machine-learning detection of meteorite falls in NEXRAD Doppler radar, plus a research program toward multi-sensor fusion, closing the decametric gap, and full-chain characterization for planetary defense and recovery."
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
**NEXRAD** Doppler weather-radar network, a continent-scale, openly-available mesh
that can detect falling meteoritic debris. Working with Paul Abell and Mark Fries
(who pioneered the Doppler-radar meteorite method), the goal is to turn that network
into an **automatic, physically-interpretable detector of fresh meteorite falls.**

The detector ingests volumetric radar scans, suppresses weather noise, clusters
spatio-temporal echoes with unsupervised machine learning, and applies consistency
tests (altitude–time slope, fall-consistent apparent velocities, alignment with
winds, multi-scan persistence). Candidates get a confidence score, and the strongest
are flagged for rapid follow-up. A planned next step is a **radar-fall simulator** to
generate annotated synthetic data, both to train a convolutional neural network for
more robust detection and to provide a forward model for parameter inference.
*See live results at [/acm2026](/acm2026/) and the planned in-browser viewer at
[/detect](/detect/).*

## Sensor fusion & sequential estimation

A single sensor only ever sees part of an entry. The real leverage comes from
**fusing them**: optical astrometry and photometry from camera networks, Doppler
**radar** (low-altitude debris, drift and terminal mass), **infrasound** and
**seismic** records (total energy and fragmentation altitudes), and **spectra /
radiometry** (composition and ablation regime). My research program aims to treat each
significant bolide as a **multi-sensor inverse problem**, combining these heterogeneous
streams with **sequential Bayesian estimators (Kalman-type filters)** that would update
the meteoroid's state (position, velocity, mass, density, fragmentation) and the
ablation/fragmentation model parameters as each observation is assimilated.

The aim is full **posterior distributions** for pre-atmospheric mass, bulk density,
strength and fragment size-frequency, with realistic uncertainties propagated to the
predicted fall ellipse, rather than single best-fit values, with a forward model coupled
to **hierarchical MCMC** so constraints can be inferred jointly across events.

## Closing the decametric gap {#decametric-gap}

<figure class="fig" data-lightbox data-full="/assets/img/research/decametric-gap.png" data-cap="Observational coverage of small bodies by size: telescopes constrain the large end, fireball networks the small end, leaving a poorly-sampled 10–100 m “gap in knowledge.”">
  <img src="/assets/img/research/decametric-gap.png" alt="Plot of peak dynamic pressure and albedo versus diameter showing meteors, fireballs and asteroids, with a 10-100 m gap in knowledge" loading="lazy" width="632" height="380">
  <figcaption>The 10–100&nbsp;m “decametric gap” between what fireball networks and telescopic surveys each sample. <span class="muted">P.&nbsp;Shober; compiled from FRIPON, GMN, CAMS and NEO-survey data.</span></figcaption>
</figure>

The **10–100 m size range** is the worst-characterised in the whole small-body
inventory: telescopic surveys become inefficient for objects this small and dark,
while fireball networks only sample what actually hits Earth. Yet this regime
dominates the impact flux responsible for [**Chelyabinsk-type events**](https://doi.org/10.1126/science.1242642)
and probes the transition between rubble-pile asteroids and individual meteoroids, a core
**planetary-defense** concern. Tying the multi-sensor bolide constraints to the decametric
NEO population that upcoming infrared surveys will reveal ([**NEO Surveyor**](https://doi.org/10.3847/PSJ/ad0468),
[**NEOMIR**](https://doi.org/10.1117/12.3018505)) is the path to closing this gap.

## From discovery to recovery

A small but growing number of asteroids have now been spotted *before* impact (asteroid
[2023 CX1](https://doi.org/10.1038/s41550-025-02659-8), which dropped meteorites over
Normandy, among them). The endgame is **full-chain, "telescope-to-ground" events**:
telescopic discovery and spectroscopy → predicted trajectory and impact energy → luminous
flight in the camera networks → fragmentation from infrasound/seismic → **dark flight in
Doppler radar** → prediction and **recovery** of the meteorites, with every step fused into
one coherent, uncertainty-aware estimate. Building toward that pipeline, and helping prepare
networks like FRIPON for this regime, is the goal of my sensor-fusion program.
