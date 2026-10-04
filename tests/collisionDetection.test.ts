/**
 * ASTRAVERSA Ω — Collision Detection Tests
 *
 * Tests for:
 * - Sphere-sphere collision check
 * - Collision event details
 * - All-pairs detection
 * - Deterministic ordering
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  checkSphereCollision,
  computeCollision,
  detectAllCollisions,
} from '../src/physics/collisionDetection';
import type { CollisionBody } from '../src/physics/collisionDetection';
import { Vector3 } from '../src/physics/Vector3';

describe('Sphere-Sphere Collision Check', () => {
  it('detects overlapping spheres', () => {
    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(5, 0, 0);
    expect(checkSphereCollision(posA, 3, posB, 3)).toBe(true);
  });

  it('detects touching spheres', () => {
    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(10, 0, 0);
    expect(checkSphereCollision(posA, 5, posB, 5)).toBe(true);
  });

  it('rejects separated spheres', () => {
    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(20, 0, 0);
    expect(checkSphereCollision(posA, 5, posB, 5)).toBe(false);
  });

  it('detects coincident spheres', () => {
    const pos = new Vector3(1, 2, 3);
    expect(checkSphereCollision(pos, 1, pos, 1)).toBe(true);
  });

  it('works in 3D', () => {
    const posA = new Vector3(0, 0, 0);
    const posB = new Vector3(1, 1, 1); // distance = √3 ≈ 1.732
    expect(checkSphereCollision(posA, 1, posB, 1)).toBe(true);

    const posC = new Vector3(3, 3, 3); // distance = √27 ≈ 5.196
    expect(checkSphereCollision(posA, 1, posC, 1)).toBe(false);
  });
});

describe('Collision Event Computation', () => {
  it('returns null for non-colliding bodies', () => {
    const bodyA: CollisionBody = { id: 'a', position: new Vector3(0, 0, 0), radius: 1 };
    const bodyB: CollisionBody = { id: 'b', position: new Vector3(10, 0, 0), radius: 1 };
    expect(computeCollision(bodyA, bodyB)).toBeNull();
  });

  it('computes penetration depth', () => {
    const bodyA: CollisionBody = { id: 'a', position: new Vector3(0, 0, 0), radius: 3 };
    const bodyB: CollisionBody = { id: 'b', position: new Vector3(5, 0, 0), radius: 3 };
    const event = computeCollision(bodyA, bodyB);

    expect(event).not.toBeNull();
    if (!event) return;

    // Sum of radii = 6, distance = 5, penetration = 1
    expect(event.penetrationDepth).toBeCloseTo(1, 5);
    expect(event.centerDistance).toBeCloseTo(5, 5);
  });

  it('computes correct contact normal', () => {
    const bodyA: CollisionBody = { id: 'a', position: new Vector3(0, 0, 0), radius: 3 };
    const bodyB: CollisionBody = { id: 'b', position: new Vector3(5, 0, 0), radius: 3 };
    const event = computeCollision(bodyA, bodyB);

    expect(event).not.toBeNull();
    if (!event) return;

    // Normal should point from A toward B (positive X)
    expect(event.contactNormal.x).toBeCloseTo(1, 5);
    expect(event.contactNormal.y).toBeCloseTo(0, 5);
    expect(event.contactNormal.z).toBeCloseTo(0, 5);
  });

  it('enforces deterministic ID ordering', () => {
    const bodyA: CollisionBody = { id: 'z-body', position: new Vector3(0, 0, 0), radius: 3 };
    const bodyB: CollisionBody = { id: 'a-body', position: new Vector3(5, 0, 0), radius: 3 };
    const event = computeCollision(bodyA, bodyB);

    expect(event).not.toBeNull();
    if (!event) return;

    // Smaller ID first
    expect(event.bodyIdA).toBe('a-body');
    expect(event.bodyIdB).toBe('z-body');
  });

  it('handles coincident centers', () => {
    const bodyA: CollisionBody = { id: 'a', position: new Vector3(1, 1, 1), radius: 5 };
    const bodyB: CollisionBody = { id: 'b', position: new Vector3(1, 1, 1), radius: 5 };
    const event = computeCollision(bodyA, bodyB);

    expect(event).not.toBeNull();
    if (!event) return;

    expect(event.penetrationDepth).toBeCloseTo(10, 5);
    // Arbitrary but deterministic normal
    expect(isFinite(event.contactNormal.x)).toBe(true);
  });
});

describe('All-Pairs Detection', () => {
  it('detects all collisions in a group', () => {
    const bodies: CollisionBody[] = [
      { id: 'a', position: new Vector3(0, 0, 0), radius: 5 },
      { id: 'b', position: new Vector3(8, 0, 0), radius: 5 },
      { id: 'c', position: new Vector3(100, 0, 0), radius: 5 },
    ];

    const events = detectAllCollisions(bodies);

    // Only a-b should collide (distance 8, sum radii 10)
    expect(events.length).toBe(1);
    expect(events[0].bodyIdA).toBe('a');
    expect(events[0].bodyIdB).toBe('b');
  });

  it('produces deterministic results', () => {
    const bodies: CollisionBody[] = [
      { id: 'x', position: new Vector3(0, 0, 0), radius: 10 },
      { id: 'y', position: new Vector3(5, 0, 0), radius: 10 },
      { id: 'z', position: new Vector3(3, 3, 0), radius: 10 },
    ];

    const events1 = detectAllCollisions(bodies);
    const events2 = detectAllCollisions(bodies);

    expect(events1.length).toBe(events2.length);
    for (let i = 0; i < events1.length; i++) {
      expect(events1[i].bodyIdA).toBe(events2[i].bodyIdA);
      expect(events1[i].bodyIdB).toBe(events2[i].bodyIdB);
      expect(events1[i].penetrationDepth).toBeCloseTo(events2[i].penetrationDepth, 10);
    }
  });

  it('returns empty array for no collisions', () => {
    const bodies: CollisionBody[] = [
      { id: 'a', position: new Vector3(0, 0, 0), radius: 1 },
      { id: 'b', position: new Vector3(100, 0, 0), radius: 1 },
    ];

    const events = detectAllCollisions(bodies);
    expect(events.length).toBe(0);
  });

  it('handles single body', () => {
    const events = detectAllCollisions([
      { id: 'a', position: new Vector3(0, 0, 0), radius: 1 },
    ]);
    expect(events.length).toBe(0);
  });

  it('handles empty array', () => {
    const events = detectAllCollisions([]);
    expect(events.length).toBe(0);
  });
});
