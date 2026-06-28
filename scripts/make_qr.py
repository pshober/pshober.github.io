#!/usr/bin/env python3
"""Generate the ACM 2026 QR code offline (no paid/tracking service).

Requires `segno` (pure-Python, no native deps):
    python3 -m pip install --user segno

Usage:
    python3 scripts/make_qr.py                       # default ACM 2026 URL
    python3 scripts/make_qr.py https://example.com/  # any URL

Outputs (high error-correction = H, survives print smudging / a logo overlay):
    assets/img/acm2026_qr.svg   # vector, use this for the printed poster
    assets/img/acm2026_qr.png   # 1000+ px raster fallback
"""
import sys

URL = sys.argv[1] if len(sys.argv) > 1 else "https://planetarypat.com/acm2026/"

try:
    import segno
except ImportError:
    sys.exit("Missing dependency. Run:  python3 -m pip install --user segno")

qr = segno.make(URL, error="h")
# Deep-navy modules on white keep it on-theme while staying high-contrast.
qr.save("assets/img/acm2026_qr.svg", scale=10, border=4, dark="#0b1020", light="#ffffff")
qr.save("assets/img/acm2026_qr.png", scale=20, border=4, dark="#0b1020", light="#ffffff")
print("Wrote assets/img/acm2026_qr.svg and assets/img/acm2026_qr.png")
print("Encodes:", URL)
print("Test the PRINTED proof with a phone before mass-printing.")
