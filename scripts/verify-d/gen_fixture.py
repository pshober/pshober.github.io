#!/usr/bin/env python3
"""Generate a reference fixture for the JavaScript port of the D-criteria.

The four D-functions are NOT re-typed here. We slice the exact source lines out of
stream_assessment/csd_master_significance.py and exec() them, so the reference values
come from the same code that produced the published results.

Usage:  python3 gen_fixture.py [path/to/csd_master_significance.py]
Writes: fixture.js next to this script.
"""
import json, math, os, sys, re
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/stream_assessment/csd_master_significance.py")

lines = open(SRC).read().split("\n")

# Slice from the "D functions" banner up to (not including) the _DFUNC_REG registry.
start = next(i for i, l in enumerate(lines) if l.startswith("# ---") and "D functions" in l)
end   = next(i for i, l in enumerate(lines) if l.startswith("_DFUNC_REG"))
block = "\n".join(lines[start:end])

# Guard: the slice must contain exactly the four criteria and their helpers.
for name in ("_rad", "_I_incl", "_pi_angle", "_theta_angle",
             "D_SH", "D_prime", "D_H", "_calc_vg_components", "_get_dn_components", "D_N"):
    assert re.search(r"^def %s\(" % re.escape(name), block, re.M) or name == "_rad", \
        "missing %s in extracted block" % name

ns = {"np": np, "math": math}
exec(compile(block, SRC, "exec"), ns)
D_SH, D_prime, D_H, D_N = ns["D_SH"], ns["D_prime"], ns["D_H"], ns["D_N"]
SPEED_EARTH = ns["SPEED_EARTH"]


class Row(dict):
    """Minimal stand-in for the pandas Series that D_N expects."""
    @property
    def index(self):
        return list(self.keys())


rng = np.random.default_rng(20260901)

# ---------------------------------------------------------------- orbital cases
def rand_orbit():
    return dict(q=float(rng.uniform(0.02, 1.3)),
                e=float(rng.uniform(0.01, 0.985)),
                i=float(rng.uniform(0.0, 180.0)),
                w=float(rng.uniform(0.0, 360.0)),
                O=float(rng.uniform(0.0, 360.0)))

orbital = []

# Structured edge cases first -- these are where a port silently diverges.
EDGE_W = [0.0, 89.999, 90.0, 90.001, 179.999, 180.0, 180.001, 269.999, 270.0, 270.001, 359.999]
EDGE_I = [0.0, 1e-9, 0.5, 90.0, 179.5, 180.0]
EDGE_O = [(350.0, 10.0), (10.0, 350.0), (0.0, 180.0), (0.0, 180.001), (0.0, 179.999),
          (180.0, 0.0), (0.0, 0.0), (359.999, 0.001), (90.0, 270.0), (270.0, 90.0)]
EDGE_E = [1e-9, 1e-4, 0.5, 0.9, 0.985, 0.999999]

for w1 in EDGE_W:
    for w2 in (0.0, 90.0, 270.0):
        orbital.append((dict(q=0.5, e=0.6, i=12.0, w=w1, O=100.0),
                        dict(q=0.7, e=0.4, i=30.0, w=w2, O=200.0)))
for i1 in EDGE_I:
    for i2 in EDGE_I:
        orbital.append((dict(q=0.4, e=0.7, i=i1, w=45.0, O=30.0),
                        dict(q=0.9, e=0.3, i=i2, w=310.0, O=250.0)))
for O1, O2 in EDGE_O:
    orbital.append((dict(q=0.3, e=0.8, i=15.0, w=135.0, O=O1),
                    dict(q=0.35, e=0.75, i=18.0, w=140.0, O=O2)))
for e1 in EDGE_E:
    for e2 in EDGE_E:
        orbital.append((dict(q=0.22, e=e1, i=12.3, w=135.8, O=191.9),
                        dict(q=0.24, e=e2, i=11.0, w=133.0, O=195.0)))
# Identical orbits -> D must be exactly 0.
for _ in range(10):
    o = rand_orbit()
    orbital.append((o, dict(o)))
# Random bulk
for _ in range(2000):
    orbital.append((rand_orbit(), rand_orbit()))

orbital_cases = []
for a, b in orbital:
    args = (a["q"], a["e"], a["i"], a["w"], a["O"], b["q"], b["e"], b["i"], b["w"], b["O"])
    row = {"a": a, "b": b}
    for label, fn in (("D_SH", D_SH), ("D_prime", D_prime), ("D_H", D_H)):
        try:
            v = float(fn(*args))
        except Exception:
            v = None
        row[label] = None if (v is None or not math.isfinite(v)) else v
    orbital_cases.append(row)

# ---------------------------------------------------------------- radiant cases
def rand_radiant():
    return dict(ra=float(rng.uniform(0.0, 360.0)),
                dec=float(rng.uniform(-90.0, 90.0)),
                sol=float(rng.uniform(0.0, 360.0)),
                v_g=float(rng.uniform(11.0, 71.0)))

radiant = []
# The +/-180 node degeneracy is the whole point of the min() branch -- hammer it.
for base in (0.0, 45.0, 90.0, 179.0, 180.0, 181.0, 270.0, 359.0):
    radiant.append((dict(ra=100.0, dec=20.0, sol=base, v_g=30.0),
                    dict(ra=100.0, dec=20.0, sol=(base + 180.0) % 360.0, v_g=30.0)))
    radiant.append((dict(ra=base, dec=0.0, sol=10.0, v_g=25.0),
                    dict(ra=(base + 180.0) % 360.0, dec=0.0, sol=190.0, v_g=25.0)))
for d in (-90.0, -89.999, -45.0, 0.0, 45.0, 89.999, 90.0):
    radiant.append((dict(ra=12.0, dec=d, sol=5.0, v_g=29.8),
                    dict(ra=200.0, dec=-d, sol=185.0, v_g=42.0)))
for _ in range(10):
    r = rand_radiant()
    radiant.append((r, dict(r)))
for _ in range(2000):
    radiant.append((rand_radiant(), rand_radiant()))

radiant_cases = []
for a, b in radiant:
    try:
        v = float(D_N(Row(a), Row(b)))
    except Exception:
        v = None
    radiant_cases.append({"a": a, "b": b,
                          "D_N": None if (v is None or not math.isfinite(v)) else v})

out = {
    "source": os.path.abspath(SRC),
    "speed_earth": SPEED_EARTH,
    "note": "Reference values produced by exec()-ing the verbatim D-function block "
            "from csd_master_significance.py. Do not hand-edit.",
    "orbital": orbital_cases,
    "radiant": radiant_cases,
}
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture.js")
with open(dest, "w") as fh:
    fh.write("window.D_FIXTURE = ")
    json.dump(out, fh)
    fh.write(";\n")
print("orbital cases: %d" % len(orbital_cases))
print("radiant cases: %d" % len(radiant_cases))
print("SPEED_EARTH  : %r" % SPEED_EARTH)
print("wrote %s (%.1f KB)" % (dest, os.path.getsize(dest) / 1024.0))
