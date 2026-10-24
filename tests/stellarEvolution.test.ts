/**
 * ASTRAVERSA Ω — Stellar Evolution Tests
 *
 * Verifies:
 * - Analytical Main Sequence lifetime scaling (τ_MS ∝ M^(-2.5))
 * - Stefan-Boltzmann energy conservation (L = 4π R² σ T⁴) across all phases
 * - 1.0 M☉ Solar lifecycle track (ZAMS → MS → Subgiant → RGB → HB → AGB → White Dwarf)
 * - Massive star evolution (Supergiant → Neutron Star / Black Hole remnant)
 * - Convective red dwarf longevity (M < 0.43 M☉)
 * - Physical mass loss constraints (M_current <= M_initial)
 * - Numerical stability and boundary condition clamping
 */

import { describe, it, expect } from 'vitest';
import {
  computeMainSequenceLifetime,
  computeStellarEvolution,
  computeTemperatureFromStefanBoltzmann,
  getSpectralClassAndColorFromTemperature,
  StellarEvolutionPhase,
} from '../src/astronomy/stellarEvolution';
import {
  SOLAR_MASS,
  SOLAR_RADIUS,
  SOLAR_LUMINOSITY,
  SOLAR_TEMPERATURE,
  STEFAN_BOLTZMANN,
} from '../src/astronomy/constants';
import { SpectralClass } from '../src/astronomy/stellar';

describe('Main Sequence Lifetime', () => {
  it('computes canonical 10 Gyr lifetime for a 1.0 M☉ star', () => {
    const lifetime = computeMainSequenceLifetime(1.0);
    expect(lifetime).toBeCloseTo(1.0e10, -5); // ~10 billion years
  });

  it('lifetime scales inversely with mass as approximately M^(-2.5) for intermediate stars', () => {
    const t1 = computeMainSequenceLifetime(1.0);
    const t2 = computeMainSequenceLifetime(2.0);

    // Expected: 2^(-2.5) ≈ 0.17677
    const ratio = t2 / t1;
    expect(ratio).toBeCloseTo(Math.pow(2.0, -2.5), 3);
    expect(t2).toBeLessThan(t1);
  });

  it('computes short lifetimes for massive stars (10 M☉)', () => {
    const t10 = computeMainSequenceLifetime(10.0);
    // 10^(-2.5) = 1 / √100000 ≈ 0.003162 → ~31.6 Myr
    expect(t10 / 1e6).toBeCloseTo(31.6, 0);
  });

  it('computes extended lifetimes exceeding 100 Gyr for red dwarfs (0.2 M☉)', () => {
    const tRedDwarf = computeMainSequenceLifetime(0.2);
    // 0.2^(-1.8) ≈ 18.1 * 10^10 yr ≈ 181 Gyr
    expect(tRedDwarf).toBeGreaterThan(1.0e11);
  });

  it('enforces an asymptotic minimum lifetime floor for ultra-massive stars (>= 50 M☉)', () => {
    const t50 = computeMainSequenceLifetime(50.0);
    const t100 = computeMainSequenceLifetime(100.0);
    expect(t50).toBeGreaterThan(3.0e6);
    expect(t100).toBeGreaterThan(3.0e6);
    // Difference should be small due to asymptotic floor
    expect(Math.abs(t50 - t100)).toBeLessThan(3.0e6);
  });
});

describe('Stefan-Boltzmann Law Consistency', () => {
  it('computes solar effective temperature matching 5778 K at 1 L☉ and 1 R☉', () => {
    const temp = computeTemperatureFromStefanBoltzmann(SOLAR_LUMINOSITY, SOLAR_RADIUS);
    expect(Math.abs(temp - SOLAR_TEMPERATURE)).toBeLessThan(10); // within ~6K of nominal IAU 5778K
  });

  it('maintains strict Stefan-Boltzmann energy consistency across all phases for a 1.0 M☉ star', () => {
    // Check multiple epochs across the entire lifecycle:
    // 0 Gyr (ZAMS), 4.6 Gyr (Sun now), 9.0 Gyr (late MS), 10.5 Gyr (SGB),
    // 11.5 Gyr (RGB), 12.5 Gyr (HB), 13.3 Gyr (AGB), 14.0 Gyr (White Dwarf)
    const testAges = [0, 4.6e9, 9.0e9, 1.05e10, 1.15e10, 1.25e10, 1.33e10, 1.4e10];

    for (const age of testAges) {
      const state = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: age });

      // L = 4π R² σ T⁴
      const expectedWatts =
        4 * Math.PI * Math.pow(state.radiusMeters, 2) * STEFAN_BOLTZMANN * Math.pow(state.effectiveTemperature, 4);

      // Relative error must be under 0.01%
      const relError = Math.abs(state.luminosityWatts - expectedWatts) / state.luminosityWatts;
      expect(relError).toBeLessThan(1e-4);
    }
  });

  it('maintains Stefan-Boltzmann consistency for massive stars and remnants', () => {
    const testAges = [0, 5e6, 12e6, 20e6]; // ZAMS, MS, Supergiant, Neutron star

    for (const age of testAges) {
      const state = computeStellarEvolution({ initialMassSolar: 15.0, ageYears: age });

      const expectedWatts =
        4 * Math.PI * Math.pow(state.radiusMeters, 2) * STEFAN_BOLTZMANN * Math.pow(state.effectiveTemperature, 4);

      const relError = Math.abs(state.luminosityWatts - expectedWatts) / state.luminosityWatts;
      expect(relError).toBeLessThan(1e-4);
    }
  });
});

