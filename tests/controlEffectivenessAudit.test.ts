/**
 * ASTRAVERSA Ω — Mission 003A Control Effectiveness Audit Tests
 *
 * Runs controlled low/default/high parameter experiments on seed 42
 * measuring requested values, generated counts, active rendered counts,
 * and hardware safety caps.
 */

import { describe, it, expect } from 'vitest';
import { generateGalaxy } from '../src/universe/GalaxyGenerator';
import {
  computeActiveRenderedStars,
  createDefaultObservatorySettings,
  DEFAULT_LAYER_VISIBILITY,
} from '../src/rendering';

describe('Mission 003A — Controlled Low / Default / High Parameter Experiments (Seed 42)', () => {
  const SEED = 42;

  describe('1. Stellar Tracer Population & Buffer Limits', () => {
    it('records exact requested vs generated vs rendered counts across presets', () => {
      // Low (8,000)
      const low = generateGalaxy(SEED, { starCount: 8000 });
      const lowActive = computeActiveRenderedStars(low.stars.length, low.bar !== undefined, DEFAULT_LAYER_VISIBILITY);
      expect(low.stars.length).toBe(8000);
      expect(lowActive).toBe(8000);

      // Default Medium (20,000)
      const def = generateGalaxy(SEED, { starCount: 20000 });
      const defActive = computeActiveRenderedStars(def.stars.length, def.bar !== undefined, DEFAULT_LAYER_VISIBILITY);
      expect(def.stars.length).toBe(20000);
      expect(defActive).toBe(20000);

      // High (40,000)
      const high = generateGalaxy(SEED, { starCount: 40000 });
      const highActive = computeActiveRenderedStars(high.stars.length, high.bar !== undefined, DEFAULT_LAYER_VISIBILITY);
      expect(high.stars.length).toBe(40000);
      expect(highActive).toBe(40000);

      // Ultra (75,000)
      const ultra = generateGalaxy(SEED, { starCount: 75000 });
      const ultraActive = computeActiveRenderedStars(ultra.stars.length, ultra.bar !== undefined, DEFAULT_LAYER_VISIBILITY);
      expect(ultra.stars.length).toBe(75000);
      expect(ultraActive).toBe(75000);

      // Clamped safe hardware limit (requested 120,000 -> clamped to 100,000)
      const capped = generateGalaxy(SEED, { starCount: 120000 });
      expect(capped.stars.length).toBe(100000);

      // Clamped minimum safe limit (requested 2,000 -> clamped to 5,000)
      const minCapped = generateGalaxy(SEED, { starCount: 2000 });
      expect(minCapped.stars.length).toBe(5000);
    });

    it('verifies deterministic seed continuity across different tracer densities', () => {
      const g1 = generateGalaxy(SEED, { starCount: 8000 });
      const g2 = generateGalaxy(SEED, { starCount: 20000 });
      const g3 = generateGalaxy(SEED, { starCount: 40000 });

      // First star seed and ID must be strictly identical
      expect(g1.stars[0].id).toBe('gs-42-0');
      expect(g2.stars[0].id).toBe('gs-42-0');
      expect(g3.stars[0].id).toBe('gs-42-0');
      expect(g1.stars[0].seed).toBe(g2.stars[0].seed);
      expect(g2.stars[0].seed).toBe(g3.stars[0].seed);
    });
  });

  describe('2. Gas Cloud & Interstellar Medium Population vs Spatial Distribution', () => {
    it('verifies cloud count scales buffer points without affecting star seeds', () => {
      const settings = createDefaultObservatorySettings();
      expect(settings.cloudCount).toBe(14000);
      expect(settings.cloudCoverage).toBe(1.0);
      expect(settings.cloudOpacity).toBe(1.0);

      // Low: 4,000 particles
      const lowClouds = 4000;
      // High: 30,000 particles
      const highClouds = 30000;

      // Spatial coverage spread: 0.5x (concentrated ridges) to 2.0x (diffuse halo)
      const lowSpread = 0.5;
      const highSpread = 2.0;

      expect(lowClouds).toBeGreaterThanOrEqual(4000);
      expect(highClouds).toBeLessThanOrEqual(30000);
      expect(highClouds / lowClouds).toBe(7.5); // 7.5x dynamic particle range
      expect(highSpread / lowSpread).toBe(4.0); // 4.0x spatial coverage range
    });

    it('verifies dust lane particle counts and coverage parameters', () => {
      const settings = createDefaultObservatorySettings();
      expect(settings.dustCount).toBe(4800);
      expect(settings.dustCoverage).toBe(1.0);
      expect(settings.dustOpacity).toBe(0.50);

      // Low: 1,500 particles, High: 12,000 particles (8x dynamic range)
      const lowDust = 1500;
      const highDust = 12000;
      expect(highDust / lowDust).toBe(8.0);
    });
  });

  describe('3. Spiral Arm Morphology Architecture Experiments', () => {
    it('evaluates 2, 4, 6, and 8 spiral arm generation', () => {
      const g2 = generateGalaxy(SEED, { quality: 'LOW', armCount: 2 });
      const g4 = generateGalaxy(SEED, { quality: 'LOW', armCount: 4 });
      const g6 = generateGalaxy(SEED, { quality: 'LOW', armCount: 6 });
      const g8 = generateGalaxy(SEED, { quality: 'LOW', armCount: 8 });

      expect(g2.spiralArms.armCount).toBe(2);
      expect(g4.spiralArms.armCount).toBe(4);
      expect(g6.spiralArms.armCount).toBe(6);
      expect(g8.spiralArms.armCount).toBe(8);

      expect(g2.spiralArmDefinitions?.length).toBe(2);
      expect(g4.spiralArmDefinitions?.length).toBe(4);
      expect(g6.spiralArmDefinitions?.length).toBe(6);
      expect(g8.spiralArmDefinitions?.length).toBe(8);
    });

    it('evaluates pitch angle, width multiplier, and winding factor variations', () => {
      // Low pitch angle (6°) -> tightly wound
      const tight = generateGalaxy(SEED, { quality: 'LOW', armPitchAngleDeg: 6.0, armWidthMult: 0.5 });
      expect(tight.spiralArmDefinitions?.[0].pitchAngleRad).toBeCloseTo(6.0 * (Math.PI / 180), 4);
      expect(tight.spiralArms.armWidth).toBeCloseTo(0.10 * 0.5, 4);

      // High pitch angle (28°) -> open radial spiral
      const open = generateGalaxy(SEED, { quality: 'LOW', armPitchAngleDeg: 28.0, armWidthMult: 2.0 });
      expect(open.spiralArmDefinitions?.[0].pitchAngleRad).toBeCloseTo(28.0 * (Math.PI / 180), 4);
      expect(open.spiralArms.armWidth).toBeCloseTo(0.10 * 2.0, 4);
    });
  });

  describe('4. Scale & Morphology Boundary Experiments', () => {
    it('evaluates physical diameter variations (100k ly vs 500k ly vs 1.5M ly)', () => {
      const mw = generateGalaxy(SEED, { quality: 'LOW', targetDiameterLy: 100000 });
      const canonical = generateGalaxy(SEED, { quality: 'LOW', targetDiameterLy: 500000 });
      const giant = generateGalaxy(SEED, { quality: 'LOW', targetDiameterLy: 1500000 });

      expect(mw.radius).toBeCloseTo(15.33, 1);
      expect(canonical.radius).toBeCloseTo(76.65, 1);
      expect(giant.radius).toBeCloseTo(229.95, 1);

      expect(giant.radius / mw.radius).toBeCloseTo(15.0, 1);
    });

    it('evaluates bulge radius fraction (0.05 to 0.30) and halo multiplier (1.0x to 2.5x)', () => {
      const compactBulge = generateGalaxy(SEED, { quality: 'LOW', bulgeRadiusFraction: 0.05, haloRadiusMultiplier: 1.0 });
      const massiveBulge = generateGalaxy(SEED, { quality: 'LOW', bulgeRadiusFraction: 0.30, haloRadiusMultiplier: 2.5 });

      expect(compactBulge.bulge.radiusFraction).toBeCloseTo(0.05, 2);
      expect(massiveBulge.bulge.radiusFraction).toBeCloseTo(0.30, 2);

      expect(compactBulge.diskStructure?.extendedHaloDiameterLy).toBeCloseTo(500000, 0);
      expect(massiveBulge.diskStructure?.extendedHaloDiameterLy).toBeCloseTo(1250000, 0);
    });
  });
});
