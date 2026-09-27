/**
 * ASTRAVERSA Ω — Gravity Tests
 */

import { describe, it, expect } from 'vitest';
import { computeGravitationalForce, computeNetGravitationalForce, G_SI } from '../src/physics/gravity';
import { Vector3 } from '../src/physics/Vector3';

describe('Gravitational Force', () => {
  it('computes force between two bodies', () => {
    // Earth-Sun system (simplified)
    const sunPos = new Vector3(0, 0, 0);
    const earthPos = new Vector3(1.496e11, 0, 0); // 1 AU
    const sunMass = 1.989e30;
    const earthMass = 5.972e24;

    const force = computeGravitationalForce(
      earthPos, earthMass, sunPos, sunMass, G_SI
    );

    // Force should point toward the sun (negative x)
    expect(force.x).toBeLessThan(0);
    expect(Math.abs(force.y)).toBeLessThan(1); // negligible
    expect(Math.abs(force.z)).toBeLessThan(1); // negligible

    // Expected force ≈ 3.54e22 N
    const forceMag = force.magnitude();
    expect(forceMag).toBeGreaterThan(3e22);
    expect(forceMag).toBeLessThan(4e22);
  });

  it('force is symmetric (Newton\'s third law)', () => {
    const pos1 = new Vector3(0, 0, 0);
    const pos2 = new Vector3(1e10, 0, 0);
    const mass1 = 1e30;
    const mass2 = 1e24;

    const forceOn1 = computeGravitationalForce(pos1, mass1, pos2, mass2, G_SI);
    const forceOn2 = computeGravitationalForce(pos2, mass2, pos1, mass1, G_SI);

    // Forces should be equal in magnitude but opposite in direction
    expect(forceOn1.magnitude()).toBeCloseTo(forceOn2.magnitude(), 5);
    expect(forceOn1.x).toBeCloseTo(-forceOn2.x, 5);
  });

  it('force increases with mass', () => {
    const pos1 = new Vector3(0, 0, 0);
    const pos2 = new Vector3(1e10, 0, 0);

    const forceLow = computeGravitationalForce(pos1, 1e24, pos2, 1e24, G_SI);
    const forceHigh = computeGravitationalForce(pos1, 1e24, pos2, 2e24, G_SI);

    expect(forceHigh.magnitude()).toBeGreaterThan(forceLow.magnitude());
    // Should be approximately 2x
    expect(forceHigh.magnitude() / forceLow.magnitude()).toBeCloseTo(2, 1);
  });

  it('force decreases with distance (inverse square)', () => {
    const pos1 = new Vector3(0, 0, 0);
    const mass = 1e30;

    const forceNear = computeGravitationalForce(
      pos1, mass, new Vector3(1e10, 0, 0), mass, G_SI
    );
    const forceFar = computeGravitationalForce(
      pos1, mass, new Vector3(2e10, 0, 0), mass, G_SI
    );

    // At 2x distance, force should be ~1/4
    const ratio = forceNear.magnitude() / forceFar.magnitude();
    expect(ratio).toBeCloseTo(4, 0);
  });

  it('handles softening at very close distances', () => {
    const pos1 = new Vector3(0, 0, 0);
    const pos2 = new Vector3(1e-10, 0, 0); // extremely close
    const mass = 1e30;

    // Should not throw or produce Infinity
    const force = computeGravitationalForce(pos1, mass, pos2, mass, G_SI);
    expect(isFinite(force.x)).toBe(true);
    expect(isFinite(force.y)).toBe(true);
    expect(isFinite(force.z)).toBe(true);
  });
});

describe('Net Gravitational Force', () => {
  it('computes net force from multiple bodies', () => {
    const positions = [
      new Vector3(0, 0, 0),         // Target body
      new Vector3(1e10, 0, 0),      // Right
      new Vector3(-1e10, 0, 0),     // Left (same mass, same distance)
    ];
    const masses = [1e24, 1e30, 1e30]; // Equal massive bodies on both sides

    const netForce = computeNetGravitationalForce(0, positions, masses, G_SI);

    // Forces from left and right should cancel (approximately zero net force)
    expect(Math.abs(netForce.x)).toBeLessThan(1e10);
  });
});
