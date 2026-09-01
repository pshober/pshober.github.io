/* d-criteria.js — orbital/geocentric dissimilarity functions.
 *
 * A line-by-line port of the D-function block in
 * stream_assessment/csd_master_significance.py (lines 194-308), which is the code
 * that produced the published results in A&A 686 A130, A&A 693 A23, A&A 702 A36
 * and ApJ 1000 254. It is checked against that Python by scripts/verify-d/.
 *
 * Two deliberate fidelity notes:
 *  - Degree/radian conversions mirror numpy's deg2rad/rad2deg (multiply by a
 *    precomputed constant) rather than being simplified, so round-trips match.
 *  - pyMod() reproduces Python's % (sign follows the divisor). JS's % follows the
 *    dividend. Naive ((x%m)+m)%m is NOT used: it loses precision for tiny x.
 *
 * The published Δφ_II / Δλ_II in A&A 686 eq. (18)/(20) and A&A 702 eq. (4)/(6) are
 * typeset as 2 sin((180° − φ₂ − φ₁)/2). The code below uses 180° + φ₂ − φ₁, which is
 * what every published result was computed with, and which is what the papers' own
 * accompanying sentence describes. Likewise D_H's last term follows the code (and
 * Jopek 1993), not the 4x-larger form printed in A&A 686 eq. (14).
 */
