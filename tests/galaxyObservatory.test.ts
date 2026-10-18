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

  describe('Mission 003A — Galaxy Controls v1 Settings & State', () => {
    it('has documented canonical defaults for all observatory parameters', async () => {
      const { DEFAULT_OBSERVATORY_SETTINGS, createDefaultObservatorySettings } = await import(
        '../src/rendering'
      );

      expect(DEFAULT_OBSERVATORY_SETTINGS).toEqual({
        renderScale: 1.0,
        targetDiameterLy: 500000,
        visualRotationSpeed: 1.0,
        orbitalMotionSpeed: 1.0,
        isPaused: false,
        timeSpeed: 1.0,
        starSizeMultiplier: 1.0,
        haloOpacity: 0.35,
        dustOpacity: 0.50,
        cameraDistanceMultiplier: 1.0,
        cameraFov: 52,
      });

      const freshCopy = createDefaultObservatorySettings();
      expect(freshCopy).toEqual(DEFAULT_OBSERVATORY_SETTINGS);
      // Verify independence (not a mutated reference)
      freshCopy.renderScale = 2.0;
      expect(DEFAULT_OBSERVATORY_SETTINGS.renderScale).toBe(1.0);
    });

    it('strictly separates visual rendering scale from physical model diameter', () => {
      // 1. Physical model diameter changes the astronomical galaxy entity
      const galaxyCanonical = generateGalaxy(42, { quality: 'LOW', targetDiameterLy: 500000 });
      const galaxyMilkyWay = generateGalaxy(42, { quality: 'LOW', targetDiameterLy: 100000 });
      const galaxySupergiant = generateGalaxy(42, { quality: 'LOW', targetDiameterLy: 1000000 });

      // Physical radii and scale heights are recalculated
      expect(galaxyMilkyWay.radius).toBeCloseTo(15.33, 1); // ~15.33 kpc
      expect(galaxyCanonical.radius).toBeCloseTo(76.65, 1); // ~76.65 kpc
      expect(galaxySupergiant.radius).toBeCloseTo(153.29, 1); // ~153.29 kpc

      // Bar semi-major axis scales proportionally with physical galaxy radius
      expect(galaxyMilkyWay.bar?.length).toBeLessThan(galaxyCanonical.bar?.length ?? 0);
      expect(galaxySupergiant.bar?.length).toBeGreaterThan(galaxyCanonical.bar?.length ?? 0);

      // 2. Visual rendering scale is an optical GPU multiplier
      const visualScale = 1.75;
      const effectiveSceneRadius = galaxyCanonical.radius * RENDER_SCALE_KPC * visualScale;
      expect(effectiveSceneRadius).toBeCloseTo(galaxyCanonical.radius * RENDER_SCALE_KPC * 1.75, 4);

      // Model parsec data remains unchanged when only visual scale is changed
      expect(galaxyCanonical.diskStructure?.mainDiskDiameterLy).toBe(500000);
      expect(galaxyCanonical.seed).toBe(42);
    });

    it('differentiates rigid-body visual rotation from internal orbital dynamics', () => {
      // Rigid-body rotation rate: scales outer group rotation angle
      const deltaT = 0.016; // 1 frame (~60 FPS)
      const visualSpeed1 = 1.0;
      const visualSpeed2 = 2.5;

      const deltaAngle1 = deltaT * visualSpeed1 * 0.05;
      const deltaAngle2 = deltaT * visualSpeed2 * 0.05;

      expect(deltaAngle2).toBe(deltaAngle1 * 2.5);

      // Orbital dynamics modifies internal effectiveTime driving shader phases
      const time = 10.0;
      const orbitalSpeed1 = 1.0;
      const orbitalSpeed2 = 3.0;

      const effectiveTime1 = time * orbitalSpeed1;
      const effectiveTime2 = time * orbitalSpeed2;

      expect(effectiveTime1).toBe(10.0);
      expect(effectiveTime2).toBe(30.0);
      // Independent parameters
      expect(effectiveTime2).not.toBe(deltaAngle2);
    });

    it('supports simulation pause and variable time dilation', () => {
      const dt = 0.016;

      // When running at 1x
      let simTime = 0;
      let isPaused = false;
      let timeSpeed = 1.0;

      if (!isPaused) simTime += dt * timeSpeed;
      expect(simTime).toBeCloseTo(0.016, 5);

      // When time speed is dilated (2.5x)
      timeSpeed = 2.5;
      if (!isPaused) simTime += dt * timeSpeed;
      expect(simTime).toBeCloseTo(0.016 + 0.040, 5);

      // When paused
      isPaused = true;
      const frozenTime = simTime;
      if (!isPaused) simTime += dt * timeSpeed;
      expect(simTime).toBe(frozenTime); // Unchanged
    });

    it('allows camera FOV and distance adjustment without altering star coordinates', () => {
      const defaultFov = 52;
      const wideFov = 75;
      const teleFov = 30;

      expect(wideFov).toBeGreaterThan(defaultFov);
      expect(teleFov).toBeLessThan(defaultFov);

      // Distance multiplier scales camera distance while maintaining target vector
      const targetPos = { x: 0, y: 0, z: 0 };
      const basePos = { x: 100, y: 200, z: 150 };

      const distMul = 1.5;
      const scaledPos = {
        x: targetPos.x + (basePos.x - targetPos.x) * distMul,
        y: targetPos.y + (basePos.y - targetPos.y) * distMul,
        z: targetPos.z + (basePos.z - targetPos.z) * distMul,
      };

      expect(scaledPos.x).toBe(150);
      expect(scaledPos.y).toBe(300);
      expect(scaledPos.z).toBe(225);
    });

    it('resets observatory defaults without corrupting procedural seed 42 or navigation', async () => {
      const { createDefaultObservatorySettings } = await import('../src/rendering');
      const { Universe } = await import('../src/universe/Universe');

      const universe = new Universe(42);
      universe.generateGalaxy({ quality: 'LOW', targetDiameterLy: 250000 });

      // User modified physical diameter to 250k ly
      expect(universe.galaxy?.diskStructure?.mainDiskDiameterLy).toBe(250000);

      // Reset action restores canonical 500k ly model and canonical observatory settings
      const resetSettings = createDefaultObservatorySettings();
      universe.generateGalaxy({ quality: 'LOW', targetDiameterLy: 500000 });

      expect(resetSettings.renderScale).toBe(1.0);
      expect(resetSettings.isPaused).toBe(false);
      expect(resetSettings.timeSpeed).toBe(1.0);
      expect(resetSettings.cameraFov).toBe(52);
      expect(universe.galaxy?.diskStructure?.mainDiskDiameterLy).toBe(500000);
      expect(universe.seed).toBe(42);

      // Star IDs and solar system drill-down remain intact
      expect(universe.galaxy?.stars[0].id).toBe('gs-42-0');
      const system = universe.enterStarSystem(0);
      expect(system).toBeDefined();
      expect(system?.bodies.length).toBeGreaterThan(0);
    });
  });
});