describe('Solar-Analogue Evolutionary Track (1.0 M☉)', () => {
  it('initializes ZAMS correctly at age 0', () => {
    const zams = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 0 });

    expect(zams.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
    expect(zams.luminosityClass).toBe('V');
    expect(zams.phaseProgress).toBe(0.0);
    expect(zams.radiusSolar).toBeCloseTo(0.88, 1);
    expect(zams.luminositySolar).toBeCloseTo(0.70, 1);
    expect(zams.effectiveTemperature).toBeGreaterThan(5300);
    expect(zams.effectiveTemperature).toBeLessThan(5800);
    expect(zams.spectralClass).toBe(SpectralClass.G);
  });

  it('matches modern Sun properties at age 4.6 Gyr', () => {
    const sun = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 4.6e9 });

    expect(sun.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
    expect(sun.luminosityClass).toBe('V');
    expect(sun.radiusSolar).toBeCloseTo(1.0, 1); // ~1.0 R☉
    expect(sun.luminositySolar).toBeCloseTo(1.02, 1); // ~1.0 L☉
    expect(sun.effectiveTemperature).toBeCloseTo(SOLAR_TEMPERATURE, -2); // ~5778 K
    expect(sun.spectralClass).toBe(SpectralClass.G);
    expect(sun.currentMassSolar).toBeCloseTo(0.99, 1);
  });

  it('progresses to Subgiant phase after core hydrogen exhaustion', () => {
    const sgb = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 1.05e10 });

    expect(sgb.phase).toBe(StellarEvolutionPhase.SUBGIANT);
    expect(sgb.luminosityClass).toBe('IV');
    expect(sgb.radiusSolar).toBeGreaterThan(1.5);
    expect(sgb.radiusSolar).toBeLessThan(5.0);
  });

  it('expands dramatically into a Red Giant with convective cooling', () => {
    const rgb = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 1.18e10 });

    expect(rgb.phase).toBe(StellarEvolutionPhase.RED_GIANT);
    expect(rgb.luminosityClass).toBe('III');
    // Swells to tens of solar radii
    expect(rgb.radiusSolar).toBeGreaterThan(30.0);
    // Luminosity climbs to hundreds of solar luminosities
    expect(rgb.luminositySolar).toBeGreaterThan(100.0);
    // Surface temperature cools down into K/M range
    expect(rgb.effectiveTemperature).toBeLessThan(4200);
    expect(rgb.effectiveTemperature).toBeGreaterThan(2500);
  });

  it('stabilizes during Core Helium Burning (Horizontal Branch / Red Clump)', () => {
    const hb = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 1.25e10 });

    expect(hb.phase).toBe(StellarEvolutionPhase.CORE_HELIUM_BURNING);
    expect(hb.luminosityClass).toBe('III');
    // Radius contracts compared to peak RGB
    expect(hb.radiusSolar).toBeLessThan(20.0);
    expect(hb.radiusSolar).toBeGreaterThan(5.0);
    expect(hb.luminositySolar).toBeGreaterThan(30.0);
  });

  it('reaches Asymptotic Giant Branch (AGB)', () => {
    const agb = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 1.34e10 });

    expect(agb.phase).toBe(StellarEvolutionPhase.ASYMPTOTIC_GIANT);
    expect(agb.luminosityClass).toBe('II');
    expect(agb.radiusSolar).toBeGreaterThan(50.0);
    expect(agb.luminositySolar).toBeGreaterThan(1000.0);
  });

  it('ejects envelope and cools as a degenerate White Dwarf', () => {
    const wd = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 1.45e10 });

    expect(wd.phase).toBe(StellarEvolutionPhase.WHITE_DWARF);
    expect(wd.luminosityClass).toBe('VII');
    expect(wd.spectralClass).toBe('D');
    // Radius should be approximately Earth-sized (~0.01 R☉)
    expect(wd.radiusSolar).toBeLessThan(0.02);
    expect(wd.radiusSolar).toBeGreaterThan(0.005);
    // Remnant core mass between 0.5 and 0.6 M☉
    expect(wd.currentMassSolar).toBeGreaterThan(0.5);
    expect(wd.currentMassSolar).toBeLessThan(0.65);
    // Bolometric luminosity is low
    expect(wd.luminositySolar).toBeLessThan(0.1);
  });
});

