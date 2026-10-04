/**
 * ASTRAVERSA Ω — Orbital Resonance Tests
 *
 * Tests for:
 * - Resonance detection between two bodies
 * - Known astronomical resonances
 * - All-pairs analysis
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  findClosestResonance,
  analyzeResonances,
  formatResonance,
} from '../src/physics/orbitalResonance';
import type { ResonanceBody } from '../src/physics/orbitalResonance';

describe('Resonance Detection', () => {
  it('detects exact 2:1 resonance', () => {
    // Inner body period = 1, outer = 2 → ratio = 2
    const result = findClosestResonance(100, 200, 'inner', 'outer');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.ratio).toEqual([2, 1]);
    expect(result.label).toBe('2:1');
    expect(result.deviation).toBeCloseTo(0, 8);
    expect(result.strength).toBeCloseTo(1, 2);
  });

  it('detects exact 3:2 resonance', () => {
    const result = findClosestResonance(200, 300, 'inner', 'outer');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.ratio).toEqual([3, 2]);
    expect(result.label).toBe('3:2');
    expect(result.deviation).toBeCloseTo(0, 8);
  });

  it('detects approximate 2:1 resonance within tolerance', () => {
    // Slightly off from exact 2:1
    const result = findClosestResonance(100, 201, 'inner', 'outer', 0.02);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.ratio).toEqual([2, 1]);
    expect(result.deviation).toBeLessThan(0.02);
    expect(result.deviation).toBeGreaterThan(0);
  });

  it('rejects resonance outside tolerance', () => {
    // Ratio is 2.1:1 — far from any simple ratio with tight tolerance
    const result = findClosestResonance(100, 210, 'inner', 'outer', 0.01);
    // 2.1/2 = 0.05 deviation → outside 1% tolerance
    expect(result).toBeNull();
  });

  it('handles swapped period order', () => {
    // Should auto-swap so inner has shorter period
    const result = findClosestResonance(200, 100, 'outer', 'inner');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.innerBodyId).toBe('inner');
    expect(result.outerBodyId).toBe('outer');
  });

  it('returns null for zero period', () => {
    expect(findClosestResonance(0, 100, 'a', 'b')).toBeNull();
    expect(findClosestResonance(100, 0, 'a', 'b')).toBeNull();
  });

  it('returns null for negative period', () => {
    expect(findClosestResonance(-100, 200, 'a', 'b')).toBeNull();
  });

  it('detects 1:1 co-orbital resonance', () => {
    const result = findClosestResonance(365.25, 365.25, 'trojan', 'planet');
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.ratio).toEqual([1, 1]);
  });

  it('detects 4:1 resonance', () => {
    const result = findClosestResonance(100, 400, 'inner', 'outer');
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.ratio).toEqual([4, 1]);
  });
});

describe('Multi-Body Resonance Analysis', () => {
  it('finds resonances among multiple bodies', () => {
    const bodies: ResonanceBody[] = [
      { id: 'a', orbitalPeriod: 100 },
      { id: 'b', orbitalPeriod: 200 },
      { id: 'c', orbitalPeriod: 400 },
    ];

    const results = analyzeResonances(bodies);

    // a:b = 2:1, b:c = 2:1, a:c = 4:1
    expect(results.length).toBeGreaterThanOrEqual(2);

    const labels = results.map(r => r.label);
    expect(labels).toContain('2:1');
  });

  it('returns empty for non-resonant bodies', () => {
    const bodies: ResonanceBody[] = [
      { id: 'a', orbitalPeriod: 100 },
      { id: 'b', orbitalPeriod: 157 }, // ~1.57:1 — not near any simple ratio
    ];

    const results = analyzeResonances(bodies, 0.005); // Very tight tolerance
    expect(results.length).toBe(0);
  });

  it('filters out bodies with zero period', () => {
    const bodies: ResonanceBody[] = [
      { id: 'star', orbitalPeriod: 0 },
      { id: 'planet', orbitalPeriod: 100 },
    ];

    const results = analyzeResonances(bodies);
    expect(results.length).toBe(0);
  });

  it('sorts results by strength', () => {
    const bodies: ResonanceBody[] = [
      { id: 'a', orbitalPeriod: 100 },
      { id: 'b', orbitalPeriod: 200 },     // Exact 2:1 with a
      { id: 'c', orbitalPeriod: 301.5 },   // Approximate 3:1 with a
    ];

    const results = analyzeResonances(bodies);
    if (results.length >= 2) {
      // Exact resonance should have higher strength
      expect(results[0].strength).toBeGreaterThanOrEqual(results[1].strength);
    }
  });
});

describe('Resonance Formatting', () => {
  it('formats resonance for display', () => {
    const result = findClosestResonance(100, 200, 'Earth', 'Mars');
    expect(result).not.toBeNull();
    if (!result) return;

    const formatted = formatResonance(result);
    expect(formatted).toContain('2:1');
    expect(formatted).toContain('resonance');
  });
});
