/**
 * ASTRAVERSA Ω — Seeded Random Number Generator
 *
 * Deterministic pseudo-random number generator using the Mulberry32 algorithm.
 *
 * Design principles:
 * - Same seed always produces the same sequence of numbers
 * - No dependency on Math.random()
 * - Supports deriving child seeds for hierarchical generation
 *
 * Usage:
 *   const rng = new SeededRandom(42);
 *   const value = rng.next();        // 0 <= value < 1
 *   const ranged = rng.range(5, 10); // 5 <= ranged < 10
 *
 * Hierarchical seeding:
 *   Universe seed → Galaxy seed → Star seed → Planet seed
 *   Each level derives its seed from the parent, ensuring determinism
 *   at every level of the generation hierarchy.
 */

export class SeededRandom {
  private state: number;

  /**
   * Create a new seeded PRNG.
   * @param seed - Integer seed value. Different seeds produce different sequences.
   */
  constructor(seed: number) {
    // Ensure integer seed
    this.state = seed | 0;
  }

  /**
   * Generate the next pseudo-random number in [0, 1).
   * Uses the Mulberry32 algorithm.
   */
  next(): number {
    // Mulberry32
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random number in the range [min, max).
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate a random integer in the range [min, max] (inclusive).
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Generate a random number with approximate Gaussian (normal) distribution.
   * Uses the Box-Muller transform.
   *
   * @param mean - Mean of the distribution
   * @param stdDev - Standard deviation
   */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform using two uniform random numbers
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1 || 1e-10)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Pick a random element from an array.
   */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Derive a child seed from the current state.
   * Useful for hierarchical procedural generation.
   *
   * @param index - Unique index for this child (e.g., planet index)
   * @returns A new integer seed deterministically derived from the current state and index
   */
  deriveSeed(index: number): number {
    // Hash the current state with the index to produce a new seed
    let hash = this.state ^ (index * 2654435761);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  /**
   * Create a child SeededRandom instance for hierarchical generation.
   *
   * @param index - Unique index for this child
   * @returns A new SeededRandom with a deterministically derived seed
   */
  fork(index: number): SeededRandom {
    return new SeededRandom(this.deriveSeed(index));
  }
}
