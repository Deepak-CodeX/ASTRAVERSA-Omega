/**
 * ASTRAVERSA Ω — Astronomical Constants
 *
 * Physical and astronomical constants used throughout the simulation.
 * All values are in SI units unless otherwise noted.
 *
 * The simulation uses a scaled unit system for practical computation:
 * - Distance: AU (Astronomical Units) for orbital distances
 * - Mass: Solar masses (M☉) for stellar masses, kg for internal calculations
 * - Time: Seconds internally, displayed as years/days
 *
 * See TATTVA.md for unit system rationale and limitations.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fundamental Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Gravitational constant (m³ kg⁻¹ s⁻²) */
export const G = 6.6743e-11;

/** Exact speed of light in vacuum (m/s) */
export const SPEED_OF_LIGHT = 299792458;

/** Alias for speed of light */
export const C = SPEED_OF_LIGHT;

/** Stefan-Boltzmann constant (W m⁻² K⁻⁴) */
export const STEFAN_BOLTZMANN = 5.670374419e-8;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Solar Properties
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Solar mass (kg) */
export const SOLAR_MASS = 1.989e30;

/** Solar radius (m) */
export const SOLAR_RADIUS = 6.957e8;

/** Solar luminosity (W) */
export const SOLAR_LUMINOSITY = 3.828e26;

/** Solar effective temperature (K) */
export const SOLAR_TEMPERATURE = 5778;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Planetary Reference Values
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Earth mass (kg) */
export const EARTH_MASS = 5.972e24;

/** Earth radius (m) */
export const EARTH_RADIUS = 6.371e6;

/** Jupiter mass (kg) */
export const JUPITER_MASS = 1.898e27;

/** Jupiter radius (m) */
export const JUPITER_RADIUS = 6.9911e7;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Distance Units
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Astronomical Unit in meters (IAU 2012 exact definition: 149597870700 m) */
export const AU = 1.495978707e11;

/** Light year in meters (Julian year * c) */
export const LIGHT_YEAR = 9.4607304725808e15;

/** Parsec in meters */
export const PARSEC = 3.08567758149137e16;

/** Kiloparsec in meters */
export const KILOPARSEC = PARSEC * 1000;

/** Kiloparsec in light years (1 kpc = 3261.563777 ly) */
export const KILOPARSEC_LY = 3261.563777;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Time Units
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Seconds in a day */
export const SECONDS_PER_DAY = 86400;

/** Seconds in a year (Julian year = 365.25 days) */
export const SECONDS_PER_YEAR = 365.25 * SECONDS_PER_DAY;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Simulation Scaling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * The simulation internally works in SI units (meters, kg, seconds).
 * For rendering, distances are scaled to make the solar system visible.
 *
 * RENDER_SCALE: 1 AU in the simulation = this many units in the 3D scene.
 * This allows planets to be visually separated while maintaining
 * correct relative proportions.
 */
export const RENDER_SCALE_AU = 10; // 1 AU = 10 scene units

/**
 * RENDER_SCALE_KPC: 1 kiloparsec in the simulation = this many units in the 3D scene.
 * Used at galaxy-scale rendering.
 */
export const RENDER_SCALE_KPC = 30; // 1 kpc = 30 scene units

/**
 * Minimum visual radius for rendered objects (scene units).
 * Ensures tiny planets remain visible.
 */
export const MIN_RENDER_RADIUS = 0.05;

/**
 * Convert meters to AU
 */
export function metersToAU(meters: number): number {
  return meters / AU;
}

/**
 * Convert AU to meters
 */
export function auToMeters(au: number): number {
  return au * AU;
}

/**
 * Convert seconds to years
 */
export function secondsToYears(seconds: number): number {
  return seconds / SECONDS_PER_YEAR;
}

/**
 * Convert years to seconds
 */
export function yearsToSeconds(years: number): number {
  return years * SECONDS_PER_YEAR;
}

/**
 * Convert kiloparsecs to light-years
 */
export function kpcToLightYears(kpc: number): number {
  return kpc * KILOPARSEC_LY;
}

/**
 * Convert light-years to kiloparsecs
 */
export function lightYearsToKpc(ly: number): number {
  return ly / KILOPARSEC_LY;
}

/**
 * Calculate Schwarzschild radius in meters from solar masses:
 * r_s = 2 * G * M / c^2
 */
export function schwarzschildRadiusMeters(massSolar: number): number {
  const massKg = massSolar * SOLAR_MASS;
  return (2 * G * massKg) / (C * C);
}

/**
 * Calculate Schwarzschild radius in kilometers from solar masses
 */
export function schwarzschildRadiusKm(massSolar: number): number {
  return schwarzschildRadiusMeters(massSolar) / 1000;
}

/**
 * Calculate Schwarzschild radius in Astronomical Units (AU) from solar masses
 */
export function schwarzschildRadiusAU(massSolar: number): number {
  return schwarzschildRadiusMeters(massSolar) / AU;
}

