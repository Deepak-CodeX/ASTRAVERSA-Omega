/**
 * ASTRAVERSA Ω — SimulationClock Tests
 */

import { describe, it, expect } from 'vitest';
import { SimulationClock } from '../src/engine/SimulationClock';

describe('SimulationClock', () => {
  it('starts at time zero and paused', () => {
    const clock = new SimulationClock();
    expect(clock.simulationTime).toBe(0);
    expect(clock.isPaused).toBe(true);
    expect(clock.multiplier).toBe(0);
  });

  describe('pause behavior', () => {
    it('does not advance time when paused', () => {
      const clock = new SimulationClock();
      const substeps = clock.tick(1000); // 1 second of wall time

      expect(substeps).toEqual([]);
      expect(clock.simulationTime).toBe(0);
    });

    it('pauses when multiplier is set to 0', () => {
      const clock = new SimulationClock();
      clock.resume(10);
      expect(clock.isPaused).toBe(false);

      clock.setMultiplier(0);
      expect(clock.isPaused).toBe(true);
    });
  });

  describe('time progression', () => {
    it('advances at 1× speed', () => {
      const clock = new SimulationClock();
      clock.resume(1);

      clock.tick(1000); // 1 second wall time
      expect(clock.simulationTime).toBeCloseTo(1, 5);
    });

    it('advances at 10× speed', () => {
      const clock = new SimulationClock();
      clock.resume(10);

      clock.tick(1000); // 1 second wall time
      expect(clock.simulationTime).toBeCloseTo(10, 5);
    });

    it('advances at 100× speed', () => {
      const clock = new SimulationClock();
      clock.resume(100);

      clock.tick(1000);
      expect(clock.simulationTime).toBeCloseTo(100, 5);
    });

    it('advances at 1000× speed', () => {
      const clock = new SimulationClock();
      clock.resume(1000);

      clock.tick(1000);
      expect(clock.simulationTime).toBeCloseTo(1000, 5);
    });

    it('advances at 1,000,000× speed', () => {
      const clock = new SimulationClock();
      clock.resume(1_000_000);

      clock.tick(1000);
      // Should advance 1,000,000 simulation seconds
      // But capped by MAX_SUBSTEPS * MAX_PHYSICS_DT = 100 * 3600 = 360,000
      // So actual advance may be less due to substep capping
      expect(clock.simulationTime).toBeGreaterThan(0);
      expect(clock.simulationTime).toBeLessThanOrEqual(1_000_000);
    });

    it('accumulates time over multiple ticks', () => {
      const clock = new SimulationClock();
      clock.resume(1);

      clock.tick(500);
      clock.tick(500);
      expect(clock.simulationTime).toBeCloseTo(1, 5);
    });
  });

  describe('multiplier changes', () => {
    it('changes speed mid-simulation', () => {
      const clock = new SimulationClock();
      clock.resume(1);

      clock.tick(1000); // 1 second at 1×
      expect(clock.simulationTime).toBeCloseTo(1, 5);

      clock.setMultiplier(10);
      clock.tick(1000); // 1 second at 10×
      expect(clock.simulationTime).toBeCloseTo(11, 5);
    });
  });

  describe('substep generation', () => {
    it('returns substeps for physics integration', () => {
      const clock = new SimulationClock();
      clock.resume(1);

      const substeps = clock.tick(16); // ~60fps frame
      expect(substeps.length).toBeGreaterThan(0);

      const total = substeps.reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(0.016, 5);
    });

    it('subdivides large time steps', () => {
      const clock = new SimulationClock();
      clock.resume(1_000_000);

      const substeps = clock.tick(16); // ~16ms wall time at 1M×
      // 16ms * 1M = 16,000 sim seconds, should be subdivided
      expect(substeps.length).toBeGreaterThan(1);

      // Each substep should be <= MAX_PHYSICS_DT (3600s)
      for (const dt of substeps) {
        expect(dt).toBeLessThanOrEqual(3600);
      }
    });
  });

  describe('reset', () => {
    it('resets time and pauses', () => {
      const clock = new SimulationClock();
      clock.resume(10);
      clock.tick(5000);

      clock.reset();
      expect(clock.simulationTime).toBe(0);
      expect(clock.isPaused).toBe(true);
    });
  });
});
