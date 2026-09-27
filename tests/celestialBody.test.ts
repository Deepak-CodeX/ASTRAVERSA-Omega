/**
 * ASTRAVERSA Ω — CelestialBody Tests
 */

import { describe, it, expect } from 'vitest';
import { createCelestialBody, CelestialBodyType } from '../src/universe/CelestialBody';
import { Vector3 } from '../src/physics/Vector3';
import { SpectralClass } from '../src/astronomy/stellar';

describe('CelestialBody', () => {
  it('creates a star with correct properties', () => {
    const star = createCelestialBody({
      id: 'star-1',
      name: 'Test Star',
      type: CelestialBodyType.STAR,
      mass: 1.989e30,
      radius: 6.957e8,
      color: '#fff4ea',
      seed: 42,
      starProperties: {
        spectralClass: SpectralClass.G,
        luminosity: 3.828e26,
        temperature: 5778,
      },
    });

    expect(star.id).toBe('star-1');
    expect(star.name).toBe('Test Star');
    expect(star.type).toBe(CelestialBodyType.STAR);
    expect(star.mass).toBe(1.989e30);
    expect(star.radius).toBe(6.957e8);
    expect(star.starProperties?.spectralClass).toBe(SpectralClass.G);
    expect(star.starProperties?.temperature).toBe(5778);
  });

  it('creates a planet with correct properties', () => {
    const planet = createCelestialBody({
      id: 'planet-1',
      name: 'Test Planet',
      type: CelestialBodyType.PLANET,
      mass: 5.972e24,
      radius: 6.371e6,
      position: new Vector3(1.496e11, 0, 0),
      velocity: new Vector3(0, 0, 29780),
      color: '#4682b4',
      seed: 100,
      planetProperties: {
        planetType: 'ROCKY' as any,
        orbitalRadius: 1.496e11,
        orbitalPeriod: 365.25 * 86400,
        parentId: 'star-1',
      },
    });

    expect(planet.id).toBe('planet-1');
    expect(planet.type).toBe(CelestialBodyType.PLANET);
    expect(planet.position.x).toBe(1.496e11);
    expect(planet.velocity.z).toBe(29780);
    expect(planet.planetProperties?.orbitalRadius).toBe(1.496e11);
  });

  it('defaults position and velocity to zero', () => {
    const body = createCelestialBody({
      id: 'test',
      name: 'Test',
      type: CelestialBodyType.STAR,
      mass: 1e30,
      radius: 1e8,
      color: '#fff',
      seed: 0,
    });

    expect(body.position.x).toBe(0);
    expect(body.position.y).toBe(0);
    expect(body.position.z).toBe(0);
    expect(body.velocity.x).toBe(0);
    expect(body.velocity.y).toBe(0);
    expect(body.velocity.z).toBe(0);
  });
});
