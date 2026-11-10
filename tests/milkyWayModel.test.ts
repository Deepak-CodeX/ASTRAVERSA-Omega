/**
 * ASTRAVERSA Ω — Milky Way Model & Galactic Morphology Tests (Mission 002B)
 *
 * Verifies:
 * 1. Physical dimensions & morphology:
 *    - Main stellar disk diameter: 100,000 ly (~30.66 kpc diameter, R ~15.33 kpc)
 *    - Oblate bulge: axis ratio q = c/a ~ 0.35 (strictly <= 0.40) to prevent vertical elongation
 *    - Central bar: length ~4.5 kpc, angle ~28 deg
 *    - 4 main arms + Orion Spur
 *    - Dual thin/thick disk scale heights (0.30 kpc and 0.90 kpc)
 * 2. Sagittarius A*:
 *    - Mass: 4.154 × 10⁶ M☉
 *    - Quiescent accretion state, Schwarzschild radius derivation (~12.27 × 10⁶ km)
 * 3. Solar System coordinates:
 *    - Sun (Sol) located at Galactocentric coordinates (0, +0.020, 8.2) kpc
 *    - Tagged with OBSERVED provenance
 * 4. Canonical observed stars:
 *    - Alpha Centauri / Proxima, Sirius, Vega, Betelgeuse, TRAPPIST-1, Kepler-186
 */

import { describe, it, expect } from 'vitest';
import {
  generateMilkyWay,
  createSagittariusAStar,
  SUN_GALACTOCENTRIC_X,
  SUN_GALACTOCENTRIC_Y,
  SUN_GALACTOCENTRIC_Z,
  MILKY_WAY_SEED,
} from '../src/universe/MilkyWayGenerator';
import { GalaxyType } from '../src/universe/Galaxy';
import { AstronomicalProvenance } from '../src/universe/AstronomicalProvenance';
import { SOLAR_MASS } from '../src/astronomy/constants';

