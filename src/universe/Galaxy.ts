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
  BARRED_SPIRAL: 'BARRED_SPIRAL',
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
 * Detailed astronomical definition of an individual logarithmic spiral arm.
 */
export interface SpiralArmDefinition {
  /** Astronomical arm designation (e.g. Scutum-Centaurus, Perseus, etc.) */
  name: string;
  /** Zero-based arm index */
  armIndex: number;
  /** Radial coordinate where the arm emerges from the bar tip (kpc) */
  startRadius: number;
  /** Angular coordinate where the arm emerges (radians) */
  startAngle: number;
  /** Pitch angle of the logarithmic spiral (radians, ~12-14 degrees) */
  pitchAngleRad: number;
  /** Radial expansion coefficient controlling width broadening with radius */
  widthExpansionCoeff: number;
  /** Whether this is a major density-wave arm or a secondary/spur structure */
  isMajor: boolean;
}

/**
 * Parameters controlling the central stellar bar.
 */
export interface BarParams {
  /** Semi-major axis length of the central bar (kpc) */
  length: number;
  /** Semi-minor axis width of the central bar (kpc) */
  width: number;
  /** Vertical thickness / scale height of the bar (kpc) */
  thickness: number;
  /** Position angle of the bar relative to the galactic X-axis (radians) */
  angle: number;
  /** Density enhancement multiplier for stars within the bar region */
  densityMultiplier: number;
}

/**
 * Dual-component thin and thick stellar disk parameters.
 */
export interface DiskStructureParams {
  /** Thin disk vertical scale height (kpc), predominantly young Population I stars */
  thinScaleHeight: number;
  /** Thick disk vertical scale height (kpc), predominantly older Population II stars */
  thickScaleHeight: number;
  /** Radial exponential scale length (kpc) */
  radialScaleLength: number;
  /** Fraction of disk stars residing in the thick disk (0 to 1) */
  thickDiskFraction: number;
  /** Outer boundary radius of main stellar disk body (kpc, 500,000 ly diameter = ~76.65 kpc radius) */
  mainDiskRadiusKpc: number;
  /** Main stellar disk body diameter in light-years */
  mainDiskDiameterLy: number;
  /** Outer boundary radius of the extended diffuse stellar halo (kpc) */
  extendedHaloRadiusKpc: number;
  /** Extended diffuse stellar halo diameter in light-years */
  extendedHaloDiameterLy: number;
}

/**
 * Supermassive Black Hole at the galactic nucleus (ANANTARA A*).
 */
export interface SupermassiveBlackHole {
  /** Unique identifier */
  id: string;
  /** Display name (e.g. "ANANTARA A*") */
  name: string;
  /** Mass in solar masses (M☉) */
  massSolar: number;
  /** Mass in SI kilograms */
  massKg: number;
  /** Schwarzschild radius (2GM/c²) in meters */
  schwarzschildRadiusMeters: number;
  /** Schwarzschild radius in kilometers */
  schwarzschildRadiusKm: number;
  /** Schwarzschild radius in AU */
  schwarzschildRadiusAU: number;
  /** Dimensionless Kerr spin parameter a* (-1 to 1, ~0.94 for relativistic frame-dragging) */
  spinParameter: number;
  /** Accretion flow regime */
  accretionState: 'quiescent' | 'active' | 'radiatively-inefficient';
  /** Gravitational sphere of influence radius (pc) */
  sphereOfInfluencePc: number;
  /** Nuclear Star Cluster stellar velocity dispersion (km/s) */
  velocityDispersionKms: number;
  /** Relativistic radio jet length (kpc, separate from stellar diameter) */
  jetLengthKpc?: number;
  /** Estimated synchrotron jet mechanical power (Watts) */
  jetLuminosityWatts?: number;
  /** Terminal radio lobe diffuse radius (kpc) */
  radioLobeRadiusKpc?: number;
  /** Relativistic photon sphere radius in AU (1.5 * rs) */
  photonRingAU?: number;
  /** Theoretical Eddington accretion luminosity (Watts) */
  eddingtonLuminosityWatts?: number;
  /** Explanatory note clarifying optical marker vs physical microscopic Schwarzschild radius */
  visualScaleNotice?: string;
  /** Flag denoting parameters are fictional simulation settings */
  isFictionalSimulation?: boolean;
  /** Position in galactic coordinates (kpc), [0, 0, 0] */
  x: number;
  y: number;
  z: number;
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

  /** Display name (e.g. ANANTARA α) */
  name: string;

  /** Optional editable display name */
  displayName?: string;

  /** Generation algorithm schema version (1: legacy spiral, 2: barred spiral Milky Way class) */
  generationVersion?: number;

  /** Master seed for this galaxy */
  seed: number;

  /** Galaxy morphological type */
  type: GalaxyType;

  /** Main stellar disk body radius (kiloparsecs, e.g. ~76.65 kpc for 500,000 ly diameter) */
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

  /** Detailed astronomical 4-arm definitions */
  spiralArmDefinitions?: SpiralArmDefinition[];

  /** Central stellar bar parameters */
  bar?: BarParams;

  /** Dual thin/thick disk and halo structure parameters */
  diskStructure?: DiskStructureParams;

  /** Central Supermassive Black Hole (ANANTARA A*) */
  nucleus?: SupermassiveBlackHole;

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
  NUCLEUS: 'NUCLEUS',
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
