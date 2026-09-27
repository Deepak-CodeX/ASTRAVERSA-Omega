/**
 * ASTRAVERSA Ω — Universe Container
 *
 * Top-level container for the simulation universe.
 *
 * Hierarchy:
 *   Universe → Galaxy → StarCluster → GalaxyStar → SolarSystem
 *
 * Mission 001: Managed a single solar system.
 * Mission 002: Manages a galaxy with drill-down to solar systems.
 */

import type { CelestialBody } from './CelestialBody';
import type { SolarSystem } from './SolarSystemGenerator';
import { generateSolarSystem } from './SolarSystemGenerator';
import type { Galaxy, GalaxyStar, NavigationState } from './Galaxy';
import { ViewLevel } from './Galaxy';
import { generateGalaxy } from './GalaxyGenerator';
import type { GalaxyGenerationConfig } from './GalaxyGenerator';

/**
 * The Universe is the top-level container for all simulation content.
 */
export class Universe {
  /** The master seed for this universe */
  readonly seed: number;

  /** The generated galaxy */
  private _galaxy: Galaxy | null = null;

  /** Currently active solar system (when drilling into a star) */
  private _solarSystem: SolarSystem | null = null;

  /** Currently selected star for the active solar system */
  private _activeStarIndex: number | null = null;

  /** Navigation state */
  private _navigation: NavigationState = {
    level: ViewLevel.GALAXY,
    galaxyId: '',
  };

  constructor(seed: number) {
    this.seed = seed;
  }

  // ── Galaxy ──────────────────────────────────

  /**
   * Generate the galaxy for this universe.
   */
  generateGalaxy(config?: GalaxyGenerationConfig): Galaxy {
    this._galaxy = generateGalaxy(this.seed, config);
    this._navigation = {
      level: ViewLevel.GALAXY,
      galaxyId: this._galaxy.id,
    };
    return this._galaxy;
  }

  /** Get the generated galaxy. */
  get galaxy(): Galaxy | null {
    return this._galaxy;
  }

  // ── Solar System (preserves Mission 001 API) ──

  /**
   * Generate and set the active solar system.
   * Uses a derived seed from the universe seed for determinism.
   *
   * This method is preserved from Mission 001 for backward compatibility.
   */
  generateSolarSystem(systemSeed?: number): SolarSystem {
    const seed = systemSeed ?? this.seed;
    this._solarSystem = generateSolarSystem(seed);
    return this._solarSystem;
  }

  /**
   * Enter a star system from the galaxy view.
   * Generates a solar system from the star's seed.
   */
  enterStarSystem(starIndex: number): SolarSystem | null {
    if (!this._galaxy || starIndex < 0 || starIndex >= this._galaxy.stars.length) {
      return null;
    }

    const star = this._galaxy.stars[starIndex];
    this._solarSystem = generateSolarSystem(star.seed);
    this._activeStarIndex = starIndex;
    this._navigation = {
      level: ViewLevel.SYSTEM,
      galaxyId: this._galaxy.id,
      starIndex,
      clusterId: star.clusterIndex >= 0
        ? this._galaxy.clusters[star.clusterIndex]?.id
        : undefined,
    };

    return this._solarSystem;
  }

  /**
   * Return to galaxy view from a star system.
   */
  exitStarSystem(): void {
    this._solarSystem = null;
    this._activeStarIndex = null;
    if (this._galaxy) {
      this._navigation = {
        level: ViewLevel.GALAXY,
        galaxyId: this._galaxy.id,
      };
    }
  }

  /** Get the currently active solar system. */
  get solarSystem(): SolarSystem | null {
    return this._solarSystem;
  }

  /** Get the active star index (when viewing a system). */
  get activeStarIndex(): number | null {
    return this._activeStarIndex;
  }

  /** Get the active star data (when viewing a system). */
  get activeStar(): GalaxyStar | null {
    if (this._galaxy && this._activeStarIndex !== null) {
      return this._galaxy.stars[this._activeStarIndex] ?? null;
    }
    return null;
  }

  /** Get all bodies in the current solar system. */
  get bodies(): CelestialBody[] {
    return this._solarSystem?.bodies ?? [];
  }

  /** Find a celestial body by ID. */
  findBody(id: string): CelestialBody | undefined {
    return this.bodies.find(body => body.id === id);
  }

  // ── Navigation ──────────────────────────────

  /** Get the current navigation state. */
  get navigation(): NavigationState {
    return this._navigation;
  }

  /** Set navigation state. */
  setNavigation(nav: NavigationState): void {
    this._navigation = nav;
  }
}
