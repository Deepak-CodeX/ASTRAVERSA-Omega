/**
 * ASTRAVERSA Ω — Collision Detection
 *
 * Deterministic sphere-sphere collision detection for celestial bodies.
 *
 * Scope:
 * - Detect intersection/contact between spherical bodies
 * - Identify colliding pairs
 * - Generate deterministic collision events
 *
 * This module does NOT implement:
 * - Collision response (bouncing, merging, fragmentation)
 * - Continuous collision detection (CCD) between frames
 * - Non-spherical collision volumes
 *
 * See TATTVA.md for assumptions and limitations.
 */

import { Vector3 } from './Vector3';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Represents a collidable spherical body.
 */
export interface CollisionBody {
  id: string;
  position: Vector3;
  radius: number;
}

/**
 * A detected collision event between two bodies.
 */
export interface CollisionEvent {
  /** ID of first body (lexicographically smaller ID first for determinism) */
  bodyIdA: string;

  /** ID of second body */
  bodyIdB: string;

  /** Penetration depth (positive = overlapping) */
  penetrationDepth: number;

  /** Contact point (midpoint between surfaces along contact normal) */
  contactPoint: Vector3;

  /** Contact normal (unit vector from A toward B) */
  contactNormal: Vector3;

  /** Distance between body centers */
  centerDistance: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Detection Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check whether two spherical bodies are colliding.
 *
 * Two spheres collide if the distance between their centers
 * is less than or equal to the sum of their radii.
 *
 * @param posA - Center of body A
 * @param radiusA - Radius of body A
 * @param posB - Center of body B
 * @param radiusB - Radius of body B
 * @returns true if the spheres overlap or touch
 */
export function checkSphereCollision(
  posA: Vector3,
  radiusA: number,
  posB: Vector3,
  radiusB: number
): boolean {
  const distSq = posA.distanceToSquared(posB);
  const sumRadii = radiusA + radiusB;
  return distSq <= sumRadii * sumRadii;
}

/**
 * Compute detailed collision information between two spherical bodies.
 *
 * Returns null if the bodies are not colliding.
 *
 * @param bodyA - First collision body
 * @param bodyB - Second collision body
 * @returns CollisionEvent if colliding, null otherwise
 */
export function computeCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody
): CollisionEvent | null {
  const displacement = bodyB.position.subtract(bodyA.position);
  const centerDistance = displacement.magnitude();
  const sumRadii = bodyA.radius + bodyB.radius;

  if (centerDistance > sumRadii) {
    return null; // No collision
  }

  const penetrationDepth = sumRadii - centerDistance;

  // Contact normal: direction from A to B
  // Handle coincident centers (degenerate case)
  let contactNormal: Vector3;
  if (centerDistance < 1e-10) {
    contactNormal = new Vector3(1, 0, 0); // Arbitrary but deterministic
  } else {
    contactNormal = displacement.scale(1 / centerDistance);
  }

  // Contact point: on the surface of A, along the normal
  const contactPoint = bodyA.position.add(
    contactNormal.scale(bodyA.radius - penetrationDepth / 2)
  );

  // Enforce deterministic ordering: smaller ID first
  const [idA, idB] = bodyA.id < bodyB.id
    ? [bodyA.id, bodyB.id]
    : [bodyB.id, bodyA.id];

  return {
    bodyIdA: idA,
    bodyIdB: idB,
    penetrationDepth,
    contactPoint,
    contactNormal: bodyA.id < bodyB.id ? contactNormal : contactNormal.scale(-1),
    centerDistance,
  };
}

/**
 * Detect all collisions among a set of bodies.
 *
 * Performs all-pairs check (O(n²)). For the expected body counts
 * in a solar system (< 30), this is efficient enough.
 *
 * Results are deterministic: same input → same output, ordered
 * by (bodyIdA, bodyIdB) lexicographic comparison.
 *
 * @param bodies - Array of collision bodies
 * @returns Array of collision events, sorted deterministically
 */
export function detectAllCollisions(bodies: CollisionBody[]): CollisionEvent[] {
  const events: CollisionEvent[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const event = computeCollision(bodies[i], bodies[j]);
      if (event) {
        events.push(event);
      }
    }
  }

  // Sort for deterministic ordering
  events.sort((a, b) => {
    const cmpA = a.bodyIdA.localeCompare(b.bodyIdA);
    if (cmpA !== 0) return cmpA;
    return a.bodyIdB.localeCompare(b.bodyIdB);
  });

  return events;
}
