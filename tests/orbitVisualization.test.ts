import { describe, it, expect } from 'vitest';
import {
  computeOrbitTrailPoints,
  orbitalToCartesian,
  cartesianToOrbital,
  type OrbitalElements,
} from '../src/physics/orbitalElements';
import { G, SOLAR_MASS, EARTH_MASS, AU } from '../src/astronomy/constants';
import { computeHabitableZone } from '../src/astronomy/stellarPlanetaryCoupling';

describe('Mission P1-A — Orbit Visualization & Geometry', () => {
  const muSun = G * SOLAR_MASS;

  it('computes closed ellipse trail points matching orbital elements', () => {
    const a = 1.0 * AU;
    const e = 0.2;
    const inc = 0.05; // radians (~2.86 deg)
    const elements: OrbitalElements = {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc,
      longitudeOfAscendingNode: 0.1,
      argumentOfPeriapsis: 0.2,
      trueAnomaly: 0,
    };

    const numPoints = 128;
    const trail = computeOrbitTrailPoints(elements, muSun, numPoints);

    expect(trail.length).toBe(numPoints + 1);

    // Verify first and last points coincide (closed loop)
    const first = trail[0];
    const last = trail[trail.length - 1];
    expect(first.x).toBeCloseTo(last.x, 3);
    expect(first.y).toBeCloseTo(last.y, 3);
    expect(first.z).toBeCloseTo(last.z, 3);

    // Verify periapsis distance r_min = a * (1 - e)
    // and apoapsis distance r_max = a * (1 + e)
    let minR = Infinity;
    let maxR = 0;
    for (const pt of trail) {
      const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }

    const expectedMinR = a * (1 - e);
    const expectedMaxR = a * (1 + e);

    expect(minR).toBeCloseTo(expectedMinR, -5); // accurate to within small fraction of an AU
    expect(maxR).toBeCloseTo(expectedMaxR, -5);
  });

  it('aligns orbital trail plane with simulation coordinate frame (Y-up, XZ orbital plane for zero inclination)', () => {
    const a = 1.5 * AU;
    const elements: OrbitalElements = {
      semiMajorAxis: a,
      eccentricity: 0.0,
      inclination: 0.0,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 0.0,
      trueAnomaly: 0.0,
    };

    const trail = computeOrbitTrailPoints(elements, muSun, 64);
    for (const pt of trail) {
      // With inclination = 0, y should be exactly 0 in the Y-up coordinate convention
      expect(Math.abs(pt.y)).toBeLessThan(1e-4);
      // In XZ plane, distance from origin is constant = a
      const rPlane = Math.sqrt(pt.x * pt.x + pt.z * pt.z);
      expect(rPlane).toBeCloseTo(a, -4);
    }
  });

  it('maintains mathematical consistency between state vectors and orbital elements', () => {
    const elements: OrbitalElements = {
      semiMajorAxis: 2.2 * AU,
      eccentricity: 0.15,
      inclination: 0.1,
      longitudeOfAscendingNode: 0.4,
      argumentOfPeriapsis: 0.8,
      trueAnomaly: 1.2,
    };

    const { position, velocity } = orbitalToCartesian(elements, muSun);
    const recovered = cartesianToOrbital(position, velocity, muSun);

    expect(recovered).not.toBeNull();
    if (recovered) {
      expect(recovered.semiMajorAxis).toBeCloseTo(elements.semiMajorAxis, -6);
      expect(recovered.eccentricity).toBeCloseTo(elements.eccentricity, 4);
      expect(recovered.inclination).toBeCloseTo(elements.inclination, 4);
    }
  });

  it('derives habitable zone boundaries mathematically from stellar parameters for overlay', () => {
    // Solar values: L = 1.0 L_sun, Teff = 5780 K
    const solarLuminosityWatts = 3.828e26;
    const solarTeff = 5780;

    const hz = computeHabitableZone(solarLuminosityWatts, solarTeff);

    // Conservative HZ for Sun is roughly 0.95 AU to 1.67 AU
    expect(hz.innerConservativeAU).toBeGreaterThan(0.9);
    expect(hz.innerConservativeAU).toBeLessThan(1.05);

    expect(hz.outerConservativeAU).toBeGreaterThan(1.55);
    expect(hz.outerConservativeAU).toBeLessThan(1.75);

    // Optimistic HZ must encompass conservative HZ
    expect(hz.innerOptimisticAU).toBeLessThan(hz.innerConservativeAU);
    expect(hz.outerOptimisticAU).toBeGreaterThan(hz.outerConservativeAU);

    // Bounds in meters must match AU * AU_IN_METERS
    expect(hz.innerConservativeMeters).toBeCloseTo(hz.innerConservativeAU * AU, -2);
    expect(hz.outerConservativeMeters).toBeCloseTo(hz.outerConservativeAU * AU, -2);
  });
});
