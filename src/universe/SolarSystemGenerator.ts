/**
 * ASTRAVERSA Ω — Solar System Generator
 *
 * Procedurally generates a star and planetary system from a seed.
 *
 * Generation hierarchy:
 *   Seed → Star properties → Planet count → Planet properties
 *
 * Each planet's properties are derived from a child seed, ensuring
 * that adding planets doesn't change the properties of existing ones.
 *
 * Simplifications (see TATTVA.md):
 * - All orbits are initially circular and coplanar (XZ plane)
 * - Planet spacing follows a simplified Titius-Bode-like distribution
 * - Star mass is sampled from a weighted distribution favoring K/G/M types
 * - No binary star systems
 * - No asteroid belts or comets
 */

import { SeededRandom } from './SeededRandom';
import type { CelestialBody } from './CelestialBody';
import { CelestialBodyType, createCelestialBody } from './CelestialBody';
import type { SpectralClass } from '../astronomy/stellar';
import {
  computeStellarEvolution,
  computeMainSequenceLifetime,
} from '../astronomy/stellarEvolution';
import {
  computeHabitableZone,
  computeEquilibriumTemperature,
  computeInsolationFlux,
  computeRelativeInsolation,
  classifyHabitability,
  sampleBondAlbedo,
} from '../astronomy/stellarPlanetaryCoupling';
import { computePlanetaryEnvironment } from '../astronomy/planetaryEnvironment';
import {
  getPlanetType,
  getPlanetTypeData,
  circularOrbitalVelocity,
  orbitalPeriod,
  earthMassesToKg,
  earthRadiiToMeters,
  jupiterMassesToKg,
  jupiterRadiiToMeters,
  PlanetType,
} from '../astronomy/planetary';
import { AU } from '../astronomy/constants';
import { Vector3 } from '../physics/Vector3';

import { G } from '../astronomy/constants';

/**
 * Options for solar system generation.
 */
export interface SolarSystemGenerationOptions {
  /** If true, deterministically generates secondary natural satellites (moons) within Hill spheres */
  includeMoons?: boolean;
}

/**
 * Result of solar system generation.
 */
export interface SolarSystem {
  /** The seed used to generate this system */
  seed: number;

  /** The star at the center */
  star: CelestialBody;

  /** The planets orbiting the star */
  planets: CelestialBody[];

  /** The moons orbiting planets (Mission P1-A) */
  moons?: CelestialBody[];

  /** All bodies in the system (star + planets + optional moons) */
  bodies: CelestialBody[];
}

/**
 * Roman numeral suffixes for planet naming.
 */
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/**
 * Star name components for procedural naming.
 */
const NAME_PREFIXES = [
  'Astra', 'Sol', 'Vega', 'Altair', 'Rigel', 'Sirius', 'Deneb',
  'Polaris', 'Antares', 'Castor', 'Spica', 'Regulus', 'Betel',
  'Capella', 'Procyon', 'Achernar', 'Canopus', 'Aldebaran',
];

const NAME_SUFFIXES = [
  'Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma', 'Delta',
  'Nova', 'Tau', 'Sigma', 'Omega', 'Zeta', 'Epsilon', 'Theta',
];

/**
 * Generate a procedural star name from a seed.
 */
function generateStarName(rng: SeededRandom): string {
  const prefix = rng.pick(NAME_PREFIXES);
  const suffix = rng.pick(NAME_SUFFIXES);
  return `${prefix} ${suffix}`;
}

/**
 * Sample a stellar mass from a distribution weighted toward common star types.
 * Most stars are K and M type (low mass). G-type (Sun-like) are less common.
 * O and B types are very rare.
 *
 * This distribution is simplified but roughly reflects the initial mass function.
 */
