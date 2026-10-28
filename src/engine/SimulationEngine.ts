/**
 * ASTRAVERSA Ω — Simulation Engine
 *
 * Orchestrates the simulation lifecycle:
 * - Manages the simulation clock
 * - Coordinates physics updates
 * - Maintains simulation state
 *
 * The engine operates on CelestialBody data directly.
 * It does NOT know about rendering — rendering reads body state each frame.
 */

import { SimulationClock, type TimeMultiplier } from './SimulationClock';
import { Vector3 } from '../physics/Vector3';
import { computeGravitationalForce } from '../physics/gravity';
import { orbitalToCartesian, type OrbitalElements } from '../physics/orbitalElements';
import { CelestialBodyType, type CelestialBody } from '../universe/CelestialBody';
import { G, SOLAR_MASS, secondsToYears } from '../astronomy/constants';
import { computeStellarEvolution } from '../astronomy/stellarEvolution';
import type { SpectralClass } from '../astronomy/stellar';
import {
  computeHabitableZone,
  computeEquilibriumTemperature,
  computeInsolationFlux,
  computeRelativeInsolation,
  classifyHabitability,
  getDefaultBondAlbedo,
} from '../astronomy/stellarPlanetaryCoupling';
import { computePlanetaryEnvironment } from '../astronomy/planetaryEnvironment';

/**
 * Simulation engine state.
 */
export const SimulationState = {
  UNINITIALIZED: 'UNINITIALIZED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
} as const;
export type SimulationState = typeof SimulationState[keyof typeof SimulationState];

export class SimulationEngine {
  readonly clock: SimulationClock;
  private _state: SimulationState = SimulationState.UNINITIALIZED;
  private _bodies: CelestialBody[] = [];

  constructor() {
    this.clock = new SimulationClock();
  }

  /** Current engine state */
  get state(): SimulationState {
    return this._state;
  }

  /** Current bodies being simulated */
  get bodies(): CelestialBody[] {
    return this._bodies;
  }

  /** Total number of bodies in the simulation */
  get bodyCount(): number {
    return this._bodies.length;
  }

  /**
   * Find a body by unique ID in the active simulation.
   */
  getBody(id: string): CelestialBody | undefined {
    return this._bodies.find((b) => b.id === id);
  }

  /**
   * Initialize the engine with a set of celestial bodies.
   */
  initialize(bodies: CelestialBody[]): void {
    this._bodies = [...bodies];
    this._state = SimulationState.PAUSED;
    this.clock.reset();

    // Compute initial accelerations
    this.computeAccelerations();

    // Ensure initial stellar-planetary coupling is evaluated for all stars
    for (const body of this._bodies) {
      if (body.type === CelestialBodyType.STAR) {
        this.updatePlanetaryCoupling(body);
      }
    }
  }

  /**
   * Start or resume the simulation.
   */
  start(multiplier: TimeMultiplier = 1): void {
    this.clock.resume(multiplier);
    this._state = SimulationState.RUNNING;
  }

  /**
   * Pause the simulation.
   */
  pause(): void {
    this.clock.pause();
    this._state = SimulationState.PAUSED;
  }

  /**
   * Set the time multiplier.
   */
  setTimeMultiplier(multiplier: TimeMultiplier): void {
    this.clock.setMultiplier(multiplier);
    if (multiplier === 0) {
      this._state = SimulationState.PAUSED;
    } else {
      this._state = SimulationState.RUNNING;
    }
  }

  /**
   * Update the simulation by one frame's worth of wall-clock time.
   * Called from the rendering loop (requestAnimationFrame) or test harness.
   *
   * @param wallDeltaMs - Wall-clock milliseconds since last update
   */
  update(wallDeltaMs: number): void {
    if (this._state !== SimulationState.RUNNING) return;

    const substeps = this.clock.tick(wallDeltaMs);

    let totalDt = 0;
    for (const dt of substeps) {
      this.integrateStep(dt);
      totalDt += dt;
    }

    if (totalDt > 0) {
      this.advanceStellarAge(secondsToYears(totalDt));
    }
  }

  /**
   * Advance the stellar age of all stars in the simulation by deltaYears,
   * updating their physical parameters (mass, radius, luminosity, temperature, color, phase).
   */
  advanceStellarAge(deltaYears: number): void {
    if (deltaYears <= 0) return;
    for (const body of this._bodies) {
      if (body.type === CelestialBodyType.STAR && body.starProperties?.evolution) {
        const currentAge = body.starProperties.evolution.ageYears;
        this.setStarAge(body, currentAge + deltaYears);
      }
    }
  }

