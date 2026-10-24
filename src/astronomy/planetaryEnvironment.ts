/**
 * ASTRAVERSA Ω — Planetary Environments & Thermal Regimes (Mission 005A)
 *
 * Implements authoritative surface environment physics for planetary bodies:
 * 1. Surface gravity (g, g/g_earth) and escape velocity (v_esc)
 * 2. Atmospheric retention assessment via thermal Jeans escape threshold
 * 3. Parameterized surface atmospheric pressure (P_surf in bar and Pa)
 * 4. 1D semi-grey radiative equilibrium surface temperature (T_surf)
 *    distinct from bare-rock equilibrium temperature (T_eq)
 * 5. Thermodynamic water phase stability (Clausius-Clapeyron boiling curve)
 * 6. Physical environmental regimes without speculative habitability claims
 *
 * Scientific Model & Literature Foundations:
 * - Surface Gravity & Escape Velocity:
 *     g = G * M_p / R_p^2
 *     v_esc = sqrt(2 * G * M_p / R_p)
 *
 * - Atmospheric Retention (Thermal Escape Boundary):
 *     Bodies with v_esc < 3.0 km/s (e.g. Moon 2.38 km/s, Mercury 4.25 km/s under
 *     extreme solar wind) cannot retain substantial volatile atmospheres over
 *     geological timescales (~4.5 Gyr) against thermal Jeans escape and stellar wind
 *     stripping, yielding near-vacuum surfaces (P_surf ≈ 0).
 *     Reference: Pierrehumbert (2010), Catling & Kasting (2017).
 *
 * - 1D Semi-Grey Atmospheric Greenhouse Model:
 *     T_eq = [ (L_star * (1 - A)) / (16 * π * σ * d^2) ]^(1/4)
 *     T_surf = T_eq * (1 + 0.75 * τ_IR)^(1/4)
 *     where τ_IR is the effective thermal infrared optical depth:
 *       τ_IR = τ_0 * (P_surf / P_0)^α
 *     with τ_0 ≈ 0.842, P_0 = 1.01325 bar, and α = 0.50 (pressure broadening).
 *     Reference: Pierrehumbert, R. T. (2010). "Principles of Planetary Climate".
 *     Earth reference: T_eq ≈ 255 K, τ_IR ≈ 0.842 => T_surf ≈ 288 K (ΔT ≈ +33 K).
 *
 * - Water Phase Stability Curve:
 *     Modeled via the Clausius-Clapeyron relation with water triple point
 *     (T_triple = 273.16 K, P_triple = 611.65 Pa ≈ 0.006117 bar).
 *     Below P_triple, liquid water cannot exist in equilibrium; ice sublimates
 *     directly to vapor.
 *
 * - Thermal Regimes (Honest Physical Classification):
 *     Categorizes physical surface states without equating thermal regimes
 *     to biological habitability.
 */

import { G, EARTH_MASS, EARTH_RADIUS } from './constants';
import { PlanetType } from './planetary';
import { computeEquilibriumTemperature } from './stellarPlanetaryCoupling';
import type { SeededRandom } from '../universe/SeededRandom';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Physical Constants & Reference Values
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Standard Earth surface gravitational acceleration (m/s²) */
export const STANDARD_GRAVITY_EARTH = (G * EARTH_MASS) / (EARTH_RADIUS * EARTH_RADIUS);

/** Standard Earth escape velocity in m/s */
export const ESCAPE_VELOCITY_EARTH = Math.sqrt((2 * G * EARTH_MASS) / EARTH_RADIUS);

/** Water triple-point pressure in bar (611.657 Pa) */
export const WATER_TRIPLE_POINT_PRESSURE_BAR = 0.00611657;

/** Water triple-point temperature in Kelvin */
export const WATER_TRIPLE_POINT_TEMP_K = 273.16;

/** Water freezing / melting temperature at 1 atm in Kelvin */
export const WATER_FREEZING_TEMP_K = 273.15;

/** Water normal boiling temperature at 1 atm (1.01325 bar) in Kelvin */
export const WATER_NORMAL_BOILING_TEMP_K = 373.15;

