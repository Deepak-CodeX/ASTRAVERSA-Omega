/**
 * ASTRAVERSA Ω — Gravitational Physics
 *
 * Simplified Newtonian gravitational model.
 *
 * Assumptions (documented in TATTVA.md):
 * - Point-mass approximation
 * - No relativistic corrections
 * - No tidal forces
 * - Softening parameter to prevent singularity at zero distance
 *
 * The gravitational constant G is used in SI units (m³ kg⁻¹ s⁻²).
 * However, the simulation uses scaled units for practical computation.
 * See astronomy/constants.ts for unit system details.
 */

import { Vector3 } from './Vector3';

/** Gravitational constant in SI units: m³ kg⁻¹ s⁻² */
export const G_SI = 6.6743e-11;

/**
 * Softening length squared (in simulation distance units²).
 * Prevents force singularity when bodies are very close.
 * This is a common technique in N-body simulations.
 */
const SOFTENING_SQUARED = 1e-10;

/**
 * Compute the gravitational force vector exerted on body1 by body2.
 *
 * F = G * m1 * m2 / (r² + ε²) * r̂
 *
 * where r̂ points from body1 toward body2, and ε² is the softening parameter.
 *
 * @param pos1 - Position of body 1
 * @param mass1 - Mass of body 1 (kg in simulation units)
 * @param pos2 - Position of body 2
 * @param mass2 - Mass of body 2 (kg in simulation units)
 * @param G - Gravitational constant (in simulation units)
 * @returns Force vector on body 1 due to body 2
 */
export function computeGravitationalForce(
  pos1: Vector3,
  mass1: number,
  pos2: Vector3,
  mass2: number,
  G: number = G_SI
): Vector3 {
  const displacement = pos2.subtract(pos1);
  const distSquared = displacement.magnitudeSquared();

  // Apply softening to prevent singularity
  const softenedDistSquared = distSquared + SOFTENING_SQUARED;
  const dist = Math.sqrt(softenedDistSquared);

  // F = G * m1 * m2 / r²  in the direction of displacement
  const forceMagnitude = (G * mass1 * mass2) / softenedDistSquared;
  const forceDirection = displacement.scale(1 / dist);

  return forceDirection.scale(forceMagnitude);
}

/**
 * Compute the net gravitational force on a body from all other bodies.
 *
 * @param targetIndex - Index of the target body in the arrays
 * @param positions - Positions of all bodies
 * @param masses - Masses of all bodies
 * @param G - Gravitational constant
 * @returns Net force vector on the target body
 */
export function computeNetGravitationalForce(
  targetIndex: number,
  positions: Vector3[],
  masses: number[],
  G: number = G_SI
): Vector3 {
  let netForce = Vector3.zero();

  for (let i = 0; i < positions.length; i++) {
    if (i === targetIndex) continue;

    const force = computeGravitationalForce(
      positions[targetIndex],
      masses[targetIndex],
      positions[i],
      masses[i],
      G
    );
    netForce = netForce.add(force);
  }

  return netForce;
}
