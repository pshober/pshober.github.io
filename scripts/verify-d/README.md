# D-criterion port verification

`assets/js/d-criteria.js` is a hand port of the D-function block in
`stream_assessment/csd_master_significance.py` (the code that produced the results in
A&A 686 A130, A&A 693 A23, A&A 702 A36 and ApJ 1000 254). This checks the port against
that Python instead of trusting it.

## Run it

```sh
python3 gen_fixture.py [path/to/csd_master_significance.py]   # default: ~/stream_assessment/...
google-chrome --headless --dump-dom "file://$PWD/verify.html" | sed 's/<[^>]*>//g'
```

Expect `RESULT: PASS`. The gate is a max absolute *and* relative error above 1e-10 on any
criterion; the port currently agrees to ~2e-15, i.e. floating-point noise.

`gen_fixture.py` does not re-type the formulas. It slices the exact source lines out of
`csd_master_significance.py` and `exec()`s them, so the reference values cannot drift from
the published code. 4,158 cases: ~4,000 random plus structured edge cases for ω near
90°/270°, Ω wrapping across 0/360°, i = 0 and 180°, e → 0 and e → 1, identical orbits, and
radiant pairs separated by exactly 180° (which exercise D_N's two-node `min()` branch).

## Note on the published equations

The code and the papers disagree in two places. In both, the code is what ran, so no
published result is affected — but the port follows the code:

1. **Δφ_II / Δλ_II** are typeset as `2 sin((180° − φ₂ − φ₁)/2)` in A&A 686 eq. (18)/(20)
   and A&A 702 eq. (4)/(6). The code uses `180° + φ₂ − φ₁`. The papers' own sentence —
   "Δξ is small if φ₁ − φ₂ and λ₁ − λ₂ are either both small or both close to 180°" —
   only holds for the code's form.
2. **D_H** eq. (14) in A&A 686 prints the last term as `((e_B + e_A)(2 sin(Π/2)))²`,
   which is 4× the value the code computes, the value Jopek (1993) defines, and the value
   the same paper's own eq. (6) uses for D_SH.
