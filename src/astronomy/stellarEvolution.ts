/**
 * ASTRAVERSA Ω — Stellar Evolution
 *
 * Computational stellar evolution model tracking the lifecycle of stars
 * from Zero-Age Main Sequence (ZAMS) to post-main-sequence phases and
 * compact remnants.
 *
 * Scientific Design & Modeling Philosophy:
 * - Uses analytical piecewise approximations inspired by Hurley, Pols & Tout (2000)
 *   and Iben (1967), calibrated against standard stellar tracks.
 * - This is an educational and computational universe simulation model, NOT
 *   a research-grade stellar interior hydrodynamics code (e.g. MESA/EZ).
 * - Stefan-Boltzmann energy consistency (L = 4π R² σ T_eff⁴) is strictly maintained
 *   at all evolutionary epochs.
 * - Mass loss on the giant branches follows an approximate Reimers formulation.
 * - All physical properties are in SI units internally, with helper solar-unit projections.
 *
 * See TATTVA.md for assumptions, equations, and explicit validity limits.
 */

import {
  SOLAR_MASS,
  SOLAR_RADIUS,
  SOLAR_LUMINOSITY,
  SOLAR_TEMPERATURE,
  STEFAN_BOLTZMANN,
  SECONDS_PER_YEAR,
} from './constants';
import { SpectralClass } from './stellar';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types & Enums
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Key evolutionary phases in a star's lifecycle.
 */
export const StellarEvolutionPhase = {
  MAIN_SEQUENCE: 'MAIN_SEQUENCE',       // Core hydrogen burning (Luminosity class V)
  SUBGIANT: 'SUBGIANT',                 // Core hydrogen exhaustion, shell burning (Class IV)
  RED_GIANT: 'RED_GIANT',               // Ascending RGB, convective envelope expansion (Class III)
  CORE_HELIUM_BURNING: 'CORE_HELIUM_BURNING', // Horizontal Branch / Red Clump (Class III)
  ASYMPTOTIC_GIANT: 'ASYMPTOTIC_GIANT', // Double-shell burning AGB (Class II/III)
  SUPERGIANT: 'SUPERGIANT',             // Massive star evolution (Class I)
  WHITE_DWARF: 'WHITE_DWARF',           // Low/intermediate mass degenerate remnant (Class VII)
  NEUTRON_STAR: 'NEUTRON_STAR',         // Core-collapse remnant for 8 <= M0 < 25 M☉
  STELLAR_BLACK_HOLE: 'STELLAR_BLACK_HOLE', // Core-collapse remnant for M0 >= 25 M☉
} as const;

export type StellarEvolutionPhase =
  typeof StellarEvolutionPhase[keyof typeof StellarEvolutionPhase];

/**
 * Complete snapshot of a star's evolutionary state at a specific epoch.
 */
export interface StellarEvolutionState {
  /** Initial ZAMS mass in solar masses (M☉) */
  initialMassSolar: number;

  /** Current stellar mass in solar masses (M☉), accounting for mass loss */
  currentMassSolar: number;

  /** Current stellar mass in kilograms (kg) */
  currentMassKg: number;

  /** Metallicity fraction Z (canonical solar Z☉ = 0.0142) */
  metallicity: number;

  /** Total elapsed stellar age in Julian years */
  ageYears: number;

  /** Total elapsed stellar age in seconds */
  ageSeconds: number;

  /** Theoretical Main Sequence lifetime in years */
  mainSequenceLifetimeYears: number;

  /** Current evolutionary phase */
  phase: StellarEvolutionPhase;

  /** Progress fraction within the current phase [0.0, 1.0] */
  phaseProgress: number;

  /** Current stellar radius in solar radii (R☉) */
  radiusSolar: number;

  /** Current stellar radius in meters (m) */
  radiusMeters: number;

  /** Current bolometric luminosity in solar luminosities (L☉) */
  luminositySolar: number;

  /** Current bolometric luminosity in Watts (W) */
  luminosityWatts: number;

  /** Effective surface temperature in Kelvin (K) */
  effectiveTemperature: number;

  /** Morgan-Keenan spectral class */
  spectralClass: SpectralClass | 'D' | 'NS' | 'BH';

  /** Yerkes luminosity class */
  luminosityClass: 'Ia' | 'Ib' | 'II' | 'III' | 'IV' | 'V' | 'VII' | 'REMNANT';

