/**
 * ASTRAVERSA Ω — Conservation Diagnostics Tests
 *
 * Tests for:
 * - Kinetic energy computation
 * - Gravitational potential energy computation
 * - Total energy diagnostics
 * - Angular momentum computation
 * - Conservation monitoring with drift
 */

import { describe, it, expect } from 'vitest';
import {
  computeKineticEnergy,
  computePotentialEnergy,
  computeEnergyDiagnostics,
  computeAngularMomentum,
  computeConservationReport,
} from '../src/physics/conservationDiagnostics';
import type { DiagnosticBody } from '../src/physics/conservationDiagnostics';
import { Vector3 } from '../src/physics/Vector3';
import { G, SOLAR_MASS, AU } from '../src/astronomy/constants';

describe('Kinetic Energy', () => {
  it('computes KE for a single body', () => {
    const bodies: DiagnosticBody[] = [
      { mass: 1000, velocity: new Vector3(10, 0, 0), position: Vector3.zero() },
    ];
    const ke = computeKineticEnergy(bodies);
    // KE = 0.5 * 1000 * 100 = 50000
    expect(ke).toBeCloseTo(50000, 5);
  });

  it('computes KE for multiple bodies', () => {
    const bodies: DiagnosticBody[] = [
      { mass: 1, velocity: new Vector3(3, 4, 0), position: Vector3.zero() },
      { mass: 2, velocity: new Vector3(0, 0, 5), position: Vector3.zero() },
    ];
    const ke = computeKineticEnergy(bodies);
    // KE = 0.5*1*25 + 0.5*2*25 = 12.5 + 25 = 37.5
    expect(ke).toBeCloseTo(37.5, 5);
  });

  it('returns 0 for stationary bodies', () => {
    const bodies: DiagnosticBody[] = [
      { mass: 1e30, velocity: Vector3.zero(), position: Vector3.zero() },
    ];
    expect(computeKineticEnergy(bodies)).toBe(0);
  });
});

describe('Potential Energy', () => {
  it('computes PE between two bodies', () => {
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(AU, 0, 0) },
    ];
    const pe = computePotentialEnergy(bodies, G);
    // PE = -G * M² / r
    const expected = -G * SOLAR_MASS * SOLAR_MASS / AU;
    expect(pe).toBeCloseTo(expected, -20); // Very large number, check relative
    expect(pe).toBeLessThan(0);
  });

  it('PE is always negative for gravitational interaction', () => {
    const bodies: DiagnosticBody[] = [
      { mass: 1e24, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 1e24, velocity: Vector3.zero(), position: new Vector3(1e10, 0, 0) },
      { mass: 1e24, velocity: Vector3.zero(), position: new Vector3(0, 1e10, 0) },
    ];
    const pe = computePotentialEnergy(bodies, G);
    expect(pe).toBeLessThan(0);
  });

  it('single body has zero PE', () => {
    const bodies: DiagnosticBody[] = [
      { mass: 1e30, velocity: Vector3.zero(), position: Vector3.zero() },
    ];
    expect(computePotentialEnergy(bodies, G)).toBe(0);
  });
});

describe('Energy Diagnostics', () => {
  it('total energy = KE + PE', () => {
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 5.972e24, velocity: new Vector3(0, 0, 29780), position: new Vector3(AU, 0, 0) },
    ];
    const diag = computeEnergyDiagnostics(bodies, G);
    expect(diag.totalEnergy).toBeCloseTo(diag.kineticEnergy + diag.potentialEnergy, 10);
  });

  it('bound orbit has negative total energy', () => {
    // Earth orbiting Sun at circular velocity
    const v_circ = Math.sqrt(G * SOLAR_MASS / AU);
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 5.972e24, velocity: new Vector3(0, 0, v_circ), position: new Vector3(AU, 0, 0) },
    ];
    const diag = computeEnergyDiagnostics(bodies, G);
    expect(diag.totalEnergy).toBeLessThan(0);
  });

  it('computes virial ratio', () => {
    const v_circ = Math.sqrt(G * SOLAR_MASS / AU);
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 5.972e24, velocity: new Vector3(0, 0, v_circ), position: new Vector3(AU, 0, 0) },
    ];
    const diag = computeEnergyDiagnostics(bodies, G);
    // For a virialized Keplerian system, virial ratio ≈ 1
    // But this is a 2-body system with one nearly stationary, so approximate
    expect(diag.virialRatio).toBeGreaterThan(0);
  });
});

describe('Angular Momentum', () => {
  it('computes angular momentum for circular orbit', () => {
    const v_circ = Math.sqrt(G * SOLAR_MASS / AU);
    const earthMass = 5.972e24;
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: earthMass, velocity: new Vector3(0, 0, v_circ), position: new Vector3(AU, 0, 0) },
    ];
    const am = computeAngularMomentum(bodies);

    // L = m * r * v for circular orbit, pointing in Y direction
    expect(am.magnitude).toBeGreaterThan(0);
    // Angular momentum should point primarily in Y direction (orbit in XZ plane)
    expect(Math.abs(am.totalAngularMomentum.y)).toBeGreaterThan(
      Math.abs(am.totalAngularMomentum.x)
    );
  });

  it('zero angular momentum for radial motion', () => {
    // Body moving directly toward center
    const bodies: DiagnosticBody[] = [
      { mass: 1e30, velocity: Vector3.zero(), position: Vector3.zero() },
      { mass: 1e24, velocity: new Vector3(-1000, 0, 0), position: new Vector3(1e10, 0, 0) },
    ];
    const am = computeAngularMomentum(bodies);
    // r × v for radial motion should be zero for the second body
    // But the first body also contributes L = 0 (at origin, zero velocity)
    // Second body: L = m * (r × v) = 1e24 * (1e10, 0, 0) × (-1000, 0, 0) = 0
    expect(am.totalAngularMomentum.magnitude()).toBeCloseTo(0, 5);
  });
});

describe('Conservation Report', () => {
  it('reports zero drift when state unchanged', () => {
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 5.972e24, velocity: new Vector3(0, 0, 29780), position: new Vector3(AU, 0, 0) },
    ];

    const initial = computeEnergyDiagnostics(bodies, G);
    const initialL = computeAngularMomentum(bodies);

    const report = computeConservationReport(
      bodies, G, initial.totalEnergy, initialL.magnitude
    );

    expect(report.relativeEnergyDrift).toBeCloseTo(0, 10);
    expect(report.relativeAngularMomentumDrift).toBeCloseTo(0, 10);
  });

  it('detects energy drift after perturbation', () => {
    const bodies: DiagnosticBody[] = [
      { mass: SOLAR_MASS, velocity: Vector3.zero(), position: new Vector3(0, 0, 0) },
      { mass: 5.972e24, velocity: new Vector3(0, 0, 29780), position: new Vector3(AU, 0, 0) },
    ];

    const initial = computeEnergyDiagnostics(bodies, G);

    // Perturb velocity (simulating drift)
    const perturbedBodies: DiagnosticBody[] = [
      { ...bodies[0] },
      { ...bodies[1], velocity: new Vector3(0, 0, 30000) },
    ];

    const report = computeConservationReport(
      perturbedBodies, G, initial.totalEnergy, computeAngularMomentum(bodies).magnitude
    );

    expect(report.relativeEnergyDrift).toBeGreaterThan(0);
  });
});
