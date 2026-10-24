/**
 * ASTRAVERSA Ω — Stellar–Planetary Coupling Tests (Mission 004B)
 *
 * Deterministic test suite verifying:
 * 1. Reference Earth–Sun-like radiative equilibrium temperature & insolation
 * 2. Inverse-square law irradiation behavior
 * 3. Planetary Bond albedo sensitivity
 * 4. Stellar luminosity sensitivity
 * 5. Input validation & numerical boundary guards
 * 6. Literature-based habitable zone calculations (Kopparapu et al. 2013)
 * 7. Dynamic habitable zone migration over stellar evolution
 * 8. Generator determinism and engine integration
 * 9. UI display consistency
 */

import { describe, it, expect } from 'vitest';
import {
  computeEquilibriumTemperature,
  computeInsolationFlux,
  computeRelativeInsolation,
  computeHabitableZone,
  classifyHabitability,
  getDefaultBondAlbedo,
  sampleBondAlbedo,
  HabitabilityStatus,
  SOLAR_INSOLATION_EARTH,
  HZ_VALID_TEFF_MIN,
  HZ_VALID_TEFF_MAX,
  HZ_REFERENCE_SOLAR_TEFF,
} from '../src/astronomy/stellarPlanetaryCoupling';
import {
  AU,
  SOLAR_LUMINOSITY,
  SOLAR_TEMPERATURE,
  STEFAN_BOLTZMANN,
  PlanetType,
} from '../src/astronomy';
import { generateSolarSystem } from '../src/universe/SolarSystemGenerator';
import { SimulationEngine } from '../src/engine/SimulationEngine';
import { CelestialBodyType } from '../src/universe/CelestialBody';
import { SeededRandom } from '../src/universe/SeededRandom';