  /**
   * Set the exact stellar age of a star, recomputing its evolutionary state.
   */
  setStarAge(star: CelestialBody, newAgeYears: number): void {
    if (!star.starProperties?.evolution) return;
    const initialMassSolar = star.starProperties.evolution.initialMassSolar;
    const metallicity = star.starProperties.evolution.metallicity;
    const nextEvolution = computeStellarEvolution({
      initialMassSolar,
      ageYears: Math.max(0, newAgeYears),
      metallicity,
    });

    star.mass = nextEvolution.currentMassKg;
    star.radius = nextEvolution.radiusMeters;
    star.color = nextEvolution.color;
    star.starProperties.spectralClass = nextEvolution.spectralClass as SpectralClass;
    star.starProperties.luminosity = nextEvolution.luminosityWatts;
    star.starProperties.temperature = nextEvolution.effectiveTemperature;
    star.starProperties.evolution = nextEvolution;

    // Dynamically update circumstellar habitable zone and all orbiting planetary equilibrium temperatures
    this.updatePlanetaryCoupling(star);
  }

  /**
   * Update stellar-planetary coupling for all planets orbiting this star.
   * Recalculates star habitable zone and planetary radiative-equilibrium temperatures.
   */
  updatePlanetaryCoupling(star: CelestialBody): void {
    if (!star.starProperties) return;
    const luminosity = star.starProperties.luminosity;
    const temperature = star.starProperties.temperature;

    // Recalculate circumstellar habitable zone
    const hz = computeHabitableZone(luminosity, temperature);
    star.starProperties.habitableZone = hz;

    // Update each planet orbiting this star
    for (const body of this._bodies) {
      if (body.type === CelestialBodyType.PLANET && body.planetProperties?.parentId === star.id) {
        const pp = body.planetProperties;
        const dist = pp.orbitalRadius;
        const albedo = pp.albedo ?? getDefaultBondAlbedo(pp.planetType);

        pp.albedo = albedo;
        pp.equilibriumTemperature = computeEquilibriumTemperature(luminosity, dist, albedo);
        pp.insolationFlux = computeInsolationFlux(luminosity, dist);
        pp.insolationRelative = computeRelativeInsolation(pp.insolationFlux);
        pp.habitabilityStatus = classifyHabitability(dist, hz);

        // Dynamically update planetary surface environment and thermal regime (Mission 005A)
        pp.environment = computePlanetaryEnvironment({
          planetType: pp.planetType,
          massKg: body.mass,
          radiusMeters: body.radius,
          luminosityWatts: luminosity,
          orbitalDistanceMeters: dist,
          albedo,
          surfacePressureBar: pp.environment?.surfacePressureBar,
        });
      }
    }
  }

  /**
   * Perform one integration step of duration dt.
   */
  private integrateStep(dt: number): void {
    const bodies = this._bodies;
    const n = bodies.length;

    // Compute new accelerations after hypothetical position update
    // Using Velocity Verlet: first update positions, then compute new accelerations,
    // then update velocities
    const newAccelerations: Vector3[] = new Array(n);

    // Step 1: Update positions using current velocity and acceleration
    for (let i = 0; i < n; i++) {
      const body = bodies[i];
      body.position = body.position
        .add(body.velocity.scale(dt))
        .add(body.acceleration.scale(0.5 * dt * dt));
    }

    // Step 2: Compute new accelerations at new positions
    for (let i = 0; i < n; i++) {
      newAccelerations[i] = this.computeAccelerationForBody(i);
    }

    // Step 3: Update velocities using average of old and new accelerations
    for (let i = 0; i < n; i++) {
      const body = bodies[i];
      body.velocity = body.velocity.add(
        body.acceleration.add(newAccelerations[i]).scale(0.5 * dt)
      );
      body.acceleration = newAccelerations[i];
    }
  }

  /**
   * Compute the gravitational acceleration for a single body.
   */
  private computeAccelerationForBody(targetIndex: number): Vector3 {
    const bodies = this._bodies;
    const target = bodies[targetIndex];
    let accel = Vector3.zero();

    for (let i = 0; i < bodies.length; i++) {
      if (i === targetIndex) continue;

      const other = bodies[i];
      const force = computeGravitationalForce(
        target.position,
        target.mass,
        other.position,
        other.mass,
        G
      );

      // a = F / m
      accel = accel.add(force.scale(1 / target.mass));
    }

    return accel;
  }

  /**
   * Compute and store accelerations for all bodies.
   */
  computeAccelerations(): void {
    for (let i = 0; i < this._bodies.length; i++) {
      this._bodies[i].acceleration = this.computeAccelerationForBody(i);
    }
  }

