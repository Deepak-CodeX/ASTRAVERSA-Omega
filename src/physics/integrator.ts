/**
 * ASTRAVERSA Ω — Numerical Integrators
 *
 * Provides numerical integration methods for updating positions and velocities
 * of celestial bodies under gravitational forces.
 *
 * Current implementation: Velocity Verlet (Störmer-Verlet)
 *
 * Why Velocity Verlet:
 * - Symplectic: preserves phase-space volume, better long-term energy conservation
 * - Second-order accurate: good balance of accuracy vs. computational cost
 * - Simple to implement and understand
 * - Well-suited for orbital mechanics
 *
 * Future: This module can be extended with RK4, leapfrog, or adaptive methods.
 *
 * See TATTVA.md for integration assumptions and limitations.
 */

import { Vector3 } from './Vector3';

/**
 * Represents the state of a body for integration purposes.
 */
export interface IntegratorState {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
}

/**
 * Velocity Verlet integration step.
 *
 * Given current state and new acceleration, computes the next position and velocity.
 *
 * Algorithm:
 *   x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
 *   v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
 *
 * This function performs the full step, requiring the new acceleration to be
 * computed between the position update and velocity update in the caller's loop.
 *
 * For simplicity in this initial implementation, we use a single-step approach
 * where the new acceleration is approximated from the updated position.
 *
 * @param state - Current state (position, velocity, acceleration)
 * @param newAcceleration - Acceleration at the new position
 * @param dt - Time step in seconds
 * @returns New state after integration
 */
export function velocityVerletStep(
  state: IntegratorState,
  newAcceleration: Vector3,
  dt: number
): IntegratorState {
  // x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
  const newPosition = state.position
    .add(state.velocity.scale(dt))
    .add(state.acceleration.scale(0.5 * dt * dt));

  // v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
  const newVelocity = state.velocity.add(
    state.acceleration.add(newAcceleration).scale(0.5 * dt)
  );

  return {
    position: newPosition,
    velocity: newVelocity,
    acceleration: newAcceleration,
  };
}

/**
 * Simple Euler integration step (first-order).
 *
 * Less accurate than Verlet but useful as a reference implementation
 * and for non-critical updates.
 *
 * @param state - Current state
 * @param newAcceleration - Current acceleration
 * @param dt - Time step in seconds
 * @returns New state after integration
 */
export function eulerStep(
  state: IntegratorState,
  newAcceleration: Vector3,
  dt: number
): IntegratorState {
  const newVelocity = state.velocity.add(newAcceleration.scale(dt));
  const newPosition = state.position.add(newVelocity.scale(dt));

  return {
    position: newPosition,
    velocity: newVelocity,
    acceleration: newAcceleration,
  };
}
