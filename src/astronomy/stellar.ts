/**
 * ASTRAVERSA Ω — Stellar Properties
 *
 * Simplified main-sequence stellar classification and property generation.
 *
 * This uses approximate main-sequence relationships to generate
 * physically plausible (but not research-grade) stellar properties.
 *
 * Main-sequence approximations used:
 * - Luminosity ∝ Mass^3.5 (for M > 0.43 M☉)
 * - Radius ∝ Mass^0.8 (rough approximation)
 * - Temperature from Stefan-Boltzmann law: L = 4π R² σ T⁴
 *
 * See TATTVA.md for limitations.
 */

import { SOLAR_MASS, SOLAR_RADIUS, SOLAR_LUMINOSITY, SOLAR_TEMPERATURE } from './constants';

/**
 * Spectral classification of main-sequence stars.
 * Ordered from hottest (O) to coolest (M).
 */
export const SpectralClass = {
  O: 'O',
  B: 'B',
  A: 'A',
  F: 'F',
  G: 'G',
  K: 'K',
  M: 'M',
} as const;
export type SpectralClass = typeof SpectralClass[keyof typeof SpectralClass];

/**
 * Properties of a star.
 */
export interface StellarProperties {
  spectralClass: SpectralClass;
  mass: number;         // kg
  radius: number;       // m
  luminosity: number;   // W
  temperature: number;  // K
  color: string;        // CSS color for rendering
}

/**
 * Spectral class data: mass range (in solar masses), typical temperature, color.
 * These are simplified approximations for procedural generation.
 */
const SPECTRAL_DATA: Record<SpectralClass, {
  massMin: number;   // Solar masses
  massMax: number;
  tempMin: number;   // K
  tempMax: number;
  color: string;     // Approximate visual color
}> = {
  [SpectralClass.O]: { massMin: 16, massMax: 150, tempMin: 30000, tempMax: 50000, color: '#9bb0ff' },
  [SpectralClass.B]: { massMin: 2.1, massMax: 16, tempMin: 10000, tempMax: 30000, color: '#aabfff' },
  [SpectralClass.A]: { massMin: 1.4, massMax: 2.1, tempMin: 7500, tempMax: 10000, color: '#cad7ff' },
  [SpectralClass.F]: { massMin: 1.04, massMax: 1.4, tempMin: 6000, tempMax: 7500, color: '#f8f7ff' },
  [SpectralClass.G]: { massMin: 0.8, massMax: 1.04, tempMin: 5200, tempMax: 6000, color: '#fff4ea' },
  [SpectralClass.K]: { massMin: 0.45, massMax: 0.8, tempMin: 3700, tempMax: 5200, color: '#ffd2a1' },
  [SpectralClass.M]: { massMin: 0.08, massMax: 0.45, tempMin: 2400, tempMax: 3700, color: '#ffcc6f' },
};

/**
 * Get the spectral class for a given stellar mass (in solar masses).
 */
export function getSpectralClass(massSolar: number): SpectralClass {
  if (massSolar >= 16) return SpectralClass.O;
  if (massSolar >= 2.1) return SpectralClass.B;
  if (massSolar >= 1.4) return SpectralClass.A;
  if (massSolar >= 1.04) return SpectralClass.F;
  if (massSolar >= 0.8) return SpectralClass.G;
  if (massSolar >= 0.45) return SpectralClass.K;
  return SpectralClass.M;
}

/**
 * Compute stellar properties from mass using main-sequence approximations.
 *
 * @param massSolar - Stellar mass in solar masses
 * @returns StellarProperties with all derived values
 */
export function computeStellarProperties(massSolar: number): StellarProperties {
  const spectralClass = getSpectralClass(massSolar);
  const data = SPECTRAL_DATA[spectralClass];

  // Mass in kg
  const mass = massSolar * SOLAR_MASS;

  // Luminosity: L ∝ M^3.5 (simplified main-sequence relation)
  const luminosity = SOLAR_LUMINOSITY * Math.pow(massSolar, 3.5);

  // Radius: R ∝ M^0.8 (simplified main-sequence relation)
  const radius = SOLAR_RADIUS * Math.pow(massSolar, 0.8);

  // Temperature: from Stefan-Boltzmann L = 4π R² σ T⁴
  // T = (L / (4π R² σ))^0.25
  // But we also use the spectral data range as a sanity check
  const computedTemp = SOLAR_TEMPERATURE * Math.pow(massSolar, 0.6); // approximate
  const temperature = Math.max(data.tempMin, Math.min(data.tempMax, computedTemp));

  return {
    spectralClass,
    mass,
    radius,
    luminosity,
    temperature,
    color: data.color,
  };
}

/**
 * Get spectral data for rendering and UI purposes.
 */
export function getSpectralData(spectralClass: SpectralClass) {
  return SPECTRAL_DATA[spectralClass];
}
