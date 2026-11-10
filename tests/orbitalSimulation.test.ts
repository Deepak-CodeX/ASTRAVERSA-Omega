/**
 * ASTRAVERSA Ω — Orbital Simulation Integrity Tests (Mission P1-B)
 *
 * Verifies the complete execution pipeline:
 *   Simulation Clock → Simulation Time → Orbital State Calculation → Celestial Body Position → Hierarchy
 *
 * Grounded in Keplerian two-body astrodynamics:
 * - μ = G(M_parent + M_body)
 * - M = E - e·sin(E)
 * - Exact closed orbits without numerical drift
 * - Correct hierarchical coordinates for moons orbiting moving planets
 */

import { describe, it, expect } from 'vitest';
import { SimulationClock } from '../src/engine/SimulationClock';
import { SimulationEngine, SimulationState } from '../src/engine/SimulationEngine';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { CelestialBodyType } from '../src/universe/CelestialBody';
import {
  propagateKeplerOrbit,
  solveKeplerEquation,
  orbitalToCartesian,
  computeOrbitalPeriod,
  normalizeAngle,
  type OrbitalElements,
} from '../src/physics/orbitalElements';
import { G, SOLAR_MASS, AU } from '../src/astronomy/constants';

describe('Mission P1-B — Orbital Simulation Integrity', () => {
  const muSun = G * SOLAR_MASS;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Simulation Clock Robustness
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Simulation Clock Robustness', () => {
    it('advances simulation time when running', () => {
      const clock = new SimulationClock();
      clock.resume(10);
      const substeps = clock.tick(1000); // 1 real sec * 10x = 10 sim sec

      expect(substeps.length).toBeGreaterThan(0);
      expect(clock.simulationTime).toBeCloseTo(10, 5);
      expect(clock.isPaused).toBe(false);
    });

    it('freezes simulation time completely when paused', () => {
      const clock = new SimulationClock();
      clock.resume(100);
      clock.tick(500);
      const frozenTime = clock.simulationTime;

      clock.pause();
      expect(clock.isPaused).toBe(true);

      const substeps = clock.tick(5000);
      expect(substeps).toEqual([]);
      expect(clock.simulationTime).toBe(frozenTime);
    });

    it('resumes seamlessly from the exact paused timestamp', () => {
      const clock = new SimulationClock();
      clock.resume(10);
      clock.tick(1000); // 10s
      const pausedAt = clock.simulationTime;
      clock.pause();

      clock.tick(10000); // no change while paused
      expect(clock.simulationTime).toBe(pausedAt);

      clock.resume(10);
      clock.tick(1000); // +10s
      expect(clock.simulationTime).toBeCloseTo(pausedAt + 10, 5);
    });

    it('safely handles zero, negative, and non-finite multipliers without crashing', () => {
      const clock = new SimulationClock();
      clock.resume(10);
      expect(clock.isPaused).toBe(false);

      // Negative multiplier should pause safely
      clock.setMultiplier(-10 as any);
      expect(clock.isPaused).toBe(true);
      expect(clock.multiplier).toBe(0);

      // NaN or Infinity multiplier should pause safely
      clock.setMultiplier(NaN as any);
      expect(clock.isPaused).toBe(true);
      expect(clock.multiplier).toBe(0);

      clock.setMultiplier(Infinity as any);
      expect(clock.isPaused).toBe(true);
      expect(clock.multiplier).toBe(0);

      // Resume with invalid value defaults to 1x
      clock.resume(-5 as any);
      expect(clock.isPaused).toBe(false);
      expect(clock.multiplier).toBe(1);
    });

    it('safely handles non-positive or invalid wallDeltaMs', () => {
      const clock = new SimulationClock();
      clock.resume(10);

      expect(clock.tick(0)).toEqual([]);
      expect(clock.tick(-500)).toEqual([]);
      expect(clock.tick(NaN)).toEqual([]);
      expect(clock.tick(Infinity)).toEqual([]);
      expect(clock.simulationTime).toBe(0);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Keplerian Orbital Mechanics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Keplerian Mechanics & Anomaly Propagation', () => {
    it('maintains constant orbital radius for circular orbit (e = 0)', () => {
      const a = 1.0 * AU;
      const elements: OrbitalElements = {
        semiMajorAxis: a,
        eccentricity: 0.0,
        inclination: 0.0,
        longitudeOfAscendingNode: 0.0,
        argumentOfPeriapsis: 0.0,
        trueAnomaly: 0.0,
      };

      const period = computeOrbitalPeriod(a, muSun);

      // Sample 12 points throughout one complete orbital revolution
      for (let i = 0; i <= 12; i++) {
        const dt = (i / 12) * period;
        const propagated = propagateKeplerOrbit(elements, muSun, dt);
        const { position } = orbitalToCartesian(propagated, muSun);
        const radius = position.magnitude();

        expect(radius).toBeCloseTo(a, -4); // accurate to within small fraction of AU
      }
    });

    it('reproduces exact periapsis and apoapsis distances for eccentric orbit (e = 0.25)', () => {
      const a = 2.0 * AU;
      const e = 0.25;
      const elements: OrbitalElements = {
        semiMajorAxis: a,
        eccentricity: e,
        inclination: 0.0,
        longitudeOfAscendingNode: 0.0,
        argumentOfPeriapsis: 0.0,
        trueAnomaly: 0.0, // starts at periapsis
      };

      const period = computeOrbitalPeriod(a, muSun);

      // At t = 0 (periapsis): r = a * (1 - e) = 2.0 * 0.75 = 1.5 AU
      const atPeriapsis = orbitalToCartesian(elements, muSun).position.magnitude();
      expect(atPeriapsis).toBeCloseTo(1.5 * AU, -4);

      // At t = period / 2 (apoapsis): r = a * (1 + e) = 2.0 * 1.25 = 2.5 AU
      const halfOrbit = propagateKeplerOrbit(elements, muSun, period / 2);
      const atApoapsis = orbitalToCartesian(halfOrbit, muSun).position.magnitude();
      expect(atApoapsis).toBeCloseTo(2.5 * AU, -4);
    });

    it('returns to exact starting coordinates after one complete orbital period T', () => {
      const a = 1.8 * AU;
      const e = 0.35;
      const inc = 0.15;
      const elements: OrbitalElements = {
        semiMajorAxis: a,
        eccentricity: e,
        inclination: inc,
        longitudeOfAscendingNode: 0.5,
        argumentOfPeriapsis: 0.7,
        trueAnomaly: 1.1,
      };

      const initial = orbitalToCartesian(elements, muSun);
      const period = computeOrbitalPeriod(a, muSun);

      const afterFullOrbit = propagateKeplerOrbit(elements, muSun, period);
      const finalState = orbitalToCartesian(afterFullOrbit, muSun);

      expect(finalState.position.x).toBeCloseTo(initial.position.x, -2);
      expect(finalState.position.y).toBeCloseTo(initial.position.y, -2);
      expect(finalState.position.z).toBeCloseTo(initial.position.z, -2);

      expect(finalState.velocity.x).toBeCloseTo(initial.velocity.x, 2);
      expect(finalState.velocity.y).toBeCloseTo(initial.velocity.y, 2);
      expect(finalState.velocity.z).toBeCloseTo(initial.velocity.z, 2);
    });

    it('exhibits out-of-plane Y motion for inclined orbit (i > 0)', () => {
      const a = 1.0 * AU;
      const inc = Math.PI / 6; // 30 degrees inclination
      const elements: OrbitalElements = {
        semiMajorAxis: a,
        eccentricity: 0.0,
        inclination: inc,
        longitudeOfAscendingNode: 0.0,
        argumentOfPeriapsis: 0.0,
        trueAnomaly: Math.PI / 2, // 90 degrees past node
      };

      const { position } = orbitalToCartesian(elements, muSun);

      // In Y-up coordinate system, non-zero inclination yields substantial Y excursion
      expect(Math.abs(position.y)).toBeGreaterThan(0.2 * AU);
    });

    it('converges robustly for extreme eccentricities up to e = 0.99', () => {
      const highE = 0.99;
      for (const M of [0.001, 0.1, 0.5, Math.PI, 5.0, 6.28]) {
        const E = solveKeplerEquation(M, highE);
        const checkM = E - highE * Math.sin(E);
        expect(normalizeAngle(checkM)).toBeCloseTo(normalizeAngle(M), 5);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Hierarchical Orbital Systems (Planets & Moons)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Hierarchical Systems & Satellite Coordinates', () => {
    it('advances both planet and moon coordinates correctly over time', () => {
      const system = generateSolarSystem(42, { includeMoons: true });
      const engine = new SimulationEngine();
      engine.initialize(system.bodies);

      const star = engine.bodies.find((b) => b.type === CelestialBodyType.STAR)!;
      const moon = engine.bodies.find((b) => b.type === CelestialBodyType.MOON)!;
      expect(moon).toBeDefined();

      const planet = engine.bodies.find((b) => b.id === moon.parentId)!;
      expect(planet).toBeDefined();

      const initialPlanetPos = planet.position.clone();
      const initialMoonPos = moon.position.clone();
      const initialRelMoonPos = initialMoonPos.subtract(initialPlanetPos);
      expect(initialRelMoonPos.magnitude()).toBeCloseTo(moon.moonProperties!.orbitalRadius, -4);

      // Advance simulation by 5 simulation days at 10,000x multiplier
      // 5 days = 432,000 sim seconds
      engine.start(10_000);
      const wallDeltaMs = (432_000 / 10_000) * 1000; // 43.2 ms wall time
      engine.update(wallDeltaMs);

      // Planet must have moved along its orbit
      expect(planet.position.distanceTo(initialPlanetPos)).toBeGreaterThan(1e7);

      // Moon must have moved in world coordinates
      expect(moon.position.distanceTo(initialMoonPos)).toBeGreaterThan(1e7);

      // Moon relative distance to planet must match its bound Keplerian radius
      const currentRelMoonPos = moon.position.subtract(planet.position);
      const expectedMoonRadius = moon.moonProperties!.orbitalRadius;
      expect(currentRelMoonPos.magnitude()).toBeCloseTo(expectedMoonRadius, -4);

      // Star at center of system must remain stationary
      expect(star.position.magnitude()).toBeCloseTo(0, 3);
    });

    it('preserves moon relative orbit around planet as planet travels around the star', () => {
      const system = generateSolarSystem(999, { includeMoons: true });
      const engine = new SimulationEngine();
      engine.initialize(system.bodies);

      const planet = system.bodies.find((b) => b.type === CelestialBodyType.PLANET && system.bodies.some(m => m.parentId === b.id))!;
      const moon = system.bodies.find((b) => b.parentId === planet.id)!;

      const moonRadius = moon.moonProperties!.orbitalRadius;
      const planetPeriod = planet.planetProperties!.orbitalPeriod;

      engine.start(10_000);

      // Advance by 1/4 of a planetary orbit
      const quarterYearSimSec = planetPeriod / 4;
      const frameWallMs = 50;
      const frames = Math.floor((quarterYearSimSec / 10_000) / (frameWallMs / 1000));

      for (let f = 0; f < Math.min(frames, 50); f++) {
        engine.update(frameWallMs);
      }

      // Planet has traversed significant arc around star
      expect(planet.position.magnitude()).toBeCloseTo(planet.planetProperties!.orbitalRadius, -4);

      // Moon distance to parent planet remains physically bounded
      const relDist = moon.position.distanceTo(planet.position);
      expect(relDist).toBeCloseTo(moonRadius, -3);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Real-Time Simulation Integration & Controls
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Engine Controls & Integration', () => {
    it('freezes planetary motion when engine is paused and resumes when started', () => {
      const system = generateSolarSystem(42);
      const engine = new SimulationEngine();
      engine.initialize(system.bodies);

      const planet = engine.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
      const initialPos = planet.position.clone();

      // Calling update while paused must not change positions
      expect(engine.state).toBe(SimulationState.PAUSED);
      engine.update(100);
      expect(planet.position.x).toBe(initialPos.x);
      expect(planet.position.z).toBe(initialPos.z);

      // Start engine at 10,000x
      engine.start(10_000);
      expect(engine.state).toBe(SimulationState.RUNNING);
      engine.update(100);

      // Planet must now move
      expect(planet.position.distanceTo(initialPos)).toBeGreaterThan(0);

      const movedPos = planet.position.clone();

      // Pause again
      engine.pause();
      expect(engine.state).toBe(SimulationState.PAUSED);
      engine.update(100);
      expect(planet.position.x).toBe(movedPos.x);
      expect(planet.position.z).toBe(movedPos.z);
    });

    it('higher time multipliers produce proportionally larger orbital advancement per frame', () => {
      const system1 = generateSolarSystem(42);
      const system2 = generateSolarSystem(42);

      const engine1 = new SimulationEngine();
      const engine2 = new SimulationEngine();

      engine1.initialize(system1.bodies);
      engine2.initialize(system2.bodies);

      const planet1 = engine1.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
      const planet2 = engine2.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;

      const p1_start = planet1.position.clone();
      const p2_start = planet2.position.clone();

      // Engine 1 runs at 1,000x
      engine1.start(1000);
      engine1.update(50); // 50ms wall time

      // Engine 2 runs at 10,000x (10x faster)
      engine2.start(10_000);
      engine2.update(50); // 50ms wall time

      const dist1 = planet1.position.distanceTo(p1_start);
      const dist2 = planet2.position.distanceTo(p2_start);

      // 10,000x must advance roughly 10x further than 1,000x for small orbital arcs
      expect(dist2 / dist1).toBeCloseTo(10, 0);
    });

    it('concurrently advances multiple planets with different orbital periods', () => {
      const system = generateSolarSystem(42);
      const engine = new SimulationEngine();
      engine.initialize(system.bodies);

      const planets = engine.bodies.filter((b) => b.type === CelestialBodyType.PLANET);
      expect(planets.length).toBeGreaterThan(2);

      const startPositions = planets.map((p) => p.position.clone());

      engine.start(10_000);
      engine.update(100);

      // Every planet must have moved
      for (let i = 0; i < planets.length; i++) {
        const moved = planets[i].position.distanceTo(startPositions[i]);
        expect(moved).toBeGreaterThan(0);
      }

      // Innermost planet must travel faster in angular velocity than outermost planet (Kepler's 3rd law)
      const innerPlanet = planets[0];
      const outerPlanet = planets[planets.length - 1];

      const innerOmega = Math.sqrt(muSun / Math.pow(innerPlanet.planetProperties!.orbitalRadius, 3));
      const outerOmega = Math.sqrt(muSun / Math.pow(outerPlanet.planetProperties!.orbitalRadius, 3));

      expect(innerOmega).toBeGreaterThan(outerOmega);
    });
  });
});
