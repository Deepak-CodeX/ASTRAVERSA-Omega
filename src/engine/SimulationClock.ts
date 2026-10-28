/**
 * ASTRAVERSA Ω — Simulation Clock
 *
 * Centralized time management for the simulation.
 *
 * Design principles:
 * - Simulation time is independent of rendering frame rate
 * - Time can be paused and speed-adjusted without affecting simulation integrity
 * - All time values are in seconds (SI) internally
 * - The clock uses a fixed timestep for physics to ensure deterministic behavior
 *
 * Time multipliers:
 *   1× = real-time (1 sim second = 1 real second)
 *   10× = 10 sim seconds per real second
 *   100× = ~1.7 sim minutes per real second
 *   1,000× = ~17 sim minutes per real second
 *   1,000,000× = ~11.6 sim days per real second
 *
 * The clock subdivides large time steps into smaller fixed-size substeps
 * to maintain numerical stability in the physics integration.
 */

/**
 * Available time multiplier values.
 */
export const TIME_MULTIPLIERS = [0, 1, 10, 100, 1000, 10_000, 100_000, 1_000_000] as const;
export type TimeMultiplier = typeof TIME_MULTIPLIERS[number];

/**
 * Labels for time multipliers (for UI display).
 */
export const TIME_MULTIPLIER_LABELS: Record<TimeMultiplier, string> = {
  0: 'Paused',
  1: '1×',
  10: '10×',
  100: '100×',
  1000: '1,000×',
  10_000: '10,000×',
  100_000: '100,000×',
  1_000_000: '1,000,000×',
};

/**
 * Maximum physics timestep (seconds).
 * Larger simulation deltas are subdivided into steps of this size.
 * This prevents physics instability at high time multipliers.
 */
const MAX_PHYSICS_DT = 3600; // 1 hour max per substep

/**
 * Maximum number of substeps per frame.
 * Prevents the simulation from freezing when the time multiplier
 * produces too many substeps for a single frame.
 */
const MAX_SUBSTEPS = 100;

export class SimulationClock {
  /** Current simulation time in seconds since epoch */
  private _simulationTime: number = 0;

  /** Current time multiplier (0 = paused) */
  private _multiplier: TimeMultiplier = 0;

  /** Whether the simulation is paused */
  get isPaused(): boolean {
    return this._multiplier === 0;
  }

  /** Current simulation time in seconds */
  get simulationTime(): number {
    return this._simulationTime;
  }

  /** Current time multiplier */
  get multiplier(): TimeMultiplier {
    return this._multiplier;
  }

  /**
   * Set the time multiplier.
   * @param multiplier - Must be one of the valid TIME_MULTIPLIERS values
   */
  setMultiplier(multiplier: TimeMultiplier): void {
    this._multiplier = multiplier;
  }

  /**
   * Pause the simulation.
   */
  pause(): void {
    this._multiplier = 0;
  }

  /**
   * Resume the simulation at the given multiplier (default 1×).
   */
  resume(multiplier: TimeMultiplier = 1): void {
    if (multiplier === 0) {
      multiplier = 1;
    }
    this._multiplier = multiplier;
  }

  /**
   * Advance the simulation clock by a wall-clock delta.
   *
   * Returns an array of substep durations (in simulation seconds) that
   * physics should be integrated over. This ensures numerical stability
   * by capping individual timesteps.
   *
   * @param wallDeltaMs - Wall-clock time elapsed since last tick (milliseconds)
   * @returns Array of simulation timestep durations (seconds) for physics integration
   */
  tick(wallDeltaMs: number): number[] {
    if (this._multiplier === 0) {
      return [];
    }

    // Convert wall-clock delta to simulation delta
    const wallDeltaS = wallDeltaMs / 1000;
    const simDelta = wallDeltaS * this._multiplier;

    // Subdivide into fixed timesteps for numerical stability
    const substeps: number[] = [];
    let remaining = simDelta;
    let stepCount = 0;

    while (remaining > 0 && stepCount < MAX_SUBSTEPS) {
      const dt = Math.min(remaining, MAX_PHYSICS_DT);
      substeps.push(dt);
      remaining -= dt;
      stepCount++;
    }

    // Advance simulation time
    const totalAdvanced = substeps.reduce((sum, dt) => sum + dt, 0);
    this._simulationTime += totalAdvanced;

    return substeps;
  }

  /**
   * Reset the simulation clock to zero.
   */
  reset(): void {
    this._simulationTime = 0;
    this._multiplier = 0;
  }
}
