/**
 * ASTRAVERSA Ω — Orbital Elements Tests
 *
 * Tests for:
 * - Kepler equation solver
 * - Anomaly conversions (mean ↔ eccentric ↔ true)
 * - Orbital period computation
 * - State vector ↔ orbital elements conversion
 * - Round-trip conversion fidelity
 */

import { describe, it, expect } from 'vitest';
import {
  solveKeplerEquation,
  eccentricToTrueAnomaly,
  trueToEccentricAnomaly,
  eccentricToMeanAnomaly,
  meanToEccentricAnomaly,
  meanToTrueAnomaly,
  trueToMeanAnomaly,
  computeOrbitalPeriod,
  cartesianToOrbital,
  orbitalToCartesian,
  normalizeAngle,
  orbitalRadius,
} from '../src/physics/orbitalElements';
import type { OrbitalElements } from '../src/physics/orbitalElements';
import { Vector3 } from '../src/physics/Vector3';
import { G, SOLAR_MASS, AU, SECONDS_PER_YEAR } from '../src/astronomy/constants';

const TWO_PI = 2 * Math.PI;
const MU_SUN = G * SOLAR_MASS;

describe('Kepler Equation Solver', () => {
  it('solves for circular orbit (e=0)', () => {
    // For e=0, E should equal M
    const M = 1.5;
    const E = solveKeplerEquation(M, 0);
    expect(E).toBeCloseTo(M, 10);
  });

  it('solves for low eccentricity (e=0.1)', () => {
    const e = 0.1;
    const M = 1.0;
    const E = solveKeplerEquation(M, e);
    // Verify: M = E - e*sin(E)
    const Mcheck = E - e * Math.sin(E);
    expect(Mcheck).toBeCloseTo(M, 10);
  });

  it('solves for moderate eccentricity (e=0.5)', () => {
    const e = 0.5;
    for (const M of [0, 0.5, 1.0, Math.PI, 2.5, 5.0]) {
      const E = solveKeplerEquation(M, e);
      const Mcheck = E - e * Math.sin(E);
      // Normalize both for comparison
      expect(normalizeAngle(Mcheck)).toBeCloseTo(normalizeAngle(M), 8);
    }
  });

  it('solves for high eccentricity (e=0.9)', () => {
    const e = 0.9;
    for (const M of [0.01, 0.5, 1.0, Math.PI, 4.0, 6.0]) {
      const E = solveKeplerEquation(M, e);
      const Mcheck = E - e * Math.sin(E);
      expect(normalizeAngle(Mcheck)).toBeCloseTo(normalizeAngle(M), 8);
    }
  });

  it('solves for very high eccentricity (e=0.99)', () => {
    const e = 0.99;
    const M = 0.1;
    const E = solveKeplerEquation(M, e);
    const Mcheck = E - e * Math.sin(E);
    expect(normalizeAngle(Mcheck)).toBeCloseTo(normalizeAngle(M), 6);
  });

  it('handles M=0 (periapsis)', () => {
    const E = solveKeplerEquation(0, 0.5);
    expect(E).toBeCloseTo(0, 10);
  });

  it('handles M=π (apoapsis region)', () => {
    const e = 0.3;
    const E = solveKeplerEquation(Math.PI, e);
    const Mcheck = E - e * Math.sin(E);
    expect(normalizeAngle(Mcheck)).toBeCloseTo(Math.PI, 8);
  });

  it('handles negative M by normalization', () => {
    const e = 0.3;
    const E = solveKeplerEquation(-1.0, e);
    const Epositive = solveKeplerEquation(TWO_PI - 1.0, e);
    // Should produce equivalent results (both normalized to [0, 2π))
    expect(normalizeAngle(E)).toBeCloseTo(normalizeAngle(Epositive), 8);
  });
});

describe('Anomaly Conversions', () => {
  it('eccentric to true anomaly round-trip', () => {
    const e = 0.3;
    for (const E of [0, 0.5, 1.0, Math.PI, 2.5, 5.0]) {
      const nu = eccentricToTrueAnomaly(E, e);
      const Eback = trueToEccentricAnomaly(nu, e);
      expect(normalizeAngle(Eback)).toBeCloseTo(normalizeAngle(E), 8);
    }
  });

  it('mean to true anomaly round-trip', () => {
    const e = 0.4;
    for (const M of [0.1, 1.0, Math.PI, 4.0, 6.0]) {
      const nu = meanToTrueAnomaly(M, e);
      const Mback = trueToMeanAnomaly(nu, e);
      expect(normalizeAngle(Mback)).toBeCloseTo(normalizeAngle(M), 8);
    }
  });

  it('eccentric to mean anomaly round-trip', () => {
    const e = 0.6;
    for (const E of [0.1, 1.5, Math.PI, 4.5]) {
      const M = eccentricToMeanAnomaly(E, e);
      const Eback = meanToEccentricAnomaly(M, e);
      expect(normalizeAngle(Eback)).toBeCloseTo(normalizeAngle(E), 8);
    }
  });

  it('circular orbit: all anomalies equal', () => {
    const e = 0;
    const angle = 1.5;
    const nu = eccentricToTrueAnomaly(angle, e);
    const M = eccentricToMeanAnomaly(angle, e);
    expect(nu).toBeCloseTo(angle, 10);
    expect(M).toBeCloseTo(angle, 10);
  });
});

