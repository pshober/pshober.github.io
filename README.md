# planetarypat.com

Personal/research website for **Patrick M. Shober** (planetary scientist, NASA JSC).
Built with plain Jekyll and served by **GitHub Pages' native build** (no GitHub
Actions, no local toolchain required) at <https://planetarypat.com>.

## How it works

- **Content is data-driven.** To update the site you almost never touch HTML:
  - CV → [`_data/cv.yml`](_data/cv.yml)
  - Publications → [`_data/publications.yml`](_data/publications.yml)
  - Projects → [`_data/projects.yml`](_data/projects.yml)
  - Conference (ACM 2026) page + gallery → [`_data/acm2026.yml`](_data/acm2026.yml)
- **Layout/look** lives in `_layouts/`, `_includes/`, and `_sass/`.
- Push to `main` → GitHub rebuilds and redeploys in ~1–2 minutes.

## The ACM 2026 QR page

`https://planetarypat.com/acm2026/` is the **fixed URL** the printed poster QR
points to. The URL never changes; edit `_data/acm2026.yml` to update its content
(add/curate result figures, captions) right up to and during the conference.

## Editing from anywhere

You can edit any `_data/*.yml` file directly on github.com (pencil icon → commit)
and the site rebuilds automatically — no laptop or build tools needed.

## Custom domain / DNS

The custom domain is bound by the [`CNAME`](CNAME) file (`planetarypat.com`) plus
DNS records at Cloudflare. See the project plan / handoff notes for the exact
records and the HTTPS runbook.
