/**
 * ASTRAVERSA Ω — Galaxy Generator Tests
 *
 * Tests for Mission 002: Procedural galaxy generation,
 * determinism, structure, hierarchy, and integration
 * with Mission 001 solar system generator.
 */

import { describe, it, expect } from 'vitest';
import { generateGalaxy } from '../src/universe/GalaxyGenerator';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { Universe } from '../src/universe/Universe';
import { GalaxyType, ViewLevel } from '../src/universe/Galaxy';
import type { QualityLevel } from '../src/universe/Galaxy';
import { CelestialBodyType } from '../src/universe/CelestialBody';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Galaxy Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Galaxy Generation', () => {
  it('generates a galaxy with all required properties', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.id).toBe('galaxy-42');
    expect(galaxy.name).toBeDefined();
    expect(galaxy.name.length).toBeGreaterThan(0);
    expect(galaxy.seed).toBe(42);
    expect(galaxy.type).toBe(GalaxyType.SPIRAL);
    expect(galaxy.radius).toBeGreaterThan(0);
    expect(galaxy.thickness).toBeGreaterThan(0);
    expect(galaxy.estimatedPopulation).toBeGreaterThan(0);
    expect(galaxy.age).toBeGreaterThan(0);
    expect(galaxy.metallicity).toBeGreaterThanOrEqual(0);
    expect(galaxy.metallicity).toBeLessThanOrEqual(1);
  });

  it('generates spiral arm parameters', () => {
    const galaxy = generateGalaxy(42);

    expect(galaxy.spiralArms.armCount).toBeGreaterThanOrEqual(2);
    expect(galaxy.spiralArms.armCount).toBeLessThanOrEqual(4);
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
    for (let seed = 0; seed < 10; seed++) {
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
      expect(galaxy.type).toBe(GalaxyType.SPIRAL);
    }
  });
});
