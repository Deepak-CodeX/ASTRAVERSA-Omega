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

  /** All bodies in the system (star + planets) */
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
export function generateSolarSystem(seed: number): SolarSystem {
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
      planetProperties: {
        planetType,
        orbitalRadius: orbitalDistanceM,
        orbitalPeriod: period,
        parentId: star.id,
        albedo,
        equilibriumTemperature,
        insolationFlux,
        insolationRelative,
        habitabilityStatus,
        environment,
      },
    }));
  }

  return {
    seed,
    star,
    planets,
    bodies: [star, ...planets],
  };
}
