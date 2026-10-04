/**
 * ASTRAVERSA Ω — Orbital Resonance Analysis
 *
 * Lightweight mathematical resonance detection between orbital periods.
 *
 * A mean-motion resonance (MMR) exists when the ratio of two orbital periods
 * is close to a simple integer ratio p:q. For example, Jupiter's moons
 * Io, Europa, and Ganymede are in a 1:2:4 resonance (Laplace resonance).
 *
 * This module:
 * - Detects approximate integer-ratio resonances between pairs
 * - Reports closest resonance for each pair
 * - Does NOT model resonance dynamics, libration, or stability
 * - Is purely kinematic (period ratios only)
 *
 * Assumptions (documented in TATTVA.md):
 * - Resonance is detected by period ratio proximity to p:q
 * - We check ratios up to 8:1 (beyond that, resonances are weak)
 * - Tolerance is configurable (default: 2% relative deviation)
 * - This is a detection tool, not a dynamical analysis
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * A detected resonance between two bodies.
 */
export interface ResonanceResult {
  /** ID of the inner body (shorter period) */
  innerBodyId: string;

  /** ID of the outer body (longer period) */
  outerBodyId: string;

  /** Resonance ratio as [inner, outer] — e.g., [2, 1] means inner orbits twice per outer orbit */
  ratio: [number, number];

  /** Human-readable label, e.g., "2:1" */
  label: string;

  /** Actual period ratio (T_outer / T_inner) */
  actualRatio: number;

  /** Expected exact ratio (p/q where ratio = [p, q]) */
  expectedRatio: number;

  /** Relative deviation from exact resonance */
  deviation: number;

  /** Strength indicator: 0 (perfect) to 1 (at tolerance boundary) */
  strength: number;
}

/**
 * Input body for resonance analysis — only needs an ID and period.
 */
export interface ResonanceBody {
  id: string;
  orbitalPeriod: number; // seconds
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Resonance Ratios to Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Common mean-motion resonance ratios to check, as [p, q].
 * p:q means the inner body completes p orbits for every q of the outer.
 *
 * Listed in rough order of astrophysical significance.
 */
const RESONANCE_RATIOS: [number, number][] = [
  [1, 1],  // Co-orbital
  [2, 1],  // 2:1 (very common, e.g., asteroid belt)
  [3, 2],  // 3:2 (e.g., Neptune-Pluto)
  [3, 1],  // 3:1
  [4, 3],  // 4:3
  [5, 3],  // 5:3
  [5, 2],  // 5:2
  [4, 1],  // 4:1
  [5, 4],  // 5:4
  [7, 4],  // 7:4
  [5, 1],  // 5:1
  [2, 3],  // Inverted ratios (inner body slower — rare but check for completeness)
  [1, 2],  // 1:2 (Laplace resonance element)
  [1, 4],  // 1:4 (Laplace resonance element)
  [6, 1],  // 6:1
  [7, 2],  // 7:2
  [7, 3],  // 7:3
  [8, 3],  // 8:3
  [8, 5],  // 8:5
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Detection Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Default tolerance for resonance detection (2%) */
const DEFAULT_TOLERANCE = 0.02;

/**
 * Find the closest resonance between two orbital periods.
 *
 * @param periodInner - Orbital period of the inner body (seconds)
 * @param periodOuter - Orbital period of the outer body (seconds)
 * @param innerBodyId - ID of the inner body
 * @param outerBodyId - ID of the outer body
 * @param tolerance - Maximum relative deviation to count as resonance (default 2%)
 * @returns The closest ResonanceResult if within tolerance, null otherwise
 */
export function findClosestResonance(
  periodInner: number,
  periodOuter: number,
  innerBodyId: string,
  outerBodyId: string,
  tolerance: number = DEFAULT_TOLERANCE
): ResonanceResult | null {
  if (periodInner <= 0 || periodOuter <= 0) return null;

  // Ensure inner has shorter period
  let pInner = periodInner;
  let pOuter = periodOuter;
  let idInner = innerBodyId;
  let idOuter = outerBodyId;

  if (pInner > pOuter) {
    // Swap so inner is always the shorter-period body
    [pInner, pOuter] = [pOuter, pInner];
    [idInner, idOuter] = [idOuter, idInner];
  }

  const actualRatio = pOuter / pInner;

  let bestResult: ResonanceResult | null = null;
  let bestDeviation = Infinity;

  for (const [p, q] of RESONANCE_RATIOS) {
    const expectedRatio = p / q;
    const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;

    if (deviation < tolerance && deviation < bestDeviation) {
      bestDeviation = deviation;
      bestResult = {
        innerBodyId: idInner,
        outerBodyId: idOuter,
        ratio: [p, q],
        label: `${p}:${q}`,
        actualRatio,
        expectedRatio,
        deviation,
        strength: 1 - deviation / tolerance,
      };
    }
  }

  return bestResult;
}

/**
 * Analyze resonances among all pairs in a set of bodies.
 *
 * @param bodies - Array of bodies with IDs and orbital periods
 * @param tolerance - Maximum relative deviation (default 2%)
 * @returns Array of detected resonances, sorted by strength (strongest first)
 */
export function analyzeResonances(
  bodies: ResonanceBody[],
  tolerance: number = DEFAULT_TOLERANCE
): ResonanceResult[] {
  const results: ResonanceResult[] = [];

  // Filter out bodies without meaningful periods (e.g., stars)
  const orbiting = bodies.filter(b => b.orbitalPeriod > 0 && isFinite(b.orbitalPeriod));

  for (let i = 0; i < orbiting.length; i++) {
    for (let j = i + 1; j < orbiting.length; j++) {
      const result = findClosestResonance(
        orbiting[i].orbitalPeriod,
        orbiting[j].orbitalPeriod,
        orbiting[i].id,
        orbiting[j].id,
        tolerance
      );
      if (result) {
        results.push(result);
      }
    }
  }

  // Sort by strength (strongest first)
  results.sort((a, b) => b.strength - a.strength);

  return results;
}

/**
 * Format a resonance result for display.
 *
 * @param result - ResonanceResult to format
 * @returns Human-readable summary string
 */
export function formatResonance(result: ResonanceResult): string {
  const deviation = (result.deviation * 100).toFixed(2);
  return `${result.innerBodyId} : ${result.outerBodyId} ≈ ${result.label} resonance (${deviation}% deviation)`;
}
