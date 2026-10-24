/**
 * ASTRAVERSA Ω — Planetary Environment Tests (Mission 005A)
 */

import { describe, it, expect } from 'vitest';
import {
  computeSurfaceGravity,
  computeRelativeSurfaceGravity,
  computeEscapeVelocity,
  isAtmosphereRetainedByGravity,
  estimateSurfaceAtmosphericPressure,
  computeWaterBoilingPoint,
  computeInfraredOpticalDepth,
  computeSurfaceTemperature,
  evaluateWaterPhaseState,
  classifyThermalRegime,
  computePlanetaryEnvironment,
  WaterPhaseState,
  ThermalRegime,
  PLANETARY_ENVIRONMENT_METADATA,
  STANDARD_GRAVITY_EARTH,
  ESCAPE_VELOCITY_EARTH,
  WATER_TRIPLE_POINT_PRESSURE_BAR,
  WATER_NORMAL_BOILING_TEMP_K,
} from '../src/astronomy/planetaryEnvironment';
import {
  EARTH_MASS,
  EARTH_RADIUS,
  JUPITER_MASS,
  JUPITER_RADIUS,
  SOLAR_LUMINOSITY,
  AU,
} from '../src/astronomy/constants';
import { PlanetType } from '../src/astronomy/planetary';
import { SeededRandom } from '../src/universe/SeededRandom';

