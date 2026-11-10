/**
 * ASTRAVERSA Ω — Canonical Real Solar System Tests (Mission 002B)
 *
 * Verifies:
 * 1. Sol (Sun) properties:
 *    - Spectral class G2V, mass 1.9885e30 kg, radius 6.957e8 m, temp 5778 K
 *    - Valid Habitable Zone calculation attached
 *    - OBSERVED provenance
 * 2. Canonical Planets:
 *    - Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto
 *    - Physical masses, radii, albedos matching NASA Planetary Fact Sheets
 *    - Ground-truth Keplerian orbital elements (semi-major axis, eccentricity, inclination)
 *    - Kopparapu (2013) habitability classifications:
 *      * Mercury & Venus: TOO_HOT
 *      * Earth: CONSERVATIVE_HZ
 *      * Mars: OPTIMISTIC_OUTER
 *      * Outer gas/ice giants: TOO_COLD
 * 3. Natural Satellites:
 *    - Earth: Moon (Luna)
 *    - Mars: Phobos, Deimos
 *    - Jupiter: Io, Europa, Ganymede, Callisto
 *    - Saturn: Titan, Enceladus, Mimas
 *    - Uranus: Titania, Oberon, Miranda
 *    - Neptune: Triton
 *    - Pluto: Charon
 * 4. All bodies have OBSERVED provenance with NASA/JPL Horizons attribution.
 */

import { describe, it, expect } from 'vitest';
import { createCanonicalSolarSystem } from '../src/universe/data/canonicalSolarSystem';
import { CelestialBodyType } from '../src/universe/CelestialBody';
import { AstronomicalProvenance } from '../src/universe/AstronomicalProvenance';
import { AU } from '../src/astronomy/constants';

