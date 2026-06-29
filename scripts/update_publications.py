#!/usr/bin/env python3
"""Sync refereed publications + paper counts from NASA ADS into the site's data files.

What it does
------------
* Queries NASA ADS for Patrick's *refereed* papers (ORCID ∪ author-name), de-dupes them
  against what's already in `_data/publications.yml`, and inserts any NEW ones into the
  "Refereed publications" section in the site's house style (best-effort: author
  abbreviation/truncation, sentence-case titles, venue formatting).
* Recomputes the headline counts from the refereed list and writes them to
  `_data/metrics.yml` (`papers`, `first_author`), the refereed-section `badge`, and the two
  numbers in the `_data/cv.yml` summary.
* Refreshes `_data/ads_metrics.yml` (citations, h-index, reads) from the ADS metrics endpoint.

It NEVER invents data: anything ADS doesn't supply cleanly (no DOI, unknown journal) is
skipped and reported, not fabricated. New entries are meant to be reviewed in a PR, so the
best-effort formatting can be touched up before going live.

Usage
-----
    ADS_TOKEN=xxxx python3 scripts/update_publications.py            # write changes
    ADS_TOKEN=xxxx python3 scripts/update_publications.py --dry-run  # print only
    python3 scripts/update_publications.py --from-json docs.json --dry-run  # offline test

Requires: requests, ruamel.yaml  (pip install requests "ruamel.yaml<0.18")
"""
import argparse
import json
import os
import re
import sys
import datetime
from io import StringIO

# ── Configuration (edit me) ──────────────────────────────────────────────────
ORCID = "0000-0003-4766-2098"
AUTHOR = 'author:"Shober, P. M."'
# Bibcodes or lowercased DOIs to ignore (e.g. a same-name author's paper that slips in):
EXCLUDE = set()

# ADS journal name → the venue style used on the site.
JOURNAL_MAP = {
    "Astronomy and Astrophysics": "Astronomy & Astrophysics",
    "Meteoritics and Planetary Science": "Meteoritics & Planetary Science",
    "Meteoritics & Planetary Science": "Meteoritics & Planetary Science",
    "The Astronomical Journal": "The Astronomical Journal",
    "The Astrophysical Journal": "The Astrophysical Journal",
    "The Astrophysical Journal Letters": "The Astrophysical Journal Letters",
    "Monthly Notices of the Royal Astronomical Society": "Monthly Notices of the Royal Astronomical Society",
    "Nature Astronomy": "Nature Astronomy",
    "Science Advances": "Science Advances",
    "The Planetary Science Journal": "The Planetary Science Journal",
    "Planetary and Space Science": "Planetary and Space Science",
    "Icarus": "Icarus",
    "Acta Astronautica": "Acta Astronautica",
}

# Proper nouns / acronyms to restore after lower-casing a title (case as written here).
PROTECTED = [
    "FRIPON", "DFN", "WMPL", "AMOS", "GFO", "GMN", "CAMS", "DFNetwork", "NEXRAD",
    "NASA", "ESA", "NEO", "NEOs", "NEOMIR", "MCMC", "ISRU", "CX1", "YORP", "CRE",
    "Earth", "Sun", "Moon", "Mars", "Jupiter", "Saturn", "Bennu", "Ryugu",
    "Geminid", "Geminids", "Taurid", "Taurids", "Winchcombe", "Chelyabinsk",
    "Bayesian", "Gaussian", "Doppler", "Apollo", "Atira", "Aten", "Amor",
    "Tisserand", "Kuiper", "Oort", "Tisza", "Madura", "Cave", "Arpu", "Kuilpu",
    "Ménétréol", "Saint-Pierre-le-Viger", "Jupiter-family", "Near-Earth", "IAU",
    "α–β", "rock-comet", "Minimoon", "H5", "CM", "CI", "JFC", "JFCs", "Chang'e-6",
]

PUB = os.path.join("_data", "publications.yml")
METRICS = os.path.join("_data", "metrics.yml")
ADS_METRICS = os.path.join("_data", "ads_metrics.yml")
CV = os.path.join("_data", "cv.yml")

