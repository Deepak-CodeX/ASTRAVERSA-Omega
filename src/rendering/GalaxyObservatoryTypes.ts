/**
 * ASTRAVERSA Ω — Galaxy Observatory Types & Settings
 *
 * Defines the comprehensive control parameters for Galaxy Observatory v1.
 *
 * Design principles:
 * - Clear separation between visual rendering scale and physical galaxy model diameter
 * - Clear distinction between rigid-body visual rotation and internal differential orbital motion
 * - Compatibility with simulation clock time management (pause, resume, multipliers)
 * - Safe reset to documented defaults without corrupting procedural seeds
 */

export interface GalaxyObservatorySettings {
  /**
   * Visual rendering scale factor (applied to the 3D scene representation).
   * Range: 0.25× to 2.5×, default 1.0×.
   * Does NOT alter the underlying physical galaxy dimensions in kpc.
   */
  renderScale: number;

  /**
   * Physical galaxy model diameter target in light-years.
   * Default: 500,000 ly (canonical ANANTARA α main stellar body).
   * Modifying this regenerates the underlying physical model.
   */
  targetDiameterLy: number;

  /**
   * Rigid-body visual rotation speed multiplier.
   * Controls the kinematic orientation rotation of the entire galaxy around the Y-axis.
   * Range: 0× (static) to 5×, default 1.0×.
   */
  visualRotationSpeed: number;

  /**
   * Stellar and gas orbital motion progression speed multiplier.
   * Controls internal differential Keplerian rotation, accretion flows, and shockwaves.
   * Range: 0× (frozen phases) to 5×, default 1.0×.
   */
  orbitalMotionSpeed: number;

  /**
   * Simulation pause state.
   * When true, time advancement is halted.
   */
  isPaused: boolean;

  /**
   * Simulation time dilation multiplier.
   * Available values: 0.1×, 0.5×, 1×, 2×, 5×, 10×.
   * Default: 1.0×.
   */
  timeSpeed: number;

  /**
   * Stellar point size and brightness multiplier.
   * Directly sets the shader uniform uSizeMul.
   * Range: 0.5× to 2.5×, default 1.0×.
   */
  starSizeMultiplier: number;

  /**
   * Extended stellar halo envelope opacity.
   * Controls the visibility of the faint 750,000 ly Population II envelope.
   * Range: 0.0 (invisible) to 1.0 (dense), default 0.35.
   */
  haloOpacity: number;

  /**
   * Interstellar dust extinction lane opacity.
   * Controls forward scattering and absorption silhouette strength.
   * Range: 0.0 (transparent) to 1.0 (opaque), default 0.50.
   */
  dustOpacity: number;

  /**
   * Camera distance multiplier relative to the active preset framing.
   * Range: 0.3× (close-up) to 2.5× (wide-field), default 1.0×.
   */
  cameraDistanceMultiplier: number;

  /**
   * Camera optical field-of-view in degrees.
   * Range: 35° (telephoto) to 85° (wide-angle), default 52°.
   */
  cameraFov: number;
}

/**
 * Documented canonical default observatory settings.
 */
export const DEFAULT_OBSERVATORY_SETTINGS: Readonly<GalaxyObservatorySettings> = Object.freeze({
  renderScale: 1.0,
  targetDiameterLy: 500000,
  visualRotationSpeed: 1.0,
  orbitalMotionSpeed: 1.0,
  isPaused: false,
  timeSpeed: 1.0,
  starSizeMultiplier: 1.0,
  haloOpacity: 0.35,
  dustOpacity: 0.50,
  cameraDistanceMultiplier: 1.0,
  cameraFov: 52,
});

/**
 * Return a fresh copy of the default observatory settings.
 */
export function createDefaultObservatorySettings(): GalaxyObservatorySettings {
  return { ...DEFAULT_OBSERVATORY_SETTINGS };
}