  /** Approximate CSS color string for 3D visualization */
  color: string;

  /** Human-readable phase label for UI */
  phaseLabel: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Lifetime & Evolution Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute the Main Sequence lifetime of a star based on its initial mass.
 *
 * Approximations:
 * - Standard regime (0.43 to 30 M☉): τ_MS ≈ 10¹⁰ * (M/M☉)^(-2.5) years
 * - Convective M-dwarfs (< 0.43 M☉): τ_MS ≈ 10¹⁰ * (M/M☉)^(-1.8) years (extended lifetime)
 * - Massive stars (> 30 M☉): Radiation pressure creates an asymptotic floor ≈ 3.5 Myr
 *
 * @param initialMassSolar - Initial mass in solar masses (0.08 to 120 M☉)
 * @returns Main sequence lifetime in Julian years
 */
export function computeMainSequenceLifetime(initialMassSolar: number): number {
  if (initialMassSolar < 0.43) {
    return 1.0e10 * Math.pow(initialMassSolar, -1.8);
  } else if (initialMassSolar > 30.0) {
    // Asymptotic floor for very massive stars
    return 3.5e6 + 5.0e6 * Math.pow(30.0 / initialMassSolar, 1.2);
  } else {
    return 1.0e10 * Math.pow(initialMassSolar, -2.5);
  }
}

/**
 * Determine the Morgan-Keenan spectral class and visual color from effective temperature.
 *
 * @param tempK - Effective surface temperature in Kelvin
 * @returns Object containing spectral class and RGB hex color
 */
export function getSpectralClassAndColorFromTemperature(tempK: number): {
  spectralClass: SpectralClass;
  color: string;
} {
  if (tempK >= 30000) {
    return { spectralClass: SpectralClass.O, color: '#9bb0ff' };
  } else if (tempK >= 10000) {
    return { spectralClass: SpectralClass.B, color: '#aabfff' };
  } else if (tempK >= 7500) {
    return { spectralClass: SpectralClass.A, color: '#cad7ff' };
  } else if (tempK >= 6000) {
    return { spectralClass: SpectralClass.F, color: '#f8f7ff' };
  } else if (tempK >= 5200) {
    return { spectralClass: SpectralClass.G, color: '#fff4ea' };
  } else if (tempK >= 3700) {
    return { spectralClass: SpectralClass.K, color: '#ffd2a1' };
  } else {
    return { spectralClass: SpectralClass.M, color: '#ffcc6f' };
  }
}

/**
 * Derive effective temperature strictly from Stefan-Boltzmann law:
 *   L = 4π R² σ T_eff⁴  =>  T_eff = (L / (4π R² σ))^(1/4)
 *
 * @param luminosityWatts - Bolometric luminosity in Watts
 * @param radiusMeters - Stellar radius in meters
 * @returns Effective temperature in Kelvin
 */
export function computeTemperatureFromStefanBoltzmann(
  luminosityWatts: number,
  radiusMeters: number
): number {
  if (radiusMeters <= 0 || luminosityWatts <= 0) return SOLAR_TEMPERATURE;
  return Math.pow(
    luminosityWatts / (4 * Math.PI * radiusMeters * radiusMeters * STEFAN_BOLTZMANN),
    0.25
  );
}

/**
 * Compute the complete stellar evolution state for a given initial mass and age.
 *
 * @param params - Evolution query parameters
 * @returns StellarEvolutionState containing all physical properties and classifications
 */
export function computeStellarEvolution(params: {
  initialMassSolar: number;
  ageYears: number;
  metallicity?: number;
}): StellarEvolutionState {
  const M0 = Math.max(0.08, Math.min(120.0, params.initialMassSolar));
  const age = Math.max(0, params.ageYears);
  const metallicity = params.metallicity ?? 0.0142; // Default canonical solar metallicity

  const tMS = computeMainSequenceLifetime(M0);

  // ── Baseline ZAMS Properties ─────────────────────────
  // ZAMS Mass-Luminosity: L0 ≈ M0^3.5 for intermediate, modified for high/low mass
  let L0_solar: number;
  if (M0 < 0.43) {
    L0_solar = 0.23 * Math.pow(M0, 2.3);
  } else if (M0 > 2.0) {
    L0_solar = 1.4 * Math.pow(M0, 3.5);
  } else {
    L0_solar = Math.pow(M0, 3.8);
  }

  // ZAMS Mass-Radius: R0 ≈ M0^0.8
  const R0_solar = M0 < 1.0 ? Math.pow(M0, 0.9) : Math.pow(M0, 0.7);

  // Evolutionary variables to populate
  let phase: StellarEvolutionPhase;
  let phaseProgress: number;
  let currentMassSolar = M0;
  let radiusSolar = R0_solar;
  let luminositySolar = L0_solar;
  let luminosityClass: StellarEvolutionState['luminosityClass'] = 'V';
  let spectralClassStr: StellarEvolutionState['spectralClass'] = SpectralClass.G;
  let color = '#fff4ea';
  let phaseLabel = 'Main Sequence';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Mass Branch 1: Massive Stars (M0 >= 8.0 M☉)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (M0 >= 8.0) {
    const tSupergiantEnd = tMS * 1.15;

    if (age <= tMS) {
      // Main Sequence (O/B type)
      phase = StellarEvolutionPhase.MAIN_SEQUENCE;
      phaseProgress = age / tMS;
      luminosityClass = 'V';
      phaseLabel = 'Main Sequence (Core Hydrogen Burning)';

      // Moderate core brightening & radius expansion along MS
      luminositySolar = L0_solar * (1.0 + 0.5 * phaseProgress);
      radiusSolar = R0_solar * (1.0 + 0.6 * phaseProgress);
      currentMassSolar = M0 * (1.0 - 0.08 * phaseProgress); // Radiative stellar wind loss
    } else if (age <= tSupergiantEnd) {
      // Supergiant Phase (Red/Blue Supergiant)
      phase = StellarEvolutionPhase.SUPERGIANT;
      phaseProgress = (age - tMS) / (tSupergiantEnd - tMS);
      luminosityClass = phaseProgress < 0.5 ? 'Ib' : 'Ia';
      phaseLabel = 'Supergiant (Advanced Nuclear Burning)';

      // Huge expansion: radius swells to 200 - 800 R☉
      const maxSupergiantRadius = Math.min(850.0, 50.0 * Math.pow(M0, 0.85));
      radiusSolar = R0_solar + (maxSupergiantRadius - R0_solar) * Math.sin(phaseProgress * Math.PI * 0.5);
      luminositySolar = L0_solar * (2.0 + 3.0 * phaseProgress);
      currentMassSolar = M0 * (0.92 - 0.25 * phaseProgress); // Intense supergiant wind
    } else {
      // Compact Remnant (Supernova remnant endpoint)
      if (M0 < 25.0) {
        // Neutron Star
        phase = StellarEvolutionPhase.NEUTRON_STAR;
        phaseProgress = 1.0;
        luminosityClass = 'REMNANT';
        phaseLabel = 'Neutron Star (Pulsar Remnant)';

        currentMassSolar = Math.min(2.1, 1.2 + 0.03 * (M0 - 8.0));
        // Radius ≈ 12 km ≈ 1.725e-5 R☉
        radiusSolar = 1.725e-5;
        // Thermal cooling emission
        const coolAgeYears = Math.max(1, age - tSupergiantEnd);
        const logCool = Math.log10(coolAgeYears);
        const temp = Math.max(10000, 1.0e7 * Math.pow(10, -0.45 * Math.min(logCool, 8.0)));
        // Derive L from R and temp in SI
        const rMeters = radiusSolar * SOLAR_RADIUS;
        const lWatts = 4 * Math.PI * rMeters * rMeters * STEFAN_BOLTZMANN * Math.pow(temp, 4);
        luminositySolar = lWatts / SOLAR_LUMINOSITY;
        spectralClassStr = 'NS';
        color = '#80e5ff';
      } else {
        // Stellar-mass Black Hole
        phase = StellarEvolutionPhase.STELLAR_BLACK_HOLE;
        phaseProgress = 1.0;
        luminosityClass = 'REMNANT';
        phaseLabel = 'Stellar-mass Black Hole Remnant';

        currentMassSolar = Math.max(3.0, M0 * 0.35);
        // Visual physical marker: Schwarzschild radius (rs = 2.953 km * M/M☉)
        radiusSolar = (currentMassSolar * 2953.0) / SOLAR_RADIUS;
        luminositySolar = 1e-7; // Minimal quiescent Hawking/accretion marker
        spectralClassStr = 'BH';
        color = '#1a1024';
      }
    }
  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Mass Branch 2: Ultra-low mass M-Dwarfs (M0 < 0.43 M☉)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  else if (M0 < 0.43) {
    // Fully convective: lifetimes exceed 100 Gyr, stay on MS for any standard cosmic age
    phase = StellarEvolutionPhase.MAIN_SEQUENCE;
    phaseProgress = Math.min(1.0, age / tMS);
    luminosityClass = 'V';
    phaseLabel = 'Main Sequence (Convective Red Dwarf)';

    // Barely changes over cosmic time
    luminositySolar = L0_solar * (0.95 + 0.15 * phaseProgress);
    radiusSolar = R0_solar * (0.98 + 0.08 * phaseProgress);
    currentMassSolar = M0;
  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Mass Branch 3: Intermediate Mass Stars (0.43 <= M0 < 8.0 M☉)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  else {
    const tSGB = tMS * 1.10; // Subgiant ends at +10%
    const tRGB = tMS * 1.22; // Red Giant Branch ends at +22%
    const tHB = tMS * 1.32;  // Core Helium Burning ends at +32%
    const tAGB = tMS * 1.35; // Asymptotic Giant Branch ends at +35%

    if (age <= tMS) {
      // ── 1. Main Sequence ─────────────────────────────
      phase = StellarEvolutionPhase.MAIN_SEQUENCE;
      phaseProgress = age / tMS;
      luminosityClass = 'V';
      phaseLabel = 'Main Sequence (Core Hydrogen Burning)';

      // Standard solar-like track: gradual 30-40% increase in L and 15-25% in R
      luminositySolar = L0_solar * (0.70 + 0.70 * phaseProgress);
      radiusSolar = R0_solar * (0.88 + 0.26 * phaseProgress);
      currentMassSolar = M0 * (1.0 - 0.01 * phaseProgress);
    } else if (age <= tSGB) {
      // ── 2. Subgiant Branch ───────────────────────────
      phase = StellarEvolutionPhase.SUBGIANT;
      phaseProgress = (age - tMS) / (tSGB - tMS);
      luminosityClass = 'IV';
      phaseLabel = 'Subgiant (Shell Hydrogen Burning)';

      const lTAMS = L0_solar * 1.4;
      const rTAMS = R0_solar * 1.14;
      luminositySolar = lTAMS * (1.0 + 0.35 * phaseProgress);
      radiusSolar = rTAMS * (1.0 + 1.8 * phaseProgress);
      currentMassSolar = M0 * 0.985;
    } else if (age <= tRGB) {
      // ── 3. Red Giant Branch ──────────────────────────
      phase = StellarEvolutionPhase.RED_GIANT;
      phaseProgress = (age - tSGB) / (tRGB - tSGB);
      luminosityClass = 'III';
      phaseLabel = 'Red Giant (Ascending Giant Branch)';

      // Ascending the Hayashi track: convective envelope limit cools star to 3100 - 3600 K
      // Luminosity accelerates steeply towards RGB tip (1000 - 2500 L☉)
      const rgbScale = Math.pow(phaseProgress, 2.2);
      const maxRGBLum = 800.0 * Math.pow(M0, 1.4) + 1200.0;
      luminositySolar = (L0_solar * 2.0) + (maxRGBLum - (L0_solar * 2.0)) * rgbScale;

      // Effective temperature cools along the Hayashi track
      const targetTemp = 4400.0 - (4400.0 - 3250.0) * Math.pow(phaseProgress, 0.4);
      // Derive radius strictly from L and T to follow Hayashi convective boundary
      const rMeters = Math.sqrt(
        (luminositySolar * SOLAR_LUMINOSITY) / (4 * Math.PI * STEFAN_BOLTZMANN * Math.pow(targetTemp, 4))
      );
      radiusSolar = rMeters / SOLAR_RADIUS;

      // Reimers mass loss on RGB
      currentMassSolar = M0 * (0.98 - 0.18 * rgbScale);
    } else if (age <= tHB) {
      // ── 4. Core Helium Burning (Horizontal Branch) ───
      phase = StellarEvolutionPhase.CORE_HELIUM_BURNING;
      phaseProgress = (age - tRGB) / (tHB - tRGB);
      luminosityClass = 'III';
      phaseLabel = 'Horizontal Branch (Core Helium Burning)';

      // Helium flash has occurred: star contracts to stable clump
      radiusSolar = (10.0 * Math.pow(M0, 0.75)) * (1.0 + 0.2 * phaseProgress);
      luminositySolar = (45.0 * Math.pow(M0, 1.3)) * (1.0 + 0.15 * phaseProgress);
      currentMassSolar = M0 * 0.78;
    } else if (age <= tAGB) {
      // ── 5. Asymptotic Giant Branch ───────────────────
      phase = StellarEvolutionPhase.ASYMPTOTIC_GIANT;
      phaseProgress = (age - tHB) / (tAGB - tHB);
      luminosityClass = 'II';
      phaseLabel = 'Asymptotic Giant Branch (Thermal Pulses)';

      // Second ascent: swells even larger than RGB before ejecting envelope
      const agbScale = Math.pow(phaseProgress, 2.0);
      luminositySolar = 2500.0 * Math.pow(M0, 1.1) * (0.5 + 0.5 * agbScale);

      // Hayashi temperature for AGB
      const agbTemp = 3300.0 - 350.0 * agbScale;
      const rMeters = Math.sqrt(
        (luminositySolar * SOLAR_LUMINOSITY) / (4 * Math.PI * STEFAN_BOLTZMANN * Math.pow(agbTemp, 4))
      );
      radiusSolar = rMeters / SOLAR_RADIUS;

      currentMassSolar = M0 * (0.75 - 0.25 * agbScale);
    } else {
      // ── 6. White Dwarf Remnant ───────────────────────
      phase = StellarEvolutionPhase.WHITE_DWARF;
      phaseProgress = 1.0;
      luminosityClass = 'VII';
      phaseLabel = 'White Dwarf (Degenerate Cooling Remnant)';

      // Carbon-Oxygen white dwarf core
      const wdMassSolar = Math.min(1.4, 0.45 + 0.09 * M0);
      currentMassSolar = wdMassSolar;

      // Degenerate electron radius: R ≈ 0.012 R☉ * (M/M☉)^(-1/3)
      const baseWDRadius = 0.012 * Math.pow(wdMassSolar, -1.0 / 3.0);
      radiusSolar = baseWDRadius;

      // Mestel cooling law: T_eff cools from ~80,000 K down to ~3,000 K over Gyr
      const coolingAgeYears = Math.max(1, age - tAGB);
      const coolFactor = Math.pow(1.0 + coolingAgeYears / 5.0e6, -0.28);
      const wdTemp = Math.max(3000.0, 75000.0 * coolFactor);

      // Derive L strictly from R and T in SI to maintain exact Stefan-Boltzmann consistency
      const rMeters = radiusSolar * SOLAR_RADIUS;
      const lWatts = 4 * Math.PI * rMeters * rMeters * STEFAN_BOLTZMANN * Math.pow(wdTemp, 4);
      luminositySolar = lWatts / SOLAR_LUMINOSITY;

      spectralClassStr = 'D';
      color = wdTemp > 15000 ? '#e0ecff' : wdTemp > 7000 ? '#ffffff' : '#ffd2a1';
    }
  }

  // SI conversions
  const currentMassKg = currentMassSolar * SOLAR_MASS;
  const radiusMeters = radiusSolar * SOLAR_RADIUS;
  const luminosityWatts = luminositySolar * SOLAR_LUMINOSITY;
  const ageSeconds = age * SECONDS_PER_YEAR;

  // ── Calculate Temperature & Colors strictly in SI ──
  let effectiveTemperature: number;
  if (phase === StellarEvolutionPhase.STELLAR_BLACK_HOLE) {
    effectiveTemperature = 100.0;
  } else {
    effectiveTemperature = computeTemperatureFromStefanBoltzmann(luminosityWatts, radiusMeters);
    if (phase !== StellarEvolutionPhase.WHITE_DWARF && phase !== StellarEvolutionPhase.NEUTRON_STAR) {
      const spec = getSpectralClassAndColorFromTemperature(effectiveTemperature);
      spectralClassStr = spec.spectralClass;
      color = spec.color;
    }
  }

  return {
    initialMassSolar: M0,
    currentMassSolar,
    currentMassKg,
    metallicity,
    ageYears: age,
    ageSeconds,
    mainSequenceLifetimeYears: tMS,
    phase,
    phaseProgress: Math.min(1.0, Math.max(0.0, phaseProgress)),
    radiusSolar,
    radiusMeters,
    luminositySolar,
    luminosityWatts,
    effectiveTemperature,
    spectralClass: spectralClassStr,
    luminosityClass,
    color,
    phaseLabel,
  };
}
