/**
 * ASTRAVERSA Ω — P0 Engineering Stabilization Tests
 *
 * Verifies the three P0 defects restored to scientific and simulation integrity:
 * 1. P0-1: Authoritative Simulation State in SimulationEngine
 * 2. P0-2: Correct 4-step Velocity-Verlet Integration with safe acceleration field
 * 3. P0-3: Separate Analytical Keplerian vs Numerical N-body Propagation Modes
 */

import { describe, it, expect } from 'vitest';
import { SimulationEngine, SimulationState, PropagationMode } from '../src/engine/SimulationEngine';
import {
  type CelestialBody,
  CelestialBodyType,
  createCelestialBody,
} from '../src/universe/CelestialBody';
import { Vector3 } from '../src/physics/Vector3';
import { G, SOLAR_MASS, EARTH_MASS, AU } from '../src/astronomy/constants';
import { computeOrbitalPeriod, orbitalToCartesian, type OrbitalElements } from '../src/physics/orbitalElements';

function createTestStar(): CelestialBody {
  return createCelestialBody({
    id: 'test-star',
    name: 'Sol Test',
    type: CelestialBodyType.STAR,
    mass: SOLAR_MASS,
    radius: 6.9634e8,
    position: new Vector3(0, 0, 0),
    velocity: new Vector3(0, 0, 0),
    color: '#ffdd44',
    seed: 1,
    starProperties: {
      spectralClass: 'G',
      luminosity: 3.828e26,
      temperature: 5778,
    },
  });
}

function createTestPlanet(id: string, a: number, e: number = 0, mass: number = EARTH_MASS): CelestialBody {
  const elements: OrbitalElements = {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    trueAnomaly: 0,
  };
  const mu = G * (SOLAR_MASS + mass);
  const cartesian = orbitalToCartesian(elements, mu);

  const planet = createCelestialBody({
    id,
    name: `Planet ${id}`,
    type: CelestialBodyType.PLANET,
    mass,
    radius: 6.371e6,
    position: cartesian.position,
    velocity: cartesian.velocity,
    color: '#4488ff',
    seed: 42,
    parentId: 'test-star',
    planetProperties: {
      planetType: 'TERRESTRIAL',
      orbitalRadius: a,
      orbitalPeriod: computeOrbitalPeriod(a, mu),
      parentId: 'test-star',
      orbitalElements: { ...elements },
      albedo: 0.3,
      equilibriumTemperature: 255,
      insolationFlux: 1361,
      insolationRelative: 1.0,
      habitabilityStatus: 'OPTIMISTIC_HABITABLE',
    },
  });
  return planet;
}

function createTestMoon(id: string, parentPlanet: CelestialBody, a: number): CelestialBody {
  const elements: OrbitalElements = {
    semiMajorAxis: a,
    eccentricity: 0,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    trueAnomaly: 0,
  };
  const mu = G * (parentPlanet.mass + 7.342e22);
  const localCartesian = orbitalToCartesian(elements, mu);

  const moon = createCelestialBody({
    id,
    name: `Moon ${id}`,
    type: CelestialBodyType.MOON,
    mass: 7.342e22,
    radius: 1.737e6,
    position: parentPlanet.position.add(localCartesian.position),
    velocity: parentPlanet.velocity.add(localCartesian.velocity),
    color: '#aaaaaa',
    seed: 100,
    parentId: parentPlanet.id,
    moonProperties: {
      orbitalRadius: a,
      orbitalPeriod: computeOrbitalPeriod(a, mu),
      parentId: parentPlanet.id,
      orbitalElements: { ...elements },
    },
  });
  return moon;
}