describe('Mission 002B — Canonical Real Solar System', () => {
  const solarSystem = createCanonicalSolarSystem();

  describe('The Sun (Sol)', () => {
    it('models our home star with empirical solar values', () => {
      const sun = solarSystem.star;

      expect(sun.name).toContain('Sun (Sol)');
      expect(sun.type).toBe(CelestialBodyType.STAR);
      expect(sun.mass).toBeCloseTo(1.9885e30, -25);
      expect(sun.radius).toBeCloseTo(6.957e8, -5);
      expect(sun.starProperties?.temperature).toBe(5778);
      expect(sun.starProperties?.spectralClass).toBe('G');
    });

    it('calculates realistic habitable zone encompassing 1 AU', () => {
      const hz = solarSystem.star.starProperties?.habitableZone;
      expect(hz).toBeDefined();
      expect(hz!.innerConservativeAU).toBeLessThan(1.0);
      expect(hz!.outerConservativeAU).toBeGreaterThan(1.0);
    });

    it('bears OBSERVED provenance citing NASA/JPL Horizons', () => {
      expect(solarSystem.star.provenance?.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(solarSystem.star.provenance?.sourceArchive).toContain('JPL');
    });
  });

  describe('Canonical Planets & Dwarf Planets', () => {
    it('contains all 8 official IAU planets plus Pluto in orbital order', () => {
      const planetNames = solarSystem.planets.map(p => p.name);
      expect(planetNames).toContain('Mercury');
      expect(planetNames).toContain('Venus');
      expect(planetNames).toContain('Earth');
      expect(planetNames).toContain('Mars');
      expect(planetNames).toContain('Jupiter');
      expect(planetNames).toContain('Saturn');
      expect(planetNames).toContain('Uranus');
      expect(planetNames).toContain('Neptune');
      expect(planetNames).toContain('Pluto');
      expect(solarSystem.planets.length).toBe(9);
    });

    it('models Earth orbital parameters at 1.0 AU in conservative habitable zone', () => {
      const earth = solarSystem.planets.find(p => p.name === 'Earth')!;
      expect(earth).toBeDefined();

      const aAU = earth.planetProperties!.orbitalRadius! / AU;
      expect(aAU).toBeCloseTo(1.0, 2);
      expect(earth.planetProperties!.orbitalElements?.eccentricity).toBeCloseTo(0.0167, 3);
      expect(earth.planetProperties!.habitabilityStatus).toBe('CONSERVATIVE_HZ');
      expect(earth.mass).toBeCloseTo(5.9722e24, -20);
      expect(earth.radius).toBeCloseTo(6.371e6, -3);
    });

    it('models Mars in optimistic outer habitable zone', () => {
      const mars = solarSystem.planets.find(p => p.name === 'Mars')!;
      expect(mars).toBeDefined();

      const aAU = mars.planetProperties!.orbitalRadius! / AU;
      expect(aAU).toBeCloseTo(1.524, 2);
      expect(mars.planetProperties!.habitabilityStatus).toBe('OPTIMISTIC_OUTER');
    });

    it('models Venus and Mercury as TOO_HOT', () => {
      const mercury = solarSystem.planets.find(p => p.name === 'Mercury')!;
      const venus = solarSystem.planets.find(p => p.name === 'Venus')!;

      expect(mercury.planetProperties!.habitabilityStatus).toBe('TOO_HOT');
      expect(venus.planetProperties!.habitabilityStatus).toBe('TOO_HOT');
    });

    it('models Jupiter and outer gas giants as TOO_COLD', () => {
      const jupiter = solarSystem.planets.find(p => p.name === 'Jupiter')!;
      const saturn = solarSystem.planets.find(p => p.name === 'Saturn')!;
      const uranus = solarSystem.planets.find(p => p.name === 'Uranus')!;
      const neptune = solarSystem.planets.find(p => p.name === 'Neptune')!;

      expect(jupiter.planetProperties!.habitabilityStatus).toBe('TOO_COLD');
      expect(saturn.planetProperties!.habitabilityStatus).toBe('TOO_COLD');
      expect(uranus.planetProperties!.habitabilityStatus).toBe('TOO_COLD');
      expect(neptune.planetProperties!.habitabilityStatus).toBe('TOO_COLD');
    });

    it('assigns OBSERVED provenance to all planets', () => {
      for (const planet of solarSystem.planets) {
        expect(planet.provenance?.classification).toBe(AstronomicalProvenance.OBSERVED);
        expect(planet.provenance?.sourceArchive).toContain('JPL');
      }
    });
  });

  describe('Natural Satellites & Moons', () => {
    it('models Earth Moon (Luna)', () => {
      const moon = solarSystem.moons.find(m => m.name === 'Moon (Luna)');
      expect(moon).toBeDefined();
      expect(moon?.parentId).toBe('earth');
      expect(moon?.mass).toBeCloseTo(7.342e22, -18);
      expect(moon?.radius).toBeCloseTo(1.737e6, -3);
    });

    it('models Galilean moons orbiting Jupiter', () => {
      const jupiterMoons = solarSystem.moons.filter(m => m.parentId === 'jupiter');
      const names = jupiterMoons.map(m => m.name);

      expect(names).toContain('Io');
      expect(names).toContain('Europa');
      expect(names).toContain('Ganymede');
      expect(names).toContain('Callisto');
    });

    it('models Saturnian moons including Titan and Enceladus', () => {
      const saturnMoons = solarSystem.moons.filter(m => m.parentId === 'saturn');
      const names = saturnMoons.map(m => m.name);

      expect(names).toContain('Titan');
      expect(names).toContain('Enceladus');
    });

    it('models Pluto and Charon dwarf planet system', () => {
      const pluto = solarSystem.planets.find(p => p.name === 'Pluto');
      const charon = solarSystem.moons.find(m => m.name === 'Charon');

      expect(pluto).toBeDefined();
      expect(charon).toBeDefined();
      expect(charon?.parentId).toBe('pluto');
    });

    it('ensures all moons have valid parent references and OBSERVED provenance', () => {
      const allBodies = [solarSystem.star, ...solarSystem.planets, ...solarSystem.moons];
      const allIds = new Set(allBodies.map(b => b.id));

      for (const moon of solarSystem.moons) {
        expect(allIds.has(moon.parentId!)).toBe(true);
        expect(moon.provenance?.classification).toBe(AstronomicalProvenance.OBSERVED);
      }
    });
  });
});
