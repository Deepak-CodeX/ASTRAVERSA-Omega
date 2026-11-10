/**
 * ASTRAVERSA Ω — Astronomical Provenance Tests (Mission 002B)
 *
 * Verifies the epistemic demarcation between:
 * - OBSERVED: Ground-truth astronomical objects from empirical instruments (NASA, ESA, ESO)
 * - DERIVED_FROM_OBSERVATIONS: Modeled/inferred from observational constraints
 * - PROCEDURAL_SIMULATION: Deterministic or stochastic synthetic entities
 * - HYPOTHETICAL: Theoretical thought-experiments or speculative constructs
 */

import { describe, it, expect } from 'vitest';
import {
  AstronomicalProvenance,
  type ProvenanceRecord,
  createObservedProvenance,
  createDerivedProvenance,
  createProceduralProvenance,
} from '../src/universe/AstronomicalProvenance';

describe('Mission 002B — Astronomical Provenance Architecture', () => {
  describe('Classification Constants', () => {
    it('defines distinct epistemic domains', () => {
      expect(AstronomicalProvenance.OBSERVED).toBe('OBSERVED');
      expect(AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS).toBe('DERIVED_FROM_OBSERVATIONS');
      expect(AstronomicalProvenance.PROCEDURAL_SIMULATION).toBe('PROCEDURAL_SIMULATION');
      expect(AstronomicalProvenance.HYPOTHETICAL).toBe('HYPOTHETICAL');
    });

    it('ensures domain values are mutually exclusive', () => {
      const values = Object.values(AstronomicalProvenance);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('createObservedProvenance', () => {
    it('constructs complete observed provenance records with J2000 epoch and confidence 1.0', () => {
      const record = createObservedProvenance(
        'Sol',
        'NASA JPL Horizons',
        'Standish (1998) JPL Planetary Ephemeris DE405',
        'Solar system barycenter observational baseline'
      );

      expect(record.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(record.catalogId).toBe('Sol');
      expect(record.sourceArchive).toBe('NASA JPL Horizons');
      expect(record.citation).toContain('Standish');
      expect(record.confidence).toBe(1.0);
      expect(record.epoch).toBe('J2000.0');
      expect(record.notes).toBe('Solar system barycenter observational baseline');
    });

    it('supports optional citation and notes', () => {
      const record = createObservedProvenance('Gaia DR3 5853498713190525696', 'ESA Gaia DR3');
      expect(record.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(record.catalogId).toBe('Gaia DR3 5853498713190525696');
      expect(record.sourceArchive).toBe('ESA Gaia DR3');
      expect(record.citation).toBeUndefined();
      expect(record.notes).toBeUndefined();
    });
  });

  describe('createDerivedProvenance', () => {
    it('constructs derived observational provenance with confidence 0.95', () => {
      const record = createDerivedProvenance(
        'Milky Way Thin Disk',
        'Bland-Hawthorn & Gerhard (2016)',
        'ARA&A 54, 529-596',
        'Scale height hz = 300 pc derived from stellar kinematics'
      );

      expect(record.classification).toBe(AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS);
      expect(record.confidence).toBe(0.95);
      expect(record.catalogId).toBe('Milky Way Thin Disk');
      expect(record.notes).toContain('300 pc');
    });
  });

  describe('createProceduralProvenance', () => {
    it('constructs procedural provenance with determinism indicator', () => {
      const record = createProceduralProvenance(42, 'ANANTARA α galaxy star population');

      expect(record.classification).toBe(AstronomicalProvenance.PROCEDURAL_SIMULATION);
      expect(record.catalogId).toBe('PROC-42');
      expect(record.sourceArchive).toBe('ASTRAVERSA Procedural Engine');
      expect(record.notes).toBe('ANANTARA α galaxy star population');
    });

    it('uses default notes when omitted', () => {
      const record = createProceduralProvenance(999);
      expect(record.notes).toBe('Generated deterministically via SeededRandom');
    });
  });

  describe('Scientific Demarcation Rules', () => {
    it('strictly distinguishes real Solar System from procedural systems', () => {
      const earthProvenance: ProvenanceRecord = createObservedProvenance('NAIF-399', 'NASA PDS');
      const proceduralPlanetProvenance: ProvenanceRecord = createProceduralProvenance(101);

      expect(earthProvenance.classification).not.toBe(proceduralPlanetProvenance.classification);
      expect(earthProvenance.classification).toBe('OBSERVED');
      expect(proceduralPlanetProvenance.classification).toBe('PROCEDURAL_SIMULATION');
    });
  });
});

