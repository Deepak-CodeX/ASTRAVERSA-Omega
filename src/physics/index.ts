/**
 * ASTRAVERSA Ω — Physics Module Index
 */

export { Vector3 } from './Vector3';
export { computeGravitationalForce, computeNetGravitationalForce, G_SI } from './gravity';
export { velocityVerletStep, eulerStep } from './integrator';
export type { IntegratorState } from './integrator';

// Mission 003 — Orbital Mechanics
export {
  solveKeplerEquation,
  eccentricToTrueAnomaly,
  trueToEccentricAnomaly,
  eccentricToMeanAnomaly,
  meanToEccentricAnomaly,
  meanToTrueAnomaly,
  trueToMeanAnomaly,
  computeOrbitalPeriod,
  cartesianToOrbital,
  orbitalToCartesian,
  normalizeAngle,
  orbitalRadius,
  computeOrbitTrailPoints,
} from './orbitalElements';
export type { OrbitalElements, StateVector } from './orbitalElements';

// Mission 003 — Collision Detection
export {
  checkSphereCollision,
  computeCollision,
  detectAllCollisions,
} from './collisionDetection';
export type { CollisionBody, CollisionEvent } from './collisionDetection';

// Mission 003 — Conservation Diagnostics
export {
  computeKineticEnergy,
  computePotentialEnergy,
  computeEnergyDiagnostics,
  computeAngularMomentum,
  computeConservationReport,
} from './conservationDiagnostics';
export type {
  DiagnosticBody,
  EnergyDiagnostics,
  AngularMomentumDiagnostics,
  ConservationReport,
} from './conservationDiagnostics';

// Mission 003 — Orbital Resonance
export {
  findClosestResonance,
  analyzeResonances,
  formatResonance,
} from './orbitalResonance';
export type { ResonanceResult, ResonanceBody } from './orbitalResonance';
