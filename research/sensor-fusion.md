---
layout: research
title: "Sensor fusion & radar meteorite detection"
permalink: /research/sensor-fusion/
eyebrow: "NASA · MetDetect · planetary defense"
lede: "Turning the national weather-radar network into an automatic meteorite-fall detector — and fusing radar, optical and infrasound to close the 10–100 m blind spot in our view of near-Earth objects."
description: "MetDetect: machine-learning detection of meteorite falls in NEXRAD Doppler radar, multi-sensor Bayesian inversion, and closing the decametric gap for planetary defense."
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

The project has three deliverables: (i) **automatic radar detection** to replace
today's manual screening; (ii) **physically-interpretable characterisation** of the
fragment distributions (size-frequency, bulk density/drag proxies, masses, terminal
velocities, entry geometry, weather corrections); and (iii) **fusion with wide-field
camera networks** to jointly resolve the optical trajectory and the dark-flight
physics. The detector ingests volumetric radar scans, suppresses weather noise,
clusters spatio-temporal echoes with unsupervised machine learning, and applies
consistency tests (altitude–time slope, fall-consistent apparent velocities,
alignment with winds, multi-scan persistence). Candidates get a calibrated confidence
score, and the strongest are flagged for rapid follow-up.

In parallel I'm building a **radar-fall simulator** that generates large, annotated
synthetic datasets — both to train a convolutional neural network for robust
detection and to provide the forward model for **Bayesian hierarchical inversion
(MCMC)**, recovering posteriors for the size-frequency slope, density, total mass,
and entry speed and angle. With Fries I've assembled ~56 large radar-detected falls
from the last two decades to test the pipelines and characterise big falls.

*See the live conference results at [/acm2026](/acm2026/), and the planned in-browser
viewer at [/detect](/detect/).*

## Closing the decametric gap {#decametric-gap}

The **10–100 m size range** is the worst-characterised in the whole small-body
inventory: telescopic surveys become inefficient for objects this small and dark,
while fireball networks only sample what actually hits Earth. Yet this regime
dominates the impact flux responsible for **Chelyabinsk-type events** and probes the
transition between rubble-pile asteroids and individual meteoroids — a core
**planetary-defense** concern.

Treating each significant bolide as a **multi-sensor inverse problem** — combining
optical astrometry/photometry with Doppler radar (low-altitude debris, terminal
mass), infrasound and seismic records (total energy, fragmentation altitudes), and
spectra/radiometry (composition) — yields posterior distributions for pre-atmospheric
mass, density, strength and fragment distribution rather than single values. Tying
these constraints to the decametric NEO population revealed by upcoming infrared
surveys (**NEO Surveyor**, **NEOMIR**) is the path to closing the gap. With 11
asteroids already detected *before* impact, the endgame is full **discovery →
luminous flight → fragmentation → dark flight → recovery** event chains.
