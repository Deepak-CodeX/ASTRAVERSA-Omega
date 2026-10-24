/**
 * ASTRAVERSA Ω — Stellar–Planetary Coupling (Mission 004B)
 *
 * Implements authoritative radiative coupling between stellar luminosity and
 * orbiting planetary bodies:
 * 1. Planetary radiative-equilibrium temperature (T_eq)
 * 2. Incident stellar insolation flux (S and S/S_0)
 * 3. Circumstellar habitable zone (HZ) boundaries based on the 1D climate
 *    modeling literature (Kopparapu et al. 2013, 2014)
 *
 * Scientific Model & Assumptions:
 * - Radiative Equilibrium:
 *     T_eq = ( (L_star * (1 - A)) / (16 * π * σ * d^2) )^(1/4)
 *   where:
 *     - L_star is stellar luminosity in Watts (W)
 *     - A is Bond albedo (dimensionless fraction in [0, 1))
 *     - d is orbital distance in meters (m)
 *     - σ is the Stefan–Boltzmann constant (5.670374419e-8 W m^-2 K^-4)
 *   Assumptions:
 *     - Absorbed radiation is uniformly reradiated over 4π R_p^2 (rapid planetary
 *       rotation and efficient global atmospheric/oceanic heat redistribution).
 *     - Emissivity ε = 1 (blackbody absorption and emission).
 *     - No explicit greenhouse warming model (e.g. Earth's actual surface is ~288 K
 *       due to +33.7 K natural greenhouse warming from H2O/CO2).
 *     - Negligible internal/tidal/geothermal heat flux.
 *
 * - Circumstellar Habitable Zone (Kopparapu et al. 2013, 2014):
 *     S_eff = S_eff_⊙ + a * T_* + b * T_*^2 + c * T_*^3 + d * T_*^4
 *     where T_* = T_eff - 5780 K
 *     d_AU = sqrt((L_star / L_⊙) / S_eff)
 *   Boundaries:
 *     1. Recent Venus (optimistic inner boundary)
 *     2. Runaway Greenhouse (conservative inner boundary)
 *     3. Maximum Greenhouse (conservative outer boundary)
 *     4. Early Mars (optimistic outer boundary)
 *   Validity limits:
 *     - Validated for main-sequence stars with 2600 K <= T_eff <= 7200 K.
 *     - For stellar temperatures outside [2600, 7200] K, T_eff is clamped for
 *       spectral weighting evaluation to prevent unphysical 4th-order polynomial
 *       divergence, while scaling strictly with the actual stellar bolometric luminosity.
 *
 * References:
 * - Kopparapu, R. K., Ramirez, R. M., Kasting, J. F., et al. (2013). "Habitable Zones around
 *   Main-Sequence Stars: New Estimates". The Astrophysical Journal, 765:131.
 * - Kopparapu, R. K., Ramirez, R. M., Schottelkotte, J., et al. (2014). "Habitable Zones around
 *   Main-Sequence Stars: Dependence on Planetary Mass". ApJ, 787:L29.
 * - Pierrehumbert, R. T. (2010). "Principles of Planetary Climate". Cambridge University Press.
 */

import { AU, SOLAR_LUMINOSITY, STEFAN_BOLTZMANN } from './constants';
import { PlanetType } from './planetary';
import type { SeededRandom } from '../universe/SeededRandom';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants & Models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Reference solar insolation flux at 1 AU (Solar Constant S_0 in W/m²) */
export const SOLAR_INSOLATION_EARTH = SOLAR_LUMINOSITY / (4 * Math.PI * AU * AU);

/** Kopparapu et al. (2013) valid effective temperature range (K) */
export const HZ_VALID_TEFF_MIN = 2600;
export const HZ_VALID_TEFF_MAX = 7200;
export const HZ_REFERENCE_SOLAR_TEFF = 5780;

/**
 * Polynomial coefficients for Kopparapu et al. (2013, Table 3)
 * for a 1-Earth-mass planet.
 */