describe('Orbital Period', () => {
  it('computes Earth orbital period', () => {
    // T = 2π √(a³ / μ) for a = 1 AU, μ = GM☉
    const a = AU;
    const T = computeOrbitalPeriod(a, MU_SUN);
    const expectedYears = 1.0;
    const actualYears = T / SECONDS_PER_YEAR;
    expect(actualYears).toBeCloseTo(expectedYears, 1);
  });

  it('period scales as a^(3/2) (Kepler\'s third law)', () => {
    const a1 = AU;
    const a2 = 4 * AU; // 4× distance
    const T1 = computeOrbitalPeriod(a1, MU_SUN);
    const T2 = computeOrbitalPeriod(a2, MU_SUN);
    // T ∝ a^1.5, so T2/T1 = 4^1.5 = 8
    expect(T2 / T1).toBeCloseTo(8, 1);
  });

  it('returns Infinity for non-positive semi-major axis', () => {
    expect(computeOrbitalPeriod(-1e10, MU_SUN)).toBe(Infinity);
    expect(computeOrbitalPeriod(0, MU_SUN)).toBe(Infinity);
  });
});

describe('Cartesian ↔ Orbital Elements Conversion', () => {
  it('converts circular equatorial orbit', () => {
    // Earth-like circular orbit in XZ plane
    const r = new Vector3(AU, 0, 0);
    const v_circ = Math.sqrt(MU_SUN / AU);
    const v = new Vector3(0, 0, v_circ); // perpendicular in XZ

    const elements = cartesianToOrbital(r, v, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    expect(elements.semiMajorAxis).toBeCloseTo(AU, -5); // within ~10km
    expect(elements.eccentricity).toBeCloseTo(0, 4);
    expect(elements.inclination).toBeCloseTo(0, 4); // equatorial (Y=0)
  });

  it('converts elliptical orbit', () => {
    // Start at periapsis with slightly less than circular velocity
    const r = new Vector3(AU, 0, 0);
    const v_circ = Math.sqrt(MU_SUN / AU);
    const v = new Vector3(0, 0, v_circ * 0.9); // sub-circular

    const elements = cartesianToOrbital(r, v, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    // Should be elliptical
    expect(elements.eccentricity).toBeGreaterThan(0.01);
    expect(elements.eccentricity).toBeLessThan(1.0);
    // Semi-major axis should be less than 1 AU (bound orbit with less than circular velocity)
    expect(elements.semiMajorAxis).toBeLessThan(AU);
    expect(elements.semiMajorAxis).toBeGreaterThan(0);
  });

  it('converts inclined orbit', () => {
    // Orbit tilted 30° from the reference plane
    const r = new Vector3(AU, 0, 0);
    const inc = Math.PI / 6; // 30 degrees
    const v_circ = Math.sqrt(MU_SUN / AU);
    // Velocity with Y component for inclination
    const v = new Vector3(0, v_circ * Math.sin(inc), v_circ * Math.cos(inc));

    const elements = cartesianToOrbital(r, v, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    expect(elements.inclination).toBeCloseTo(inc, 2);
    expect(elements.eccentricity).toBeCloseTo(0, 2);
  });

  it('round-trip: orbital → cartesian → orbital', () => {
    const original: OrbitalElements = {
      semiMajorAxis: 2 * AU,
      eccentricity: 0.3,
      inclination: Math.PI / 4,
      longitudeOfAscendingNode: Math.PI / 3,
      argumentOfPeriapsis: Math.PI / 6,
      trueAnomaly: Math.PI / 2,
    };

    // Elements → Cartesian
    const { position, velocity } = orbitalToCartesian(original, MU_SUN);

    // Cartesian → Elements
    const recovered = cartesianToOrbital(position, velocity, MU_SUN);
    expect(recovered).not.toBeNull();
    if (!recovered) return;

    // Compare
    expect(recovered.semiMajorAxis).toBeCloseTo(original.semiMajorAxis, -3);
    expect(recovered.eccentricity).toBeCloseTo(original.eccentricity, 6);
    expect(recovered.inclination).toBeCloseTo(original.inclination, 6);
    expect(normalizeAngle(recovered.longitudeOfAscendingNode))
      .toBeCloseTo(normalizeAngle(original.longitudeOfAscendingNode), 6);
    expect(normalizeAngle(recovered.argumentOfPeriapsis))
      .toBeCloseTo(normalizeAngle(original.argumentOfPeriapsis), 6);
    expect(normalizeAngle(recovered.trueAnomaly))
      .toBeCloseTo(normalizeAngle(original.trueAnomaly), 6);
  });

  it('round-trip: cartesian → orbital → cartesian', () => {
    const pos = new Vector3(AU, 0.2 * AU, 0.3 * AU);
    const vel = new Vector3(-5000, 1000, 25000);

    // Cartesian → Elements
    const elements = cartesianToOrbital(pos, vel, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    // Elements → Cartesian
    const { position, velocity } = orbitalToCartesian(elements, MU_SUN);

    // Compare
    expect(position.x).toBeCloseTo(pos.x, -2);
    expect(position.y).toBeCloseTo(pos.y, -2);
    expect(position.z).toBeCloseTo(pos.z, -2);
    expect(velocity.x).toBeCloseTo(vel.x, 0);
    expect(velocity.y).toBeCloseTo(vel.y, 0);
    expect(velocity.z).toBeCloseTo(vel.z, 0);
  });

  it('returns null for degenerate zero-position', () => {
    const result = cartesianToOrbital(Vector3.zero(), new Vector3(1000, 0, 0), MU_SUN);
    expect(result).toBeNull();
  });

  it('returns null for zero mu', () => {
    const result = cartesianToOrbital(new Vector3(AU, 0, 0), new Vector3(0, 0, 30000), 0);
    expect(result).toBeNull();
  });

  it('converts polar orbit (i = π/2)', () => {
    // Polar orbit in standard frame: inclination 90°
    const r = new Vector3(AU, 0, 0);
    const v_circ = Math.sqrt(MU_SUN / AU);
    // Velocity pointing along Y (perpendicular to X in simulation Y-up, purely vertical orbit)
    const v = new Vector3(0, v_circ, 0);

    const elements = cartesianToOrbital(r, v, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    expect(elements.inclination).toBeCloseTo(Math.PI / 2, 4);
    expect(elements.eccentricity).toBeCloseTo(0, 4);
    expect(elements.semiMajorAxis).toBeCloseTo(AU, -5);
  });

  it('converts retrograde equatorial orbit (i = π)', () => {
    // Retrograde orbit in XZ plane: velocity is opposite to prograde
    const r = new Vector3(AU, 0, 0);
    const v_circ = Math.sqrt(MU_SUN / AU);
    const v = new Vector3(0, 0, -v_circ); // opposite direction to standard prograde

    const elements = cartesianToOrbital(r, v, MU_SUN);
    expect(elements).not.toBeNull();
    if (!elements) return;

    expect(elements.inclination).toBeCloseTo(Math.PI, 4);
    expect(elements.eccentricity).toBeCloseTo(0, 4);
    expect(elements.semiMajorAxis).toBeCloseTo(AU, -5);
  });

  it('round-trip: high eccentricity orbit (e = 0.85)', () => {
    const original: OrbitalElements = {
      semiMajorAxis: 3 * AU,
      eccentricity: 0.85,
      inclination: Math.PI / 3,
      longitudeOfAscendingNode: 1.2,
      argumentOfPeriapsis: 2.1,
      trueAnomaly: 0.8,
    };

    const { position, velocity } = orbitalToCartesian(original, MU_SUN);
    const recovered = cartesianToOrbital(position, velocity, MU_SUN);

    expect(recovered).not.toBeNull();
    if (!recovered) return;

    expect(recovered.semiMajorAxis).toBeCloseTo(original.semiMajorAxis, -3);
    expect(recovered.eccentricity).toBeCloseTo(original.eccentricity, 6);
    expect(recovered.inclination).toBeCloseTo(original.inclination, 6);
    expect(normalizeAngle(recovered.longitudeOfAscendingNode))
      .toBeCloseTo(normalizeAngle(original.longitudeOfAscendingNode), 6);
    expect(normalizeAngle(recovered.argumentOfPeriapsis))
      .toBeCloseTo(normalizeAngle(original.argumentOfPeriapsis), 6);
    expect(normalizeAngle(recovered.trueAnomaly))
      .toBeCloseTo(normalizeAngle(original.trueAnomaly), 6);
  });
});

describe('Orbital Radius', () => {
  it('returns semi-major axis at ν=0 for circular orbit', () => {
    const r = orbitalRadius(AU, 0, 0);
    expect(r).toBeCloseTo(AU, 5);
  });

  it('returns periapsis at ν=0 for eccentric orbit', () => {
    const a = AU;
    const e = 0.3;
    const rPeri = orbitalRadius(a, e, 0);
    expect(rPeri).toBeCloseTo(a * (1 - e), 5);
  });

  it('returns apoapsis at ν=π for eccentric orbit', () => {
    const a = AU;
    const e = 0.3;
    const rApo = orbitalRadius(a, e, Math.PI);
    expect(rApo).toBeCloseTo(a * (1 + e), 5);
  });
});