function sampleStellarMass(rng: SeededRandom): number {
  const roll = rng.next();

  // Weighted distribution (cumulative):
  // 76% chance M-type (0.08 - 0.45 M☉)
  // 12% chance K-type (0.45 - 0.8 M☉)
  // 7.5% chance G-type (0.8 - 1.04 M☉)
  // 3% chance F-type (1.04 - 1.4 M☉)
  // 1% chance A-type (1.4 - 2.1 M☉)
  // 0.4% chance B-type (2.1 - 16 M☉)
  // 0.1% chance O-type (16+ M☉)
  //
  // For a more interesting initial demo, we bias toward G/K types
  // while keeping the distribution somewhat realistic.

  if (roll < 0.30) {
    return rng.range(0.08, 0.45); // M-type
  } else if (roll < 0.55) {
    return rng.range(0.45, 0.8);  // K-type
  } else if (roll < 0.80) {
    return rng.range(0.8, 1.04);  // G-type (Sun-like, boosted for demo)
  } else if (roll < 0.90) {
    return rng.range(1.04, 1.4);  // F-type
  } else if (roll < 0.96) {
    return rng.range(1.4, 2.1);   // A-type
  } else if (roll < 0.99) {
    return rng.range(2.1, 10);    // B-type (capped lower for practical systems)
  } else {
    return rng.range(10, 30);     // O-type (capped for practical systems)
  }
}

/**
 * Generate a complete solar system from a seed.
 *
 * @param seed - Integer seed for deterministic generation
 * @returns A SolarSystem containing a star and planets
 */
