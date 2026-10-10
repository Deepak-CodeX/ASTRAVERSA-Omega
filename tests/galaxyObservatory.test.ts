/**
 * ASTRAVERSA Ω — Galaxy Observatory & Rendering Tests
 *
 * Validates layer visibility defaults, telemetry calculations,
 * and astronomical observatory scale relationships for ANANTARA α.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYER_VISIBILITY,
  type GalaxyLayerVisibility,
  type CameraPreset,
} from '../src/rendering';
import { generateGalaxy } from '../src/universe/GalaxyGenerator';
import { RENDER_SCALE_KPC } from '../src/astronomy/constants';

describe('Galaxy Observatory System', () => {
  describe('Layer Visibility Configuration', () => {
    it('has all visual layers active by default, including bar, nucleus, jets, and accretion', () => {
      expect(DEFAULT_LAYER_VISIBILITY).toEqual({
        disk: true,
        bar: true,
        bulge: true,
        dust: true,
        clusters: true,
        halo: true,
        nucleus: true,
        jets: true,
        accretion: true,
      });
    });

    it('supports toggling individual layers independently', () => {
      const state: GalaxyLayerVisibility = { ...DEFAULT_LAYER_VISIBILITY };

      // Toggle dust layer off
      state.dust = !state.dust;
      expect(state.dust).toBe(false);
      expect(state.disk).toBe(true);
      expect(state.bar).toBe(true);
      expect(state.bulge).toBe(true);
      expect(state.nucleus).toBe(true);
      expect(state.jets).toBe(true);
      expect(state.accretion).toBe(true);

      // Toggle jets and accretion off
      state.jets = false;
      state.accretion = false;
      expect(state.jets).toBe(false);
      expect(state.accretion).toBe(false);

      // Toggle halo layer off
      state.halo = !state.halo;
      expect(state.halo).toBe(false);
      expect(state.clusters).toBe(true);

      // Toggle nucleus layer off
      state.nucleus = !state.nucleus;
      expect(state.nucleus).toBe(false);

      // Toggle dust layer back on
      state.dust = !state.dust;
      expect(state.dust).toBe(true);
    });
  });

  describe('Camera Presets and Scale Metrics', () => {
    const presets: CameraPreset[] = [
      'overview',
      'topDown',
      'nucleus',
      'bar',
      'core',
      'arm',
      'edge',
      'cluster',
      'jets',
    ];

    it('defines all 9 canonical observatory waypoints including bar, nucleus, and jets', () => {
      expect(presets).toHaveLength(9);
      expect(presets).toContain('overview');
      expect(presets).toContain('topDown');
      expect(presets).toContain('nucleus');
      expect(presets).toContain('bar');
      expect(presets).toContain('core');
      expect(presets).toContain('arm');
      expect(presets).toContain('edge');
      expect(presets).toContain('cluster');
      expect(presets).toContain('jets');
    });

    it('scales ANANTARA α 500,000-ly dimensions consistently into rendering coordinates', () => {
      const galaxy = generateGalaxy(42);
      const sceneRadius = galaxy.radius * RENDER_SCALE_KPC;

      expect(sceneRadius).toBeGreaterThan(0);
      // Main stellar disk radius R ~ 76.65 kpc (500,000 ly diameter)
      expect(galaxy.radius).toBeGreaterThan(70);
      expect(galaxy.radius).toBeLessThan(80);
      // Scene radius in units is well within Three.js far plane (60,000)
      expect(sceneRadius).toBeLessThan(5000);
    });

    it('separates main stellar body diameter from extended halo and radio jets', () => {
      const galaxy = generateGalaxy(42);
      expect(galaxy.diskStructure).toBeDefined();
      expect(galaxy.diskStructure?.mainDiskDiameterLy).toBeCloseTo(500000, 0);
      expect(galaxy.diskStructure?.extendedHaloDiameterLy).toBeCloseTo(750000, 0);

      // Relativistic radio jets length is distinct from stellar body
      expect(galaxy.nucleus?.jetLengthKpc).toBeDefined();
      expect(galaxy.nucleus?.radioLobeRadiusKpc).toBeDefined();
      expect(galaxy.nucleus?.jetLengthKpc).toBeGreaterThan(30);
      expect(galaxy.nucleus?.radioLobeRadiusKpc).toBeGreaterThan(10);
    });

    it('computes flat galactic rotation speed physically within 150-250 km/s', () => {
      // Rotation curve v(r) ~ 220 * sqrt(r / (r + 1.2))
      const calculateSpeed = (rKpc: number) => {
        return Math.round(220 * Math.sqrt(rKpc / (rKpc + 1.2)));
      };

      // At galactic center (r = 0.5 kpc)
      const centerSpeed = calculateSpeed(0.5);
      expect(centerSpeed).toBeGreaterThan(100);
      expect(centerSpeed).toBeLessThan(150);

      // At solar radius (r = 8 kpc)
      const solarSpeed = calculateSpeed(8.0);
      expect(solarSpeed).toBeGreaterThan(200);
      expect(solarSpeed).toBeLessThan(230);

      // At outer disk (r = 20 kpc) - flat curve remains ~210-220 km/s
      const edgeSpeed = calculateSpeed(20.0);
      expect(edgeSpeed).toBeGreaterThan(210);
      expect(edgeSpeed).toBeLessThan(225);
    });
  });
});