interface KopparapuCoefficients {
  sEffSun: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

const HZ_COEFFICIENTS: Record<'recentVenus' | 'runawayGreenhouse' | 'maximumGreenhouse' | 'earlyMars', KopparapuCoefficients> = {
  recentVenus: {
    sEffSun: 1.776,
    a: 2.136e-4,
    b: 2.533e-8,
    c: -1.332e-11,
    d: -3.097e-15,
  },
  runawayGreenhouse: {
    sEffSun: 1.056,
    a: 1.272e-4,
    b: 1.565e-8,
    c: -6.408e-12,
    d: -2.162e-15,
  },
  maximumGreenhouse: {
    sEffSun: 0.356,
    a: 6.171e-5,
    b: 1.698e-9,
    c: -3.198e-12,
    d: -5.575e-16,
  },
  earlyMars: {
    sEffSun: 0.320,
    a: 5.547e-5,
    b: 1.526e-9,
    c: -2.874e-12,
    d: -5.011e-16,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Habitable Zone Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Circumstellar habitable zone boundary boundaries in both SI meters and AU.
 */
export interface HabitableZoneBoundaries {
  /** Optimistic inner edge (Recent Venus limit) in meters */
  innerOptimisticMeters: number;
  /** Conservative inner edge (Runaway Greenhouse limit) in meters */
  innerConservativeMeters: number;
  /** Conservative outer edge (Maximum Greenhouse limit) in meters */
  outerConservativeMeters: number;
  /** Optimistic outer edge (Early Mars limit) in meters */
  outerOptimisticMeters: number;

  /** Optimistic inner edge in AU */
  innerOptimisticAU: number;
  /** Conservative inner edge in AU */
  innerConservativeAU: number;
  /** Conservative outer edge in AU */
  outerConservativeAU: number;
  /** Optimistic outer edge in AU */
  outerOptimisticAU: number;

  /** Star effective temperature used for spectral weighting (K) */
  effectiveTemperatureK: number;
  /** Star bolometric luminosity (W) */
  luminosityWatts: number;
  /** Whether the star temperature was clamped to [2600, 7200] K */
  isTemperatureClamped: boolean;
}

/**
 * Classification of planetary orbital distance relative to habitable zone boundaries.
 */
export const HabitabilityStatus = {
  /** Interior to optimistic inner edge (insolation excessive for surface liquid water) */
  TOO_HOT: 'TOO_HOT',
  /** Between optimistic inner edge (Recent Venus) and conservative inner edge (Runaway Greenhouse) */
  OPTIMISTIC_INNER: 'OPTIMISTIC_INNER',
  /** Within conservative habitable zone (Runaway Greenhouse to Maximum Greenhouse) */
  CONSERVATIVE_HZ: 'CONSERVATIVE_HZ',
  /** Between conservative outer edge (Maximum Greenhouse) and optimistic outer edge (Early Mars) */
  OPTIMISTIC_OUTER: 'OPTIMISTIC_OUTER',
  /** Exterior to optimistic outer edge (insolation insufficient to prevent global glaciation) */
  TOO_COLD: 'TOO_COLD',
} as const;
export type HabitabilityStatus = typeof HabitabilityStatus[keyof typeof HabitabilityStatus];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Radiative Equilibrium Calculations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate the radiative-equilibrium temperature (T_eq) of a spherical planet in Kelvin.
 *
 * T_eq = ( (L_star * (1 - A)) / (16 * π * σ * d^2) )^(1/4)
 *
 * @param luminosityWatts - Stellar bolometric luminosity in Watts (W >= 0)
 * @param distanceMeters - Orbital distance in meters (d > 0)
 * @param bondAlbedo - Planetary Bond albedo (0 <= A < 1)
 * @returns Equilibrium temperature in Kelvin (K)
 */
export function computeEquilibriumTemperature(
  luminosityWatts: number,
  distanceMeters: number,
  bondAlbedo: number
): number {
  if (!Number.isFinite(luminosityWatts)) {
    throw new TypeError(`luminosityWatts must be a finite number, received ${luminosityWatts}`);
  }
  if (!Number.isFinite(distanceMeters)) {
    throw new TypeError(`distanceMeters must be a finite number, received ${distanceMeters}`);
  }
  if (!Number.isFinite(bondAlbedo)) {
    throw new TypeError(`bondAlbedo must be a finite number, received ${bondAlbedo}`);
  }

  if (distanceMeters <= 0) {
    throw new RangeError(`Orbital distance must be strictly positive (> 0), received ${distanceMeters} m`);
  }
  if (luminosityWatts < 0) {
    throw new RangeError(`Stellar luminosity cannot be negative, received ${luminosityWatts} W`);
  }
  if (bondAlbedo < 0 || bondAlbedo >= 1.0) {
    throw new RangeError(`Bond albedo must be in the range [0, 1), received ${bondAlbedo}`);
  }

  // Degenerate / zero luminosity star (e.g. cold remnant or black hole)
  if (luminosityWatts === 0) {
    return 0;
  }

  // T_eq = [ L * (1 - A) / (16 * π * σ * d^2) ]^(1/4)
  const numerator = luminosityWatts * (1.0 - bondAlbedo);
  const denominator = 16.0 * Math.PI * STEFAN_BOLTZMANN * (distanceMeters * distanceMeters);

  return Math.pow(numerator / denominator, 0.25);
}

/**
 * Calculate incident stellar insolation flux at a given orbital distance.
 *
 * S = L_star / (4 * π * d^2)
 *
 * @param luminosityWatts - Stellar luminosity in Watts (W >= 0)
 * @param distanceMeters - Orbital distance in meters (d > 0)
 * @returns Incident stellar flux in W/m²
 */
export function computeInsolationFlux(luminosityWatts: number, distanceMeters: number): number {
  if (!Number.isFinite(luminosityWatts) || !Number.isFinite(distanceMeters)) {
    throw new TypeError('Luminosity and distance must be finite numbers');
  }
  if (distanceMeters <= 0) {
    throw new RangeError(`Orbital distance must be positive, received ${distanceMeters} m`);
  }
  if (luminosityWatts < 0) {
    throw new RangeError(`Stellar luminosity cannot be negative, received ${luminosityWatts} W`);
  }

  return luminosityWatts / (4.0 * Math.PI * distanceMeters * distanceMeters);
}

/**
 * Calculate insolation relative to present-day Earth solar insolation (S / S_0).
 *
 * @param insolationWattsPerM2 - Insolation in W/m²
 * @returns Relative flux dimensionless ratio (Earth = 1.0)
 */
export function computeRelativeInsolation(insolationWattsPerM2: number): number {
  if (!Number.isFinite(insolationWattsPerM2) || insolationWattsPerM2 < 0) {
    throw new RangeError(`Insolation flux must be a non-negative finite number, received ${insolationWattsPerM2}`);
  }
  return insolationWattsPerM2 / SOLAR_INSOLATION_EARTH;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Habitable Zone Calculations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Evaluate effective insolation flux threshold S_eff for a specific Kopparapu limit.
 */
function evaluateSEff(coeff: KopparapuCoefficients, tEffClamped: number): number {
  const tStar = tEffClamped - HZ_REFERENCE_SOLAR_TEFF;
  const sEff =
    coeff.sEffSun +
    coeff.a * tStar +
    coeff.b * tStar * tStar +
    coeff.c * Math.pow(tStar, 3) +
    coeff.d * Math.pow(tStar, 4);

  // Guard against non-physical negative effective flux
  return Math.max(1e-4, sEff);
}

/**
 * Calculate circumstellar habitable zone boundaries using Kopparapu et al. (2013, 2014).
 *
 * @param luminosityWatts - Stellar bolometric luminosity in Watts (W >= 0)
 * @param effectiveTemperatureK - Stellar effective temperature in Kelvin (K > 0)
 * @returns HabitableZoneBoundaries in both SI meters and AU
 */
export function computeHabitableZone(
  luminosityWatts: number,
  effectiveTemperatureK: number
): HabitableZoneBoundaries {
  if (!Number.isFinite(luminosityWatts) || !Number.isFinite(effectiveTemperatureK)) {
    throw new TypeError('Luminosity and effective temperature must be finite numbers');
  }
  if (luminosityWatts < 0) {
    throw new RangeError(`Stellar luminosity cannot be negative, received ${luminosityWatts}`);
  }
  if (effectiveTemperatureK <= 0) {
    throw new RangeError(`Effective temperature must be strictly positive, received ${effectiveTemperatureK}`);
  }

  // Non-luminous stellar remnant edge case
  if (luminosityWatts === 0) {
    return {
      innerOptimisticMeters: 0,
      innerConservativeMeters: 0,
      outerConservativeMeters: 0,
      outerOptimisticMeters: 0,
      innerOptimisticAU: 0,
      innerConservativeAU: 0,
      outerConservativeAU: 0,
      outerOptimisticAU: 0,
      effectiveTemperatureK,
      luminosityWatts,
      isTemperatureClamped: false,
    };
  }

  // Clamp effective temperature to literature model validity range [2600, 7200] K
  const isTemperatureClamped =
    effectiveTemperatureK < HZ_VALID_TEFF_MIN || effectiveTemperatureK > HZ_VALID_TEFF_MAX;
  const tEffClamped = Math.min(
    HZ_VALID_TEFF_MAX,
    Math.max(HZ_VALID_TEFF_MIN, effectiveTemperatureK)
  );

  const luminositySolar = luminosityWatts / SOLAR_LUMINOSITY;

  const sEffRecentVenus = evaluateSEff(HZ_COEFFICIENTS.recentVenus, tEffClamped);
  const sEffRunaway = evaluateSEff(HZ_COEFFICIENTS.runawayGreenhouse, tEffClamped);
  const sEffMaximum = evaluateSEff(HZ_COEFFICIENTS.maximumGreenhouse, tEffClamped);
  const sEffEarlyMars = evaluateSEff(HZ_COEFFICIENTS.earlyMars, tEffClamped);

  // d_AU = sqrt( (L / L_sun) / S_eff )
  const innerOptimisticAU = Math.sqrt(luminositySolar / sEffRecentVenus);
  const innerConservativeAU = Math.sqrt(luminositySolar / sEffRunaway);
  const outerConservativeAU = Math.sqrt(luminositySolar / sEffMaximum);
  const outerOptimisticAU = Math.sqrt(luminositySolar / sEffEarlyMars);

  return {
    innerOptimisticMeters: innerOptimisticAU * AU,
    innerConservativeMeters: innerConservativeAU * AU,
    outerConservativeMeters: outerConservativeAU * AU,
    outerOptimisticMeters: outerOptimisticAU * AU,

    innerOptimisticAU,
    innerConservativeAU,
    outerConservativeAU,
    outerOptimisticAU,

    effectiveTemperatureK: tEffClamped,
    luminosityWatts,
    isTemperatureClamped,
  };
}

/**
 * Classify a planet's habitability status based on its orbital distance and star's HZ.
 *
 * @param orbitalDistanceMeters - Planetary semi-major axis / orbital distance in meters
 * @param hz - Calculated circumstellar habitable zone boundaries
 * @returns HabitabilityStatus
 */
export function classifyHabitability(
  orbitalDistanceMeters: number,
  hz: HabitableZoneBoundaries
): HabitabilityStatus {
  if (!Number.isFinite(orbitalDistanceMeters) || orbitalDistanceMeters <= 0) {
    throw new RangeError(`Orbital distance must be positive, received ${orbitalDistanceMeters}`);
  }

  if (orbitalDistanceMeters < hz.innerOptimisticMeters) {
    return HabitabilityStatus.TOO_HOT;
  }
  if (orbitalDistanceMeters < hz.innerConservativeMeters) {
    return HabitabilityStatus.OPTIMISTIC_INNER;
  }
  if (orbitalDistanceMeters <= hz.outerConservativeMeters) {
    return HabitabilityStatus.CONSERVATIVE_HZ;
  }
  if (orbitalDistanceMeters <= hz.outerOptimisticMeters) {
    return HabitabilityStatus.OPTIMISTIC_OUTER;
  }
  return HabitabilityStatus.TOO_COLD;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Planetary Albedo Utilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Reference canonical Bond albedos by planet classification.
 * Values reflect empirical solar system averages:
 * - ROCKY: ~0.30 (Earth ~0.306, Mars ~0.25)
 * - GAS_GIANT: ~0.45 (Jupiter ~0.50, Saturn ~0.34)
 * - ICE_GIANT: ~0.35 (Uranus ~0.30, Neptune ~0.29)
 */
export function getDefaultBondAlbedo(planetType: PlanetType): number {
  switch (planetType) {
    case PlanetType.ROCKY:
      return 0.30;
    case PlanetType.GAS_GIANT:
      return 0.45;
    case PlanetType.ICE_GIANT:
      return 0.35;
    default:
      return 0.30;
  }
}

/**
 * Sample a realistic Bond albedo within literature physical bounds for a planet type,
 * using an isolated PRNG stream.
 */
export function sampleBondAlbedo(planetType: PlanetType, rng: SeededRandom): number {
  switch (planetType) {
    case PlanetType.ROCKY:
      // Airless rock (Mercury 0.09) to cloud-bearing terrestrial (Earth 0.30)
      return rng.range(0.12, 0.36);
    case PlanetType.GAS_GIANT:
      // Saturn (0.34) to Jupiter (0.50)
      return rng.range(0.35, 0.52);
    case PlanetType.ICE_GIANT:
      // Neptune (0.29) to Uranus (0.30) with atmospheric haze variation
      return rng.range(0.28, 0.38);
    default:
      return 0.30;
  }
}
