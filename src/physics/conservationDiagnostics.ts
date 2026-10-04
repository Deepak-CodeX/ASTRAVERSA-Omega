/**
 * ASTRAVERSA Ω — Conservation Diagnostics
 *
 * Provides diagnostic computation for:
 * - Total kinetic energy
 * - Gravitational potential energy (pairwise)
 * - Total mechanical energy
 * - Total angular momentum
 * - Relative drift / error measurements
 *
 * These are DIAGNOSTICS ONLY. They do NOT modify simulation state.
 * If conservation error grows, it indicates numerical drift — it
 * should be reported, not silently corrected.
 *
 * See TATTVA.md for energy conservation expectations under Velocity Verlet.
 */

import { Vector3 } from './Vector3';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Represents the essential physical state of a body for diagnostics.
 */
export interface DiagnosticBody {
  position: Vector3;
  velocity: Vector3;
  mass: number;
}

/**
 * Complete energy diagnostic snapshot.
 */
export interface EnergyDiagnostics {
  /** Total kinetic energy (J) */
  kineticEnergy: number;

  /** Total gravitational potential energy (J, negative by convention) */
  potentialEnergy: number;

  /** Total mechanical energy = KE + PE (J) */
  totalEnergy: number;

  /** Virial ratio = -2KE / PE (1.0 for virialized system) */
  virialRatio: number;
}

/**
 * Angular momentum diagnostic snapshot.
 */
export interface AngularMomentumDiagnostics {
  /** Total angular momentum vector (kg·m²/s) */
  totalAngularMomentum: Vector3;

  /** Magnitude of total angular momentum (kg·m²/s) */
  magnitude: number;
}

/**
 * Conservation tracking state — compares current diagnostics to a reference.
 */
export interface ConservationReport {
  /** Energy diagnostics at this moment */
  energy: EnergyDiagnostics;

  /** Angular momentum diagnostics at this moment */
  angularMomentum: AngularMomentumDiagnostics;

  /** Relative energy drift from reference: |E - E₀| / |E₀| */
  relativeEnergyDrift: number;

  /** Relative angular momentum drift from reference: |L - L₀| / |L₀| */
  relativeAngularMomentumDrift: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Energy Computation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute total kinetic energy of the system.
 *
 * KE = Σ (1/2) m_i v_i²
 *
 * @param bodies - Array of bodies with mass and velocity
 * @returns Total kinetic energy in Joules
 */
export function computeKineticEnergy(bodies: DiagnosticBody[]): number {
  let ke = 0;
  for (const body of bodies) {
    ke += 0.5 * body.mass * body.velocity.magnitudeSquared();
  }
  return ke;
}

/**
 * Compute total gravitational potential energy of the system.
 *
 * PE = -Σ_{i<j} G m_i m_j / r_{ij}
 *
 * @param bodies - Array of bodies with mass and position
 * @param G - Gravitational constant
 * @returns Total potential energy in Joules (negative)
 */
export function computePotentialEnergy(bodies: DiagnosticBody[], G: number): number {
  let pe = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dist = bodies[i].position.distanceTo(bodies[j].position);
      if (dist > 0) {
        pe -= G * bodies[i].mass * bodies[j].mass / dist;
      }
    }
  }
  return pe;
}

/**
 * Compute complete energy diagnostics.
 *
 * @param bodies - Array of diagnostic bodies
 * @param G - Gravitational constant
 * @returns EnergyDiagnostics
 */
export function computeEnergyDiagnostics(
  bodies: DiagnosticBody[],
  G: number
): EnergyDiagnostics {
  const ke = computeKineticEnergy(bodies);
  const pe = computePotentialEnergy(bodies, G);
  const totalEnergy = ke + pe;

  // Virial ratio: for a bound, virialized system, -2KE/PE ≈ 1
  const virialRatio = pe !== 0 ? -2 * ke / pe : 0;

  return {
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy,
    virialRatio,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Angular Momentum Computation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute total angular momentum of the system.
 *
 * L = Σ m_i (r_i × v_i)
 *
 * @param bodies - Array of bodies with mass, position, and velocity
 * @returns AngularMomentumDiagnostics
 */
export function computeAngularMomentum(
  bodies: DiagnosticBody[]
): AngularMomentumDiagnostics {
  let totalL = Vector3.zero();

  for (const body of bodies) {
    // L_i = m * (r × v)
    const Li = body.position.cross(body.velocity).scale(body.mass);
    totalL = totalL.add(Li);
  }

  return {
    totalAngularMomentum: totalL,
    magnitude: totalL.magnitude(),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Conservation Monitoring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute a conservation report comparing current state to a reference.
 *
 * @param bodies - Current body states
 * @param G - Gravitational constant
 * @param referenceEnergy - Reference total energy (e.g., from t=0)
 * @param referenceAngularMomentum - Reference angular momentum magnitude
 * @returns ConservationReport with drift measurements
 */
export function computeConservationReport(
  bodies: DiagnosticBody[],
  G: number,
  referenceEnergy: number,
  referenceAngularMomentum: number
): ConservationReport {
  const energy = computeEnergyDiagnostics(bodies, G);
  const angularMomentum = computeAngularMomentum(bodies);

  // Compute relative drifts
  const relativeEnergyDrift = Math.abs(referenceEnergy) > 0
    ? Math.abs(energy.totalEnergy - referenceEnergy) / Math.abs(referenceEnergy)
    : 0;

  const relativeAngularMomentumDrift = Math.abs(referenceAngularMomentum) > 0
    ? Math.abs(angularMomentum.magnitude - referenceAngularMomentum) / Math.abs(referenceAngularMomentum)
    : 0;

  return {
    energy,
    angularMomentum,
    relativeEnergyDrift,
    relativeAngularMomentumDrift,
  };
}