/** Standard atmospheric pressure at sea level in bar */
export const STANDARD_ATMOSPHERE_BAR = 1.01325;

/** Minimum escape velocity required to retain heavy volatiles (m/s) */
export const JEANS_ESCAPE_VELOCITY_THRESHOLD = 3000.0;

/** Reference infrared optical depth for 1 bar terrestrial atmosphere */
export const REFERENCE_IR_OPTICAL_DEPTH = 0.842;

/** Pressure-broadening exponent for optical depth scaling */
export const OPTICAL_DEPTH_PRESSURE_EXPONENT = 0.50;

/** Specific gas constant for water vapor in J/(mol K) */
const R_MOLAR = 8.314462618;

/** Latent heat of vaporization of water in J/mol */
const DELTA_H_VAPORIZATION = 40660.0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types & Enums
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Thermodynamic water phase stability at planetary surface conditions.
 */
export const WaterPhaseState = {
  /** Pressure below triple point (0.00612 bar); liquid water cannot exist, ice sublimates */
  SUBLIMATING_ICE: 'SUBLIMATING_ICE',
  /** Thermodynamically frozen solid ice (T_surf < 273.15 K, P >= P_triple) */
  SOLID_ICE: 'SOLID_ICE',
  /** Thermodynamically stable liquid water range (273.15 K <= T_surf <= T_boil) */
  LIQUID_STABLE: 'LIQUID_STABLE',
  /** Superheated steam / atmospheric vapor runaway (T_surf > T_boil) */
  SUPERHEATED_STEAM: 'SUPERHEATED_STEAM',
  /** Not applicable (e.g. gaseous giant envelopes without solid surfaces) */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type WaterPhaseState = typeof WaterPhaseState[keyof typeof WaterPhaseState];

/**
 * Descriptive physical thermal & environmental regimes.
 * Does not assert biological habitability.
 */
export const ThermalRegime = {
  /** Airless body below freezing (e.g. Pluto, Callisto, frozen asteroids) */
  AIRLESS_CRYOWORLD: 'AIRLESS_CRYOWORLD',
  /** Airless body above freezing (e.g. Moon, Mercury daytime) */
  AIRLESS_DESOLATION: 'AIRLESS_DESOLATION',
  /** Terrestrial planet with atmosphere in global deep freeze (e.g. Snowball Earth, Mars) */
  GLACIATED_TERRESTRIAL: 'GLACIATED_TERRESTRIAL',
  /** Terrestrial planet where surface liquid water is thermodynamically stable in 1D model */
  TEMPERATE_MODEL_REGIME: 'TEMPERATE_MODEL_REGIME',
  /** Severe greenhouse runaway or extreme stellar irradiation (e.g. Venus) */
  HYPERTHERMIC_RUNAWAY: 'HYPERTHERMIC_RUNAWAY',
  /** Gas giant with deep hydrogen-helium gaseous envelope */
  JOVIAN_GAS_GIANT: 'JOVIAN_GAS_GIANT',
  /** Ice giant with deep volatile/methane gaseous envelope */
  JOVIAN_ICE_GIANT: 'JOVIAN_ICE_GIANT',
} as const;
export type ThermalRegime = typeof ThermalRegime[keyof typeof ThermalRegime];

/**
 * Complete planetary environment evaluation record.
 */
export interface PlanetaryEnvironment {
  /** Surface gravity in m/s² */
  surfaceGravity: number;
  /** Relative surface gravity (Earth = 1.0 g) */
  relativeGravity: number;
  /** Surface escape velocity in km/s */
  escapeVelocityKmPerSec: number;
  /** Surface atmospheric pressure in bar (0 for airless bodies) */
  surfacePressureBar: number;
  /** Surface atmospheric pressure in Pa */
  surfacePressurePa: number;
  /** Whether the body can gravitationally retain heavy volatiles against Jeans escape */
  isAtmosphereRetained: boolean;
  /** Radiative-equilibrium temperature in Kelvin (K) */
  equilibriumTemperatureK: number;
  /** Estimated mean surface temperature in Kelvin (K) */
  surfaceTemperatureK: number;
  /** Greenhouse warming increment (T_surf - T_eq) in Kelvin (K) */
  greenhouseWarmingK: number;
  /** Thermal infrared optical depth (dimensionless) */
  infraredOpticalDepth: number;
  /** Water boiling temperature at current surface pressure in Kelvin (K) */
  waterBoilingPointK: number;
  /** Thermodynamic water phase stability state */
  waterPhaseState: WaterPhaseState;
  /** Physical thermal/environmental regime */
  thermalRegime: ThermalRegime;
  /** Human-readable display label for the thermal regime */
  regimeLabel: string;
}

/**
 * Parameters for evaluating a planetary environment.
 */
export interface EnvironmentCalculationParams {
  planetType: PlanetType;
  massKg: number;
  radiusMeters: number;
  luminosityWatts: number;
  orbitalDistanceMeters: number;
  albedo: number;
  surfacePressureBar?: number;
  rng?: SeededRandom;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Physical Primitives
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute planetary surface gravitational acceleration in m/s².
 *
 * g = G * M / R^2
 */
export function computeSurfaceGravity(massKg: number, radiusMeters: number): number {
  if (!Number.isFinite(massKg) || massKg <= 0) {
    throw new RangeError(`Planetary mass must be a positive finite number, received ${massKg}`);
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new RangeError(`Planetary radius must be a positive finite number, received ${radiusMeters}`);
  }
  return (G * massKg) / (radiusMeters * radiusMeters);
}

/**
 * Compute planetary surface gravity relative to standard Earth gravity (g / g_earth).
 */
export function computeRelativeSurfaceGravity(surfaceGravity: number): number {
  if (!Number.isFinite(surfaceGravity) || surfaceGravity < 0) {
    throw new RangeError(`Surface gravity must be a non-negative finite number, received ${surfaceGravity}`);
  }
  return surfaceGravity / STANDARD_GRAVITY_EARTH;
}

/**
 * Compute surface escape velocity in m/s.
 *
 * v_esc = sqrt(2 * G * M / R)
 */
export function computeEscapeVelocity(massKg: number, radiusMeters: number): number {
  if (!Number.isFinite(massKg) || massKg <= 0) {
    throw new RangeError(`Planetary mass must be a positive finite number, received ${massKg}`);
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new RangeError(`Planetary radius must be a positive finite number, received ${radiusMeters}`);
  }
  return Math.sqrt((2 * G * massKg) / radiusMeters);
}

/**
 * Assess whether a planet can retain heavy atmospheric volatiles (N2, O2, CO2, H2O)
 * against thermal Jeans escape over astronomical timescales (~4.5 Gyr).
 */
export function isAtmosphereRetainedByGravity(escapeVelocityMetersPerSec: number): boolean {
  if (!Number.isFinite(escapeVelocityMetersPerSec) || escapeVelocityMetersPerSec < 0) {
    throw new RangeError(`Escape velocity must be a non-negative finite number, received ${escapeVelocityMetersPerSec}`);
  }
  return escapeVelocityMetersPerSec >= JEANS_ESCAPE_VELOCITY_THRESHOLD;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Atmospheric & Temperature Models
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Estimate or sample a physically defensible surface atmospheric pressure in bar.
 *
 * - Rocky bodies with v_esc < 3.0 km/s (e.g. Moon, Mercury) return 0.0 bar (airless).
 * - Gas / ice giants have no solid surface; return reference 1.0 bar level.
 * - Terrestrial planets with v_esc >= 3.0 km/s sample pressure according to mass and
 *   volatile retention potential.
 */
export function estimateSurfaceAtmosphericPressure(
  planetType: PlanetType,
  massKg: number,
  radiusMeters: number,
  rng?: SeededRandom
): number {
  if (planetType === PlanetType.GAS_GIANT || planetType === PlanetType.ICE_GIANT) {
    // Gas/ice giants: standard reference level is 1 bar
    return 1.0;
  }

  const vEsc = computeEscapeVelocity(massKg, radiusMeters);
  if (!isAtmosphereRetainedByGravity(vEsc)) {
    return 0.0;
  }

  const massEarth = massKg / EARTH_MASS;

  if (rng) {
    if (massEarth < 0.25) {
      // Sub-terrestrial (Mars analogue): tenuous atmosphere (0.004 to 0.03 bar)
      return rng.range(0.004, 0.03);
    } else if (massEarth <= 2.0) {
      // Earth-mass terrestrial: 75% moderate atmosphere (0.2 to 2.5 bar),
      // 25% dense volcanic/runaway atmosphere (3.0 to 45.0 bar)
      const roll = rng.next();
      if (roll < 0.75) {
        return rng.range(0.2, 2.5);
      } else {
        return rng.range(3.0, 45.0);
      }
    } else {
      // Super-Earth: high volatile inventory (1.5 to 80.0 bar)
      return rng.range(1.5, 80.0);
    }
  }

  // Deterministic baseline if no PRNG provided
  if (massEarth < 0.25) return 0.006;
  if (massEarth <= 2.0) return 1.0;
  return 5.0;
}

/**
 * Compute the boiling point of pure water in Kelvin at a given atmospheric pressure (in bar)
 * using the integrated Clausius-Clapeyron relation.
 *
 * 1 / T_boil = 1 / T_0 - (R / ΔH_vap) * ln(P / P_0)
 *
 * Below the triple point (0.006117 bar), returns WATER_TRIPLE_POINT_TEMP_K (273.16 K),
 * as liquid water cannot exist in equilibrium.
 */
export function computeWaterBoilingPoint(pressureBar: number): number {
  if (!Number.isFinite(pressureBar) || pressureBar < 0) {
    throw new RangeError(`Pressure must be a non-negative finite number, received ${pressureBar}`);
  }

  if (pressureBar < WATER_TRIPLE_POINT_PRESSURE_BAR) {
    return WATER_TRIPLE_POINT_TEMP_K;
  }

  const ratio = pressureBar / STANDARD_ATMOSPHERE_BAR;
  const invT = (1.0 / WATER_NORMAL_BOILING_TEMP_K) - (R_MOLAR / DELTA_H_VAPORIZATION) * Math.log(ratio);

  // Guard against non-physical singular pressures
  if (invT <= 0) {
    return 1000.0;
  }

  return 1.0 / invT;
}

/**
 * Compute effective infrared optical depth τ_IR for a terrestrial atmosphere.
 *
 * τ_IR = τ_0 * (P_surf / P_0)^0.5
 */
export function computeInfraredOpticalDepth(surfacePressureBar: number): number {
  if (!Number.isFinite(surfacePressureBar) || surfacePressureBar < 0) {
    throw new RangeError(`Surface pressure must be non-negative, received ${surfacePressureBar}`);
  }
  if (surfacePressureBar === 0) {
    return 0.0;
  }
  return REFERENCE_IR_OPTICAL_DEPTH * Math.pow(surfacePressureBar / STANDARD_ATMOSPHERE_BAR, OPTICAL_DEPTH_PRESSURE_EXPONENT);
}

/**
 * Compute estimated surface temperature in Kelvin from equilibrium temperature
 * and surface atmospheric pressure using 1D semi-grey radiative equilibrium.
 *
 * T_surf = T_eq * (1 + 0.75 * τ_IR)^(1/4)
 */
export function computeSurfaceTemperature(
  equilibriumTemperatureK: number,
  surfacePressureBar: number,
  planetType: PlanetType
): number {
  if (!Number.isFinite(equilibriumTemperatureK) || equilibriumTemperatureK < 0) {
    throw new RangeError(`Equilibrium temperature must be non-negative, received ${equilibriumTemperatureK}`);
  }
  if (!Number.isFinite(surfacePressureBar) || surfacePressureBar < 0) {
    throw new RangeError(`Surface pressure must be non-negative, received ${surfacePressureBar}`);
  }

  // Gas and ice giants have no solid surface; temperature at reference level is ~T_eq
  if (planetType === PlanetType.GAS_GIANT || planetType === PlanetType.ICE_GIANT) {
    return equilibriumTemperatureK;
  }

  // Airless body: surface is in direct radiative balance with space
  if (surfacePressureBar === 0) {
    return equilibriumTemperatureK;
  }

  const tau = computeInfraredOpticalDepth(surfacePressureBar);
  const factor = Math.pow(1.0 + 0.75 * tau, 0.25);
  return equilibriumTemperatureK * factor;
}

/**
 * Evaluate the thermodynamic phase stability of water at the planet's surface.
 */
export function evaluateWaterPhaseState(
  surfaceTemperatureK: number,
  surfacePressureBar: number,
  planetType: PlanetType
): WaterPhaseState {
  if (planetType === PlanetType.GAS_GIANT || planetType === PlanetType.ICE_GIANT) {
    return WaterPhaseState.NOT_APPLICABLE;
  }

  if (surfacePressureBar < WATER_TRIPLE_POINT_PRESSURE_BAR) {
    return WaterPhaseState.SUBLIMATING_ICE;
  }

  if (surfaceTemperatureK < WATER_FREEZING_TEMP_K) {
    return WaterPhaseState.SOLID_ICE;
  }

  const tBoil = computeWaterBoilingPoint(surfacePressureBar);
  if (surfaceTemperatureK <= tBoil) {
    return WaterPhaseState.LIQUID_STABLE;
  }

  return WaterPhaseState.SUPERHEATED_STEAM;
}

/**
 * Classify the physical thermal and environmental regime of a planet.
 */
export function classifyThermalRegime(
  planetType: PlanetType,
  surfacePressureBar: number,
  surfaceTemperatureK: number,
  waterPhase: WaterPhaseState
): { regime: ThermalRegime; label: string } {
  if (planetType === PlanetType.GAS_GIANT) {
    return {
      regime: ThermalRegime.JOVIAN_GAS_GIANT,
      label: 'Jovian Gas Giant',
    };
  }
  if (planetType === PlanetType.ICE_GIANT) {
    return {
      regime: ThermalRegime.JOVIAN_ICE_GIANT,
      label: 'Jovian Ice Giant',
    };
  }

  if (surfacePressureBar === 0) {
    if (surfaceTemperatureK < WATER_FREEZING_TEMP_K) {
      return {
        regime: ThermalRegime.AIRLESS_CRYOWORLD,
        label: 'Airless Cryoworld',
      };
    } else {
      return {
        regime: ThermalRegime.AIRLESS_DESOLATION,
        label: 'Airless Desolation',
      };
    }
  }

  if (surfaceTemperatureK < WATER_FREEZING_TEMP_K) {
    return {
      regime: ThermalRegime.GLACIATED_TERRESTRIAL,
      label: 'Glaciated Terrestrial',
    };
  }

  if (waterPhase === WaterPhaseState.LIQUID_STABLE && surfaceTemperatureK <= WATER_NORMAL_BOILING_TEMP_K) {
    return {
      regime: ThermalRegime.TEMPERATE_MODEL_REGIME,
      label: 'Temperate Model Regime',
    };
  }

  return {
    regime: ThermalRegime.HYPERTHERMIC_RUNAWAY,
    label: 'Hyperthermic Runaway',
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unified Environment Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute the complete planetary environment for a celestial body.
 *
 * Integrates:
 * - Authoritative radiative-equilibrium temperature
 * - Surface gravity and escape velocity
 * - Atmospheric retention and surface pressure
 * - Semi-grey greenhouse surface temperature
 * - Water phase stability
 * - Physical thermal regime classification
 */
export function computePlanetaryEnvironment(
  params: EnvironmentCalculationParams
): PlanetaryEnvironment {
  const {
    planetType,
    massKg,
    radiusMeters,
    luminosityWatts,
    orbitalDistanceMeters,
    albedo,
    rng,
  } = params;

  // 1. Authoritative equilibrium temperature
  const equilibriumTemperatureK = computeEquilibriumTemperature(
    luminosityWatts,
    orbitalDistanceMeters,
    albedo
  );

  // 2. Gravitational properties
  const surfaceGravity = computeSurfaceGravity(massKg, radiusMeters);
  const relativeGravity = computeRelativeSurfaceGravity(surfaceGravity);
  const escapeVelocity = computeEscapeVelocity(massKg, radiusMeters);
  const escapeVelocityKmPerSec = escapeVelocity / 1000.0;
  const isAtmosphereRetained = isAtmosphereRetainedByGravity(escapeVelocity);

  // 3. Surface pressure
  let surfacePressureBar: number;
  if (params.surfacePressureBar !== undefined) {
    surfacePressureBar = params.surfacePressureBar;
  } else {
    surfacePressureBar = estimateSurfaceAtmosphericPressure(planetType, massKg, radiusMeters, rng);
  }
  const surfacePressurePa = surfacePressureBar * 100000.0; // 1 bar = 100,000 Pa

  // 4. Optical depth and surface temperature
  const infraredOpticalDepth = computeInfraredOpticalDepth(surfacePressureBar);
  const surfaceTemperatureK = computeSurfaceTemperature(
    equilibriumTemperatureK,
    surfacePressureBar,
    planetType
  );
  const greenhouseWarmingK = Math.max(0, surfaceTemperatureK - equilibriumTemperatureK);

  // 5. Water phase state
  const waterBoilingPointK = computeWaterBoilingPoint(surfacePressureBar);
  const waterPhaseState = evaluateWaterPhaseState(
    surfaceTemperatureK,
    surfacePressureBar,
    planetType
  );

  // 6. Thermal regime classification
  const { regime: thermalRegime, label: regimeLabel } = classifyThermalRegime(
    planetType,
    surfacePressureBar,
    surfaceTemperatureK,
    waterPhaseState
  );

  return {
    surfaceGravity,
    relativeGravity,
    escapeVelocityKmPerSec,
    surfacePressureBar,
    surfacePressurePa,
    isAtmosphereRetained,
    equilibriumTemperatureK,
    surfaceTemperatureK,
    greenhouseWarmingK,
    infraredOpticalDepth,
    waterBoilingPointK,
    waterPhaseState,
    thermalRegime,
    regimeLabel,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Model Metadata & Educational Disclaimers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PLANETARY_ENVIRONMENT_METADATA = {
  assumptions: [
    'Radiative-equilibrium temperature (T_eq) assumes uniform 4π global heat redistribution and blackbody emission (ε = 1).',
    'Surface temperature (T_surf) uses 1D semi-grey radiative equilibrium with pressure-broadened infrared optical depth (τ_IR ∝ P^0.5).',
    'Atmospheric retention is evaluated against thermal Jeans escape threshold (v_esc >= 3.0 km/s).',
    'Water boiling point is derived from the Clausius-Clapeyron relation with water triple point (6.12 mbar, 273.16 K).',
    'Gas and ice giants are modeled as deep gaseous envelopes without a solid surface.',
  ],
  limitations: [
    'Does not simulate 3D atmospheric circulation, Hadley cells, Coriolis deflection, or winds.',
    'Excludes dynamical cloud albedo feedback loops, photochemical haze evolution, and atmospheric loss kinetics over Gyr timescales.',
    'Excludes geophysical crustal dynamics, plate tectonics, vulcanism, and tidal heating.',
    'Temperate Model Regime reflects 1D physical water stability and is NOT proof of biological habitability, surface oceans, or life.',
  ],
  units: {
    surfaceGravity: 'm/s²',
    relativeGravity: 'g (Earth = 1.0)',
    escapeVelocity: 'km/s',
    surfacePressure: 'bar and Pa',
    equilibriumTemperature: 'K and °C',
    surfaceTemperature: 'K and °C',
    greenhouseWarming: 'K',
    waterBoilingPoint: 'K and °C',
  },
} as const;
