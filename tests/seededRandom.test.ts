/**
 * ASTRAVERSA Ω — SeededRandom Tests
 *
 * Tests for deterministic pseudo-random number generation.
 */

import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../src/universe/SeededRandom';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('produces the same sequence for the same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const seq1 = Array.from({ length: 100 }, () => rng1.next());
      const seq2 = Array.from({ length: 100 }, () => rng2.next());

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(99);

      const seq1 = Array.from({ length: 20 }, () => rng1.next());
      const seq2 = Array.from({ length: 20 }, () => rng2.next());

      expect(seq1).not.toEqual(seq2);
    });

    it('forked RNGs produce deterministic results', () => {
      const parent1 = new SeededRandom(42);
      const parent2 = new SeededRandom(42);

      const child1 = parent1.fork(5);
      const child2 = parent2.fork(5);

      const seq1 = Array.from({ length: 20 }, () => child1.next());
      const seq2 = Array.from({ length: 20 }, () => child2.next());

      expect(seq1).toEqual(seq2);
    });

    it('different fork indices produce different sequences', () => {
      const parent = new SeededRandom(42);

      const child1 = parent.fork(0);
      const child2 = parent.fork(1);

      const seq1 = Array.from({ length: 20 }, () => child1.next());
      const seq2 = Array.from({ length: 20 }, () => child2.next());

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('output range', () => {
    it('next() produces values in [0, 1)', () => {
      const rng = new SeededRandom(123);
      for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('range() produces values within bounds', () => {
      const rng = new SeededRandom(456);
      for (let i = 0; i < 1000; i++) {
        const val = rng.range(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(10);
      }
    });

    it('rangeInt() produces integers within bounds', () => {
      const rng = new SeededRandom(789);
      for (let i = 0; i < 1000; i++) {
        const val = rng.rangeInt(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        expect(Number.isInteger(val)).toBe(true);
      }
    });
  });

  describe('gaussian', () => {
    it('produces values centered around the mean', () => {
      const rng = new SeededRandom(42);
      const samples = Array.from({ length: 10000 }, () => rng.gaussian(100, 10));
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

      // Mean should be close to 100 (within reasonable tolerance)
      expect(mean).toBeGreaterThan(98);
      expect(mean).toBeLessThan(102);
    });
  });

  describe('pick', () => {
    it('picks elements from the array', () => {
      const rng = new SeededRandom(42);
      const items = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(items);
        expect(items).toContain(picked);
      }
    });
  });
});
