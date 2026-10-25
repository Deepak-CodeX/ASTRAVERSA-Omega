import { describe, it, expect } from 'vitest';
import {
  generateSolarSystem,
  computeHillRadius,
  generateMoonsForPlanet,
} from '../src/universe/SolarSystemGenerator';
import { CelestialBodyType } from '../src/universe/CelestialBody';
import { AU, SOLAR_MASS, EARTH_MASS, JUPITER_MASS, EARTH_RADIUS } from '../src/astronomy/constants';

describe('Mission P1-A — Deterministic Moon Generation', () => {
  it('correctly calculates Hill radius according to Hill sphere formula r_H = a * (m / 3M)^(1/3)', () => {
    // Earth around Sun: a = 1 AU, m = Earth mass, M = Solar mass
    const hillEarth = computeHillRadius(1.0 * AU, EARTH_MASS, SOLAR_MASS);
    // Earth Hill sphere is approximately 1.5 million km = 1.5e9 meters (~0.01 AU)
    expect(hillEarth).toBeGreaterThan(1.4e9);
    expect(hillEarth).toBeLessThan(1.6e9);

    // Jupiter around Sun: a = 5.2 AU, m = Jupiter mass (~317.8 Earth mass)
    const hillJupiter = computeHillRadius(5.2 * AU, JUPITER_MASS, SOLAR_MASS);
    // Jupiter Hill sphere is approximately 53 million km = 5.3e10 meters (~0.35 AU)
    expect(hillJupiter).toBeGreaterThan(5.0e10);
    expect(hillJupiter).toBeLessThan(5.6e10);
  });

  it('generates moons strictly within the Domingos (2006) stability limit (r_moon <= 0.49 r_H)', () => {
    const parentPlanet = {
      id: 'test-planet-jupiter',
      name: 'Test Jupiter',
      type: CelestialBodyType.PLANET,
      mass: JUPITER_MASS,
      radius: 69911e3,
      position: { x: 5.2 * AU, y: 0, z: 0 } as any,
      velocity: { x: 0, y: 0, z: 13070 } as any,
      acceleration: { x: 0, y: 0, z: 0 } as any,
      color: '#d4a373',
      seed: 8888,
      planetProperties: {
        planetType: 'GAS_GIANT' as const,
        orbitalRadius: 5.2 * AU,
        orbitalPeriod: 3.74e8,
        parentId: 'test-star',
        albedo: 0.34,
        equilibriumTemperature: 110,
        insolationFlux: 50,
        insolationRelative: 0.037,
        habitabilityStatus: 'OUTSIDE' as const,
      },
    };

    const moons = generateMoonsForPlanet(parentPlanet, SOLAR_MASS, 4, 8888);
    expect(moons.length).toBeGreaterThan(0);

    const rHill = computeHillRadius(5.2 * AU, JUPITER_MASS, SOLAR_MASS);
    const maxStableOrbit = 0.49 * rHill;

    for (const moon of moons) {
      expect(moon.type).toBe(CelestialBodyType.MOON);
      expect(moon.parentId).toBe(parentPlanet.id);
      expect(moon.moonProperties).toBeDefined();

      const moonA = moon.moonProperties!.orbitalRadius;
      expect(moonA).toBeLessThanOrEqual(maxStableOrbit);
      expect(moonA).toBeGreaterThan(parentPlanet.radius * 2.0); // Outside Roche / physical radius

      // Mass constraint: moon must be physically smaller and lighter than parent
      expect(moon.mass).toBeLessThan(parentPlanet.mass * 0.001);
      expect(moon.radius).toBeLessThan(parentPlanet.radius * 0.2);

      // Orbital elements must be attached
      expect(moon.moonProperties!.orbitalElements).toBeDefined();
      expect(moon.moonProperties!.orbitalElements!.eccentricity).toBeLessThan(0.3);
    }
  });

  it('guarantees deterministic moon generation for identical seeds', () => {
    const seed = 54321;
    const systemA = generateSolarSystem(seed, { includeMoons: true });
    const systemB = generateSolarSystem(seed, { includeMoons: true });

    expect(systemA.bodies.length).toBe(systemB.bodies.length);

    const moonsA = systemA.bodies.filter((b) => b.type === CelestialBodyType.MOON);
    const moonsB = systemB.bodies.filter((b) => b.type === CelestialBodyType.MOON);

    expect(moonsA.length).toBe(moonsB.length);

    for (let i = 0; i < moonsA.length; i++) {
      const mA = moonsA[i];
      const mB = moonsB[i];

      expect(mA.id).toBe(mB.id);
      expect(mA.name).toBe(mB.name);
      expect(mA.mass).toBe(mB.mass);
      expect(mA.radius).toBe(mB.radius);
      expect(mA.position.x).toBe(mB.position.x);
      expect(mA.position.y).toBe(mB.position.y);
      expect(mA.position.z).toBe(mB.position.z);
      expect(mA.velocity.x).toBe(mB.velocity.x);
      expect(mA.velocity.y).toBe(mB.velocity.y);
      expect(mA.velocity.z).toBe(mB.velocity.z);
    }
  });

  it('preserves 100% backward compatibility when includeMoons is false or omitted', () => {
    const seed = 42;
    const defaultSystem = generateSolarSystem(seed);
    const explicitFalseSystem = generateSolarSystem(seed, { includeMoons: false });

    // When includeMoons is omitted or false, only star + planets exist
    expect(defaultSystem.bodies.length).toBe(defaultSystem.planets.length + 1);
    expect(explicitFalseSystem.bodies.length).toBe(explicitFalseSystem.planets.length + 1);

    const moons = defaultSystem.bodies.filter((b) => b.type === CelestialBodyType.MOON);
    expect(moons.length).toBe(0);
  });
});