ADS_BASE = "https://api.adsabs.harvard.edu/v1"
FL = "bibcode,doi,identifier,year,pubdate,title,author,first_author,pub,volume,issue,page,page_range,property,doctype"


# ── ADS access ───────────────────────────────────────────────────────────────
def ads_get(token, path, **params):
    import requests
    r = requests.get(f"{ADS_BASE}/{path}", params=params,
                     headers={"Authorization": f"Bearer {token}"}, timeout=60)
    r.raise_for_status()
    return r.json()


def ads_post(token, path, payload):
    import requests
    r = requests.post(f"{ADS_BASE}/{path}", json=payload,
                      headers={"Authorization": f"Bearer {token}",
                               "Content-Type": "application/json"}, timeout=60)
    r.raise_for_status()
    return r.json()


def fetch_refereed(token):
    """Return ADS docs for refereed journal articles (ORCID ∪ author name)."""
    q = f'(orcid:{ORCID} OR {AUTHOR}) property:refereed doctype:article'
    res = ads_get(token, "search/query", q=q, fl=FL, rows=500, sort="date desc")
    return res.get("response", {}).get("docs", [])


def fetch_metrics(token, bibcodes):
    m = ads_post(token, "metrics", {"bibcodes": bibcodes})
    basic = m.get("basic stats", {})
    ref = m.get("basic stats refereed", {})
    cites = m.get("citation stats", {})
    ind = m.get("indicators", {})
    return {
        "refereed": int(ref.get("number of papers") or basic.get("number of papers") or 0),
        "citations": int(cites.get("total number of citations") or 0),
        "h_index": int(ind.get("h") or 0),
        "reads": int(basic.get("total number of reads") or 0),
    }


# ── Formatting helpers ───────────────────────────────────────────────────────
def abbrev_author(name):
    """'Devillepoix, H. A. R.' -> 'Devillepoix HAR'; 'Patrick M. Shober'-style handled too."""
    name = name.strip()
    if "," in name:
        surname, given = name.split(",", 1)
    else:  # 'First Last' (rare in ADS); treat last token as surname
        toks = name.split()
        surname, given = (toks[-1], " ".join(toks[:-1])) if len(toks) > 1 else (name, "")
    surname = surname.strip()
    parts = [p for p in re.split(r"[\s\-.]+", given.strip()) if p]
    initials = "".join(p[0] for p in parts if p[0].isalpha()).upper()
    return f"{surname} {initials}".strip()


def surname_of(name):
    return (name.split(",", 1)[0] if "," in name else name.split()[-1]).strip()


def format_authors(authors):
    """Apply the site's abbreviate + truncate style based on where 'Shober' sits."""
    abbr = [abbrev_author(a) for a in authors]
    n = len(authors)
    try:
        si = next(i for i, a in enumerate(authors) if surname_of(a) == "Shober")
    except StopIteration:
        si = None
    if si == 0:                              # Shober first → list all co-authors
        return ", ".join(abbr) if n <= 20 else abbr[0] + " et al."
    if si is not None and si <= 3:           # Shober within the first four
        if n == si + 1:                      # …and is the last listed
            return ", ".join(abbr)
        return ", ".join(abbr[: si + 1]) + ", et al."
    if si is not None:                       # buried in a big collaboration
        return f"{abbr[0]} et al. (incl. Shober PM)"
    return f"{abbr[0]} et al."               # (shouldn't happen for his papers)


def sentence_case(title):
    """Best-effort: lower-case, capitalise first letter and after sentence punctuation,
    then restore protected proper nouns. (Colon-separated subtitles stay lower-case,
    matching the site style.) Review in the PR for edge cases."""
    if not title:
        return title
    t = title.strip().rstrip(".")
    low = t.lower()
    out = []
    cap_next = True
    for ch in low:
        if cap_next and ch.isalpha():
            out.append(ch.upper()); cap_next = False
        else:
            out.append(ch)
        if ch in ".?!":
            cap_next = True
    s = "".join(out)
    for w in PROTECTED:                      # restore proper nouns (word-boundary)
        s = re.sub(rf"(?<![\w-]){re.escape(w.lower())}(?![\w-])", w, s)
    return s


