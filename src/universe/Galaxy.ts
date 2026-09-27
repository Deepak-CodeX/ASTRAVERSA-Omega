/**
 * ASTRAVERSA Ω — Galaxy Domain Model
 *
 * Formal representation of a procedurally generated galaxy.
 * This is a computational approximation, not a research-grade model.
 *
 * Galaxy → StarCluster → GalaxyStar → (SolarSystem when selected)
 *
 * Design:
 * - GalaxyStar is a lightweight representation for rendering/selection
 * - Full CelestialBody is only instantiated when drilling into a system
 * - All generation is deterministic via SeededRandom
 *
 * See TATTVA.md for scientific assumptions.
 */

import type { SpectralClass } from '../astronomy/stellar';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Classification of galaxy morphology.
 * Mission 002 implements SPIRAL only. Others are defined
 * for future expansion.
 */
export const GalaxyType = {
  SPIRAL: 'SPIRAL',
  ELLIPTICAL: 'ELLIPTICAL',
  IRREGULAR: 'IRREGULAR',
} as const;
export type GalaxyType = typeof GalaxyType[keyof typeof GalaxyType];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Parameters
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parameters controlling spiral arm generation.
 */
export interface SpiralArmParams {
  /** Number of spiral arms */
  armCount: number;
  /** Tightness of the spiral (higher = tighter winding) */
  windingFactor: number;
  /** Angular offset of first arm (radians) */
  armOffset: number;
  /** Width of each arm as a fraction of galactic radius */
  armWidth: number;
  /** How much stars cluster toward arm centers (0 = uniform, 1 = tight) */
  armDensity: number;
}

/**
 * Parameters controlling the central bulge.
 */
export interface BulgeParams {
  /** Bulge radius as fraction of galaxy radius */
  radiusFraction: number;
  /** Bulge vertical scale (thickness multiplier relative to main disk) */
  verticalScale: number;
  /** Density of stars in the bulge relative to disk */
  densityMultiplier: number;
}

/**
 * Quality level controlling rendering performance.
 */
export const QualityLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type QualityLevel = typeof QualityLevel[keyof typeof QualityLevel];

/**
 * Star counts per quality level.
 */
export const QUALITY_STAR_COUNTS: Record<QualityLevel, number> = {
  [QualityLevel.LOW]: 8000,
  [QualityLevel.MEDIUM]: 20000,
  [QualityLevel.HIGH]: 40000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Star (Lightweight Representation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * A lightweight star representation for galaxy-scale rendering.
 *
 * This is NOT a CelestialBody. CelestialBody is heavyweight
 * (simulation state, velocity, acceleration) and is only
 * instantiated when the user drills into a star system.
 *
 * GalaxyStar contains only what is needed for:
 * - Positioning in 3D space
 * - Rendering (color, brightness, size)
 * - Selection (id, seed for system generation)
 * - Scientific display (mass, temperature, spectral class)
 */
export interface GalaxyStar {
  /** Unique identifier within the galaxy */
  id: string;

  /** Display name */
  name: string;

  /** Seed for generating this star's solar system */
  seed: number;

  /** Position in galactic coordinates (kiloparsecs) */
  x: number;
  y: number;
  z: number;

  /** Mass in solar masses */
  massSolar: number;

  /** Temperature in Kelvin */
  temperature: number;

  /** Luminosity in solar luminosities */
  luminositySolar: number;

  /** Spectral classification */
  spectralClass: SpectralClass;

  /** CSS color for rendering */
  color: string;

  /** Radius in solar radii */
  radiusSolar: number;

  /** Metallicity index (0 = metal-poor, 1 = metal-rich) */
  metallicity: number;

  /** Index of the cluster this star belongs to (-1 = inter-arm / field star) */
  clusterIndex: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Star Cluster
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * A star cluster within the galaxy.
 */
export interface StarCluster {
  /** Unique identifier */
  id: string;

  /** Seed for deterministic generation */
  seed: number;

  /** Position in galactic coordinates (kiloparsecs) */
  x: number;
  y: number;
  z: number;

  /** Cluster radius (kiloparsecs) */
  radius: number;

  /** Estimated stellar population */
  populationEstimate: number;

  /** Indices of representative stars in the galaxy's star array */
  starIndices: number[];

  /** Average density characteristic (stars per cubic kpc) */
  density: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * The complete galaxy representation.
 */
export interface Galaxy {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Master seed for this galaxy */
  seed: number;

  /** Galaxy morphological type */
  type: GalaxyType;

  /** Galaxy radius (kiloparsecs) */
  radius: number;

  /** Galaxy disk thickness at center (kiloparsecs) */
  thickness: number;

  /** Estimated total stellar population (billions) */
  estimatedPopulation: number;

  /** Galaxy age (billions of years) */
  age: number;

  /** Average metallicity (0-1 scale, 0 = metal-poor, 1 = metal-rich) */
  metallicity: number;

  /** Spiral arm parameters */
  spiralArms: SpiralArmParams;

  /** Central bulge parameters */
  bulge: BulgeParams;

  /** Star clusters */
  clusters: StarCluster[];

  /** Representative stars (lightweight, for rendering) */
  stars: GalaxyStar[];

  /** Quality level used during generation */
  quality: QualityLevel;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Navigation State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Hierarchical view levels.
 */
export const ViewLevel = {
  GALAXY: 'GALAXY',
  CLUSTER: 'CLUSTER',
  STAR: 'STAR',
  SYSTEM: 'SYSTEM',
} as const;
export type ViewLevel = typeof ViewLevel[keyof typeof ViewLevel];

/**
 * Current navigation context.
 */
export interface NavigationState {
  /** Current view level */
  level: ViewLevel;

  /** Selected galaxy (always set after init) */
  galaxyId: string;

  /** Selected cluster ID (when in CLUSTER or deeper view) */
  clusterId?: string;

  /** Selected star index (when in STAR or SYSTEM view) */
  starIndex?: number;
}
