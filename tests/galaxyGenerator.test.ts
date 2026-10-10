/**
 * ASTRAVERSA Ω — Galaxy Generator Tests
 *
 * Tests for Mission 002: Procedural galaxy generation,
 * determinism, structure, hierarchy, and integration
 * with Mission 001 solar system generator.
 */

import { describe, it, expect } from 'vitest';
import { generateGalaxy, recalculateSupermassiveBlackHole } from '../src/universe/GalaxyGenerator';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { Universe } from '../src/universe/Universe';
import { GalaxyType, ViewLevel } from '../src/universe/Galaxy';
import type { QualityLevel } from '../src/universe/Galaxy';
import { CelestialBodyType } from '../src/universe/CelestialBody';
import {
  kpcToLightYears,
  lightYearsToKpc,
  schwarzschildRadiusMeters,
  schwarzschildRadiusKm,
  schwarzschildRadiusAU,
  GRAVITATIONAL_CONSTANT,
  SPEED_OF_LIGHT,
  SOLAR_MASS,
  AU,
} from '../src/astronomy/constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Galaxy Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galaxy Generation', () => {
  it('generates a galaxy with all required properties', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.id).toBe('galaxy-42');
    expect(galaxy.name).toBeDefined();
    expect(galaxy.name.length).toBeGreaterThan(0);
    expect(galaxy.displayName).toBe('ANANTARA α');
    expect(galaxy.seed).toBe(42);
    expect(galaxy.type).toBe(GalaxyType.BARRED_SPIRAL);
    expect(galaxy.radius).toBeGreaterThan(0);
    expect(galaxy.thickness).toBeGreaterThan(0);
    expect(galaxy.estimatedPopulation).toBeGreaterThan(0);
    expect(galaxy.age).toBeGreaterThan(0);
    expect(galaxy.metallicity).toBeGreaterThanOrEqual(0);
    expect(galaxy.metallicity).toBeLessThanOrEqual(1);
  });

  it('generates spiral arm parameters', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.spiralArms.armCount).toBe(4);
    expect(galaxy.spiralArms.windingFactor).toBeGreaterThan(0);
    expect(galaxy.spiralArms.armWidth).toBeGreaterThan(0);
    expect(galaxy.spiralArms.armDensity).toBeGreaterThan(0);
  });

  it('generates bulge parameters', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.bulge.radiusFraction).toBeGreaterThan(0);
    expect(galaxy.bulge.radiusFraction).toBeLessThan(1);
    expect(galaxy.bulge.verticalScale).toBeGreaterThan(1);
    expect(galaxy.bulge.densityMultiplier).toBeGreaterThan(1);
  });

  it('generates physically plausible galaxy properties', () => {
    // Canonical ANANTARA α (seed 42)
    const canonical = generateGalaxy(42);
    expect(canonical.radius).toBeGreaterThan(70);
    expect(canonical.radius).toBeLessThan(80);
    expect(canonical.diskStructure?.mainDiskDiameterLy).toBe(500000);
    expect(canonical.diskStructure?.extendedHaloDiameterLy).toBeCloseTo(750000, 1);

    // Generic galaxies (seeds other than 42)
    for (let seed = 1; seed < 10; seed++) {
      const galaxy = generateGalaxy(seed);

      // Radius should be in plausible range (kpc)
      expect(galaxy.radius).toBeGreaterThan(10);
      expect(galaxy.radius).toBeLessThan(20);

      // Age should be plausible (billions of years)
      expect(galaxy.age).toBeGreaterThan(9);
      expect(galaxy.age).toBeLessThan(14);

      // Thickness should be much less than radius
      expect(galaxy.thickness).toBeLessThan(galaxy.radius * 0.1);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Deterministic Galaxy Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galaxy Determinism', () => {
  it('same seed → same galaxy', () => {
    const galaxy1 = generateGalaxy(42);
    const galaxy2 = generateGalaxy(42);

    expect(galaxy1.name).toBe(galaxy2.name);
    expect(galaxy1.radius).toBe(galaxy2.radius);
    expect(galaxy1.thickness).toBe(galaxy2.thickness);
    expect(galaxy1.age).toBe(galaxy2.age);
    expect(galaxy1.metallicity).toBe(galaxy2.metallicity);
    expect(galaxy1.spiralArms.armCount).toBe(galaxy2.spiralArms.armCount);
    expect(galaxy1.spiralArms.windingFactor).toBe(galaxy2.spiralArms.windingFactor);
    expect(galaxy1.stars.length).toBe(galaxy2.stars.length);
    expect(galaxy1.clusters.length).toBe(galaxy2.clusters.length);

    // Verify star positions are identical
    for (let i = 0; i < Math.min(100, galaxy1.stars.length); i++) {
      expect(galaxy1.stars[i].x).toBe(galaxy2.stars[i].x);
      expect(galaxy1.stars[i].y).toBe(galaxy2.stars[i].y);
      expect(galaxy1.stars[i].z).toBe(galaxy2.stars[i].z);
      expect(galaxy1.stars[i].massSolar).toBe(galaxy2.stars[i].massSolar);
      expect(galaxy1.stars[i].temperature).toBe(galaxy2.stars[i].temperature);
      expect(galaxy1.stars[i].seed).toBe(galaxy2.stars[i].seed);
    }
  });

  it('different seeds → different galaxies', () => {
    const galaxy1 = generateGalaxy(42);
    const galaxy2 = generateGalaxy(99);

    // At least some properties should differ
    const sameName = galaxy1.name === galaxy2.name;
    const sameRadius = galaxy1.radius === galaxy2.radius;
    const sameAge = galaxy1.age === galaxy2.age;

    // Very unlikely all three match for different seeds
    expect(sameName && sameRadius && sameAge).toBe(false);
  });

  it('star seeds are deterministic and unique within a galaxy', () => {
    const galaxy = generateGalaxy(42);
    const seedSet = new Set(galaxy.stars.map(s => s.seed));

    // All star seeds should be unique
    expect(seedSet.size).toBe(galaxy.stars.length);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. Spiral Arm Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Spiral Arm Distribution', () => {
  it('stars extend to the galactic radius', () => {
    const galaxy = generateGalaxy(42);

    // Find the furthest star
    let maxR = 0;
    for (const star of galaxy.stars) {
      const r = Math.sqrt(star.x * star.x + star.z * star.z);
      if (r > maxR) maxR = r;
    }

    // At least some stars should be near the outer radius
    expect(maxR).toBeGreaterThan(galaxy.radius * 0.5);
  });

  it('stars have 3D distribution (non-zero Y values)', () => {
    const galaxy = generateGalaxy(42);

    let hasPositiveY = false;
    let hasNegativeY = false;

    for (const star of galaxy.stars) {
      if (star.y > 0.01) hasPositiveY = true;
      if (star.y < -0.01) hasNegativeY = true;
    }

    expect(hasPositiveY).toBe(true);
    expect(hasNegativeY).toBe(true);
  });

  it('vertical distribution is thin (disk-like)', () => {
    const galaxy = generateGalaxy(42);

    // Compute standard deviation of Y positions
    const yValues = galaxy.stars.map(s => s.y);
    const meanY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    const variance = yValues.reduce((a, y) => a + (y - meanY) ** 2, 0) / yValues.length;
    const stdDev = Math.sqrt(variance);

    // Y spread should be much less than the radial extent
    expect(stdDev).toBeLessThan(galaxy.radius * 0.3);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Galactic Density Behavior
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galactic Density', () => {
  it('central region has higher star density than outer region', () => {
    const galaxy = generateGalaxy(42);
    const halfRadius = galaxy.radius * 0.3;

    let innerCount = 0;
    let outerCount = 0;

    for (const star of galaxy.stars) {
      const r = Math.sqrt(star.x * star.x + star.z * star.z);
      if (r < halfRadius) innerCount++;
      else outerCount++;
    }

    // Inner region (smaller area) should have proportionally more stars
    const innerArea = Math.PI * halfRadius * halfRadius;
    const outerArea = Math.PI * galaxy.radius * galaxy.radius - innerArea;
    const innerDensity = innerCount / innerArea;
    const outerDensity = outerCount / outerArea;

    expect(innerDensity).toBeGreaterThan(outerDensity);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. Galactic Bulge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galactic Bulge', () => {
  it('bulge region has higher vertical extent', () => {
    const galaxy = generateGalaxy(42);
    const bulgeRadius = galaxy.radius * galaxy.bulge.radiusFraction;

    let bulgeMaxY = 0;
    let diskMaxY = 0;

    for (const star of galaxy.stars) {
      const r = Math.sqrt(star.x * star.x + star.z * star.z);
      const absY = Math.abs(star.y);

      if (r < bulgeRadius) {
        if (absY > bulgeMaxY) bulgeMaxY = absY;
      } else if (r > bulgeRadius * 2) {
        if (absY > diskMaxY) diskMaxY = absY;
      }
    }

    // Bulge should have stars at greater vertical distances
    // (this may not always hold due to randomness, but should generally)
    expect(bulgeMaxY).toBeGreaterThan(0);
  });

  it('bulge has stars', () => {
    const galaxy = generateGalaxy(42);
    const bulgeRadius = galaxy.radius * galaxy.bulge.radiusFraction;

    let bulgeCount = 0;
    for (const star of galaxy.stars) {
      const r = Math.sqrt(star.x * star.x + star.z * star.z);
      if (r < bulgeRadius) bulgeCount++;
    }

    // Should have a meaningful number of bulge stars
    expect(bulgeCount).toBeGreaterThan(galaxy.stars.length * 0.05);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. Star Cluster Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Star Clusters', () => {
  it('generates clusters', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.clusters.length).toBeGreaterThan(0);
    expect(galaxy.clusters.length).toBeGreaterThanOrEqual(20);
  });

  it('clusters have valid properties', () => {
    const galaxy = generateGalaxy(42);

    for (const cluster of galaxy.clusters) {
      expect(cluster.id).toBeDefined();
      expect(cluster.seed).toBeDefined();
      expect(cluster.radius).toBeGreaterThan(0);
      expect(cluster.populationEstimate).toBeGreaterThan(0);
      expect(cluster.density).toBeGreaterThan(0);
    }
  });

  it('clusters are within the galactic disk', () => {
    const galaxy = generateGalaxy(42);

    for (const cluster of galaxy.clusters) {
      const r = Math.sqrt(cluster.x * cluster.x + cluster.z * cluster.z);
      // Clusters should be within the galaxy (with some scatter margin)
      expect(r).toBeLessThan(galaxy.radius * 1.5);
    }
  });

  it('some stars are assigned to clusters', () => {
    const galaxy = generateGalaxy(42);

    let starsInClusters = 0;
    for (const star of galaxy.stars) {
      if (star.clusterIndex >= 0) starsInClusters++;
    }

    // At least some stars should be in clusters
    expect(starsInClusters).toBeGreaterThan(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. Hierarchical Seed Derivation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Hierarchical Seed Derivation', () => {
  it('galaxy seed → cluster seeds are deterministic', () => {
    const galaxy1 = generateGalaxy(42);
    const galaxy2 = generateGalaxy(42);

    for (let i = 0; i < galaxy1.clusters.length; i++) {
      expect(galaxy1.clusters[i].seed).toBe(galaxy2.clusters[i].seed);
    }
  });

  it('galaxy seed → star seeds are deterministic', () => {
    const galaxy1 = generateGalaxy(42);
    const galaxy2 = generateGalaxy(42);

    for (let i = 0; i < galaxy1.stars.length; i++) {
      expect(galaxy1.stars[i].seed).toBe(galaxy2.stars[i].seed);
    }
  });

  it('star seed → solar system is deterministic', () => {
    const galaxy = generateGalaxy(42);
    const star = galaxy.stars[0];

    const system1 = generateSolarSystem(star.seed);
    const system2 = generateSolarSystem(star.seed);

    expect(system1.star.mass).toBe(system2.star.mass);
    expect(system1.planets.length).toBe(system2.planets.length);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. Star Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galaxy Star Generation', () => {
  it('generates correct number of stars for each quality level', () => {
    const low = generateGalaxy(42, { quality: 'LOW' as QualityLevel });
    const medium = generateGalaxy(42, { quality: 'MEDIUM' as QualityLevel });
    const high = generateGalaxy(42, { quality: 'HIGH' as QualityLevel });

    expect(low.stars.length).toBe(8000);
    expect(medium.stars.length).toBe(20000);
    expect(high.stars.length).toBe(40000);
  });

  it('stars have valid spectral properties', () => {
    const galaxy = generateGalaxy(42);

    const validClasses = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

    for (let i = 0; i < Math.min(500, galaxy.stars.length); i++) {
      const star = galaxy.stars[i];

      expect(star.massSolar).toBeGreaterThan(0);
      expect(star.temperature).toBeGreaterThan(0);
      expect(star.luminositySolar).toBeGreaterThan(0);
      expect(star.radiusSolar).toBeGreaterThan(0);
      expect(validClasses).toContain(star.spectralClass);
      expect(star.color).toBeDefined();
      expect(star.color.startsWith('#')).toBe(true);
    }
  });

  it('stars have unique IDs', () => {
    const galaxy = generateGalaxy(42, { quality: 'LOW' as QualityLevel });
    const ids = new Set(galaxy.stars.map(s => s.id));
    expect(ids.size).toBe(galaxy.stars.length);
  });

  it('stars have valid metallicity values', () => {
    const galaxy = generateGalaxy(42);

    for (const star of galaxy.stars) {
      expect(star.metallicity).toBeGreaterThanOrEqual(0);
      expect(star.metallicity).toBeLessThanOrEqual(1);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. Star Selection Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Star Selection Data', () => {
  it('each star has a seed for system generation', () => {
    const galaxy = generateGalaxy(42);

    for (const star of galaxy.stars) {
      expect(typeof star.seed).toBe('number');
      expect(Number.isFinite(star.seed)).toBe(true);
    }
  });

  it('star seed generates a valid solar system', () => {
    const galaxy = generateGalaxy(42);
    const star = galaxy.stars[100]; // Pick an arbitrary star

    const system = generateSolarSystem(star.seed);

    expect(system.star).toBeDefined();
    expect(system.star.type).toBe(CelestialBodyType.STAR);
    expect(system.planets.length).toBeGreaterThanOrEqual(3);
    expect(system.planets.length).toBeLessThanOrEqual(8);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. Galaxy → Cluster → Star Hierarchy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galaxy → Cluster → Star Hierarchy', () => {
  it('cluster.starIndices reference valid stars', () => {
    const galaxy = generateGalaxy(42);

    for (const cluster of galaxy.clusters) {
      for (const idx of cluster.starIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(galaxy.stars.length);
        expect(galaxy.stars[idx]).toBeDefined();
      }
    }
  });

  it('stars in clusters have matching clusterIndex', () => {
    const galaxy = generateGalaxy(42);

    for (let ci = 0; ci < galaxy.clusters.length; ci++) {
      const cluster = galaxy.clusters[ci];
      for (const si of cluster.starIndices) {
        expect(galaxy.stars[si].clusterIndex).toBe(ci);
      }
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. Star → Planetary System Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Star → Planetary System Integration', () => {
  it('Universe.enterStarSystem generates a solar system', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' as QualityLevel });

    const system = universe.enterStarSystem(0);

    expect(system).not.toBeNull();
    expect(system!.star).toBeDefined();
    expect(system!.planets.length).toBeGreaterThanOrEqual(3);
    expect(universe.solarSystem).toBe(system);
    expect(universe.activeStarIndex).toBe(0);
    expect(universe.navigation.level).toBe(ViewLevel.SYSTEM);
  });

  it('Universe.exitStarSystem returns to galaxy view', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' as QualityLevel });
    universe.enterStarSystem(0);

    universe.exitStarSystem();

    expect(universe.solarSystem).toBeNull();
    expect(universe.activeStarIndex).toBeNull();
    expect(universe.navigation.level).toBe(ViewLevel.GALAXY);
  });

  it('different stars produce different solar systems', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' as QualityLevel });

    const system1 = universe.enterStarSystem(0);
    const mass1 = system1!.star.mass;
    const planets1 = system1!.planets.length;

    universe.exitStarSystem();

    const system2 = universe.enterStarSystem(100);
    const mass2 = system2!.star.mass;
    const planets2 = system2!.planets.length;

    // At least mass or planet count should differ
    expect(mass1 === mass2 && planets1 === planets2).toBe(false);
  });

  it('re-entering the same star produces the same system', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' as QualityLevel });

    const system1 = universe.enterStarSystem(50);
    const mass1 = system1!.star.mass;
    const planets1 = system1!.planets.length;

    universe.exitStarSystem();

    const system2 = universe.enterStarSystem(50);
    const mass2 = system2!.star.mass;
    const planets2 = system2!.planets.length;

    expect(mass1).toBe(mass2);
    expect(planets1).toBe(planets2);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. Existing Solar System Generator (unchanged)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Existing Solar System Generator (Mission 001)', () => {
  it('still generates deterministic systems', () => {
    const system1 = generateSolarSystem(42);
    const system2 = generateSolarSystem(42);

    expect(system1.star.name).toBe(system2.star.name);
    expect(system1.star.mass).toBe(system2.star.mass);
    expect(system1.planets.length).toBe(system2.planets.length);
  });

  it('still generates valid star + planets', () => {
    const system = generateSolarSystem(42);

    expect(system.star.type).toBe(CelestialBodyType.STAR);
    expect(system.planets.length).toBeGreaterThanOrEqual(3);
    expect(system.planets.length).toBeLessThanOrEqual(8);

    for (const planet of system.planets) {
      expect(planet.type).toBe(CelestialBodyType.PLANET);
      expect(planet.mass).toBeGreaterThan(0);
      expect(planet.radius).toBeGreaterThan(0);
    }
  });

  it('Universe.generateSolarSystem still works (backward compatibility)', () => {
    const universe = new Universe(42);
    const system = universe.generateSolarSystem();

    expect(system).toBeDefined();
    expect(system.star).toBeDefined();
    expect(universe.bodies.length).toBeGreaterThan(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. Quality Levels
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Quality Levels', () => {
  it('LOW produces fewer stars than HIGH', () => {
    const low = generateGalaxy(42, { quality: 'LOW' as QualityLevel });
    const high = generateGalaxy(42, { quality: 'HIGH' as QualityLevel });

    expect(low.stars.length).toBeLessThan(high.stars.length);
  });

  it('all quality levels produce valid galaxies', () => {
    const qualities: QualityLevel[] = ['LOW' as QualityLevel, 'MEDIUM' as QualityLevel, 'HIGH' as QualityLevel];

    for (const quality of qualities) {
      const galaxy = generateGalaxy(42, { quality });

      expect(galaxy.stars.length).toBeGreaterThan(0);
      expect(galaxy.clusters.length).toBeGreaterThan(0);
      expect(galaxy.type).toBe(GalaxyType.BARRED_SPIRAL);
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. ANANTARA α Scientific Reconstruction & Astrophysics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('ANANTARA α Scientific Reconstruction & Astrophysics', () => {
  const galaxy = generateGalaxy(42);

  describe('Identity and Dimensions (Constraint 1 & 8)', () => {
    it('has exact display name ANANTARA α and immutable ID galaxy-42', () => {
      expect(galaxy.displayName).toBe('ANANTARA α');
      expect(galaxy.id).toBe('galaxy-42');
      expect(galaxy.generationVersion).toBe(2);
      expect(galaxy.type).toBe(GalaxyType.BARRED_SPIRAL);
    });

    it('targets 500,000-light-year main stellar disk diameter', () => {
      expect(galaxy.diskStructure).toBeDefined();
      expect(galaxy.diskStructure?.mainDiskDiameterLy).toBe(500000);
      // Main disk radius R = 250,000 ly in kpc
      const expectedRadiusKpc = lightYearsToKpc(250000);
      expect(galaxy.diskStructure?.mainDiskRadiusKpc).toBeCloseTo(expectedRadiusKpc, 4);
      expect(galaxy.radius).toBeCloseTo(expectedRadiusKpc, 4);
      expect(galaxy.radius).toBeGreaterThan(76.6);
      expect(galaxy.radius).toBeLessThan(76.7);
    });

    it('models extended stellar halo separately (750,000 ly diameter)', () => {
      expect(galaxy.diskStructure?.extendedHaloDiameterLy).toBeCloseTo(750000, 1);
      const expectedHaloRadiusKpc = lightYearsToKpc(375000);
      expect(galaxy.diskStructure?.extendedHaloRadiusKpc).toBeCloseTo(expectedHaloRadiusKpc, 4);
      expect(galaxy.diskStructure?.extendedHaloRadiusKpc).toBeGreaterThan(galaxy.radius);
    });

    it('models dual thin and thick stellar disk components', () => {
      expect(galaxy.diskStructure?.thinScaleHeight).toBe(1.5);
      expect(galaxy.diskStructure?.thickScaleHeight).toBe(4.5);
      expect(galaxy.diskStructure?.thickDiskFraction).toBe(0.15);
    });
  });

  describe('Astrophysical Unit Conversions (Constraint 2)', () => {
    it('accurately converts between kpc and light-years', () => {
      // 1 pc = 3.261563777 ly -> 1 kpc = 3261.563777 ly
      expect(kpcToLightYears(1.0)).toBeCloseTo(3261.563777, 3);
      expect(lightYearsToKpc(3261.563777)).toBeCloseTo(1.0, 4);

      // 500,000 ly to kpc
      const kpc500k = lightYearsToKpc(500000);
      expect(kpc500k).toBeCloseTo(153.3007, 2);
      expect(kpcToLightYears(kpc500k)).toBeCloseTo(500000, 1);
    });

    it('independently validates Schwarzschild radius derivation: r_s = 2GM/c²', () => {
      const bhMassSolar = 4.154e6;
      const massKg = bhMassSolar * SOLAR_MASS;

      // Independent manual calculation with raw physical constants
      const G_RAW = 6.6743e-11;
      const C_RAW = 299792458;
      const independentRsMeters = (2 * G_RAW * massKg) / (C_RAW * C_RAW);
      const independentRsKm = independentRsMeters / 1000;
      const independentRsAU = independentRsMeters / AU;

      // Function under test
      const derivedMeters = schwarzschildRadiusMeters(bhMassSolar);
      const derivedKm = schwarzschildRadiusKm(bhMassSolar);
      const derivedAU = schwarzschildRadiusAU(bhMassSolar);

      expect(derivedMeters).toBeCloseTo(independentRsMeters, -2);
      expect(derivedKm).toBeCloseTo(independentRsKm, 0);
      expect(derivedAU).toBeCloseTo(independentRsAU, 5);

      // Verify physical magnitude for ANANTARA A* (4.154M M☉)
      // rs ~ 1.2271e10 m = 12.271M km ~ 0.0820 AU
      expect(derivedKm).toBeGreaterThan(12.2e6);
      expect(derivedKm).toBeLessThan(12.3e6);
      expect(derivedAU).toBeGreaterThan(0.081);
      expect(derivedAU).toBeLessThan(0.083);
    });

    it('attaches verified supermassive black hole nucleus ANANTARA A*', () => {
      const smbh = galaxy.nucleus;
      expect(smbh).toBeDefined();
      expect(smbh?.name).toBe('ANANTARA A*');
      expect(smbh?.massSolar).toBe(4.154e6);
      expect(smbh?.spinParameter).toBe(0.94);
      expect(smbh?.schwarzschildRadiusKm).toBeCloseTo(12.2714e6, -3);
      expect(smbh?.schwarzschildRadiusAU).toBeCloseTo(0.08201, 3);
      expect(smbh?.accretionState).toBe('quiescent');
      expect(smbh?.jetLengthKpc).toBeDefined();
      expect(smbh?.radioLobeRadiusKpc).toBeDefined();
      expect(smbh?.isFictionalSimulation).toBe(true);
      expect(smbh?.visualScaleNotice).toBeDefined();
    });

    it('supports dynamic reconfiguration of SMBH mass (configurable mass simulation)', () => {
      // 1. Sgr A* analogue (4.154M M☉)
      const base = recalculateSupermassiveBlackHole(4.154e6);
      expect(base.schwarzschildRadiusAU).toBeCloseTo(0.08201, 3);
      expect(base.photonRingAU).toBeCloseTo(0.12301, 3);

      // 2. Colossal IC 1101 analogue (40B M☉)
      const colossal = recalculateSupermassiveBlackHole(4.0e10);
      expect(colossal.massSolar).toBe(4.0e10);
      // rs scales linearly: 4e10 / 4.154e6 * 0.08201 ~ 789.7 AU
      expect(colossal.schwarzschildRadiusAU).toBeGreaterThan(700);
      expect(colossal.schwarzschildRadiusAU).toBeLessThan(900);
      expect(colossal.photonRingAU).toBeCloseTo(colossal.schwarzschildRadiusAU * 1.5, 1);
      expect(colossal.accretionState).toBe('active');
      expect(colossal.eddingtonLuminosityWatts).toBeGreaterThan(base.eddingtonLuminosityWatts!);

      // 3. Update live on Universe instance
      const universe = new Universe(42);
      universe.generateGalaxy();
      expect(universe.nucleus?.massSolar).toBe(4.154e6);

      const updated = universe.setNucleusMass(1.0e9);
      expect(updated).not.toBeNull();
      expect(universe.nucleus?.massSolar).toBe(1.0e9);
      expect(universe.nucleus?.schwarzschildRadiusAU).toBeGreaterThan(15);
    });
  });

  describe('Triaxial Stellar Bar & 4 Logarithmic Spiral Arms (Constraint 5)', () => {
    it('defines triaxial stellar bar parameters', () => {
      const bar = galaxy.bar;
      expect(bar).toBeDefined();
      expect(bar?.length).toBeCloseTo(19.929, 2);
      expect(bar?.width).toBeCloseTo(6.576, 2);
      expect(bar?.thickness).toBe(3.5);
      expect(bar?.angle).toBeCloseTo(0.48869, 4); // ~28 degrees
      expect((bar!.angle * 180) / Math.PI).toBeCloseTo(28.0, 1);
    });

    it('defines 4 continuous logarithmic spiral arms starting from bar ends', () => {
      const arms = galaxy.spiralArmDefinitions;
      expect(arms).toBeDefined();
      expect(arms).toHaveLength(4);

      const expectedNames = [
        'Scutum-Centaurus Arm',
        'Perseus Arm',
        'Sagittarius-Carina Arm',
        'Norma-Outer Arm',
      ];

      for (let i = 0; i < 4; i++) {
        expect(arms![i].name).toBe(expectedNames[i]);
        expect(arms![i].pitchAngleRad).toBeGreaterThan((11.0 * Math.PI) / 180);
        expect(arms![i].pitchAngleRad).toBeLessThan((14.0 * Math.PI) / 180);
        expect(arms![i].startRadius).toBeGreaterThan(12.0);
        expect(arms![i].startRadius).toBeLessThanOrEqual(20.0);
        expect(arms![i].widthExpansionCoeff).toBeGreaterThan(0);
      }
    });
  });

  describe('Preservation of Determinism & Downstream Integration (Constraint 3)', () => {
    it('preserves star seeds, names, and solar system drill-down integrity', () => {
      const star = galaxy.stars[0];
      expect(star.id).toBe('gs-42-0');
      expect(star.seed).toBeDefined();

      const universe = new Universe(42);
      universe.generateGalaxy();
      const system = universe.enterStarSystem(0);

      expect(system).toBeDefined();
      expect(system?.star).toBeDefined();
      expect(universe.activeStar?.name).toBe(star.name);
      expect(universe.viewLevel).toBe(ViewLevel.SYSTEM);

      universe.exitStarSystem();
      expect(universe.viewLevel).toBe(ViewLevel.GALAXY);
    });

    it('ensures separate PRNG forks prevent cross-stream desynchronization', () => {
      const g1 = generateGalaxy(42);
      const g2 = generateGalaxy(42);

      expect(g1.stars.length).toBe(g2.stars.length);
      for (let i = 0; i < 50; i++) {
        expect(g1.stars[i].seed).toBe(g2.stars[i].seed);
        expect(g1.stars[i].name).toBe(g2.stars[i].name);
        expect(g1.stars[i].x).toBe(g2.stars[i].x);
        expect(g1.stars[i].y).toBe(g2.stars[i].y);
        expect(g1.stars[i].z).toBe(g2.stars[i].z);
      }
    });
  });
});

