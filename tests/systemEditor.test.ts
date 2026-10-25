import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';
import { Universe } from '../src/universe/Universe';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { CelestialBodyType, createCelestialBody } from '../src/universe/CelestialBody';
import { Vector3 } from '../src/physics/Vector3';
import { AU, EARTH_MASS, EARTH_RADIUS } from '../src/astronomy/constants';
import type { OrbitalElements } from '../src/physics/orbitalElements';

describe('Mission P1-A — Minimal System Editor', () => {
  it('updates physical properties and recomputes gravitational acceleration', () => {
    const system = generateSolarSystem(42);
    const engine = new SimulationEngine();
    engine.initialize(system.bodies);

    const planet = system.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
    const initialMass = planet.mass;
    const initialRadius = planet.radius;
    const initialName = planet.name;

    // Modify physical properties (e.g. triple mass)
    engine.updateBodyProperties(planet.id, {
      name: 'Super-Terra',
      mass: initialMass * 3,
      radius: initialRadius * 1.4,
      color: '#4ade80',
    });

    const updated = engine.getBody(planet.id)!;
    expect(updated.name).toBe('Super-Terra');
    expect(updated.mass).toBe(initialMass * 3);
    expect(updated.radius).toBe(initialRadius * 1.4);
    expect(updated.color).toBe('#4ade80');

    // Accelerations should be non-zero and physically consistent
    expect(updated.acceleration.magnitude()).toBeGreaterThan(0);
  });

  it('updates Keplerian orbital elements and updates simulation state vectors consistently', () => {
    const system = generateSolarSystem(42);
    const engine = new SimulationEngine();
    engine.initialize(system.bodies);

    const planet = system.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
    const star = system.bodies.find((b) => b.type === CelestialBodyType.STAR)!;

    const newElements: OrbitalElements = {
      semiMajorAxis: 2.5 * AU,
      eccentricity: 0.25,
      inclination: 0.1,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 0.0,
      trueAnomaly: 0.0,
    };

    engine.updateBodyOrbit(planet.id, newElements);

    const updated = engine.getBody(planet.id)!;
    expect(updated.planetProperties?.orbitalElements?.semiMajorAxis).toBe(2.5 * AU);
    expect(updated.planetProperties?.orbitalElements?.eccentricity).toBe(0.25);

    // At trueAnomaly = 0, distance to star = a * (1 - e) = 2.5 * (1 - 0.25) = 1.875 AU
    const relPos = updated.position.subtract(star.position);
    const dist = relPos.magnitude();
    expect(dist).toBeCloseTo(1.875 * AU, -5);

    // Simulation velocity should be non-zero and perpendicular to radius at periapsis
    expect(updated.velocity.magnitude()).toBeGreaterThan(10000); // orbital speeds in m/s
  });

  it('safely adds a new planet and integrates it into the gravitational simulation', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' });
    universe.enterStarSystem(0);

    const engine = new SimulationEngine();
    engine.initialize(universe.bodies);

    const initialCount = universe.bodies.length;
    const star = universe.bodies.find((b) => b.type === CelestialBodyType.STAR)!;

    const newPlanet = createCelestialBody({
      id: 'custom-planet-1',
      name: 'Verdant Prime',
      type: CelestialBodyType.PLANET,
      mass: EARTH_MASS * 1.2,
      radius: EARTH_RADIUS * 1.1,
      position: new Vector3(3.0 * AU, 0, 0),
      velocity: new Vector3(0, 0, 17000),
      color: '#34d399',
      seed: 9999,
      parentId: star.id,
      planetProperties: {
        planetType: 'TERRESTRIAL',
        orbitalRadius: 3.0 * AU,
        orbitalPeriod: 3.15e7 * 5.2,
        parentId: star.id,
        albedo: 0.3,
        equilibriumTemperature: 160,
        insolationFlux: 150,
        insolationRelative: 0.11,
        habitabilityStatus: 'OUTSIDE',
      },
    });

    universe.addBody(newPlanet);
    engine.addBody(newPlanet);

    expect(universe.bodies.length).toBe(initialCount + 1);
    expect(engine.bodyCount).toBe(initialCount + 1);
    expect(universe.findBody('custom-planet-1')).toBeDefined();
    expect(engine.getBody('custom-planet-1')).toBeDefined();

    // Verify engine computed mutual gravitational acceleration on the new planet
    const addedInEngine = engine.getBody('custom-planet-1')!;
    expect(addedInEngine.acceleration.magnitude()).toBeGreaterThan(0);
  });

  it('removes a planet and cascades deletion to its orbiting satellites (moons)', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' });
    universe.enterStarSystem(0);

    const engine = new SimulationEngine();
    engine.initialize(universe.bodies);

    // Find a planet that has a moon, or if none, select any planet
    const planet = universe.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
    const planetId = planet.id;

    // Attach a mock moon if no moon exists
    const moon = createCelestialBody({
      id: `${planetId}-test-moon`,
      name: 'Test Moon',
      type: CelestialBodyType.MOON,
      mass: 7.342e22,
      radius: 1737e3,
      position: planet.position.clone().add(new Vector3(3.84e8, 0, 0)),
      velocity: planet.velocity.clone().add(new Vector3(0, 0, 1022)),
      color: '#cbd5e1',
      seed: 777,
      parentId: planetId,
      moonProperties: {
        orbitalRadius: 3.84e8,
        orbitalPeriod: 2.36e6,
        parentId: planetId,
      },
    });

    universe.addBody(moon);
    engine.addBody(moon);

    expect(universe.findBody(moon.id)).toBeDefined();
    expect(engine.getBody(moon.id)).toBeDefined();

    // Now remove the parent planet
    universe.removeBody(planetId);
    engine.removeBody(planetId);

    // Both the planet and its moon should be purged cleanly
    expect(universe.findBody(planetId)).toBeUndefined();
    expect(engine.getBody(planetId)).toBeUndefined();

    expect(universe.findBody(moon.id)).toBeUndefined();
    expect(engine.getBody(moon.id)).toBeUndefined();

    // The remaining bodies should have recomputed valid accelerations
    for (const b of engine.bodies) {
      expect(Number.isNaN(b.acceleration.x)).toBe(false);
      expect(Number.isNaN(b.acceleration.y)).toBe(false);
      expect(Number.isNaN(b.acceleration.z)).toBe(false);
    }
  });
});