(function (root) {
  "use strict";

  var DEG2RAD = Math.PI / 180.0;
  var RAD2DEG = 180.0 / Math.PI;
  var SPEED_EARTH = 29.78;   // km/s
  var EPS_OBLIQ = 0.40909280; // radians

  function rad(deg) { return deg * DEG2RAD; }
  function deg(r) { return r * RAD2DEG; }

  function clip(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // Python's % : result takes the sign of the divisor.
  function pyMod(x, m) {
    var r = x % m;
    if (r !== 0 && (r < 0) !== (m < 0)) r += m;
    return r;
  }

  function finiteSqrt(d2) {
    if (!isFinite(d2) || d2 < 0) return NaN;
    return Math.sqrt(d2);
  }

  // --- shared angle helpers -------------------------------------------------

  function inclI(i1, O1, i2, O2) {
    var i1r = rad(i1), i2r = rad(i2), O1r = rad(O1), O2r = rad(O2);
    var val = Math.cos(i1r) * Math.cos(i2r) +
              Math.sin(i1r) * Math.sin(i2r) * Math.cos(O1r - O2r);
    return Math.acos(clip(val, -1.0, 1.0));
  }

  function piAngle(i1, w1, O1, i2, w2, O2) {
    var I = inclI(i1, O1, i2, O2);
    var i1r = rad(i1), i2r = rad(i2);
    var O1r = rad(O1), O2r = rad(O2);
    var w1r = rad(w1), w2r = rad(w2);
    // NB: numpy round-trips through rad2deg here; mirrored exactly.
    var dOdeg = Math.abs(deg(O1r - O2r));
    var sign = dOdeg > 180.0 ? -1.0 : 1.0;
    var term = Math.cos((i1r + i2r) / 2.0) * Math.sin((O1r - O2r) / 2.0) /
               Math.cos(I / 2.0);
    term = clip(term, -1.0, 1.0);
    return (w1r - w2r) + (2.0 * sign * Math.asin(term));
  }

  function thetaAngle(i1, w1, O1, i2, w2, O2) {
    var i1r = rad(i1), i2r = rad(i2);
    var O1r = rad(O1), O2r = rad(O2);
    var w1r = rad(w1), w2r = rad(w2);
    var B1 = Math.asin(Math.sin(i1r) * Math.sin(w1r));
    var B2 = Math.asin(Math.sin(i2r) * Math.sin(w2r));
    var g1 = O1r + Math.atan(Math.cos(i1r) * Math.tan(w1r)) +
             (Math.cos(w1r) < 0 ? Math.PI : 0.0);
    var g2 = O2r + Math.atan(Math.cos(i2r) * Math.tan(w2r)) +
             (Math.cos(w2r) < 0 ? Math.PI : 0.0);
    return Math.acos(clip(
      Math.sin(B1) * Math.sin(B2) + Math.cos(B1) * Math.cos(B2) * Math.cos(g1 - g2),
      -1.0, 1.0));
  }

  // --- the three orbital-element criteria -----------------------------------
  // All take (q1,e1,i1,w1,O1, q2,e2,i2,w2,O2) with angles in degrees, q in au.

  function D_SH(q1, e1, i1, w1, O1, q2, e2, i2, w2, O2) {
    var I = inclI(i1, O1, i2, O2);
    var pi = piAngle(i1, w1, O1, i2, w2, O2);
    var d1 = (q1 - q2);
    var d2 = (e1 - e2);
    var d3 = 2.0 * Math.sin(I / 2.0);
    var d4 = (e1 + e2) * Math.sin(pi / 2.0);
    return finiteSqrt(d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4);
  }

  function D_prime(q1, e1, i1, w1, O1, q2, e2, i2, w2, O2) {
    var I = inclI(i1, O1, i2, O2);
    var th = thetaAngle(i1, w1, O1, i2, w2, O2);
    var d1 = (e1 - e2) / (e1 + e2);
    var d2 = (q1 - q2) / (q1 + q2);
    var d3 = I / Math.PI;
    var d4 = ((e1 + e2) / 2.0) * (th / Math.PI);
    return finiteSqrt(d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4);
  }

  function D_H(q1, e1, i1, w1, O1, q2, e2, i2, w2, O2) {
    var I = inclI(i1, O1, i2, O2);
    var pi = piAngle(i1, w1, O1, i2, w2, O2);
    var d1 = (e1 - e2);
    var d2 = (q1 - q2) / (q1 + q2);
    var d3 = 2.0 * Math.sin(I / 2.0);
    var d4 = (e1 + e2) * Math.sin(pi / 2.0);
    return finiteSqrt(d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4);
  }

  // --- D_N (Valsecchi et al. 1999), the geocentric criterion ----------------

  // ra, dec, sol in RADIANS; vg in km/s. Returns the rotated geocentric velocity.
  function vgComponents(ra, dec, sol, vg) {
    var sinE = Math.sin(EPS_OBLIQ), cosE = Math.cos(EPS_OBLIQ);
    var LE = sol - Math.PI;
    var sinL = Math.sin(LE), cosL = Math.cos(LE);
    var vgRel = vg / SPEED_EARTH;
    var vgx = -vgRel * Math.cos(dec) * Math.cos(ra);
    var vgy = -vgRel * Math.cos(dec) * Math.sin(ra);
    var vgz = -vgRel * Math.sin(dec);
    return [
      cosL * vgx + sinL * cosE * vgy + sinL * sinE * vgz,
      -sinL * vgx + cosL * cosE * vgy + cosL * sinE * vgz,
      -sinE * vgy + cosE * vgz
    ];
  }

  // Accepts {theta, phi, U, sol} (degrees, U dimensionless) or {ra, dec, sol, v_g}.
  // Branch order matches the Python: the Opik form wins if fully present.
  function dnComponents(row) {
    var has = function (k) { return row[k] !== undefined && row[k] !== null; };
    if (has("theta") && has("phi") && has("U") && has("sol")) {
      return {
        U: +row.U,
        ct: Math.cos(rad(row.theta)),
        phi: rad(pyMod(row.phi, 360.0)),
        lam: rad(pyMod(row.sol, 360.0))
      };
    }
    if (has("ra") && has("dec") && has("sol") && has("v_g")) {
      var ra = rad(row.ra), dec = rad(row.dec), sol = rad(row.sol), vg = +row.v_g;
      var v = vgComponents(ra, dec, sol, vg);
      var umag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return {
        U: vg / SPEED_EARTH,
        ct: v[1] / umag,
        phi: pyMod(Math.atan2(v[0], v[2]) + 2.0 * Math.PI, 2.0 * Math.PI),
        lam: pyMod(sol + Math.PI, 2.0 * Math.PI)
      };
    }
    throw new Error("D_N requires {theta,phi,U,sol} or {ra,dec,sol,v_g}");
  }

  // Pair arithmetic on already-computed components. D_N() delegates here, so the
  // fast path used by the page widgets is the exact code the fixture verifies.
  function dnFromComponents(a, b, dMax, w1, w2, w3) {
    dMax = dMax === undefined ? 999.0 : dMax;
    w1 = w1 === undefined ? 1.0 : w1;
    w2 = w2 === undefined ? 1.0 : w2;
    w3 = w3 === undefined ? 1.0 : w3;

    var du2 = (b.U - a.U) * (b.U - a.U);
    var dct2 = w1 * (b.ct - a.ct) * (b.ct - a.ct);
    if (du2 > dMax || dct2 > dMax) return dMax;

    var dphiA = 2 * Math.sin((b.phi - a.phi) / 2);
    var dphiB = 2 * Math.sin((Math.PI + b.phi - a.phi) / 2);
    var dlamA = 2 * Math.sin((b.lam - a.lam) / 2);
    var dlamB = 2 * Math.sin((Math.PI + b.lam - a.lam) / 2);
    var dz = Math.min(w2 * dphiA * dphiA + w3 * dlamA * dlamA,
                      w2 * dphiB * dphiB + w3 * dlamB * dlamB);
    return Math.min(Math.sqrt(du2 + dct2 + dz), dMax);
  }

  function D_N(row1, row2, dMax, w1, w2, w3) {
    return dnFromComponents(dnComponents(row1), dnComponents(row2), dMax, w1, w2, w3);
  }

  root.DCriteria = {
    SPEED_EARTH: SPEED_EARTH,
    D_SH: D_SH,
    D_prime: D_prime,
    D_H: D_H,
    D_N: D_N,
    dnComponents: dnComponents,
    dnFromComponents: dnFromComponents,
    _internal: { inclI: inclI, piAngle: piAngle, thetaAngle: thetaAngle, pyMod: pyMod }
  };
})(typeof window !== "undefined" ? window : this);
