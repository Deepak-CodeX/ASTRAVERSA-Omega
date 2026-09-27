/**
 * ASTRAVERSA Ω — SolarSystemGenerator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { CelestialBodyType } from '../src/universe/CelestialBody';

describe('SolarSystemGenerator', () => {
  describe('determinism', () => {
    it('generates identical systems from the same seed', () => {
      const system1 = generateSolarSystem(42);
      const system2 = generateSolarSystem(42);

      expect(system1.star.name).toBe(system2.star.name);
      expect(system1.star.mass).toBe(system2.star.mass);
      expect(system1.star.radius).toBe(system2.star.radius);
      expect(system1.planets.length).toBe(system2.planets.length);

      for (let i = 0; i < system1.planets.length; i++) {
        expect(system1.planets[i].name).toBe(system2.planets[i].name);
        expect(system1.planets[i].mass).toBe(system2.planets[i].mass);
        expect(system1.planets[i].position.x).toBe(system2.planets[i].position.x);
        expect(system1.planets[i].position.z).toBe(system2.planets[i].position.z);
      }
    });

    it('generates different systems from different seeds', () => {
      const system1 = generateSolarSystem(42);
      const system2 = generateSolarSystem(99);

      // Could theoretically generate the same star name, but very unlikely
      // Instead, check that at least masses differ
      const sameMass = system1.star.mass === system2.star.mass;
      const samePlanets = system1.planets.length === system2.planets.length;

      // At least one property should differ
      expect(sameMass && samePlanets).toBe(false);
    });
  });

  describe('structure', () => {
    it('generates a star and planets', () => {
      const system = generateSolarSystem(42);

      expect(system.star).toBeDefined();
      expect(system.star.type).toBe(CelestialBodyType.STAR);
      expect(system.planets.length).toBeGreaterThanOrEqual(3);
      expect(system.planets.length).toBeLessThanOrEqual(8);
    });

    it('bodies array contains star + planets', () => {
      const system = generateSolarSystem(42);
      expect(system.bodies.length).toBe(system.planets.length + 1);
      expect(system.bodies[0]).toBe(system.star);
    });

    it('all planets have type PLANET', () => {
      const system = generateSolarSystem(42);
      for (const planet of system.planets) {
        expect(planet.type).toBe(CelestialBodyType.PLANET);
      }
    });

    it('all planets reference the parent star', () => {
      const system = generateSolarSystem(42);
      for (const planet of system.planets) {
        expect(planet.planetProperties?.parentId).toBe(system.star.id);
      }
    });
  });

  describe('physical validity', () => {
    it('star has positive mass and radius', () => {
      for (let seed = 0; seed < 20; seed++) {
        const system = generateSolarSystem(seed);
        expect(system.star.mass).toBeGreaterThan(0);
        expect(system.star.radius).toBeGreaterThan(0);
      }
    });

    it('planets have positive mass and radius', () => {
      for (let seed = 0; seed < 20; seed++) {
        const system = generateSolarSystem(seed);
        for (const planet of system.planets) {
          expect(planet.mass).toBeGreaterThan(0);
          expect(planet.radius).toBeGreaterThan(0);
        }
      }
    });

    it('planets are sorted by orbital distance', () => {
      for (let seed = 0; seed < 20; seed++) {
        const system = generateSolarSystem(seed);
        for (let i = 1; i < system.planets.length; i++) {
          const prevOrbit = system.planets[i - 1].planetProperties!.orbitalRadius;
          const currOrbit = system.planets[i].planetProperties!.orbitalRadius;
          expect(currOrbit).toBeGreaterThan(prevOrbit);
        }
      }
    });

    it('planets have non-zero orbital velocity', () => {
      const system = generateSolarSystem(42);
      for (const planet of system.planets) {
        const speed = planet.velocity.magnitude();
        expect(speed).toBeGreaterThan(0);
      }
    });

    it('star properties are set', () => {
      const system = generateSolarSystem(42);
      expect(system.star.starProperties).toBeDefined();
      expect(system.star.starProperties!.temperature).toBeGreaterThan(0);
      expect(system.star.starProperties!.luminosity).toBeGreaterThan(0);
    });

    it('all bodies have unique IDs', () => {
      const system = generateSolarSystem(42);
      const ids = new Set(system.bodies.map(b => b.id));
      expect(ids.size).toBe(system.bodies.length);
    });
  });
});