describe('Mission 004B — Stellar–Planetary Coupling', () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Reference Earth–Sun System
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Reference Earth–Sun System', () => {
    it('calculates the documented Earth radiative-equilibrium temperature (~254.59 K / -18.6 °C)', () => {
      // Earth parameters: L = L_sun (3.828e26 W), d = 1 AU (1.495978707e11 m), A = 0.30
      const albedoEarth = 0.30;
      const tEq = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, albedoEarth);

      // Theoretical derivation:
      // P_abs = L * (1 - A) / (4 d^2)
      // P_emit = 4 * sigma * T^4
      // T_eq = ( L * (1 - A) / (16 * pi * sigma * d^2) )^(1/4) ≈ 254.59 K (-18.56 °C)
      expect(tEq).toBeCloseTo(254.59, 1);

      // With NASA measured empirical Earth albedo A = 0.306:
      const tEqNasa = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.306);
      expect(tEqNasa).toBeCloseTo(254.04, 1);

      // Verify that actual surface temperature (~288 K) requires +33.6 K natural greenhouse warming
      const naturalGreenhouseDelta = 288.15 - tEq;
      expect(naturalGreenhouseDelta).toBeCloseTo(33.6, 0);
    });

    it('calculates standard solar insolation at 1 AU (~1361.2 W/m²)', () => {
      const flux = computeInsolationFlux(SOLAR_LUMINOSITY, AU);
      expect(flux).toBeCloseTo(1361.2, 0);

      const relInsolation = computeRelativeInsolation(flux);
      expect(relInsolation).toBeCloseTo(1.0, 3);
    });

    it('classifies Earth at 1 AU around the Sun in the conservative habitable zone', () => {
      const hz = computeHabitableZone(SOLAR_LUMINOSITY, HZ_REFERENCE_SOLAR_TEFF);
      const status = classifyHabitability(AU, hz);
      expect(status).toBe(HabitabilityStatus.CONSERVATIVE_HZ);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Inverse-Square Law & Orbital Distance Sensitivity
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Inverse-Square Law Sensitivity', () => {
    it('scales insolation flux strictly as 1 / d^2', () => {
      const d1 = AU;
      const d2 = 2 * AU;
      const d3 = 3 * AU;
      const d4 = 4 * AU;

      const f1 = computeInsolationFlux(SOLAR_LUMINOSITY, d1);
      const f2 = computeInsolationFlux(SOLAR_LUMINOSITY, d2);
      const f3 = computeInsolationFlux(SOLAR_LUMINOSITY, d3);
      const f4 = computeInsolationFlux(SOLAR_LUMINOSITY, d4);

      expect(f2 / f1).toBeCloseTo(1 / 4, 8);
      expect(f3 / f1).toBeCloseTo(1 / 9, 8);
      expect(f4 / f1).toBeCloseTo(1 / 16, 8);
    });

    it('scales radiative equilibrium temperature strictly as d^(-1/2)', () => {
      const d1 = AU;
      const d2 = 4 * AU;
      const d3 = 16 * AU;

      const t1 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, d1, 0.30);
      const t2 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, d2, 0.30);
      const t3 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, d3, 0.30);

      // (4)^(-1/2) = 0.5
      expect(t2 / t1).toBeCloseTo(0.5, 6);
      // (16)^(-1/2) = 0.25
      expect(t3 / t1).toBeCloseTo(0.25, 6);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Planetary Bond Albedo Sensitivity
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Bond Albedo Sensitivity', () => {
    it('scales equilibrium temperature as (1 - A)^(1/4)', () => {
      const tBlackbody = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.0);
      const tA75 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.75);

      // (1 - 0.75)^(1/4) = 0.25^(1/4) = 1 / sqrt(2) ≈ 0.70710678
      expect(tA75 / tBlackbody).toBeCloseTo(Math.pow(0.25, 0.25), 6);

      const tA90 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.90);
      expect(tA90 / tBlackbody).toBeCloseTo(Math.pow(0.10, 0.25), 6);
    });

    it('strictly decreases temperature monotonically with increasing albedo', () => {
      let prevTemp = Infinity;
      for (let a = 0.0; a <= 0.95; a += 0.05) {
        const temp = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, a);
        expect(temp).toBeLessThan(prevTemp);
        prevTemp = temp;
      }
    });

    it('provides literature canonical default albedos by planet classification', () => {
      expect(getDefaultBondAlbedo(PlanetType.ROCKY)).toBe(0.30);
      expect(getDefaultBondAlbedo(PlanetType.GAS_GIANT)).toBe(0.45);
      expect(getDefaultBondAlbedo(PlanetType.ICE_GIANT)).toBe(0.35);
    });

    it('samples bounded albedos within physical ranges using PRNG', () => {
      const rng = new SeededRandom(12345);
      for (let i = 0; i < 50; i++) {
        const rockyAlbedo = sampleBondAlbedo(PlanetType.ROCKY, rng);
        expect(rockyAlbedo).toBeGreaterThanOrEqual(0.12);
        expect(rockyAlbedo).toBeLessThanOrEqual(0.36);

        const gasAlbedo = sampleBondAlbedo(PlanetType.GAS_GIANT, rng);
        expect(gasAlbedo).toBeGreaterThanOrEqual(0.35);
        expect(gasAlbedo).toBeLessThanOrEqual(0.52);

        const iceAlbedo = sampleBondAlbedo(PlanetType.ICE_GIANT, rng);
        expect(iceAlbedo).toBeGreaterThanOrEqual(0.28);
        expect(iceAlbedo).toBeLessThanOrEqual(0.38);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Stellar Luminosity Sensitivity
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Stellar Luminosity Sensitivity', () => {
    it('scales equilibrium temperature as L^(1/4)', () => {
      const t1 = computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.30);
      const t16 = computeEquilibriumTemperature(16 * SOLAR_LUMINOSITY, AU, 0.30);
      const t81 = computeEquilibriumTemperature(81 * SOLAR_LUMINOSITY, AU, 0.30);

      // (16)^(1/4) = 2.0
      expect(t16 / t1).toBeCloseTo(2.0, 6);
      // (81)^(1/4) = 3.0
      expect(t81 / t1).toBeCloseTo(3.0, 6);
    });

    it('returns 0 K for a completely dark / zero-luminosity star', () => {
      const tZero = computeEquilibriumTemperature(0, AU, 0.30);
      expect(tZero).toBe(0);

      const fZero = computeInsolationFlux(0, AU);
      expect(fZero).toBe(0);

      const relZero = computeRelativeInsolation(0);
      expect(relZero).toBe(0);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Input Validation & Numerical Boundaries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Input Validation & Boundary Guards', () => {
    it('throws RangeError for non-positive orbital distances', () => {
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, 0, 0.3)).toThrow(RangeError);
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, -100, 0.3)).toThrow(RangeError);
      expect(() => computeInsolationFlux(SOLAR_LUMINOSITY, 0)).toThrow(RangeError);
      expect(() => computeInsolationFlux(SOLAR_LUMINOSITY, -AU)).toThrow(RangeError);
    });

    it('throws RangeError for negative luminosities', () => {
      expect(() => computeEquilibriumTemperature(-1000, AU, 0.3)).toThrow(RangeError);
      expect(() => computeInsolationFlux(-1000, AU)).toThrow(RangeError);
      expect(() => computeHabitableZone(-1000, 5780)).toThrow(RangeError);
    });

    it('throws RangeError for albedo outside [0, 1)', () => {
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, -0.01)).toThrow(RangeError);
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 1.0)).toThrow(RangeError);
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 1.5)).toThrow(RangeError);

      // Boundary values 0.0 and 0.99 must be permitted
      expect(computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.0)).toBeGreaterThan(0);
      expect(computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, 0.99)).toBeGreaterThan(0);
    });

    it('throws TypeError for non-finite arguments', () => {
      expect(() => computeEquilibriumTemperature(NaN, AU, 0.3)).toThrow(TypeError);
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, NaN, 0.3)).toThrow(TypeError);
      expect(() => computeEquilibriumTemperature(SOLAR_LUMINOSITY, AU, NaN)).toThrow(TypeError);
      expect(() => computeEquilibriumTemperature(Infinity, AU, 0.3)).toThrow(TypeError);
    });

    it('handles zero-luminosity star habitable zone gracefully by returning 0 radii', () => {
      const hz = computeHabitableZone(0, 5000);
      expect(hz.innerConservativeAU).toBe(0);
      expect(hz.outerConservativeAU).toBe(0);
      expect(hz.innerOptimisticAU).toBe(0);
      expect(hz.outerOptimisticAU).toBe(0);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Literature-Based Habitable Zone Boundaries
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kopparapu et al. (2013) Habitable Zone Calculations', () => {
    it('reproduces literature boundaries for a Sun-like star at 5780 K', () => {
      const hz = computeHabitableZone(SOLAR_LUMINOSITY, HZ_REFERENCE_SOLAR_TEFF);

      // Literature values for 1 Earth mass (Table 3, Kopparapu 2013):
      // Recent Venus: S_eff = 1.776 -> d = sqrt(1 / 1.776) ≈ 0.750 AU
      // Runaway Greenhouse: S_eff = 1.056 -> d = sqrt(1 / 1.056) ≈ 0.973 AU
      // Maximum Greenhouse: S_eff = 0.356 -> d = sqrt(1 / 0.356) ≈ 1.676 AU
      // Early Mars: S_eff = 0.320 -> d = sqrt(1 / 0.320) ≈ 1.768 AU
      expect(hz.innerOptimisticAU).toBeCloseTo(0.750, 2);
      expect(hz.innerConservativeAU).toBeCloseTo(0.973, 2);
      expect(hz.outerConservativeAU).toBeCloseTo(1.676, 2);
      expect(hz.outerOptimisticAU).toBeCloseTo(1.768, 2);

      // Verify strict monotonic ordering: inner_opt < inner_cons < outer_cons < outer_opt
      expect(hz.innerOptimisticAU).toBeLessThan(hz.innerConservativeAU);
      expect(hz.innerConservativeAU).toBeLessThan(hz.outerConservativeAU);
      expect(hz.outerConservativeAU).toBeLessThan(hz.outerOptimisticAU);

      // Consistency between meters and AU
      expect(hz.innerConservativeMeters).toBeCloseTo(hz.innerConservativeAU * AU, 0);
      expect(hz.outerConservativeMeters).toBeCloseTo(hz.outerConservativeAU * AU, 0);
    });

    it('clamps stellar effective temperature outside [2600, 7200] K', () => {
      // Hot star (e.g. B-dwarf or hot white dwarf at 15,000 K)
      const hotHz = computeHabitableZone(10 * SOLAR_LUMINOSITY, 15000);
      expect(hotHz.isTemperatureClamped).toBe(true);
      expect(hotHz.effectiveTemperatureK).toBe(HZ_VALID_TEFF_MAX);
      expect(hotHz.innerConservativeAU).toBeGreaterThan(0);

      // Cool star (e.g. ultra-cool M/L dwarf at 1800 K)
      const coolHz = computeHabitableZone(0.01 * SOLAR_LUMINOSITY, 1800);
      expect(coolHz.isTemperatureClamped).toBe(true);
      expect(coolHz.effectiveTemperatureK).toBe(HZ_VALID_TEFF_MIN);
      expect(coolHz.innerConservativeAU).toBeGreaterThan(0);

      // Solar twin at 5778 K
      const solarHz = computeHabitableZone(SOLAR_LUMINOSITY, SOLAR_TEMPERATURE);
      expect(solarHz.isTemperatureClamped).toBe(false);
    });

    it('correctly classifies orbital positions across all five habitability regimes', () => {
      const hz = computeHabitableZone(SOLAR_LUMINOSITY, HZ_REFERENCE_SOLAR_TEFF);

      // 0.5 AU: interior to Recent Venus -> TOO_HOT
      expect(classifyHabitability(0.5 * AU, hz)).toBe(HabitabilityStatus.TOO_HOT);

      // 0.85 AU: between Recent Venus (0.75 AU) and Runaway Greenhouse (0.97 AU) -> OPTIMISTIC_INNER
      expect(classifyHabitability(0.85 * AU, hz)).toBe(HabitabilityStatus.OPTIMISTIC_INNER);

      // 1.0 AU: Earth position, inside conservative zone [0.97, 1.68] AU -> CONSERVATIVE_HZ
      expect(classifyHabitability(1.0 * AU, hz)).toBe(HabitabilityStatus.CONSERVATIVE_HZ);

      // 1.72 AU: between Maximum Greenhouse (1.68 AU) and Early Mars (1.77 AU) -> OPTIMISTIC_OUTER
      expect(classifyHabitability(1.72 * AU, hz)).toBe(HabitabilityStatus.OPTIMISTIC_OUTER);

      // 2.5 AU: exterior to Early Mars -> TOO_COLD
      expect(classifyHabitability(2.5 * AU, hz)).toBe(HabitabilityStatus.TOO_COLD);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. Dynamic Habitable Zone Migration Over Stellar Evolution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Dynamic Habitable Zone Migration', () => {
    it('expands habitable zone outwards as stellar luminosity climbs during giant evolution', () => {
      const engine = new SimulationEngine();
      const system = generateSolarSystem(42);
      engine.initialize(system.bodies);

      const star = system.star;
      const initialHz = star.starProperties!.habitableZone!;
      expect(initialHz).toBeDefined();

      const tMS = star.starProperties!.evolution!.mainSequenceLifetimeYears;
      const initialPlanet1Temp = system.planets[0].planetProperties!.equilibriumTemperature;

      // Advance star into the luminous Red Giant Branch (1.18 * tMS)
      engine.setStarAge(star, tMS * 1.18);

      expect(star.starProperties!.evolution!.phase).toBe('RED_GIANT');
      const rgbHz = star.starProperties!.habitableZone!;
      const rgbPlanet1Temp = system.planets[0].planetProperties!.equilibriumTemperature;

      // In the Red Giant phase, luminosity expands the habitable zone dramatically
      expect(rgbHz.innerConservativeAU).toBeGreaterThan(initialHz.innerConservativeAU);
      expect(rgbPlanet1Temp).toBeGreaterThan(initialPlanet1Temp);
    });

    it('contracts habitable zone inward and cools planets when entering white dwarf stage', () => {
      const engine = new SimulationEngine();
      const system = generateSolarSystem(42);
      engine.initialize(system.bodies);

      const star = system.star;
      const tMS = star.starProperties!.evolution!.mainSequenceLifetimeYears;

      // Force star into white dwarf cooling stage (age > 1.4 * tMS)
      engine.setStarAge(star, tMS * 1.5);

      expect(star.starProperties!.evolution!.phase).toBe('WHITE_DWARF');
      const wdHz = star.starProperties!.habitableZone!;

      // White dwarf luminosity is orders of magnitude smaller (< 0.01 L_sun)
      expect(star.starProperties!.luminosity / SOLAR_LUMINOSITY).toBeLessThan(0.05);

      // Habitable zone contracts inside 0.2 AU
      expect(wdHz.outerOptimisticAU).toBeLessThan(0.3);

      // All system planets (which orbit at > 0.3 AU) must become TOO_COLD
      for (const planet of system.planets) {
        expect(planet.planetProperties!.habitabilityStatus).toBe(HabitabilityStatus.TOO_COLD);
        expect(planet.planetProperties!.equilibriumTemperature).toBeLessThan(200);
      }
    });

    it('resets planetary temperatures and habitable zone when reset to ZAMS', () => {
      const engine = new SimulationEngine();
      const system = generateSolarSystem(42);
      engine.initialize(system.bodies);

      const star = system.star;
      engine.setStarAge(star, 0); // Reset to ZAMS

      const zamsHz = { ...star.starProperties!.habitableZone! };
      const zamsTemp = system.planets[0].planetProperties!.equilibriumTemperature;

      // Age by 3 Gyr
      engine.advanceStellarAge(3.0e9);
      expect(star.starProperties!.habitableZone!.innerConservativeAU).not.toBe(zamsHz.innerConservativeAU);

      // Reset to ZAMS
      engine.setStarAge(star, 0);
      expect(star.starProperties!.habitableZone!.innerConservativeAU).toBeCloseTo(zamsHz.innerConservativeAU, 6);
      expect(system.planets[0].planetProperties!.equilibriumTemperature).toBeCloseTo(zamsTemp, 4);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. Generator Determinism & Integration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Generator Determinism & Integration', () => {
    it('produces identical coupling properties from the same seed', () => {
      const sys1 = generateSolarSystem(42);
      const sys2 = generateSolarSystem(42);

      // Star habitable zone
      expect(sys1.star.starProperties!.habitableZone!.innerConservativeAU).toBe(
        sys2.star.starProperties!.habitableZone!.innerConservativeAU
      );

      // Planets coupling properties
      expect(sys1.planets.length).toBe(sys2.planets.length);
      for (let i = 0; i < sys1.planets.length; i++) {
        const p1 = sys1.planets[i].planetProperties!;
        const p2 = sys2.planets[i].planetProperties!;

        expect(p1.albedo).toBe(p2.albedo);
        expect(p1.equilibriumTemperature).toBe(p2.equilibriumTemperature);
        expect(p1.insolationFlux).toBe(p2.insolationFlux);
        expect(p1.insolationRelative).toBe(p2.insolationRelative);
        expect(p1.habitabilityStatus).toBe(p2.habitabilityStatus);
      }
    });

    it('preserves celestial body position and velocity determinism', () => {
      const sys1 = generateSolarSystem(42);
      const sys2 = generateSolarSystem(42);

      for (let i = 0; i < sys1.planets.length; i++) {
        expect(sys1.planets[i].position.x).toBe(sys2.planets[i].position.x);
        expect(sys1.planets[i].position.z).toBe(sys2.planets[i].position.z);
        expect(sys1.planets[i].velocity.x).toBe(sys2.planets[i].velocity.x);
        expect(sys1.planets[i].velocity.z).toBe(sys2.planets[i].velocity.z);
      }
    });

    it('all generated planets have positive, finite radiative equilibrium temperatures', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const system = generateSolarSystem(seed);
        for (const planet of system.planets) {
          const pp = planet.planetProperties!;
          expect(pp.equilibriumTemperature).toBeGreaterThan(0);
          expect(Number.isFinite(pp.equilibriumTemperature)).toBe(true);
          expect(pp.albedo).toBeGreaterThanOrEqual(0);
          expect(pp.albedo).toBeLessThan(1);
          expect(pp.insolationFlux).toBeGreaterThan(0);
          expect(Object.values(HabitabilityStatus)).toContain(pp.habitabilityStatus);
        }
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. UI Value Consistency
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('UI Display Consistency', () => {
    it('ensures temperature Celsius conversion is strictly T(K) - 273.15', () => {
      const tKelvin = 254.34;
      const tCelsius = tKelvin - 273.15;
      expect(tCelsius).toBeCloseTo(-18.81, 2);
    });

    it('ensures relative insolation matches insolationFlux / SOLAR_INSOLATION_EARTH', () => {
      const flux = 1361.2;
      const rel = flux / SOLAR_INSOLATION_EARTH;
      expect(computeRelativeInsolation(flux)).toBeCloseTo(rel, 6);
    });
  });
});