def extract_arxiv(identifiers):
    for id_ in identifiers or []:
        m = re.match(r"arXiv:(\d{4}\.\d{4,5})", id_, re.I)
        if m:
            return m.group(1)
    return None


def format_venue(doc):
    pub = (doc.get("pub") or "").strip()
    journal = JOURNAL_MAP.get(pub)
    if not journal:
        return None  # unknown journal → don't guess
    vol = (doc.get("volume") or "").strip()
    issue = (doc.get("issue") or "").strip()
    page = (doc.get("page_range") or "").strip()
    if not page:
        p = doc.get("page")
        page = (p[0] if isinstance(p, list) and p else (p or "")).strip()
    page = page.replace("-", "–")  # en-dash for ranges
    bits = [journal]
    if vol:
        bits[-1] = journal + ", " + (f"{vol}({issue})" if issue else vol)
    if page:
        bits.append(page)
    return ", ".join(bits)


def norm_title(t):
    return re.sub(r"[^a-z0-9]+", "", (t or "").lower())


# ── Build the site record for a paper ────────────────────────────────────────
def build_entry(doc):
    title = (doc.get("title") or [""])[0]
    venue = format_venue(doc)
    doi = (doc.get("doi") or [None])[0]
    if not (title and venue and doi):
        return None, "missing title/venue/doi"
    entry = {
        "year": int(doc.get("year") or (doc.get("pubdate") or "0")[:4] or 0),
        "authors": format_authors(doc.get("author") or []),
        "title": sentence_case(title),
        "venue": venue,
        "doi": doi,
    }
    ax = extract_arxiv(doc.get("identifier"))
    if ax:
        entry["arxiv"] = ax
    return entry, None


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print, write nothing")
    ap.add_argument("--from-json", help="read ADS docs from a local JSON file (offline test)")
    args = ap.parse_args()

    token = os.environ.get("ADS_TOKEN", "")
    if args.from_json:
        docs = json.load(open(args.from_json))
        metrics = None
    else:
        if not token:
            print("ADS_TOKEN not set; nothing to do.")
            return 0
        docs = fetch_refereed(token)
        metrics = fetch_metrics(token, [d["bibcode"] for d in docs if d.get("bibcode")])

    # drop excluded
    docs = [d for d in docs
            if d.get("bibcode") not in EXCLUDE
            and (d.get("doi") or [""])[0].lower() not in EXCLUDE]

    from ruamel.yaml import YAML
    from ruamel.yaml.scalarstring import DoubleQuotedScalarString as DQ
    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.width = 4096
    yaml.indent(mapping=2, sequence=4, offset=2)

    pubs = yaml.load(open(PUB))
    refereed = next(s for s in pubs["sections"] if s.get("by_year"))

    # everything already listed anywhere (refereed/in-prep/in-review/selected)
    listed_doi, listed_title = set(), set()
    for sec in pubs["sections"]:
        for it in sec.get("items", []):
            if it.get("doi"):
                listed_doi.add(str(it["doi"]).lower())
            listed_title.add(norm_title(it.get("title")))
    for it in pubs.get("selected", []):
        if it.get("doi"):
            listed_doi.add(str(it["doi"]).lower())
        listed_title.add(norm_title(it.get("title")))

    new_entries, skipped, flags = [], [], []
    for doc in docs:
        doi = (doc.get("doi") or [""])[0].lower()
        title = (doc.get("title") or [""])[0]
        nt = norm_title(title)
        if doi and doi in listed_doi:
            continue
        if nt in listed_title:
            flags.append(f"“{title}” is already listed (perhaps in In review/In prep) — "
                         f"if it's now published, remove the old entry.")
            continue
        entry, why = build_entry(doc)
        if entry is None:
            skipped.append(f"{doc.get('bibcode','?')}: {why}")
            continue
        new_entries.append((doc, entry))
        listed_doi.add(doi); listed_title.add(nt)  # avoid dupes within this run

    # insert new entries into the refereed section (descending by year)
    items = refereed["items"]
    for _doc, entry in new_entries:
        cm = type(items[0])() if items else None
        from ruamel.yaml.comments import CommentedMap
        cm = CommentedMap()
        cm["year"] = entry["year"]
        for k in ("authors", "title", "venue", "doi", "arxiv"):
            if k in entry:
                cm[k] = DQ(entry[k])
        pos = next((i for i, it in enumerate(items) if int(it["year"]) <= entry["year"]),
                   len(items))
        items.insert(pos, cm)

    # recompute counts from the (merged) refereed list — the displayed source of truth
    papers = len(items)
    first_author = sum(1 for it in items if str(it.get("authors", "")).startswith("Shober"))
    refereed["badge"] = DQ(f"{papers} · {first_author} first-author")

    # ── report ───────────────────────────────────────────────────────────────
    print(f"refereed listed: {papers} | first-author: {first_author} | "
          f"new: {len(new_entries)} | skipped: {len(skipped)} | flags: {len(flags)}")
    for _d, e in new_entries:
        print(f"  + ({e['year']}) {e['authors']} — {e['title']} [{e.get('doi')}]")
    for s in skipped:
        print(f"  ~ skipped {s}")
    for f in flags:
        print(f"  ! {f}")

    if args.dry_run:
        print("(dry run — no files written)")
        return 0

    # ── write publications.yml (only if there are new entries) ────────────────
    if new_entries:
        with open(PUB, "w") as fh:
            yaml.dump(pubs, fh)

    # ── metrics.yml counts (only when they change) ───────────────────────────
    my = YAML(); my.preserve_quotes = True; my.width = 4096
    m = my.load(open(METRICS))
    if m.get("papers") != papers or m.get("first_author") != first_author:
        m["papers"] = papers
        m["first_author"] = first_author
        with open(METRICS, "w") as fh:
            my.dump(m, fh)

    # ── cv.yml summary numbers (regex on raw text; leave the rest untouched) ──
    cv = open(CV).read()
    cv2 = re.sub(r"(\d+)(\s+refereed\s+)publications \(\d+ first-author\)",
                 lambda mo: f"{papers}{mo.group(2)}publications ({first_author} first-author)",
                 cv, count=1)
    if cv2 != cv:
        open(CV, "w").write(cv2)

    # ── ads_metrics.yml (citations/h-index/reads) ─────────────────────────────
    if metrics is not None:
        with open(ADS_METRICS, "w") as fh:
            fh.write("# Auto-generated by .github/workflows/update-publications.yml from NASA ADS.\n")
            fh.write(f'updated: "{datetime.date.today().isoformat()}"\n')
            for k in ("refereed", "citations", "h_index", "reads"):
                fh.write(f"{k}: {metrics[k]}\n")

    # ── GitHub Action outputs + PR body ──────────────────────────────────────
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as fh:
            fh.write(f"has_new={'true' if new_entries else 'false'}\n")
            fh.write(f"count={len(new_entries)}\n")
    if new_entries or flags:
        with open("pr_body.md", "w") as fh:
            fh.write("Automated update from NASA ADS.\n\n")
            if new_entries:
                fh.write(f"**{len(new_entries)} new refereed paper(s):**\n")
                for _d, e in new_entries:
                    fh.write(f"- ({e['year']}) {e['authors']} — *{e['title']}* "
                             f"([DOI](https://doi.org/{e['doi']}))\n")
                fh.write("\nCounts updated to "
                         f"**{papers} papers / {first_author} first-author**. "
                         "Please eyeball the author list, title casing and venue against the "
                         "house style before merging.\n")
            if flags:
                fh.write("\n**Needs a look:**\n")
                for f in flags:
                    fh.write(f"- {f}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