export function generateSolarSystem(
  seed: number,
  options?: SolarSystemGenerationOptions
): SolarSystem {
  const rng = new SeededRandom(seed);

  // ── Generate Star ──────────────────────────────────
  const starName = generateStarName(rng);
  const stellarMass = sampleStellarMass(rng);

  // Derive initial stellar age deterministically using an isolated child PRNG stream
  const starEvolutionRng = new SeededRandom(rng.deriveSeed(888));
  const tMS = computeMainSequenceLifetime(stellarMass);
  // Default to mature main sequence star (15% to 65% through MS lifetime)
  const ageFraction = starEvolutionRng.range(0.15, 0.65);
  const initialAgeYears = ageFraction * tMS;

  const evolution = computeStellarEvolution({
    initialMassSolar: stellarMass,
    ageYears: initialAgeYears,
  });

  const habitableZone = computeHabitableZone(
    evolution.luminosityWatts,
    evolution.effectiveTemperature
  );

  const star = createCelestialBody({
    id: `star-${seed}`,
    name: starName,
    type: CelestialBodyType.STAR,
    mass: evolution.currentMassKg,
    radius: evolution.radiusMeters,
    position: Vector3.zero(),
    velocity: Vector3.zero(),
    color: evolution.color,
    seed,
    starProperties: {
      spectralClass: evolution.spectralClass as SpectralClass,
      luminosity: evolution.luminosityWatts,
      temperature: evolution.effectiveTemperature,
      evolution,
      habitableZone,
    },
  });

  // ── Generate Planets ───────────────────────────────
  const planetCount = rng.rangeInt(3, 8);
  const planets: CelestialBody[] = [];

  // Generate orbital distances using a Titius-Bode-like progression
  // d(n) = baseDistance * spacingFactor^n + random perturbation
  const baseDistance = rng.range(0.3, 0.6); // AU, innermost planet distance
  const spacingFactor = rng.range(1.4, 2.0); // Geometric spacing

  for (let i = 0; i < planetCount; i++) {
    const planetRng = rng.fork(i);

    // Orbital distance with Titius-Bode-like progression
    const nominalDistance = baseDistance * Math.pow(spacingFactor, i);
    const perturbation = planetRng.range(0.9, 1.1); // ±10% random variation
    const orbitalDistanceAU = nominalDistance * perturbation;
    const orbitalDistanceM = orbitalDistanceAU * AU;

    // Determine planet type based on orbital zone
    const planetType = getPlanetType(orbitalDistanceAU);
    const typeData = getPlanetTypeData(planetType);

    // Generate mass and radius within type-appropriate ranges
    let mass: number;
    let radius: number;

    if (planetType === PlanetType.ROCKY) {
      const massEarth = planetRng.range(typeData.massMin, typeData.massMax);
      const radiusEarth = planetRng.range(typeData.radiusMin, typeData.radiusMax);
      mass = earthMassesToKg(massEarth);
      radius = earthRadiiToMeters(radiusEarth);
    } else {
      // Gas/ice giants: use Jupiter units scaled
      const massJupiter = planetRng.range(typeData.massMin / 318, typeData.massMax / 318);
      const radiusJupiter = planetRng.range(typeData.radiusMin / 11.2, typeData.radiusMax / 11.2);
      mass = jupiterMassesToKg(massJupiter);
      radius = jupiterRadiiToMeters(radiusJupiter);
    }

    // Compute circular orbital velocity
    const velocity = circularOrbitalVelocity(star.mass, orbitalDistanceM);
    const period = orbitalPeriod(star.mass, orbitalDistanceM);

    // Initial position: distribute planets at random orbital angles
    const angle = planetRng.range(0, 2 * Math.PI);
    const position = new Vector3(
      orbitalDistanceM * Math.cos(angle),
      0, // Coplanar in XZ plane
      orbitalDistanceM * Math.sin(angle)
    );

    // Velocity perpendicular to position (for circular orbit)
    const velocityVec = new Vector3(
      -velocity * Math.sin(angle),
      0,
      velocity * Math.cos(angle)
    );

    const planetName = `${starName} ${ROMAN_NUMERALS[i] || (i + 1).toString()}`;
    const color = planetRng.pick(typeData.colors);

    // Derived albedo using isolated child seed to preserve determinism
    const albedoRng = new SeededRandom(planetRng.deriveSeed(777));
    const albedo = sampleBondAlbedo(planetType, albedoRng);

    const equilibriumTemperature = computeEquilibriumTemperature(
      star.starProperties!.luminosity,
      orbitalDistanceM,
      albedo
    );
    const insolationFlux = computeInsolationFlux(
      star.starProperties!.luminosity,
      orbitalDistanceM
    );
    const insolationRelative = computeRelativeInsolation(insolationFlux);
    const habitabilityStatus = classifyHabitability(
      orbitalDistanceM,
      habitableZone
    );

    // Derived planetary environment using isolated child seed to preserve determinism (Mission 005A)
    const envRng = new SeededRandom(planetRng.deriveSeed(999));
    const environment = computePlanetaryEnvironment({
      planetType,
      massKg: mass,
      radiusMeters: radius,
      luminosityWatts: star.starProperties!.luminosity,
      orbitalDistanceMeters: orbitalDistanceM,
      albedo,
      rng: envRng,
    });

    planets.push(createCelestialBody({
      id: `planet-${seed}-${i}`,
      name: planetName,
      type: CelestialBodyType.PLANET,
      mass,
      radius,
      position,
      velocity: velocityVec,
      color,
      seed: planetRng.deriveSeed(0),
      parentId: star.id,
      planetProperties: {
        planetType,
        orbitalRadius: orbitalDistanceM,
        orbitalPeriod: period,
        parentId: star.id,
        orbitalElements: {
          semiMajorAxis: orbitalDistanceM,
          eccentricity: 0.0,
          inclination: 0.0,
          longitudeOfAscendingNode: 0.0,
          argumentOfPeriapsis: 0.0,
          trueAnomaly: angle,
        },
        albedo,
        equilibriumTemperature,
        insolationFlux,
        insolationRelative,
        habitabilityStatus,
        environment,
      },
    }));
  }

  const allMoons: CelestialBody[] = [];
  if (options?.includeMoons) {
    for (let i = 0; i < planets.length; i++) {
      const planetMoons = generateMoonsForPlanet(planets[i], star.mass, i, seed);
      allMoons.push(...planetMoons);
    }
  }

  return {
    seed,
    star,
    planets,
    moons: allMoons,
    bodies: options?.includeMoons ? [star, ...planets, ...allMoons] : [star, ...planets],
  };
}

/**
 * Compute the Hill sphere radius for a secondary body orbiting a primary star.
 *
 * r_H = a * (M_p / (3 * M_*))^(1/3)
 *
 * @param semiMajorAxisMeters - Planetary semi-major axis in meters
 * @param planetMassKg - Planetary mass in kg
 * @param starMassKg - Central star mass in kg
 */
export function computeHillRadius(
  semiMajorAxisMeters: number,
  planetMassKg: number,
  starMassKg: number
): number {
  if (starMassKg <= 0 || planetMassKg <= 0 || semiMajorAxisMeters <= 0) return 0;
  return semiMajorAxisMeters * Math.cbrt(planetMassKg / (3 * starMassKg));
}