describe('Mission 002B — Milky Way Galaxy Model & Galactic Morphology', () => {
  describe('Milky Way Physical Dimensions', () => {
    it('models canonical 100,000 light-year stellar disk diameter', () => {
      const mw = generateMilkyWay('LOW');
      expect(mw.diskStructure?.mainDiskDiameterLy).toBe(100000);
      expect(mw.radius).toBeCloseTo(15.33, 1); // R_disk ~ 15.33 kpc
      expect(mw.type).toBe(GalaxyType.BARRED_SPIRAL);
      expect(mw.name).toContain('Milky Way');
    });

    it('models extended stellar halo and dual thin/thick disk structure', () => {
      const mw = generateMilkyWay('LOW');
      expect(mw.diskStructure?.extendedHaloDiameterLy).toBe(160000);
      expect(mw.diskStructure?.thinScaleHeight).toBeCloseTo(0.30, 2); // 300 pc
      expect(mw.diskStructure?.thickScaleHeight).toBeCloseTo(0.90, 2); // 900 pc
      expect(mw.diskStructure?.radialScaleLength).toBeCloseTo(2.6, 1);
    });

    it('enforces oblate boxy/peanut bulge to prevent vertical elongation bug', () => {
      const mw = generateMilkyWay('LOW');
      expect(mw.bulge.verticalScale).toBeCloseTo(0.35, 2);
      expect(mw.bulge.verticalScale).toBeLessThanOrEqual(0.40);
      expect(mw.bulge.radiusFraction).toBeCloseTo(0.14, 2);
    });

    it('models central stellar bar parameters matching 2MASS and Spitzer surveys', () => {
      const mw = generateMilkyWay('LOW');
      expect(mw.bar?.length).toBeCloseTo(4.5, 1); // 4.5 kpc semi-major axis
      expect(mw.bar?.width).toBeCloseTo(1.5, 1);
      expect(mw.bar?.thickness).toBeCloseTo(0.40, 2); // flattened in-plane
      expect(mw.bar?.angle).toBeCloseTo(28.0 * (Math.PI / 180), 3); // 28 deg position angle
    });

    it('models 4 spiral arms starting from bar ends', () => {
      const mw = generateMilkyWay('LOW');
      expect(mw.spiralArms.armCount).toBe(4);
      expect(mw.spiralArms.armOffset).toBeCloseTo(28.0 * (Math.PI / 180), 3);
    });
  });

  describe('Central Supermassive Black Hole (Sagittarius A*)', () => {
    it('models Sagittarius A* with 4.154 million solar masses', () => {
      const sgrA = createSagittariusAStar();
      expect(sgrA.id).toBe('smbh-sagittarius-a-star');
      expect(sgrA.name).toBe('Sagittarius A*');
      expect(sgrA.massSolar).toBe(4.154e6);
      expect(sgrA.massKg).toBeCloseTo(4.154e6 * SOLAR_MASS, -20);
    });

    it('accurately derives physical Schwarzschild radius rs = 2GM/c²', () => {
      const sgrA = createSagittariusAStar();
      // rs ≈ 2.953 km/M_sun * 4.154e6 ≈ 12.27 million km (~0.082 AU)
      expect(sgrA.schwarzschildRadiusKm).toBeCloseTo(12.27e6, -5);
      expect(sgrA.schwarzschildRadiusAU).toBeCloseTo(0.082, 2);
      expect(sgrA.accretionState).toBe('quiescent');
      expect(sgrA.isFictionalSimulation).toBe(false);
    });
  });

  describe('Canonical Observed Stars & Sun Location', () => {
    it('places the Sun at true Galactocentric coordinates (0, +0.020, 8.2) kpc', () => {
      const mw = generateMilkyWay('LOW');
      const sun = mw.stars.find(s => s.id === 'star-sun-sol');

      expect(sun).toBeDefined();
      expect(sun!.name).toContain('Sun (Sol)');
      expect(sun!.x).toBe(SUN_GALACTOCENTRIC_X);
      expect(sun!.y).toBe(SUN_GALACTOCENTRIC_Y); // +20 pc above midplane
      expect(sun!.z).toBe(SUN_GALACTOCENTRIC_Z); // 8.2 kpc from Galactic Center
      expect(sun!.massSolar).toBe(1.0);
      expect(sun!.temperature).toBe(5778);
      expect(sun!.spectralClass).toBe('G');
    });

    it('attaches OBSERVED provenance to Sun and benchmark stars', () => {
      const mw = generateMilkyWay('LOW');
      const sun = mw.stars.find(s => s.id === 'star-sun-sol');
      expect(sun?.provenance).toBeDefined();
      expect(sun?.provenance?.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(sun?.provenance?.sourceArchive).toContain('JPL');
    });

    it('includes essential benchmark observational stars (Alpha Cen/Proxima, Sirius, Vega, Betelgeuse, TRAPPIST-1, Kepler-186)', () => {
      const mw = generateMilkyWay('LOW');
      const starIds = mw.stars.map(s => s.id);

      expect(starIds).toContain('star-sun-sol');
      expect(starIds).toContain('star-proxima-centauri');
      expect(starIds).toContain('star-sirius');
      expect(starIds).toContain('star-vega');
      expect(starIds).toContain('star-betelgeuse');
      expect(starIds).toContain('star-trappist-1');
      expect(starIds).toContain('star-kepler-186');

      for (const id of ['star-proxima-centauri', 'star-sirius', 'star-trappist-1']) {
        const star = mw.stars.find(s => s.id === id);
        expect(star?.provenance?.classification).toBe(AstronomicalProvenance.OBSERVED);
      }
    });

    it('maintains determinism across repeated generations', () => {
      const mw1 = generateMilkyWay('LOW', 8000);
      const mw2 = generateMilkyWay('LOW', 8000);

      expect(mw1.stars.length).toBe(mw2.stars.length);
      expect(mw1.stars[0].name).toBe(mw2.stars[0].name);
      expect(mw1.stars[10].x).toBe(mw2.stars[10].x);
      expect(mw1.stars[10].y).toBe(mw2.stars[10].y);
      expect(mw1.stars[10].z).toBe(mw2.stars[10].z);
    });
  });
});

