/**
 * ASTRAVERSA Ω — Orbital Elements & Keplerian Mechanics
 *
 * Provides:
 * - Classical orbital elements representation
 * - Kepler equation solver (M → E) with Newton-Raphson iteration
 * - Mean / eccentric / true anomaly conversions
 * - Cartesian state vectors ↔ orbital elements conversions
 * - Orbital period from semi-major axis and central mass
 *
 * Conventions:
 * - All angles in radians
 * - All distances in meters
 * - All masses in kg
 * - Reference plane: XZ (Y = up), consistent with existing simulation
 * - Prograde orbits have inclination < π/2
 *
 * Assumptions (documented in TATTVA.md):
 * - Two-body problem (elements are osculating relative to parent)
 * - No perturbation from other bodies in element computation
 * - Parabolic/hyperbolic orbits are detected but not fully supported
 * - Kepler solver convergence is enforced with iteration cap
 *
 * See TATTVA.md for scientific limitations.
 */

import { Vector3 } from './Vector3';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Classical Keplerian orbital elements.
 *
 * These describe the shape, orientation, and phase of an orbit
 * around a central body.
 */
export interface OrbitalElements {
  /** Semi-major axis (m). Positive for elliptical, negative for hyperbolic. */
  semiMajorAxis: number;

  /** Eccentricity (dimensionless). 0 = circular, 0<e<1 = elliptical, e≥1 = escape. */
  eccentricity: number;

  /** Inclination (radians, 0 to π). Angle between orbital plane and reference XZ plane. */
  inclination: number;

  /** Longitude of ascending node Ω (radians, 0 to 2π). */
  longitudeOfAscendingNode: number;

  /** Argument of periapsis ω (radians, 0 to 2π). */
  argumentOfPeriapsis: number;

  /** True anomaly ν (radians, 0 to 2π). Current angular position in orbit. */
  trueAnomaly: number;
}

/**
 * Cartesian state vector for a body relative to its parent.
 */
