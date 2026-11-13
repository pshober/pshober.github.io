# planetarypat.com

Personal/research website for **Patrick M. Shober** (planetary scientist, NASA JSC).
Built with plain Jekyll and served by **GitHub Pages' native build** (no GitHub
Actions, no local toolchain required) at <https://planetarypat.com>.

## How it works

- **Content is data-driven.** To update the site you almost never touch HTML:
  - CV → [`_data/cv.yml`](_data/cv.yml)
  - Publications → [`_data/publications.yml`](_data/publications.yml)
  - Funding history → [`_data/funding.yml`](_data/funding.yml)
  - Homepage capsule cards → [`_data/highlights.yml`](_data/highlights.yml)
  - Homepage "From the field" media wall → [`_data/media.yml`](_data/media.yml)
  - Conference (ACM 2026) page + gallery → [`_data/acm2026.yml`](_data/acm2026.yml)
- **Layout/look** lives in `_layouts/`, `_includes/`, and `_sass/`.
- Push to `main` → GitHub rebuilds and redeploys in ~1–2 minutes.

## The ACM 2026 QR page

`https://planetarypat.com/acm2026/` is the **fixed URL** the printed poster QR
points to. The URL never changes; edit `_data/acm2026.yml` to update its content
(add/curate result figures, captions) right up to and during the conference.

## Editing from anywhere

You can edit any `_data/*.yml` file directly on github.com (pencil icon → commit)
and the site rebuilds automatically, no laptop or build tools needed.

## Automated publication sync (NASA ADS)

[`scripts/update_publications.py`](scripts/update_publications.py), run every ~2 weeks by
[`.github/workflows/update-publications.yml`](.github/workflows/update-publications.yml),
pulls your **refereed** papers from NASA ADS (ORCID ∪ author name) and:

- **new paper found →** opens a **pull request** with the auto-formatted entry added to
  `_data/publications.yml` and the counts bumped — review the author list / title casing /
  venue against the house style, then merge.
- **no new paper →** commits the refreshed citation / h-index / read counts
  (`_data/ads_metrics.yml`) straight to `main`.

Paper counts live in one place — `_data/metrics.yml` (`papers`, `first_author`) — and the
pages read them via Liquid, so the script only updates that file (plus the refereed badge
and the CV summary line).

**Setup:** add a free **ADS API token** (ADS → Account → API Token) as the repo secret
`ADS_TOKEN` (Settings → Secrets and variables → Actions). Without it the workflow no-ops.
Run it on demand from the Actions tab ("Run workflow"), or locally:
`ADS_TOKEN=… python3 scripts/update_publications.py --dry-run`. Edit the config block at the
top of the script (journal-name map, protected proper nouns, exclude-list) to tune formatting.

## Meteorite falls (`/meteorite-falls/`)

A GLM-style table of meteorite falls seen in weather radar, one page per fall, and an "Ask about a fireball" form.

- **Hand-maintained facts:** one file per fall in [`_falls/`](_falls) (name, place, date, `status: verified` or
  `automated`, who verified it, meteorites with Meteoritical Bulletin codes, papers). Edit these directly.
  A new automatic detection gets `status: automated` until a person checks it; set `status: verified` and fill
  `verification:` when it is.
- **MetDetect results and figures are generated**, never edited here: METRAIN
  `automatic_detection/scripts/web/export_falls_run42.py` (RUN-42 and later; reads a results bundle from
  `automatic_detection/paper/detection_psj/bundles/<run>/`) writes [`_data/metdetect.yml`](_data/metdetect.yml),
  `assets/img/falls/<slug>/*.webp` and `assets/img/falls-run/*.webp`, joined to a fall by its `key:`. Re-run it after
  a new detection run. (`export_falls_site.py` is the RUN-41 exporter.)
- **Observations are hand-maintained**: each `_falls/<slug>.md` may carry `observed:` (`cameras` = dedicated
  fireball cameras, `video` = casual dash/security/phone footage, `satellite`, `seismic`, `infrasound`, `witnesses`;
  each with `detail`, `source`, `url`) and, for falls MetDetect has not searched, `fireball:` (`utc`, `precision`,
  `source`, `url`). Only what a source documents is listed.
- **Inquiry form:** with `falls_inquiry.endpoint` empty in `_config.yml` it opens the visitor's email app;
  paste a free [Formspree](https://formspree.io) endpoint there to receive inquiries directly.
- **Local preview:** `bundle exec jekyll build` works on the laptop with the Ruby headers unpacked from the
  `ruby3.0-dev` package (no root); see the METRAIN exporter docstring.

## Custom domain / DNS

The custom domain is bound by the [`CNAME`](CNAME) file (`planetarypat.com`) plus
DNS records at Cloudflare. See the project plan / handoff notes for the exact
records and the HTTPS runbook.