/**
 * Deterministically generate natural satellites (moons) for a planet within its dynamically stable Hill sphere.
 *
 * Grounded in dynamical stability:
 * - Domingos, Winter & Yokoyama (2006): Stable prograde satellite orbits require r <= 0.49 * r_H.
 *   We enforce r_moon in [max(3*R_p, 50,000 km), 0.35 * r_H] for guaranteed long-term N-body stability.
 * - Gas / ice giants have high capture cross-sections (1 to 3 moons).
 * - Massive terrestrial worlds (M > 0.5 M_earth) can host 0 to 1 moon.
 */
export function generateMoonsForPlanet(
  planet: CelestialBody,
  starMassKg: number,
  planetIndex: number,
  parentSeed: number
): CelestialBody[] {
  const pp = planet.planetProperties;
  if (!pp) return [];

  const rH = computeHillRadius(pp.orbitalRadius, planet.mass, starMassKg);
  const rMin = Math.max(3 * planet.radius, 50_000_000);
  const rMax = 0.35 * rH;

  if (rMin >= rMax || rH <= 0) {
    return [];
  }

  const moonRng = new SeededRandom(parentSeed + planetIndex * 1337 + 777);

  let moonCount = 0;
  if (planet.mass >= 50 * 5.972e24) {
    moonCount = moonRng.rangeInt(1, 3);
  } else if (planet.mass >= 10 * 5.972e24) {
    moonCount = moonRng.rangeInt(1, 2);
  } else if (planet.mass >= 0.5 * 5.972e24) {
    moonCount = moonRng.next() < 0.6 ? 1 : 0;
  } else {
    moonCount = 0;
  }

  const moons: CelestialBody[] = [];
  const moonLetters = ['a', 'b', 'c', 'd', 'e'];

  for (let m = 0; m < moonCount; m++) {
    const frac = (m + 0.5) / moonCount;
    const distanceM = rMin + frac * (rMax - rMin) * moonRng.range(0.9, 1.1);
    const safeDistanceM = Math.min(distanceM, rMax * 0.95);

    const moonMass = planet.mass * moonRng.range(1.5e-5, 1.2e-4);
    const density = moonRng.range(2200, 3400);
    const moonVolume = moonMass / density;
    const moonRadius = Math.cbrt((3 * moonVolume) / (4 * Math.PI));

    const period = 2 * Math.PI * Math.sqrt(Math.pow(safeDistanceM, 3) / (G * (planet.mass + moonMass)));
    const vCircular = Math.sqrt((G * planet.mass) / safeDistanceM);

    const angle = moonRng.range(0, 2 * Math.PI);
    const relPos = new Vector3(
      safeDistanceM * Math.cos(angle),
      0,
      safeDistanceM * Math.sin(angle)
    );
    const relVel = new Vector3(
      -vCircular * Math.sin(angle),
      0,
      vCircular * Math.cos(angle)
    );

    const moonColor = moonRng.pick(['#cbd5e1', '#94a3b8', '#a1a1aa', '#cbd5e1', '#e2e8f0', '#d4d4d8']);
    const moonId = `moon-${planet.id}-${m}`;
    const moonName = `${planet.name} ${moonLetters[m] ?? (m + 1).toString()}`;

    moons.push(createCelestialBody({
      id: moonId,
      name: moonName,
      type: CelestialBodyType.MOON,
      mass: moonMass,
      radius: moonRadius,
      position: new Vector3(
        planet.position.x + relPos.x,
        planet.position.y + relPos.y,
        planet.position.z + relPos.z
      ),
      velocity: new Vector3(
        planet.velocity.x + relVel.x,
        planet.velocity.y + relVel.y,
        planet.velocity.z + relVel.z
      ),
      color: moonColor,
      seed: moonRng.deriveSeed(m),
      parentId: planet.id,
      moonProperties: {
        orbitalRadius: safeDistanceM,
        orbitalPeriod: period,
        parentId: planet.id,
        orbitalElements: {
          semiMajorAxis: safeDistanceM,
          eccentricity: 0.0,
          inclination: 0.0,
          longitudeOfAscendingNode: 0.0,
          argumentOfPeriapsis: 0.0,
          trueAnomaly: angle,
        },
      },
    }));
  }

  return moons;
}