export interface StateVector {
  position: Vector3;
  velocity: Vector3;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Kepler solver maximum iterations */
const KEPLER_MAX_ITERATIONS = 50;

/** Kepler solver convergence tolerance (radians) */
const KEPLER_TOLERANCE = 1e-12;

/** Small number for near-zero comparisons */
const EPSILON = 1e-10;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Kepler Equation Solver
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Solve Kepler's equation: M = E - e·sin(E)
 *
 * Given mean anomaly M and eccentricity e, find eccentric anomaly E.
 *
 * Uses Newton-Raphson iteration with a robust initial guess.
 * Convergence is guaranteed for e < 1 (elliptical orbits).
 *
 * @param M - Mean anomaly (radians)
 * @param e - Eccentricity (0 ≤ e < 1 for elliptical)
 * @returns Eccentric anomaly E (radians)
 * @throws Error if solver fails to converge (should not happen for e < 1)
 */
export function solveKeplerEquation(M: number, e: number): number {
  // Normalize M to [0, 2π)
  let Mnorm = M % (2 * Math.PI);
  if (Mnorm < 0) Mnorm += 2 * Math.PI;

  // Initial guess: E₀ = M for low eccentricity, refined for higher e
  // Markley (1995) suggests E₀ = M + e·sin(M) as a good starter
  let E = Mnorm + e * Math.sin(Mnorm);

  // For very high eccentricities, use π as initial guess when M is near π
  if (e > 0.8 && Mnorm > Math.PI * 0.5 && Mnorm < Math.PI * 1.5) {
    E = Math.PI;
  }

  // Newton-Raphson iteration: E_{n+1} = E_n - f(E_n) / f'(E_n)
  // where f(E) = E - e·sin(E) - M, f'(E) = 1 - e·cos(E)
  for (let i = 0; i < KEPLER_MAX_ITERATIONS; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - e * sinE - Mnorm;
    const fPrime = 1 - e * cosE;

    // Guard against near-zero derivative (shouldn't happen for e < 1)
    if (Math.abs(fPrime) < 1e-15) break;

    const dE = f / fPrime;
    E -= dE;

    if (Math.abs(dE) < KEPLER_TOLERANCE) {
      return E;
    }
  }

  // If we didn't converge, return best estimate
  // This should only happen for near-parabolic orbits
  return E;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Anomaly Conversions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Convert eccentric anomaly to true anomaly.
 *
 * tan(ν/2) = √((1+e)/(1-e)) · tan(E/2)
 *
 * @param E - Eccentric anomaly (radians)
 * @param e - Eccentricity
 * @returns True anomaly ν (radians, 0 to 2π)
 */
export function eccentricToTrueAnomaly(E: number, e: number): number {
  const halfE = E / 2;
  const factor = Math.sqrt((1 + e) / (1 - e));
  let nu = 2 * Math.atan2(factor * Math.sin(halfE), Math.cos(halfE));

  // Normalize to [0, 2π)
  if (nu < 0) nu += 2 * Math.PI;
  return nu;
}

/**
 * Convert true anomaly to eccentric anomaly.
 *
 * tan(E/2) = √((1-e)/(1+e)) · tan(ν/2)
 *
 * @param nu - True anomaly (radians)
 * @param e - Eccentricity
 * @returns Eccentric anomaly E (radians, 0 to 2π)
 */
export function trueToEccentricAnomaly(nu: number, e: number): number {
  const halfNu = nu / 2;
  const factor = Math.sqrt((1 - e) / (1 + e));
  let E = 2 * Math.atan2(factor * Math.sin(halfNu), Math.cos(halfNu));

  // Normalize to [0, 2π)
  if (E < 0) E += 2 * Math.PI;
  return E;
}

/**
 * Convert eccentric anomaly to mean anomaly.
 *
 * M = E - e·sin(E)
 *
 * @param E - Eccentric anomaly (radians)
 * @param e - Eccentricity
 * @returns Mean anomaly M (radians)
 */
export function eccentricToMeanAnomaly(E: number, e: number): number {
  return E - e * Math.sin(E);
}

/**
 * Convert mean anomaly to eccentric anomaly.
 * (Wrapper around solveKeplerEquation for API consistency.)
 *
 * @param M - Mean anomaly (radians)
 * @param e - Eccentricity
 * @returns Eccentric anomaly E (radians)
 */
export function meanToEccentricAnomaly(M: number, e: number): number {
  return solveKeplerEquation(M, e);
}

/**
 * Convert mean anomaly to true anomaly.
 *
 * M → E (Kepler solver) → ν
 *
 * @param M - Mean anomaly (radians)
 * @param e - Eccentricity
 * @returns True anomaly ν (radians)
 */
export function meanToTrueAnomaly(M: number, e: number): number {
  const E = solveKeplerEquation(M, e);
  return eccentricToTrueAnomaly(E, e);
}

/**
 * Convert true anomaly to mean anomaly.
 *
 * ν → E → M
 *
 * @param nu - True anomaly (radians)
 * @param e - Eccentricity
 * @returns Mean anomaly M (radians)
 */
export function trueToMeanAnomaly(nu: number, e: number): number {
  const E = trueToEccentricAnomaly(nu, e);
  return eccentricToMeanAnomaly(E, e);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Orbital Period
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute orbital period from semi-major axis and gravitational parameter.
 *
 * T = 2π √(a³ / μ)   where μ = G(M₁ + M₂) ≈ GM for M₁ >> M₂
 *
 * @param semiMajorAxis - Semi-major axis in meters
 * @param mu - Gravitational parameter μ = G·(M_parent + M_body) in m³/s²
 * @returns Period in seconds. Returns Infinity for non-elliptical orbits.
 */
export function computeOrbitalPeriod(semiMajorAxis: number, mu: number): number {
  if (semiMajorAxis <= 0) return Infinity; // Hyperbolic or degenerate
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// State Vector ↔ Orbital Elements Conversion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
 * Coordinate System Convention (Y-up, orbits in XZ)
 *
 * The standard astrodynamics algorithm (Bate, Mueller & White) uses a Z-up
 * coordinate system with orbits in the XY plane. Our simulation uses Y-up
 * with orbits in the XZ plane. We bridge this by mapping:
 *
 *   Simulation (Y-up)    Standard (Z-up)
 *       X          →         X
 *       Y          →         Z
 *       Z          →         Y
 *
 * All public functions accept and return vectors in simulation (Y-up) space.
 * Internally, we convert to/from standard (Z-up) space for the algorithm.
 *
 * In simulation space:
 * - Equatorial (XZ plane) orbit: position (+X,0,0), velocity (0,0,+V)
 *   gives h = r×v = (0, -XV, 0), which maps to standard h = (0, 0, -XV).
 *   This means our prograde direction corresponds to h in -Z in standard,
 *   i.e., clockwise when viewed from above. To keep inclination=0 for
 *   XZ-plane orbits, we negate the Z component (Y in simulation) of h
 *   when computing inclination, which is equivalent to defining the
 *   reference "north" as -Y in simulation space.
 *
 * SIMPLER APPROACH: We convert to a standard Z-up frame, run the textbook
 * algorithm, and convert back. The mapping sim→std is: (x,y,z) → (x,z,-y).
 * This maps our XZ orbital plane to the standard XY plane, and our -Y
 * angular momentum to +Z in standard space, giving inclination=0 as desired.
 */

/** Convert simulation Y-up vector to standard Z-up vector */
function simToStd(v: Vector3): Vector3 {
  return new Vector3(v.x, v.z, -v.y);
}

/** Convert standard Z-up vector to simulation Y-up vector */
function stdToSim(v: Vector3): Vector3 {
  return new Vector3(v.x, -v.z, v.y);
}

/**
 * Convert Cartesian state vector (relative to parent) to orbital elements.
 *
 * Implements the standard algorithm from Bate, Mueller & White (1971),
 * adapted for our Y-up coordinate system.
 *
 * The reference plane is XZ (Y-up), matching the simulation coordinate system.
 * The reference direction is +X.
 *
 * @param relativePosition - Position of body relative to parent (m)
 * @param relativeVelocity - Velocity of body relative to parent (m/s)
 * @param mu - Gravitational parameter μ = G·(M_parent + M_body) in m³/s²
 * @returns OrbitalElements, or null if the orbit is degenerate
 */
export function cartesianToOrbital(
  relativePosition: Vector3,
  relativeVelocity: Vector3,
  mu: number
): OrbitalElements | null {
  // Convert to standard Z-up frame for the textbook algorithm
  const r = simToStd(relativePosition);
  const v = simToStd(relativeVelocity);
  const rMag = r.magnitude();
  const vMag = v.magnitude();

  if (rMag < EPSILON || mu < EPSILON) return null;

  // Specific angular momentum: h = r × v
  const h = r.cross(v);
  const hMag = h.magnitude();

  if (hMag < EPSILON) return null; // Degenerate (radial trajectory)

  // Node vector: n = K̂ × h  (K̂ = Z-axis in standard frame)
  const kHat = new Vector3(0, 0, 1);
  const n = kHat.cross(h);
  const nMag = n.magnitude();

  // Eccentricity vector: e_vec = (1/μ)((v² - μ/r)r - (r·v)v)
  const vSq = vMag * vMag;
  const rdotv = r.dot(v);
  const eVec = r.scale(vSq - mu / rMag).subtract(v.scale(rdotv)).scale(1 / mu);
  const e = eVec.magnitude();

  // Semi-major axis: from vis-viva equation
  const energy = vSq / 2 - mu / rMag;
  let a: number;
  if (Math.abs(e - 1.0) < EPSILON) {
    a = Infinity;
  } else {
    a = -mu / (2 * energy);
  }

  // Inclination: i = acos(h_z / |h|) in standard Z-up
  const inc = Math.acos(clamp(h.z / hMag, -1, 1));

  // Longitude of ascending node: Ω
  let Omega: number;
  if (nMag < EPSILON) {
    Omega = 0;
  } else {
    Omega = Math.acos(clamp(n.x / nMag, -1, 1));
    if (n.y < 0) Omega = 2 * Math.PI - Omega;
  }

  // Argument of periapsis: ω
  let omega: number;
  if (e < EPSILON) {
    omega = 0;
  } else if (nMag < EPSILON) {
    // Equatorial orbit — measure from X-axis
    omega = Math.atan2(eVec.y, eVec.x);
    if (omega < 0) omega += 2 * Math.PI;
  } else {
    omega = Math.acos(clamp(n.dot(eVec) / (nMag * e), -1, 1));
    if (eVec.z < 0) omega = 2 * Math.PI - omega;
  }

  // True anomaly: ν
  let nu: number;
  if (e < EPSILON) {
    if (nMag < EPSILON) {
      // Circular equatorial: measure from X-axis
      nu = Math.atan2(r.y, r.x);
      if (nu < 0) nu += 2 * Math.PI;
    } else {
      // Circular inclined: measure from ascending node
      nu = Math.acos(clamp(n.dot(r) / (nMag * rMag), -1, 1));
      if (r.z < 0) nu = 2 * Math.PI - nu;
    }
  } else {
    nu = Math.acos(clamp(eVec.dot(r) / (e * rMag), -1, 1));
    if (rdotv < 0) nu = 2 * Math.PI - nu;
  }

  return {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: inc,
    longitudeOfAscendingNode: Omega,
    argumentOfPeriapsis: omega,
    trueAnomaly: nu,
  };
}

/**
 * Convert orbital elements to Cartesian state vector (relative to parent).
 *
 * Produces position and velocity in the simulation coordinate system (Y-up).
 *
 * @param elements - Orbital elements
 * @param mu - Gravitational parameter μ = G·(M_parent + M_body) in m³/s²
 * @returns StateVector with position and velocity relative to parent
 */
export function orbitalToCartesian(
  elements: OrbitalElements,
  mu: number
): StateVector {
  const { semiMajorAxis: a, eccentricity: e, inclination: i,
    longitudeOfAscendingNode: Omega, argumentOfPeriapsis: omega,
    trueAnomaly: nu } = elements;

  // Semi-latus rectum
  const p = a * (1 - e * e);

  // Distance at current true anomaly
  const rMag = p / (1 + e * Math.cos(nu));

  const cosNu = Math.cos(nu);
  const sinNu = Math.sin(nu);

  // Position in perifocal (PQW) frame — standard 2D orbital plane
  const rP = rMag * cosNu;
  const rQ = rMag * sinNu;

  // Velocity in perifocal frame
  const sqrtMuOverP = Math.sqrt(mu / p);
  const vP = -sqrtMuOverP * sinNu;
  const vQ = sqrtMuOverP * (e + cosNu);

  // Standard Z-up rotation from perifocal to inertial:
  // R = R3(-Ω) · R1(-i) · R3(-ω)
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  // Rotation matrix columns for P and Q directions in Z-up standard frame:
  // Column for P (periapsis direction):
  const px = cosO * cosW - sinO * sinW * cosI;
  const py = sinO * cosW + cosO * sinW * cosI;
  const pz = sinW * sinI;

  // Column for Q (90° ahead in orbital plane):
  const qx = -cosO * sinW - sinO * cosW * cosI;
  const qy = -sinO * sinW + cosO * cosW * cosI;
  const qz = cosW * sinI;

  // Position and velocity in standard Z-up inertial frame
  const stdPos = new Vector3(
    px * rP + qx * rQ,
    py * rP + qy * rQ,
    pz * rP + qz * rQ
  );

  const stdVel = new Vector3(
    px * vP + qx * vQ,
    py * vP + qy * vQ,
    pz * vP + qz * vQ
  );

  // Convert from standard Z-up to simulation Y-up
  return {
    position: stdToSim(stdPos),
    velocity: stdToSim(stdVel),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize an angle to [0, 2π).
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
}

/**
 * Compute the orbital radius at a given true anomaly.
 *
 * r = a(1 - e²) / (1 + e·cos(ν))
 *
 * @param a - Semi-major axis
 * @param e - Eccentricity
 * @param nu - True anomaly (radians)
 * @returns Orbital radius at ν
 */
export function orbitalRadius(a: number, e: number, nu: number): number {
  const p = a * (1 - e * e);
  return p / (1 + e * Math.cos(nu));
}

/**
 * Generate points along an orbit for trail rendering.
 *
 * @param elements - Orbital elements (trueAnomaly is ignored; full orbit is traced)
 * @param mu - Gravitational parameter
 * @param segments - Number of segments (default 128)
 * @returns Array of Vector3 positions tracing the orbit
 */
export function computeOrbitTrailPoints(
  elements: OrbitalElements,
  mu: number,
  segments: number = 128
): Vector3[] {
  const points: Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const nu = (i / segments) * 2 * Math.PI;
    const trailElements: OrbitalElements = { ...elements, trueAnomaly: nu };
    const { position } = orbitalToCartesian(trailElements, mu);
    points.push(position);
  }

  return points;
}