  /**
   * Add a body to the live simulation, recomputing accelerations and coupling (Mission P1-A).
   */
  addBody(body: CelestialBody): void {
    this._bodies.push(body);
    this.computeAccelerations();
    const star = this._bodies.find((b) => b.type === CelestialBodyType.STAR);
    if (star) {
      this.updatePlanetaryCoupling(star);
    }
  }

  /**
   * Remove a body from the live simulation, safely purging any satellites (Mission P1-A).
   */
  removeBody(bodyId: string): CelestialBody | null {
    const index = this._bodies.findIndex((b) => b.id === bodyId);
    if (index === -1) return null;
    const [removed] = this._bodies.splice(index, 1);
    // Also remove child satellites if a primary body was removed
    this._bodies = this._bodies.filter((b) => b.parentId !== bodyId);
    this.computeAccelerations();
    return removed;
  }

  /**
   * Recompute gravitational accelerations across all current bodies (Mission P1-A).
   */
  recomputeAccelerations(): void {
    this.computeAccelerations();
  }

  /**
   * Update the orbital parameters of a body, applying Keplerian elements
   * to position, velocity, and dependent quantities (Mission P1-A).
   */
  updateBodyOrbit(bodyId: string, elements: OrbitalElements): boolean {
    const body = this._bodies.find((b) => b.id === bodyId);
    if (!body) return false;
    const parentId = body.parentId ?? body.planetProperties?.parentId ?? body.moonProperties?.parentId;
    if (!parentId) return false;
    const parent = this._bodies.find((b) => b.id === parentId);
    if (!parent) return false;

    const oldPosition = body.position.clone();
    const oldVelocity = body.velocity.clone();

    const mu = G * (parent.mass + body.mass);
    const state = orbitalToCartesian(elements, mu);

    body.position = parent.position.add(state.position);
    body.velocity = parent.velocity.add(state.velocity);

    // If this body has orbiting satellites (e.g. moons orbiting a planet),
    // preserve their relative orbital positions and velocities around this body
    // by translating them rigidly by deltaPos and deltaVel.
    const deltaPos = body.position.subtract(oldPosition);
    const deltaVel = body.velocity.subtract(oldVelocity);

    for (const child of this._bodies) {
      if (
        child.parentId === body.id ||
        child.moonProperties?.parentId === body.id
      ) {
        child.position = child.position.add(deltaPos);
        child.velocity = child.velocity.add(deltaVel);
      }
    }

    if (body.planetProperties) {
      body.planetProperties.orbitalRadius = elements.semiMajorAxis;
      body.planetProperties.orbitalElements = { ...elements };
      body.planetProperties.orbitalPeriod =
        2 * Math.PI * Math.sqrt(Math.pow(elements.semiMajorAxis, 3) / mu);
    } else if (body.moonProperties) {
      body.moonProperties.orbitalRadius = elements.semiMajorAxis;
      body.moonProperties.orbitalElements = { ...elements };
      body.moonProperties.orbitalPeriod =
        2 * Math.PI * Math.sqrt(Math.pow(elements.semiMajorAxis, 3) / mu);
    }

    this.computeAccelerations();
    const star = this._bodies.find((b) => b.type === CelestialBodyType.STAR);
    if (star) {
      this.updatePlanetaryCoupling(star);
    }
    return true;
  }

  /**
   * Update physical properties of a body, re-evaluating stellar evolution
   * or planetary coupling when mass changes (Mission P1-A).
   */
  updateBodyProperties(
    bodyId: string,
    updates: { mass?: number; radius?: number; name?: string; color?: string }
  ): boolean {
    const body = this._bodies.find((b) => b.id === bodyId);
    if (!body) return false;

    if (updates.name !== undefined) body.name = updates.name;
    if (updates.mass !== undefined && updates.mass > 0) body.mass = updates.mass;
    if (updates.radius !== undefined && updates.radius > 0) body.radius = updates.radius;
    if (updates.color !== undefined) body.color = updates.color;

    // If star mass changed, re-evaluate stellar parameters & coupling
    if (body.type === CelestialBodyType.STAR && updates.mass !== undefined) {
      const solarMass = body.mass / SOLAR_MASS;
      if (body.starProperties?.evolution) {
        body.starProperties.evolution.initialMassSolar = solarMass;
        const currentAge = body.starProperties.evolution.ageYears;
        this.setStarAge(body, currentAge);
      }
    } else {
      const star = this._bodies.find((b) => b.type === CelestialBodyType.STAR);
      if (star) {
        this.updatePlanetaryCoupling(star);
      }
    }

    this.computeAccelerations();
    return true;
  }
}