describe('P0 Engineering Stabilization Tests', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // P0-1: Authoritative Simulation State in SimulationEngine
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('P0-1: Establish One Authoritative Simulation State', () => {
    it('SimulationEngine is the authoritative owner of system bodies', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU);
      const engine = new SimulationEngine();

      engine.initialize([star, planet]);

      expect(engine.bodies.length).toBe(2);
      expect(engine.getBody('test-star')).toBe(star);
      expect(engine.getBody('p1')).toBe(planet);
      expect(engine.getBody('nonexistent')).toBeUndefined();
    });

    it('updateBodyProperties directly updates authoritative state without desync', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU);
      const engine = new SimulationEngine();
      engine.initialize([star, planet]);

      engine.updateBodyProperties('p1', {
        name: 'New Earth',
        mass: 2 * EARTH_MASS,
        radius: 7e6,
        color: '#22ff88',
      });

      const updated = engine.getBody('p1');
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('New Earth');
      expect(updated!.mass).toBe(2 * EARTH_MASS);
      expect(updated!.radius).toBe(7e6);
      expect(updated!.color).toBe('#22ff88');

      // The authoritative bodies array reflects the update identically
      const inList = engine.bodies.find(b => b.id === 'p1');
      expect(inList?.name).toBe('New Earth');
    });

    it('updateBodyOrbit directly recomputes Cartesian position and updates authoritative elements', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU);
      const engine = new SimulationEngine();
      engine.initialize([star, planet]);

      const initialPos = planet.position.clone();

      const newElements: OrbitalElements = {
        semiMajorAxis: 2.0 * AU,
        eccentricity: 0.1,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        trueAnomaly: 0,
      };

      engine.updateBodyOrbit('p1', newElements);

      const updated = engine.getBody('p1')!;
      expect(updated.planetProperties?.orbitalElements?.semiMajorAxis).toBe(2.0 * AU);
      expect(updated.planetProperties?.orbitalElements?.eccentricity).toBe(0.1);
      // New periapsis distance at trueAnomaly=0 is a * (1 - e) = 2.0 * 0.9 * AU = 1.8 AU
      expect(updated.position.x).toBeCloseTo(1.8 * AU, -5);
      expect(updated.position.x).not.toBeCloseTo(initialPos.x, -5);
    });

    it('addBody and removeBody dynamically update the authoritative registry', () => {
      const star = createTestStar();
      const engine = new SimulationEngine();
      engine.initialize([star]);

      expect(engine.bodies.length).toBe(1);

      const planet2 = createTestPlanet('p2', 1.5 * AU);
      engine.addBody(planet2);

      expect(engine.bodies.length).toBe(2);
      expect(engine.getBody('p2')).toBe(planet2);

      engine.removeBody('p2');
      expect(engine.bodies.length).toBe(1);
      expect(engine.getBody('p2')).toBeUndefined();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // P0-2: Correct Velocity-Verlet Integration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('P0-2: Correct Velocity-Verlet Integration', () => {
    it('executes full 4-step Velocity-Verlet algorithm advancing both position and velocity', () => {
      const star = createTestStar();
      // Create a non-Keplerian free-floating body (e.g. comet / probe with no Keplerian elements)
      const probe = createCelestialBody({
        id: 'probe-1',
        name: 'Deep Space Probe',
        type: CelestialBodyType.PLANET,
        mass: 1000, // 1000 kg probe
        radius: 10,
        position: new Vector3(1.0 * AU, 0, 0),
        velocity: new Vector3(0, 29780, 0), // ~ Earth circular speed
        color: '#ffffff',
        seed: 999,
        parentId: 'test-star',
      });

      const engine = new SimulationEngine();
      engine.initialize([star, probe]);
      engine.start(1); // 1x multiplier

      const initialPos = probe.position.clone();
      const initialVel = probe.velocity.clone();

      // Step simulation by 1000 seconds
      engine.update(1000);

      // In circular orbit: after 1000s, position and velocity must both change
      expect(probe.position.x).not.toBe(initialPos.x);
      expect(probe.position.y).not.toBe(initialPos.y);
      expect(probe.velocity.x).not.toBe(initialVel.x);
      expect(probe.velocity.y).not.toBe(initialVel.y);

      // Probe velocity in x must become negative due to central gravitational attraction towards origin
      expect(probe.velocity.x).toBeLessThan(0);
      // Position y must have advanced positively
      expect(probe.position.y).toBeGreaterThan(0);
    });

    it('safely integrates zero-mass test particle without NaN or division by zero', () => {
      const star = createTestStar();
      // Zero-mass test particle
      const masslessParticle = createCelestialBody({
        id: 'photon-sail',
        name: 'Massless Sail',
        type: CelestialBodyType.PLANET,
        mass: 0, // Mass = 0
        radius: 1,
        position: new Vector3(1.0 * AU, 0, 0),
        velocity: new Vector3(0, 29780, 0),
        color: '#ffffff',
        seed: 888,
        parentId: 'test-star',
      });

      const engine = new SimulationEngine();
      engine.initialize([star, masslessParticle]);
      engine.start(100);

      // Step by 500 ms wall clock (50 seconds sim time)
      expect(() => {
        engine.update(500);
      }).not.toThrow();

      // Assert no NaN in position, velocity or acceleration
      expect(Number.isFinite(masslessParticle.position.x)).toBe(true);
      expect(Number.isFinite(masslessParticle.position.y)).toBe(true);
      expect(Number.isFinite(masslessParticle.velocity.x)).toBe(true);
      expect(Number.isFinite(masslessParticle.velocity.y)).toBe(true);
      expect(Number.isNaN(masslessParticle.position.x)).toBe(false);
      expect(Number.isNaN(masslessParticle.velocity.x)).toBe(false);
    });

    it('maintains bounded energy and orbital stability over multiple numerical integration steps', () => {
      const star = createTestStar();
      const planet = createTestPlanet('nbody-planet', 1.0 * AU, 0, EARTH_MASS);

      const engine = new SimulationEngine();
      engine.initialize([star, planet]);
      // Set to numerical N-body mode
      engine.setPropagationMode(PropagationMode.NUMERICAL_N_BODY);
      engine.start(1);

      const r0 = planet.position.magnitude();
      const v0 = planet.velocity.magnitude();
      const initialSpecificEnergy = (0.5 * v0 * v0) - (G * SOLAR_MASS / r0);

      // Step over 10 hours in 60s increments
      const dtStep = 60; // 60s steps
      for (let t = 0; t < 600; t++) {
        (engine as any).integrateStep(dtStep);
      }

      const r1 = planet.position.magnitude();
      const v1 = planet.velocity.magnitude();
      const finalSpecificEnergy = (0.5 * v1 * v1) - (G * SOLAR_MASS / r1);

      // Velocity-Verlet energy conservation: fractional energy drift < 1e-4 over 600 steps
      const deltaE = Math.abs((finalSpecificEnergy - initialSpecificEnergy) / initialSpecificEnergy);
      expect(deltaE).toBeLessThan(1e-4);

      // Radius remains close to 1 AU
      expect(r1).toBeCloseTo(1.0 * AU, -8);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // P0-3: Separate Analytical Keplerian and Numerical N-body Modes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('P0-3: Separate Analytical Keplerian and Numerical N-body Modes', () => {
    it('exports PropagationMode enum with ANALYTICAL_KEPLER and NUMERICAL_N_BODY', () => {
      expect(PropagationMode.ANALYTICAL_KEPLER).toBe('ANALYTICAL_KEPLER');
      expect(PropagationMode.NUMERICAL_N_BODY).toBe('NUMERICAL_N_BODY');
    });

    it('defaults to ANALYTICAL_KEPLER propagation mode', () => {
      const engine = new SimulationEngine();
      expect(engine.propagationMode).toBe(PropagationMode.ANALYTICAL_KEPLER);
    });

    it('in ANALYTICAL_KEPLER mode, propagates exact conic motion without O(N^2) force evaluation overhead', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU, 0.2); // eccentric orbit
      const engine = new SimulationEngine();
      engine.initialize([star, planet]);
      engine.start(1000); // 1000x multiplier

      const initialPos = planet.position.clone();

      // Advance by 1000 ms wall clock (1000 sim seconds)
      engine.update(1000);

      // In analytical mode, eccentricity and semiMajorAxis remain mathematically exact
      expect(planet.planetProperties?.orbitalElements?.semiMajorAxis).toBe(1.0 * AU);
      expect(planet.planetProperties?.orbitalElements?.eccentricity).toBe(0.2);

      // Planet has moved along orbit away from starting point
      expect(planet.position.distanceTo(initialPos)).toBeGreaterThan(0);

      // Exact Keplerian radius formula: r = a(1 - e^2) / (1 + e * cos(nu))
      const nu = planet.planetProperties?.orbitalElements?.trueAnomaly!;
      const expectedRadius = (1.0 * AU * (1 - 0.2 * 0.2)) / (1 + 0.2 * Math.cos(nu));
      expect(planet.position.magnitude()).toBeCloseTo(expectedRadius, -4);
    });

    it('in ANALYTICAL_KEPLER mode, correctly incorporates parent planet position for moons', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU, 0);
      const moon = createTestMoon('m1', planet, 384400e3); // 384,400 km
      const engine = new SimulationEngine();
      engine.initialize([star, planet, moon]);
      engine.start(100);

      // Step simulation
      engine.update(1000); // 100 seconds sim time

      // Moon world-space position must be near planet position + lunar distance
      const distancePlanetToStar = planet.position.magnitude();
      expect(distancePlanetToStar).toBeCloseTo(1.0 * AU, -5);

      const distanceMoonToPlanet = moon.position.subtract(planet.position).magnitude();
      expect(distanceMoonToPlanet).toBeCloseTo(384400e3, -2);
    });

    it('in NUMERICAL_N_BODY mode, steps via Velocity-Verlet and synchronizes osculating elements', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU, 0.05);
      const engine = new SimulationEngine();
      engine.initialize([star, planet]);

      // Switch to N-body mode
      engine.setPropagationMode(PropagationMode.NUMERICAL_N_BODY);
      expect(engine.propagationMode).toBe(PropagationMode.NUMERICAL_N_BODY);

      engine.start(10);

      // Step simulation by 10 wall seconds (100 sim seconds)
      engine.update(10000);

      // Elements must have been synchronized via syncOsculatingElements
      const osculating = planet.planetProperties?.orbitalElements;
      expect(osculating).toBeDefined();
      expect(osculating!.semiMajorAxis).toBeCloseTo(1.0 * AU, -7);
      expect(osculating!.eccentricity).toBeCloseTo(0.05, 2);
      expect(Number.isFinite(osculating!.trueAnomaly)).toBe(true);
    });

    it('supports seamless runtime switching between ANALYTICAL_KEPLER and NUMERICAL_N_BODY', () => {
      const star = createTestStar();
      const planet = createTestPlanet('p1', 1.0 * AU, 0);
      const engine = new SimulationEngine();
      engine.initialize([star, planet]);
      engine.start(1);

      // Run 1000s in analytical mode
      engine.update(1000);
      const posAfterAnalytical = planet.position.clone();

      // Switch to numerical N-body
      engine.setPropagationMode(PropagationMode.NUMERICAL_N_BODY);
      expect(engine.propagationMode).toBe(PropagationMode.NUMERICAL_N_BODY);

      // Run another 1000s in numerical mode
      engine.update(1000);
      const posAfterNumerical = planet.position.clone();

      expect(posAfterNumerical.magnitude()).toBeCloseTo(1.0 * AU, -6);
      expect(posAfterNumerical.distanceTo(posAfterAnalytical)).toBeGreaterThan(0);

      // Switch back to analytical
      engine.setPropagationMode(PropagationMode.ANALYTICAL_KEPLER);
      expect(engine.propagationMode).toBe(PropagationMode.ANALYTICAL_KEPLER);
      engine.update(1000);
      expect(planet.position.magnitude()).toBeCloseTo(1.0 * AU, -6);
    });
  });
});
