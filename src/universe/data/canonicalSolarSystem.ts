/**
 * ASTRAVERSA Ω — Canonical Solar System
 *
 * Ground-truth observed data for our actual Solar System (Sol System),
 * sourced from NASA/JPL Horizons and the NASA Planetary Fact Sheets.
 *
 * Epistemic Provenance: OBSERVED (NASA / JPL Horizons, J2000 epoch).
 *
 * Includes:
 * - Star: Sun (Sol)
 * - 8 Terrestrial, Gas, and Ice Giant Planets (Mercury through Neptune)
 * - Major natural satellites (Earth's Moon, Phobos/Deimos, Galilean Moons, Titan, Triton, etc.)
 * - Dwarf planet Pluto with Charon
 */

import { Vector3 } from '../../physics/Vector3';
import { G, AU } from '../../astronomy/constants';
import { PlanetType } from '../../astronomy/planetary';
import { computeHabitableZone, HabitabilityStatus } from '../../astronomy/stellarPlanetaryCoupling';
import {
  type CelestialBody,
  CelestialBodyType,
  createCelestialBody,
} from '../CelestialBody';
import type { SolarSystem } from '../SolarSystemGenerator';
import { orbitalToCartesian, type OrbitalElements } from '../../physics/orbitalElements';
import { createObservedProvenance } from '../AstronomicalProvenance';
import {
  MARS_GEOLOGY,
  MOON_GEOLOGY,
  type PlanetaryGeology,
} from '../../astronomy/planetaryGeology';

// Degrees to radians helper
const DEG2RAD = Math.PI / 180;

/**
 * Build the canonical, observationally validated Solar System.
 */