describe('Planetary Environment (Mission 005A)', () => {
  describe('Surface Gravity and Escape Velocity', () => {
    it('calculates Earth surface gravity accurately (~9.82 m/s² and 1.0 g)', () => {
      const gEarth = computeSurfaceGravity(EARTH_MASS, EARTH_RADIUS);
      expect(gEarth).toBeCloseTo(9.82, 1);

      const relG = computeRelativeSurfaceGravity(gEarth);
      expect(relG).toBeCloseTo(1.0, 4);
    });

    it('calculates Earth escape velocity accurately (~11.19 km/s)', () => {
      const vEscMeters = computeEscapeVelocity(EARTH_MASS, EARTH_RADIUS);
      const vEscKm = vEscMeters / 1000.0;
      expect(vEscKm).toBeCloseTo(11.19, 1);
    });

    it('calculates Moon-like surface gravity and escape velocity', () => {
      const moonMass = 0.0123 * EARTH_MASS;
      const moonRadius = 0.272 * EARTH_RADIUS;

      const gMoon = computeSurfaceGravity(moonMass, moonRadius);
      expect(gMoon).toBeCloseTo(1.63, 1);

      const vEscMoonKm = computeEscapeVelocity(moonMass, moonRadius) / 1000.0;
      expect(vEscMoonKm).toBeCloseTo(2.38, 1);
    });

    it('calculates Jupiter surface gravity and escape velocity', () => {
      const gJupiter = computeSurfaceGravity(JUPITER_MASS, JUPITER_RADIUS);
      expect(gJupiter).toBeCloseTo(25.9, 0);

      const vEscJupiterKm = computeEscapeVelocity(JUPITER_MASS, JUPITER_RADIUS) / 1000.0;
      expect(vEscJupiterKm).toBeCloseTo(60.2, 0);
    });

    it('scales gravity with M/R² and escape velocity with sqrt(M/R)', () => {
      const baseG = computeSurfaceGravity(EARTH_MASS, EARTH_RADIUS);
      const doubleMassG = computeSurfaceGravity(2 * EARTH_MASS, EARTH_RADIUS);
      expect(doubleMassG).toBeCloseTo(2 * baseG, 5);

      const doubleRadiusG = computeSurfaceGravity(EARTH_MASS, 2 * EARTH_RADIUS);
      expect(doubleRadiusG).toBeCloseTo(baseG / 4, 5);

      const baseV = computeEscapeVelocity(EARTH_MASS, EARTH_RADIUS);
      const quadMassV = computeEscapeVelocity(4 * EARTH_MASS, EARTH_RADIUS);
      expect(quadMassV).toBeCloseTo(2 * baseV, 5);
    });

    it('throws on non-positive or non-finite inputs', () => {
      expect(() => computeSurfaceGravity(0, EARTH_RADIUS)).toThrow(RangeError);
      expect(() => computeSurfaceGravity(-100, EARTH_RADIUS)).toThrow(RangeError);
      expect(() => computeSurfaceGravity(EARTH_MASS, 0)).toThrow(RangeError);
      expect(() => computeSurfaceGravity(EARTH_MASS, -EARTH_RADIUS)).toThrow(RangeError);
      expect(() => computeSurfaceGravity(NaN, EARTH_RADIUS)).toThrow(RangeError);
      expect(() => computeEscapeVelocity(EARTH_MASS, NaN)).toThrow(RangeError);
    });
  });

  describe('Atmospheric Retention (Thermal Jeans Escape)', () => {
    it('marks bodies with v_esc < 3.0 km/s as unable to retain atmosphere', () => {
      expect(isAtmosphereRetainedByGravity(2380)).toBe(false); // Moon
      expect(isAtmosphereRetainedByGravity(2999)).toBe(false);
      expect(isAtmosphereRetainedByGravity(3000)).toBe(true);  // Threshold
      expect(isAtmosphereRetainedByGravity(11190)).toBe(true); // Earth
    });

    it('assigns 0 bar to airless terrestrial bodies', () => {
      const moonMass = 0.0123 * EARTH_MASS;
      const moonRadius = 0.272 * EARTH_RADIUS;
      const pressure = estimateSurfaceAtmosphericPressure(PlanetType.ROCKY, moonMass, moonRadius);
      expect(pressure).toBe(0.0);
    });

    it('assigns 1.0 bar reference level to gas and ice giants', () => {
      expect(estimateSurfaceAtmosphericPressure(PlanetType.GAS_GIANT, JUPITER_MASS, JUPITER_RADIUS)).toBe(1.0);
      expect(estimateSurfaceAtmosphericPressure(PlanetType.ICE_GIANT, 15 * EARTH_MASS, 4 * EARTH_RADIUS)).toBe(1.0);
    });

    it('samples realistic terrestrial pressures deterministically when PRNG is supplied', () => {
      const rng1 = new SeededRandom(12345);
      const p1 = estimateSurfaceAtmosphericPressure(PlanetType.ROCKY, EARTH_MASS, EARTH_RADIUS, rng1);

      const rng2 = new SeededRandom(12345);
      const p2 = estimateSurfaceAtmosphericPressure(PlanetType.ROCKY, EARTH_MASS, EARTH_RADIUS, rng2);

      expect(p1).toBe(p2);
      expect(p1).toBeGreaterThan(0.1);
      expect(p1).toBeLessThan(50.0);
    });
  });

  describe('1D Semi-Grey Greenhouse Model', () => {
    it('returns zero optical depth and zero warming for airless bodies (P = 0)', () => {
      expect(computeInfraredOpticalDepth(0)).toBe(0);
      const tEq = 250;
      const tSurf = computeSurfaceTemperature(tEq, 0, PlanetType.ROCKY);
      expect(tSurf).toBe(tEq);
    });

    it('calculates Earth reference greenhouse warming accurately (~+33 K)', () => {
      const tEqEarth = 255.0; // Standard Earth equilibrium temperature
      const pEarth = 1.01325; // 1 atm
      const tSurfEarth = computeSurfaceTemperature(tEqEarth, pEarth, PlanetType.ROCKY);

      expect(tSurfEarth).toBeGreaterThan(285.0);
      expect(tSurfEarth).toBeLessThan(291.0);
      expect(tSurfEarth - tEqEarth).toBeCloseTo(33.2, 0);
    });

    it('calculates modest warming for a thin Mars-like atmosphere', () => {
      const tEqMars = 210.0;
      const pMars = 0.006; // ~6 mbar
      const tSurfMars = computeSurfaceTemperature(tEqMars, pMars, PlanetType.ROCKY);

      expect(tSurfMars).toBeGreaterThan(tEqMars);
      expect(tSurfMars - tEqMars).toBeLessThan(5.0);
    });

    it('guarantees thermodynamic invariant T_surf >= T_eq for all terrestrial pressures', () => {
      const tEq = 200.0;
      for (const p of [0, 0.001, 0.05, 1.0, 10.0, 90.0]) {
        const tSurf = computeSurfaceTemperature(tEq, p, PlanetType.ROCKY);
        expect(tSurf).toBeGreaterThanOrEqual(tEq);
      }
    });

    it('keeps giant planet temperature at reference level (~T_eq)', () => {
      const tEq = 120.0;
      const tSurfGas = computeSurfaceTemperature(tEq, 1.0, PlanetType.GAS_GIANT);
      expect(tSurfGas).toBe(tEq);

      const tSurfIce = computeSurfaceTemperature(tEq, 1.0, PlanetType.ICE_GIANT);
      expect(tSurfIce).toBe(tEq);
    });
  });

  describe('Water Phase Stability (Clausius-Clapeyron Boiling Curve)', () => {
    it('computes water boiling point at 1 atm as ~373.15 K (100 °C)', () => {
      const tBoil = computeWaterBoilingPoint(1.01325);
      expect(tBoil).toBeCloseTo(WATER_NORMAL_BOILING_TEMP_K, 1);
    });

    it('computes water boiling point at 2 atm as higher (~393.5 K)', () => {
      const tBoil2Atm = computeWaterBoilingPoint(2.0265);
      expect(tBoil2Atm).toBeGreaterThan(WATER_NORMAL_BOILING_TEMP_K);
      expect(tBoil2Atm).toBeCloseTo(393.5, 0);
    });

    it('returns triple point temperature below 0.00612 bar', () => {
      const tBoilVac = computeWaterBoilingPoint(0.001);
      expect(tBoilVac).toBeCloseTo(273.16, 2);
    });

    it('identifies SUBLIMATING_ICE below water triple point pressure', () => {
      const state = evaluateWaterPhaseState(280, 0.002, PlanetType.ROCKY);
      expect(state).toBe(WaterPhaseState.SUBLIMATING_ICE);
    });

    it('identifies SOLID_ICE when temperature is below 273.15 K', () => {
      const state = evaluateWaterPhaseState(250, 1.0, PlanetType.ROCKY);
      expect(state).toBe(WaterPhaseState.SOLID_ICE);
    });

    it('identifies LIQUID_STABLE in Earth-like conditions (288 K, 1 bar)', () => {
      const state = evaluateWaterPhaseState(288.15, 1.0, PlanetType.ROCKY);
      expect(state).toBe(WaterPhaseState.LIQUID_STABLE);
    });

    it('identifies SUPERHEATED_STEAM when temperature exceeds boiling point', () => {
      const state = evaluateWaterPhaseState(380, 1.0, PlanetType.ROCKY);
      expect(state).toBe(WaterPhaseState.SUPERHEATED_STEAM);
    });

    it('returns NOT_APPLICABLE for gas/ice giants', () => {
      expect(evaluateWaterPhaseState(288, 1.0, PlanetType.GAS_GIANT)).toBe(WaterPhaseState.NOT_APPLICABLE);
      expect(evaluateWaterPhaseState(288, 1.0, PlanetType.ICE_GIANT)).toBe(WaterPhaseState.NOT_APPLICABLE);
    });
  });

  describe('Thermal and Environmental Regime Classifications', () => {
    it('classifies gas and ice giants correctly', () => {
      expect(classifyThermalRegime(PlanetType.GAS_GIANT, 1.0, 150, WaterPhaseState.NOT_APPLICABLE).regime).toBe(ThermalRegime.JOVIAN_GAS_GIANT);
      expect(classifyThermalRegime(PlanetType.ICE_GIANT, 1.0, 80, WaterPhaseState.NOT_APPLICABLE).regime).toBe(ThermalRegime.JOVIAN_ICE_GIANT);
    });

    it('classifies cold airless worlds as AIRLESS_CRYOWORLD and hot airless as AIRLESS_DESOLATION', () => {
      const coldAirless = classifyThermalRegime(PlanetType.ROCKY, 0, 150, WaterPhaseState.SUBLIMATING_ICE);
      expect(coldAirless.regime).toBe(ThermalRegime.AIRLESS_CRYOWORLD);

      const hotAirless = classifyThermalRegime(PlanetType.ROCKY, 0, 350, WaterPhaseState.SUBLIMATING_ICE);
      expect(hotAirless.regime).toBe(ThermalRegime.AIRLESS_DESOLATION);
    });

    it('classifies glaciated atmosphere worlds as GLACIATED_TERRESTRIAL', () => {
      const glaciated = classifyThermalRegime(PlanetType.ROCKY, 1.0, 240, WaterPhaseState.SOLID_ICE);
      expect(glaciated.regime).toBe(ThermalRegime.GLACIATED_TERRESTRIAL);
    });

    it('classifies liquid-stable terrestrial worlds as TEMPERATE_MODEL_REGIME', () => {
      const temperate = classifyThermalRegime(PlanetType.ROCKY, 1.0, 288, WaterPhaseState.LIQUID_STABLE);
      expect(temperate.regime).toBe(ThermalRegime.TEMPERATE_MODEL_REGIME);
    });

    it('classifies overheated terrestrial worlds as HYPERTHERMIC_RUNAWAY', () => {
      const runaway = classifyThermalRegime(PlanetType.ROCKY, 90.0, 700, WaterPhaseState.SUPERHEATED_STEAM);
      expect(runaway.regime).toBe(ThermalRegime.HYPERTHERMIC_RUNAWAY);
    });
  });

  describe('Unified Environment Pipeline (computePlanetaryEnvironment)', () => {
    it('evaluates a complete Earth-Sun analogue accurately', () => {
      const env = computePlanetaryEnvironment({
        planetType: PlanetType.ROCKY,
        massKg: EARTH_MASS,
        radiusMeters: EARTH_RADIUS,
        luminosityWatts: SOLAR_LUMINOSITY,
        orbitalDistanceMeters: AU,
        albedo: 0.30,
        surfacePressureBar: 1.01325,
      });

      expect(env.surfaceGravity).toBeCloseTo(9.82, 1);
      expect(env.relativeGravity).toBeCloseTo(1.0, 4);
      expect(env.escapeVelocityKmPerSec).toBeCloseTo(11.19, 1);
      expect(env.isAtmosphereRetained).toBe(true);
      expect(env.surfacePressureBar).toBe(1.01325);
      expect(env.surfacePressurePa).toBeCloseTo(101325, 0);

      // Temperatures
      expect(env.equilibriumTemperatureK).toBeCloseTo(254.6, 0);
      expect(env.surfaceTemperatureK).toBeCloseTo(287.8, 0);
      expect(env.greenhouseWarmingK).toBeCloseTo(33.2, 0);

      // Water and regime
      expect(env.waterPhaseState).toBe(WaterPhaseState.LIQUID_STABLE);
      expect(env.thermalRegime).toBe(ThermalRegime.TEMPERATE_MODEL_REGIME);
      expect(env.regimeLabel).toBe('Temperate Model Regime');
    });

    it('evaluates a frozen airless Moon-like analogue', () => {
      const env = computePlanetaryEnvironment({
        planetType: PlanetType.ROCKY,
        massKg: 0.0123 * EARTH_MASS,
        radiusMeters: 0.272 * EARTH_RADIUS,
        luminosityWatts: SOLAR_LUMINOSITY,
        orbitalDistanceMeters: 5 * AU, // Outer solar system
        albedo: 0.12,
      });

      expect(env.escapeVelocityKmPerSec).toBeLessThan(3.0);
      expect(env.isAtmosphereRetained).toBe(false);
      expect(env.surfacePressureBar).toBe(0.0);
      expect(env.surfaceTemperatureK).toBe(env.equilibriumTemperatureK);
      expect(env.greenhouseWarmingK).toBe(0.0);
      expect(env.thermalRegime).toBe(ThermalRegime.AIRLESS_CRYOWORLD);
    });

    it('exposes model metadata and educational assumptions', () => {
      expect(PLANETARY_ENVIRONMENT_METADATA.assumptions.length).toBeGreaterThanOrEqual(4);
      expect(PLANETARY_ENVIRONMENT_METADATA.limitations.length).toBeGreaterThanOrEqual(4);
      expect(PLANETARY_ENVIRONMENT_METADATA.units.surfaceGravity).toBe('m/s²');
      expect(PLANETARY_ENVIRONMENT_METADATA.units.surfacePressure).toBe('bar and Pa');
    });
  });
});
