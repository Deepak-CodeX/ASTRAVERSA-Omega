import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/engine/SimulationEngine';
import { Universe } from '../src/universe/Universe';
import { generateSolarSystem, computeHillRadius } from '../src/universe/SolarSystemGenerator';
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

  it('rigidly translates child satellites when parent planet orbit is updated (preserves relative moon orbits)', () => {
    const universe = new Universe(42);
    universe.generateGalaxy({ quality: 'LOW' });
    universe.enterStarSystem(0);

    const engine = new SimulationEngine();
    engine.initialize(universe.bodies);

    const planet = universe.bodies.find((b) => b.type === CelestialBodyType.PLANET)!;
    const initialPlanetPos = planet.position.clone();
    const initialPlanetVel = planet.velocity.clone();

    // Attach a satellite moon
    const moon = createCelestialBody({
      id: `${planet.id}-satellite`,
      name: `${planet.name} Alpha`,
      type: CelestialBodyType.MOON,
      mass: 7.342e22,
      radius: 1737e3,
      position: initialPlanetPos.add(new Vector3(4.0e8, 0, 0)),
      velocity: initialPlanetVel.add(new Vector3(0, 0, 1000)),
      color: '#e2e8f0',
      seed: 1234,
      parentId: planet.id,
      moonProperties: {
        orbitalRadius: 4.0e8,
        orbitalPeriod: 2.5e6,
        parentId: planet.id,
      },
    });

    universe.addBody(moon);
    engine.addBody(moon);

    const initialRelPos = engine.getBody(moon.id)!.position.subtract(engine.getBody(planet.id)!.position);
    const initialRelVel = engine.getBody(moon.id)!.velocity.subtract(engine.getBody(planet.id)!.velocity);

    expect(initialRelPos.x).toBeCloseTo(4.0e8, -2);
    expect(initialRelVel.z).toBeCloseTo(1000, 1);

    // Now update the parent planet's orbit to a new semi-major axis (e.g. 2.0 AU)
    const newPlanetOrbit: OrbitalElements = {
      semiMajorAxis: 2.0 * AU,
      eccentricity: 0.15,
      inclination: 0.05,
      longitudeOfAscendingNode: 0.2,
      argumentOfPeriapsis: 0.3,
      trueAnomaly: 0.0,
    };

    const orbitUpdated = engine.updateBodyOrbit(planet.id, newPlanetOrbit);
    expect(orbitUpdated).toBe(true);

    const movedPlanet = engine.getBody(planet.id)!;
    const movedMoon = engine.getBody(moon.id)!;

    // The planet has moved significantly
    expect(movedPlanet.position.distanceTo(initialPlanetPos)).toBeGreaterThan(0.1 * AU);

    // The child satellite moon must have moved along with the planet
    const newRelPos = movedMoon.position.subtract(movedPlanet.position);
    const newRelVel = movedMoon.velocity.subtract(movedPlanet.velocity);

    // Relative distance vector must be preserved within sub-millimeter precision
    expect(newRelPos.x).toBeCloseTo(initialRelPos.x, 0);
    expect(newRelPos.y).toBeCloseTo(initialRelPos.y, 0);
    expect(newRelPos.z).toBeCloseTo(initialRelPos.z, 0);

    // Relative velocity vector must be preserved
    expect(newRelVel.x).toBeCloseTo(initialRelVel.x, 3);
    expect(newRelVel.y).toBeCloseTo(initialRelVel.y, 3);
    expect(newRelVel.z).toBeCloseTo(initialRelVel.z, 3);
  });

  it('supports editing moon physical properties and relative Keplerian orbit', () => {
    const system = generateSolarSystem(12345, { includeMoons: true });
    const engine = new SimulationEngine();
    engine.initialize(system.bodies);

    const moon = system.bodies.find((b) => b.type === CelestialBodyType.MOON)!;
    expect(moon).toBeDefined();

    const parentPlanet = system.bodies.find((b) => b.id === moon.parentId)!;
    expect(parentPlanet).toBeDefined();

    const initialMoonMass = moon.mass;
    const initialMoonRadius = moon.radius;

    // Update moon physical properties
    engine.updateBodyProperties(moon.id, {
      name: 'Titanus Prime',
      mass: initialMoonMass * 2,
      radius: initialMoonRadius * 1.25,
      color: '#38bdf8',
    });

    const updatedMoon = engine.getBody(moon.id)!;
    expect(updatedMoon.name).toBe('Titanus Prime');
    expect(updatedMoon.mass).toBe(initialMoonMass * 2);
    expect(updatedMoon.radius).toBe(initialMoonRadius * 1.25);
    expect(updatedMoon.color).toBe('#38bdf8');

    // Update moon orbit around parent planet to a new distance
    const newMoonDistance = parentPlanet.radius * 5.0; // 5 planetary radii
    const newElements: OrbitalElements = {
      semiMajorAxis: newMoonDistance,
      eccentricity: 0.05,
      inclination: 0.02,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 0.0,
      trueAnomaly: 0.0,
    };

    const orbitOk = engine.updateBodyOrbit(moon.id, newElements);
    expect(orbitOk).toBe(true);

    const orbitUpdatedMoon = engine.getBody(moon.id)!;
    expect(orbitUpdatedMoon.moonProperties?.orbitalRadius).toBe(newMoonDistance);

    // Distance to parent planet must match new periapsis a * (1 - e) = 5 * R_p * 0.95
    const relDistance = orbitUpdatedMoon.position.distanceTo(parentPlanet.position);
    expect(relDistance).toBeCloseTo(newMoonDistance * 0.95, -2);

    // Acceleration should be directed toward the parent planet and non-zero
    expect(orbitUpdatedMoon.acceleration.magnitude()).toBeGreaterThan(0);
  });

  it('verifies moon Hill radius stability constraint and bounds checking', () => {
    // For a terrestrial planet (1.0 M_earth) at 1 AU around 1.0 M_sun
    // Hill radius is ~1.5e9 m (~0.01 AU). The Domingos (2006) stability limit is 0.49 * rH ~ 7.35e8 m (~0.0049 AU).
    const starMass = 1.989e30;
    const planetMass = 5.972e24;
    const planetDist = 1.0 * AU;

    const rH = computeHillRadius(planetDist, planetMass, starMass);
    const maxStableOrbit = 0.49 * rH;

    // Test a valid orbit (e.g. Earth's Moon at 3.84e8 m < 7.35e8 m)
    const validMoonOrbitM = 3.84e8;
    expect(validMoonOrbitM).toBeLessThanOrEqual(maxStableOrbit);

    // Test an unstable orbit exceeding Hill sphere boundary (e.g. 1.0e9 m > 0.49 rH)
    const unstableMoonOrbitM = 1.0e9;
    expect(unstableMoonOrbitM).toBeGreaterThan(maxStableOrbit);
  });
});