describe('Massive Star Evolution & Remnants', () => {
  it('evolves a 15 M☉ star into a Supergiant and Neutron Star', () => {
    const tMS = computeMainSequenceLifetime(15.0); // ~11.5 Myr

    // 1. Main sequence
    const ms = computeStellarEvolution({ initialMassSolar: 15.0, ageYears: tMS * 0.5 });
    expect(ms.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
    expect(ms.spectralClass).toBe(SpectralClass.B);
    expect(ms.luminositySolar).toBeGreaterThan(5000);

    // 2. Supergiant
    const sg = computeStellarEvolution({ initialMassSolar: 15.0, ageYears: tMS * 1.05 });
    expect(sg.phase).toBe(StellarEvolutionPhase.SUPERGIANT);
    expect(sg.radiusSolar).toBeGreaterThan(100);

    // 3. Neutron star remnant
    const ns = computeStellarEvolution({ initialMassSolar: 15.0, ageYears: tMS * 1.5 });
    expect(ns.phase).toBe(StellarEvolutionPhase.NEUTRON_STAR);
    expect(ns.spectralClass).toBe('NS');
    // Radius ~ 12 km = 1.7e-5 R☉
    expect(ns.radiusSolar).toBeLessThan(1e-4);
    expect(ns.currentMassSolar).toBeGreaterThan(1.2);
    expect(ns.currentMassSolar).toBeLessThan(2.2);
  });

  it('evolves a 35 M☉ star into a Stellar-mass Black Hole remnant', () => {
    const tMS = computeMainSequenceLifetime(35.0);

    const bh = computeStellarEvolution({ initialMassSolar: 35.0, ageYears: tMS * 1.5 });
    expect(bh.phase).toBe(StellarEvolutionPhase.STELLAR_BLACK_HOLE);
    expect(bh.spectralClass).toBe('BH');
    expect(bh.currentMassSolar).toBeGreaterThan(3.0);
    expect(bh.luminosityClass).toBe('REMNANT');
  });
});

describe('Low-Mass Red Dwarf Longevity', () => {
  it('keeps a 0.2 M☉ red dwarf on the main sequence across standard cosmic time', () => {
    const redDwarf1 = computeStellarEvolution({ initialMassSolar: 0.2, ageYears: 5.0e9 });
    const redDwarf2 = computeStellarEvolution({ initialMassSolar: 0.2, ageYears: 1.5e10 });

    expect(redDwarf1.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
    expect(redDwarf2.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
    expect(redDwarf1.spectralClass).toBe(SpectralClass.M);
    expect(redDwarf2.spectralClass).toBe(SpectralClass.M);
    expect(redDwarf2.effectiveTemperature).toBeLessThan(3500);
  });
});

describe('Physical Constraints & Numerical Stability', () => {
  it('strictly enforces current mass <= initial mass at all ages', () => {
    for (const mass of [0.2, 0.8, 1.0, 2.5, 7.0, 15.0, 30.0]) {
      for (const ageRatio of [0.0, 0.5, 1.0, 1.15, 1.25, 1.5, 2.0]) {
        const tMS = computeMainSequenceLifetime(mass);
        const state = computeStellarEvolution({ initialMassSolar: mass, ageYears: tMS * ageRatio });

        expect(state.currentMassSolar).toBeLessThanOrEqual(mass * 1.000001);
        expect(state.currentMassSolar).toBeGreaterThan(0.05);
      }
    }
  });

  it('handles age = 0 without error or division by zero', () => {
    const state = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: 0 });
    expect(isFinite(state.luminositySolar)).toBe(true);
    expect(isFinite(state.radiusSolar)).toBe(true);
    expect(isFinite(state.effectiveTemperature)).toBe(true);
  });

  it('handles negative age gracefully by clamping to 0', () => {
    const state = computeStellarEvolution({ initialMassSolar: 1.0, ageYears: -100 });
    expect(state.ageYears).toBe(0);
    expect(state.phase).toBe(StellarEvolutionPhase.MAIN_SEQUENCE);
  });

  it('clamps extreme masses to physical modeling bounds [0.08, 120]', () => {
    const low = computeStellarEvolution({ initialMassSolar: 0.001, ageYears: 1e9 });
    const high = computeStellarEvolution({ initialMassSolar: 500.0, ageYears: 1e6 });

    expect(low.initialMassSolar).toBe(0.08);
    expect(high.initialMassSolar).toBe(120.0);
  });
});

describe('Color & Spectral Class Mapping', () => {
  it('maps temperatures to correct spectral classifications', () => {
    expect(getSpectralClassAndColorFromTemperature(40000).spectralClass).toBe(SpectralClass.O);
    expect(getSpectralClassAndColorFromTemperature(18000).spectralClass).toBe(SpectralClass.B);
    expect(getSpectralClassAndColorFromTemperature(8500).spectralClass).toBe(SpectralClass.A);
    expect(getSpectralClassAndColorFromTemperature(6500).spectralClass).toBe(SpectralClass.F);
    expect(getSpectralClassAndColorFromTemperature(5700).spectralClass).toBe(SpectralClass.G);
    expect(getSpectralClassAndColorFromTemperature(4500).spectralClass).toBe(SpectralClass.K);
    expect(getSpectralClassAndColorFromTemperature(3000).spectralClass).toBe(SpectralClass.M);
  });
});