export function createCanonicalSolarSystem(): SolarSystem {
  const seed = 19770820; // Commemorating Voyager 2 launch epoch

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // The Sun (Sol)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sunMass = 1.9885e30; // kg
  const sunRadius = 6.957e8; // m
  const sunLuminosity = 3.828e26; // W
  const sunTemp = 5778; // K

  const sunProvenance = createObservedProvenance(
    'Sol',
    'NASA / JPL Horizons',
    'NASA Planetary Fact Sheet',
    'Center of our Solar System, spectral class G2V main-sequence star.'
  );

  const sun: CelestialBody = createCelestialBody({
    id: 'sun',
    name: 'Sun (Sol)',
    type: CelestialBodyType.STAR,
    mass: sunMass,
    radius: sunRadius,
    position: Vector3.zero(),
    velocity: Vector3.zero(),
    color: '#ffcc33',
    seed: seed,
    provenance: sunProvenance,
    starProperties: {
      spectralClass: 'G',
      luminosity: sunLuminosity,
      temperature: sunTemp,
      habitableZone: computeHabitableZone(sunLuminosity, sunTemp),
    },
  });

  const planets: CelestialBody[] = [];
  const moons: CelestialBody[] = [];

  // Helper to instantiate planet with Keplerian elements and Cartesian state vectors
  function addPlanet(config: {
    id: string;
    name: string;
    planetType: PlanetType;
    mass: number;
    radius: number;
    color: string;
    seed: number;
    semiMajorAxisAU: number;
    eccentricity: number;
    inclinationDeg: number;
    longitudeOfAscendingNodeDeg: number;
    argumentOfPeriapsisDeg: number;
    meanAnomalyDeg: number;
    albedo: number;
    habitabilityStatus: HabitabilityStatus;
    catalogNotes?: string;
    geology?: PlanetaryGeology;
  }): CelestialBody {
    const aMeters = config.semiMajorAxisAU * AU;
    const incRad = config.inclinationDeg * DEG2RAD;
    const nodeRad = config.longitudeOfAscendingNodeDeg * DEG2RAD;
    const periRad = config.argumentOfPeriapsisDeg * DEG2RAD;
    const meanRad = config.meanAnomalyDeg * DEG2RAD;

    const orbitalElements: OrbitalElements = {
      semiMajorAxis: aMeters,
      eccentricity: config.eccentricity,
      inclination: incRad,
      longitudeOfAscendingNode: nodeRad,
      argumentOfPeriapsis: periRad,
      trueAnomaly: meanRad, // approximated at epoch
      meanAnomaly: meanRad,
    };

    const mu = G * (sunMass + config.mass);
    const cartesian = orbitalToCartesian(orbitalElements, mu);
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(aMeters, 3) / mu);
    const insolationFlux = sunLuminosity / (4 * Math.PI * aMeters * aMeters);
    const insolationRelative = 1.0 / (config.semiMajorAxisAU * config.semiMajorAxisAU);
    const equilibriumTemperature =
      sunTemp * Math.sqrt(sunRadius / (2 * aMeters)) * Math.pow(1 - config.albedo, 0.25);

    const provenance = createObservedProvenance(
      config.name,
      'NASA / JPL Horizons',
      'NASA Planetary Fact Sheet / JPL Ephemeris J2000',
      config.catalogNotes
    );

    const planet = createCelestialBody({
      id: config.id,
      name: config.name,
      type: CelestialBodyType.PLANET,
      mass: config.mass,
      radius: config.radius,
      position: cartesian.position,
      velocity: cartesian.velocity,
      color: config.color,
      seed: config.seed,
      parentId: sun.id,
      provenance,
      geology: config.geology,
      planetProperties: {
        planetType: config.planetType,
        orbitalRadius: aMeters,
        orbitalPeriod: periodSeconds,
        parentId: sun.id,
        orbitalElements,
        albedo: config.albedo,
        equilibriumTemperature,
        insolationFlux,
        insolationRelative,
        habitabilityStatus: config.habitabilityStatus,
      },
    });

    planets.push(planet);
    return planet;
  }

  // Helper to instantiate natural satellite with relative Keplerian elements
  function addMoon(config: {
    id: string;
    name: string;
    parentPlanet: CelestialBody;
    mass: number;
    radius: number;
    color: string;
    seed: number;
    semiMajorAxisKm: number;
    eccentricity: number;
    inclinationDeg: number;
    longitudeOfAscendingNodeDeg: number;
    argumentOfPeriapsisDeg: number;
    meanAnomalyDeg: number;
    catalogNotes?: string;
    geology?: PlanetaryGeology;
  }): CelestialBody {
    const parent = config.parentPlanet;
    const aMeters = config.semiMajorAxisKm * 1000;
    const incRad = config.inclinationDeg * DEG2RAD;
    const nodeRad = config.longitudeOfAscendingNodeDeg * DEG2RAD;
    const periRad = config.argumentOfPeriapsisDeg * DEG2RAD;
    const meanRad = config.meanAnomalyDeg * DEG2RAD;

    const orbitalElements: OrbitalElements = {
      semiMajorAxis: aMeters,
      eccentricity: config.eccentricity,
      inclination: incRad,
      longitudeOfAscendingNode: nodeRad,
      argumentOfPeriapsis: periRad,
      trueAnomaly: meanRad,
      meanAnomaly: meanRad,
    };

    const mu = G * (parent.mass + config.mass);
    const relCartesian = orbitalToCartesian(orbitalElements, mu);
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(aMeters, 3) / mu);

    const worldPos = parent.position.add(relCartesian.position);
    const worldVel = parent.velocity.add(relCartesian.velocity);

    const provenance = createObservedProvenance(
      config.name,
      'NASA / JPL Horizons',
      'NASA Planetary Satellite Physical & Orbital Parameters',
      config.catalogNotes
    );

    const moon = createCelestialBody({
      id: config.id,
      name: config.name,
      type: CelestialBodyType.MOON,
      mass: config.mass,
      radius: config.radius,
      position: worldPos,
      velocity: worldVel,
      color: config.color,
      seed: config.seed,
      parentId: parent.id,
      provenance,
      geology: config.geology,
      moonProperties: {
        orbitalRadius: aMeters,
        orbitalPeriod: periodSeconds,
        parentId: parent.id,
        orbitalElements,
      },
    });

    moons.push(moon);
    return moon;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Mercury
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  addPlanet({
    id: 'mercury',
    name: 'Mercury',
    planetType: PlanetType.ROCKY,
    mass: 3.3011e23,
    radius: 2.4397e6,
    color: '#9e9e9e',
    seed: seed + 1,
    semiMajorAxisAU: 0.387098,
    eccentricity: 0.20563,
    inclinationDeg: 7.005,
    longitudeOfAscendingNodeDeg: 48.331,
    argumentOfPeriapsisDeg: 29.124,
    meanAnomalyDeg: 174.796,
    albedo: 0.088,
    habitabilityStatus: HabitabilityStatus.TOO_HOT,
    catalogNotes: 'Innermost terrestrial planet, heavily cratered, minimal exosphere.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Venus
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  addPlanet({
    id: 'venus',
    name: 'Venus',
    planetType: PlanetType.ROCKY,
    mass: 4.8675e24,
    radius: 6.0518e6,
    color: '#e0a96d',
    seed: seed + 2,
    semiMajorAxisAU: 0.723332,
    eccentricity: 0.006772,
    inclinationDeg: 3.39458,
    longitudeOfAscendingNodeDeg: 76.68,
    argumentOfPeriapsisDeg: 54.884,
    meanAnomalyDeg: 50.115,
    albedo: 0.76,
    habitabilityStatus: HabitabilityStatus.TOO_HOT,
    catalogNotes: 'Terrestrial planet with extreme supercritical CO₂ greenhouse atmosphere.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Earth
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const earth = addPlanet({
    id: 'earth',
    name: 'Earth',
    planetType: PlanetType.ROCKY,
    mass: 5.9722e24,
    radius: 6.371e6,
    color: '#4b9cd3',
    seed: seed + 3,
    semiMajorAxisAU: 1.00000011,
    eccentricity: 0.01671022,
    inclinationDeg: 0.00005,
    longitudeOfAscendingNodeDeg: -11.26064,
    argumentOfPeriapsisDeg: 114.20783,
    meanAnomalyDeg: 358.617,
    albedo: 0.306,
    habitabilityStatus: HabitabilityStatus.CONSERVATIVE_HZ,
    catalogNotes: 'Our home world. Liquid water oceans, nitrogen-oxygen atmosphere, active biosphere.',
  });

  // Earth's natural satellite: Moon (Luna)
  addMoon({
    id: 'moon',
    name: 'Moon (Luna)',
    parentPlanet: earth,
    mass: 7.342e22,
    radius: 1.7374e6,
    color: '#c0c0c0',
    seed: seed + 31,
    semiMajorAxisKm: 384400,
    eccentricity: 0.0549,
    inclinationDeg: 5.145,
    longitudeOfAscendingNodeDeg: 125.08,
    argumentOfPeriapsisDeg: 318.15,
    meanAnomalyDeg: 135.0,
    catalogNotes: 'Earth natural satellite. Tidally locked, synchronous rotation.',
    geology: MOON_GEOLOGY,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Mars
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const mars = addPlanet({
    id: 'mars',
    name: 'Mars',
    planetType: PlanetType.ROCKY,
    mass: 6.4171e23,
    radius: 3.3895e6,
    color: '#c1440e',
    seed: seed + 4,
    semiMajorAxisAU: 1.523679,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    longitudeOfAscendingNodeDeg: 49.558,
    argumentOfPeriapsisDeg: 286.502,
    meanAnomalyDeg: 19.373,
    albedo: 0.25,
    habitabilityStatus: HabitabilityStatus.OPTIMISTIC_OUTER,
    catalogNotes: 'Fourth planet from Sun. Cold desert planet with iron-oxide surface and polar ice caps.',
    geology: MARS_GEOLOGY,
  });

  // Mars Moons
  addMoon({
    id: 'phobos',
    name: 'Phobos',
    parentPlanet: mars,
    mass: 1.0659e16,
    radius: 11267,
    color: '#8c7d70',
    seed: seed + 41,
    semiMajorAxisKm: 9376,
    eccentricity: 0.0151,
    inclinationDeg: 1.093,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 45,
    catalogNotes: 'Innermost and larger of the two Martian moons.',
  });

  addMoon({
    id: 'deimos',
    name: 'Deimos',
    parentPlanet: mars,
    mass: 1.4762e15,
    radius: 6200,
    color: '#7a7068',
    seed: seed + 42,
    semiMajorAxisKm: 23463,
    eccentricity: 0.00033,
    inclinationDeg: 0.93,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 120,
    catalogNotes: 'Outer natural satellite of Mars.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Jupiter
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const jupiter = addPlanet({
    id: 'jupiter',
    name: 'Jupiter',
    planetType: PlanetType.GAS_GIANT,
    mass: 1.8982e27,
    radius: 6.9911e7,
    color: '#c88b3a',
    seed: seed + 5,
    semiMajorAxisAU: 5.2044,
    eccentricity: 0.048498,
    inclinationDeg: 1.303,
    longitudeOfAscendingNodeDeg: 100.464,
    argumentOfPeriapsisDeg: 273.867,
    meanAnomalyDeg: 20.02,
    albedo: 0.503,
    habitabilityStatus: 'TOO_COLD',
    catalogNotes: 'Largest gas giant in Solar System. Distinct cloud bands, Great Red Spot, powerful magnetosphere.',
  });

  // Galilean Moons
  addMoon({
    id: 'io',
    name: 'Io',
    parentPlanet: jupiter,
    mass: 8.9319e22,
    radius: 1.8216e6,
    color: '#f5c342',
    seed: seed + 51,
    semiMajorAxisKm: 421700,
    eccentricity: 0.0041,
    inclinationDeg: 0.05,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 10,
    catalogNotes: 'Most volcanically active body in the Solar System, driven by tidal friction.',
  });

  addMoon({
    id: 'europa',
    name: 'Europa',
    parentPlanet: jupiter,
    mass: 4.8e22,
    radius: 1.5608e6,
    color: '#c8d6e5',
    seed: seed + 52,
    semiMajorAxisKm: 670900,
    eccentricity: 0.009,
    inclinationDeg: 0.47,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 80,
    catalogNotes: 'Water ice crust overlying a global subsurface liquid water ocean.',
  });

  addMoon({
    id: 'ganymede',
    name: 'Ganymede',
    parentPlanet: jupiter,
    mass: 1.4819e23,
    radius: 2.6341e6,
    color: '#8b8b8b',
    seed: seed + 53,
    semiMajorAxisKm: 1070400,
    eccentricity: 0.0013,
    inclinationDeg: 0.20,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 190,
    catalogNotes: 'Largest moon in the Solar System, larger than planet Mercury; possesses intrinsic magnetic field.',
  });

  addMoon({
    id: 'callisto',
    name: 'Callisto',
    parentPlanet: jupiter,
    mass: 1.0759e23,
    radius: 2.4103e6,
    color: '#57606f',
    seed: seed + 54,
    semiMajorAxisKm: 1882700,
    eccentricity: 0.0074,
    inclinationDeg: 0.192,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 300,
    catalogNotes: 'Heavily cratered, ancient ice-rock surface with potential deep subsurface ocean.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Saturn
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const saturn = addPlanet({
    id: 'saturn',
    name: 'Saturn',
    planetType: PlanetType.GAS_GIANT,
    mass: 5.6834e26,
    radius: 5.8232e7,
    color: '#e4d5b7',
    seed: seed + 6,
    semiMajorAxisAU: 9.5826,
    eccentricity: 0.05555,
    inclinationDeg: 2.485,
    longitudeOfAscendingNodeDeg: 113.665,
    argumentOfPeriapsisDeg: 339.392,
    meanAnomalyDeg: 317.02,
    albedo: 0.342,
    habitabilityStatus: 'TOO_COLD',
    catalogNotes: 'Ringed gas giant. Spectacular ring system composed of water ice and silicates.',
  });

  // Saturn Moons
  addMoon({
    id: 'titan',
    name: 'Titan',
    parentPlanet: saturn,
    mass: 1.3452e23,
    radius: 2.5747e6,
    color: '#e58e26',
    seed: seed + 61,
    semiMajorAxisKm: 1221870,
    eccentricity: 0.0288,
    inclinationDeg: 0.3485,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 210,
    catalogNotes: 'Dense nitrogen-methane atmosphere, liquid methane/ethane lakes and rivers.',
  });

  addMoon({
    id: 'enceladus',
    name: 'Enceladus',
    parentPlanet: saturn,
    mass: 1.08e20,
    radius: 2.521e5,
    color: '#f1f2f6',
    seed: seed + 62,
    semiMajorAxisKm: 238000,
    eccentricity: 0.0047,
    inclinationDeg: 0.019,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 95,
    catalogNotes: 'High-albedo ice moon with active cryovolcanic geysers erupting from south polar fractures.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. Uranus
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const uranus = addPlanet({
    id: 'uranus',
    name: 'Uranus',
    planetType: PlanetType.ICE_GIANT,
    mass: 8.681e25,
    radius: 2.5362e7,
    color: '#4b70dd',
    seed: seed + 7,
    semiMajorAxisAU: 19.2184,
    eccentricity: 0.046381,
    inclinationDeg: 0.773,
    longitudeOfAscendingNodeDeg: 74.006,
    argumentOfPeriapsisDeg: 96.998857,
    meanAnomalyDeg: 142.2386,
    albedo: 0.30,
    habitabilityStatus: 'TOO_COLD',
    catalogNotes: 'Ice giant with extreme axial tilt of 97.77°, retrograde rotation.',
  });

  addMoon({
    id: 'titania',
    name: 'Titania',
    parentPlanet: uranus,
    mass: 3.527e21,
    radius: 7.884e5,
    color: '#dfe4ea',
    seed: seed + 71,
    semiMajorAxisKm: 435900,
    eccentricity: 0.0011,
    inclinationDeg: 0.34,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 140,
    catalogNotes: 'Eighth-largest moon in the solar system, largest moon of Uranus.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. Neptune
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const neptune = addPlanet({
    id: 'neptune',
    name: 'Neptune',
    planetType: PlanetType.ICE_GIANT,
    mass: 1.0241e26,
    radius: 2.4622e7,
    color: '#274687',
    seed: seed + 8,
    semiMajorAxisAU: 30.07,
    eccentricity: 0.009456,
    inclinationDeg: 1.769,
    longitudeOfAscendingNodeDeg: 131.78,
    argumentOfPeriapsisDeg: 273.187,
    meanAnomalyDeg: 256.228,
    albedo: 0.29,
    habitabilityStatus: 'TOO_COLD',
    catalogNotes: 'Outermost major planet in Solar System. Supersonic winds, active storm systems.',
  });

  // Neptune's large retrograde moon: Triton
  addMoon({
    id: 'triton',
    name: 'Triton',
    parentPlanet: neptune,
    mass: 2.14e22,
    radius: 1.3534e6,
    color: '#c7ecee',
    seed: seed + 81,
    semiMajorAxisKm: 354760,
    eccentricity: 0.000016,
    inclinationDeg: 156.885, // retrograde
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 45,
    catalogNotes: 'Captured Kuiper Belt dwarf planet orbiting Neptune in a retrograde direction; nitrogen cryovolcanism.',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. Dwarf Planet: Pluto
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const pluto = addPlanet({
    id: 'pluto',
    name: 'Pluto',
    planetType: PlanetType.ROCKY,
    mass: 1.303e22,
    radius: 1.1883e6,
    color: '#cfa98b',
    seed: seed + 9,
    semiMajorAxisAU: 39.482,
    eccentricity: 0.2488,
    inclinationDeg: 17.16,
    longitudeOfAscendingNodeDeg: 110.303,
    argumentOfPeriapsisDeg: 113.763,
    meanAnomalyDeg: 14.53,
    albedo: 0.58,
    habitabilityStatus: 'TOO_COLD',
    catalogNotes: 'Dwarf planet in Kuiper Belt. Binary system with Charon, heart-shaped nitrogen glacier Tombaugh Regio.',
  });

  addMoon({
    id: 'charon',
    name: 'Charon',
    parentPlanet: pluto,
    mass: 1.586e21,
    radius: 6.06e5,
    color: '#7f8c8d',
    seed: seed + 91,
    semiMajorAxisKm: 19596,
    eccentricity: 0.0002,
    inclinationDeg: 0.08,
    longitudeOfAscendingNodeDeg: 0,
    argumentOfPeriapsisDeg: 0,
    meanAnomalyDeg: 60,
    catalogNotes: 'Mutually tidally locked companion to Pluto forming a binary dwarf-planet system.',
  });

  const bodies = [sun, ...planets, ...moons];

  return {
    seed,
    star: sun,
    planets,
    moons,
    bodies,
  };
}
