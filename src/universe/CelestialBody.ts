/**
 * ASTRAVERSA Ω — Celestial Body
 *
 * Base representation for all celestial objects in the simulation.
 * This is the core data structure shared between simulation, rendering, and UI.
 *
 * Design:
 * - Pure data structure, no rendering logic
 * - Mutable position/velocity for simulation updates
 * - Immutable intrinsic properties (mass, radius, type)
 */

import { Vector3 } from '../physics/Vector3';
import type { PlanetType } from '../astronomy/planetary';
import type { SpectralClass } from '../astronomy/stellar';
import type { StellarEvolutionState } from '../astronomy/stellarEvolution';
import type {
  HabitableZoneBoundaries,
  HabitabilityStatus,
} from '../astronomy/stellarPlanetaryCoupling';

/**
 * Types of celestial bodies.
 * Extensible for future additions (asteroids, comets, black holes, etc.)
 */
export const CelestialBodyType = {
  STAR: 'STAR',
  PLANET: 'PLANET',
  MOON: 'MOON',
} as const;
export type CelestialBodyType = typeof CelestialBodyType[keyof typeof CelestialBodyType];

/**
 * Star-specific properties.
 */
export interface StarProperties {
  spectralClass: SpectralClass;
  luminosity: number;  // W
  temperature: number; // K
  evolution?: StellarEvolutionState;
  /** Circumstellar habitable zone boundaries (Mission 004B) */
  habitableZone?: HabitableZoneBoundaries;
}

/**
 * Planet-specific properties.
 */
export interface PlanetProperties {
  planetType: PlanetType;
  orbitalRadius: number;  // m (semi-major axis)
  orbitalPeriod: number;  // seconds
  parentId: string;       // ID of the parent star

  // Stellar–Planetary Coupling (Mission 004B)
  /** Planetary Bond albedo (dimensionless fraction in [0, 1)) */
  albedo: number;
  /** Radiative-equilibrium temperature (K) assuming uniform global redistribution */
  equilibriumTemperature: number;
  /** Incident stellar insolation flux at planetary orbital radius (W/m²) */
  insolationFlux: number;
  /** Insolation relative to present-day Earth solar flux (S / S_0) */
  insolationRelative: number;
  /** Circumstellar habitable zone classification based on Kopparapu et al. (2013) */
  habitabilityStatus: HabitabilityStatus;
}

/**
 * Moon-specific properties (Mission 003).
 */
export interface MoonProperties {
  orbitalRadius: number;  // m (semi-major axis around parent planet)
  orbitalPeriod: number;  // seconds
  parentId: string;       // ID of the parent planet
}

/**
 * A celestial body in the simulation.
 */
export interface CelestialBody {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Type of celestial body */
  type: CelestialBodyType;

  /** Mass in kg */
  mass: number;

  /** Physical radius in meters */
  radius: number;

  /** Current position in simulation space (meters) */
  position: Vector3;

  /** Current velocity in simulation space (m/s) */
  velocity: Vector3;

  /** Current acceleration in simulation space (m/s²) */
  acceleration: Vector3;

  /** CSS color string for rendering */
  color: string;

  /** Seed used to generate this body (for reproducibility) */
  seed: number;

  /**
   * ID of the parent body for hierarchical reference frames (Mission 003).
   * - Stars: undefined (root of the hierarchy)
   * - Planets: ID of the parent star
   * - Moons: ID of the parent planet
   */
  parentId?: string;

  /** Star-specific properties (only for STAR type) */
  starProperties?: StarProperties;

  /** Planet-specific properties (only for PLANET type) */
  planetProperties?: PlanetProperties;

  /** Moon-specific properties (only for MOON type) */
  moonProperties?: MoonProperties;
}

/**
 * Create a new celestial body with default dynamic state.
 */
export function createCelestialBody(params: {
  id: string;
  name: string;
  type: CelestialBodyType;
  mass: number;
  radius: number;
  position?: Vector3;
  velocity?: Vector3;
  color: string;
  seed: number;
  parentId?: string;
  starProperties?: StarProperties;
  planetProperties?: PlanetProperties;
  moonProperties?: MoonProperties;
}): CelestialBody {
  return {
    id: params.id,
    name: params.name,
    type: params.type,
    mass: params.mass,
    radius: params.radius,
    position: params.position ?? Vector3.zero(),
    velocity: params.velocity ?? Vector3.zero(),
    acceleration: Vector3.zero(),
    color: params.color,
    seed: params.seed,
    parentId: params.parentId,
    starProperties: params.starProperties,
    planetProperties: params.planetProperties,
    moonProperties: params.moonProperties,
  };
}
