/**
 * ASTRAVERSA Ω — Integrator Tests
 */

import { describe, it, expect } from 'vitest';
import { velocityVerletStep, eulerStep } from '../src/physics/integrator';
import { Vector3 } from '../src/physics/Vector3';

describe('Velocity Verlet Integrator', () => {
  it('updates position under constant acceleration', () => {
    const state = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(10, 0, 0), // 10 m/s in x
      acceleration: new Vector3(0, -9.8, 0), // gravity-like
    };

    const dt = 1.0; // 1 second
    const newAccel = new Vector3(0, -9.8, 0); // constant

    const result = velocityVerletStep(state, newAccel, dt);

    // x should advance: x0 + vx*dt + 0.5*ax*dt^2 = 0 + 10*1 + 0 = 10
    expect(result.position.x).toBeCloseTo(10, 5);

    // y should follow: y0 + vy*dt + 0.5*ay*dt^2 = 0 + 0 - 4.9 = -4.9
    expect(result.position.y).toBeCloseTo(-4.9, 5);

    // vy should update: vy0 + 0.5*(a_old + a_new)*dt = 0 + 0.5*(-9.8 + -9.8)*1 = -9.8
    expect(result.velocity.y).toBeCloseTo(-9.8, 5);
  });

  it('maintains constant velocity with zero acceleration', () => {
    const state = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(5, 3, -2),
      acceleration: Vector3.zero(),
    };

    const dt = 2.0;
    const result = velocityVerletStep(state, Vector3.zero(), dt);

    expect(result.position.x).toBeCloseTo(10, 5);
    expect(result.position.y).toBeCloseTo(6, 5);
    expect(result.position.z).toBeCloseTo(-4, 5);

    expect(result.velocity.x).toBeCloseTo(5, 5);
    expect(result.velocity.y).toBeCloseTo(3, 5);
    expect(result.velocity.z).toBeCloseTo(-2, 5);
  });

  it('object at rest with no force remains at rest', () => {
    const state = {
      position: new Vector3(100, 200, 300),
      velocity: Vector3.zero(),
      acceleration: Vector3.zero(),
    };

    const result = velocityVerletStep(state, Vector3.zero(), 10);

    expect(result.position.x).toBeCloseTo(100, 5);
    expect(result.position.y).toBeCloseTo(200, 5);
    expect(result.position.z).toBeCloseTo(300, 5);
  });
});

describe('Euler Integrator', () => {
  it('updates position under constant acceleration', () => {
    const state = {
      position: new Vector3(0, 0, 0),
      velocity: new Vector3(10, 0, 0),
      acceleration: new Vector3(0, -9.8, 0),
    };

    const dt = 1.0;
    const result = eulerStep(state, new Vector3(0, -9.8, 0), dt);

    // Euler: v_new = v + a*dt, x_new = x + v_new*dt
    expect(result.velocity.y).toBeCloseTo(-9.8, 5);
    expect(result.position.x).toBeCloseTo(10, 5);
    // Note: Euler is first-order, so position update uses new velocity
    expect(result.position.y).toBeCloseTo(-9.8, 5);
  });
});
