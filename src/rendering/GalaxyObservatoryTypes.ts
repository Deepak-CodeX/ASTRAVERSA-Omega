/**
 * ASTRAVERSA Ω — Galaxy Observatory Types & Settings
 *
 * Defines the comprehensive control parameters for Galaxy Observatory v2 (Mission 003A).
 *
 * Design principles:
 * - Clear separation between visual rendering scale and physical galaxy model diameter
 * - Clear distinction between rigid-body visual rotation and internal differential orbital motion
 * - Genuinely effective procedural controls (star density, cloud coverage, spiral geometry)
 * - Compatibility with simulation clock time management (pause, resume, multipliers)
 * - Safe reset to documented defaults without corrupting procedural seeds
 */

export interface GalaxyObservatorySettings {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Structure Parameters
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Visual rendering scale factor applied to the 3D scene group.
   * - Meaning: Optical magnification multiplier in 3D scene units.
   * - Scope: Rendering only (does NOT alter underlying physical parsec dimensions).
   * - Range: 0.25× to 2.5×, default: 1.0×, step: 0.05.
   * - Update: Immediate (GPU group transform).
   * - Measurable effect: Direct uniform rescale of 3D galaxy group.
   */
  renderScale: number;

  /**
   * Physical galaxy model diameter target in light-years.
   * - Meaning: Physical diameter of the main stellar disk body (1 kpc ≈ 3,261.56 ly).
   * - Scope: Physical / Model data.
   * - Range: 50,000 ly to 2,000,000 ly, default: 500,000 ly (canonical ANANTARA α).
   * - Update: Procedural regeneration.
   * - Measurable effect: Recalculates physical parsec coordinates, scale heights, and bar dimensions.
   */
  targetDiameterLy: number;

  /**
   * Number of principal spiral arms.
   * - Meaning: Count of continuous logarithmic spiral density wave arms emerging from the bar tips and inner resonance.
   * - Scope: Physical / Model data.
   * - Range: 2 to 8 arms, default: 4, integer.
   * - Update: Procedural regeneration.
   * - Measurable effect: Re-partitions stars and arm defs across the specified number of arms.
   */
  armCount: number;

  /**
   * Logarithmic spiral pitch angle in degrees.
   * - Meaning: Angle between spiral arm tangent and circle of constant radius (tan(ψ)).
   * - Scope: Physical / Model data.
   * - Range: 6.0° to 30.0°, default: 13.0°, unit: degrees.
   * - Update: Procedural regeneration.
   * - Measurable effect: Controls tightness/openness of spiral arms (higher = more open/radial, lower = tightly wound).
   */
  armPitchAngleDeg: number;

  /**
   * Spiral arm width scale multiplier.
   * - Meaning: Radial broadening and spine dispersion factor along the density wave.
   * - Scope: Physical / Model data.
   * - Range: 0.3× to 2.5×, default: 1.0×.
   * - Update: Procedural regeneration.
   * - Measurable effect: Narrower, razor-sharp spines at <1.0x; broader, diffuse stellar bands at >1.0x.
   */
  armWidthMult: number;

  /**
   * Spiral arm winding factor.
   * - Meaning: Global curvature rate controlling the angular winding rate.
   * - Scope: Physical / Model data.
   * - Range: 0.2× to 1.5×, default: 0.62.
   * - Update: Procedural regeneration.
   * - Measurable effect: Modifies spiral density wave curvature progression.
   */
  armWindingFactor: number;

  /**
   * Central spheroidal bulge radius fraction.
   * - Meaning: Semi-major radius of the dense spheroidal galactic bulge relative to galactic disk radius.
   * - Scope: Physical / Model data.
   * - Range: 0.05 to 0.30, default: 0.13 (≈ 9.96 kpc for 500k ly).
   * - Update: Procedural regeneration.
   * - Measurable effect: Changes the spatial boundary and radial concentration of the bulge core.
   */
  bulgeRadiusFraction: number;

  /**
   * Extended diffuse stellar halo radius multiplier relative to disk radius.
   * - Meaning: Boundary scale of the faint, spheroidal Population II halo envelope.
   * - Scope: Physical / Model data.
   * - Range: 1.0× to 2.5×, default: 1.5× (≈ 750,000 ly for 500k ly disk).
   * - Update: Procedural regeneration.
   * - Measurable effect: Modifies outer halo envelope boundary coordinates.
   */
  haloRadiusMultiplier: number;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Stars & Clusters Parameters
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Rendered stellar-tracer count.
   * - Meaning: Number of representative individual star tracers generated and uploaded to the GPU vertex buffer.
   * - Scope: Physical / Model data and GPU buffer allocation.
   * - Range: 5,000 to 80,000 tracers (safe hardware cap: 100,000), default: 20,000.
   * - Update: Procedural regeneration + Buffer re-allocation.
   * - Measurable effect: Directly increases point cloud density and visual richness across disk, bar, and bulge.
   */
  starCount: number;

  /**
   * Stellar point size and brightness multiplier.
   * - Meaning: Shader uniform scaling factor for point primitives in the optical dual-profile shader.
   * - Scope: Rendering only (uniform uSizeMul).
   * - Range: 0.5× to 2.5×, default: 1.0×.
   * - Update: Immediate (GPU shader uniform).
   * - Measurable effect: Increases optical diffraction disc diameter and apparent brightness.
   */
  starSizeMultiplier: number;

  /**
   * Number of active star-forming nurseries / clusters.
   * - Meaning: Number of distinct star nurseries generated along spiral arms and bar tips.
   * - Scope: Physical / Model data.
   * - Range: 8 to 100 clusters, default: 36.
   * - Update: Procedural regeneration.
   * - Measurable effect: Changes cluster entities and nursery locations throughout the galaxy.
   */
  clusterCount: number;

  /**
   * Star cluster population and rendering particle density multiplier.
   * - Meaning: Density factor determining particles rendered per star cluster.
   * - Scope: Rendering GPU buffer.
   * - Range: 0.2× to 3.0× (10 to 96 particles/cluster), default: 1.0× (32 particles/cluster).
   * - Update: Immediate GPU buffer update.
   * - Measurable effect: More luminous, denser H II emission knots and cluster cores.
   */
  clusterDensityMultiplier: number;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Gas & Dust (Clouds) Parameters
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Diffuse galactic emission gas cloud tracer count.
   * - Meaning: Number of volumetric cloud particles tracing interstellar gas, ionization ridges, and diffuse light.
   * - Scope: Rendering GPU buffer.
   * - Range: 4,000 to 30,000 particles, default: 14,000.
   * - Update: Immediate GPU buffer update.
   * - Measurable effect: Increasing this actually creates more physical gas cloud tracers on GPU, filling out disk volume.
   */
  cloudCount: number;

  /**
   * Gas cloud spatial coverage and spread factor.
   * - Meaning: Gaussian spatial spread and radial dispersion of emission clouds along arm ridges.
   * - Scope: Rendering GPU buffer.
   * - Range: 0.5× (concentrated ridge filaments) to 2.0× (broad galactic haze), default: 1.0×.
   * - Update: Immediate GPU buffer update.
   * - Measurable effect: Changes the volumetric width and spatial extent of galactic clouds.
   */
  cloudCoverage: number;

  /**
   * Gas cloud emission opacity and brightness.
   * - Meaning: Emission shader uniform scaling factor for interstellar medium glow.
   * - Scope: Rendering only (shader uniform).
   * - Range: 0.0 (transparent) to 2.0 (luminous), default: 1.0×.
   * - Update: Immediate (GPU shader uniform).
   * - Measurable effect: Scales emission intensity without changing particle positions.
   */
  cloudOpacity: number;

  /**
   * Dark dust extinction lane tracer particle count.
   * - Meaning: Number of dark dust particles simulating silhouette absorption along concave arm edges and bar shocks.
   * - Scope: Rendering GPU buffer.
   * - Range: 1,500 to 12,000 particles, default: 4,800.
   * - Update: Immediate GPU buffer update.
   * - Measurable effect: Increasing this produces denser, more intricate dust filaments across the galaxy.
   */
  dustCount: number;

  /**
   * Dust shock lane spatial coverage and width.
   * - Meaning: Spatial offset and dispersion of dust lanes relative to spiral density waves.
   * - Scope: Rendering GPU buffer.
   * - Range: 0.5× to 2.0×, default: 1.0×.
   * - Update: Immediate GPU buffer update.
   * - Measurable effect: Thicker, broader dust absorption lanes vs razor-thin shock filaments.
   */
  dustCoverage: number;

  /**
   * Interstellar dust extinction lane opacity.
   * - Meaning: Silhouette opacity uniform (uOpacityMultiplier) for forward scattering and absorption.
   * - Scope: Rendering only (shader uniform).
   * - Range: 0.0 (transparent) to 2.0 (deeply opaque), default: 0.50.
   * - Update: Immediate (GPU shader uniform).
   * - Measurable effect: Increases silhouette contrast against background star field.
   */
  dustOpacity: number;

  /**
   * Extended stellar halo envelope opacity.
   * - Meaning: Shader uniform scaling for the faint Population II spheroidal envelope.
   * - Scope: Rendering only (shader uniform).
   * - Range: 0.0 (invisible) to 1.0 (dense), default: 0.35.
   * - Update: Immediate (GPU shader uniform).
   * - Measurable effect: Adjusts visibility of the faint outer stellar envelope.
   */
  haloOpacity: number;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Dynamics Parameters
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Rigid-body visual rotation speed multiplier.
   * - Meaning: Kinematic orientation rotation of the entire galaxy around the polar Y-axis.
   * - Scope: Rendering group transform.
   * - Range: 0.0× (static) to 5.0×, default: 1.0×.
   * - Update: Immediate (frame loop).
   * - Measurable effect: Controls how fast the observatory perspective spins around the galaxy.
   */
  visualRotationSpeed: number;

  /**
   * Internal differential stellar and gas orbital motion multiplier.
   * - Meaning: Drives differential accretion flows, jet knot velocities, and organic twinkling phases.
   * - Scope: Shader phase progression time.
   * - Range: 0.0× (frozen dynamic phases) to 5.0×, default: 1.0×.
   * - Update: Immediate (frame loop).
   * - Measurable effect: Modulates internal active flows without rotating outer frame.
   */
  orbitalMotionSpeed: number;

  /**
   * Simulation clock pause state.
   * - Meaning: Freezes all temporal advancement when true.
   * - Scope: Simulation clock.
   * - Default: false.
   * - Update: Immediate.
   * - Measurable effect: Halts both visual rotation and internal phase progression.
   */
  isPaused: boolean;

  /**
   * Simulation time dilation multiplier.
   * - Meaning: Time factor advancing the simulation clock.
   * - Scope: Simulation clock.
   * - Supported: 0.1×, 0.25×, 0.5×, 1.0×, 2.0×, 4.0×, 10.0×, default: 1.0×.
   * - Update: Immediate.
   * - Measurable effect: Scales delta time for all time-dependent shaders and kinematics.
   */
  timeSpeed: number;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. View & Camera Parameters
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Camera distance multiplier relative to waypoint framing.
   * - Meaning: Radial distance multiplier along the camera-to-target vector.
   * - Scope: Camera OrbitControls.
   * - Range: 0.3× (close-in inspection) to 3.0× (wide cosmic field), default: 1.0×.
   * - Update: Immediate (live camera position offset).
   * - Measurable effect: Immediately pulls camera closer or pushes further away along look-at axis.
   */
  cameraDistanceMultiplier: number;

  /**
   * Camera viewing elevation angle (tilt) in degrees.
   * - Meaning: Angle of camera above the galactic plane (-85° to +85°).
   * - Scope: Camera OrbitControls.
   * - Range: -85.0° (south pole) to +85.0° (north pole / top-down), default: 38.0°.
   * - Update: Immediate (spherical coordinates update).
   * - Measurable effect: Changes tilt angle from edge-on (0°) to oblique or top-down (85°).
   */
  cameraViewingAngle: number;

  /**
   * Camera viewing azimuth angle in degrees.
   * - Meaning: Horizontal rotation angle around the galactic polar axis.
   * - Scope: Camera OrbitControls.
   * - Range: -180.0° to +180.0°, default: 45.0°.
   * - Update: Immediate (spherical coordinates update).
   * - Measurable effect: Rotates viewing azimuth around the target center.
   */
  cameraAzimuthAngle: number;

  /**
   * Camera optical field of view in degrees.
   * - Meaning: Perspective camera lens focal angle.
   * - Scope: Camera projection matrix.
   * - Range: 25° (telephoto lens) to 90° (ultra-wide), default: 52°.
   * - Update: Immediate (camera.updateProjectionMatrix()).
   * - Measurable effect: Modifies perspective distortion and visual field width.
   */
  cameraFov: number;
}

/**
 * Documented canonical default observatory settings.
 */
export const DEFAULT_OBSERVATORY_SETTINGS: Readonly<GalaxyObservatorySettings> = Object.freeze({
  renderScale: 1.0,
  targetDiameterLy: 500000,
  armCount: 4,
  armPitchAngleDeg: 13.0,
  armWidthMult: 1.0,
  armWindingFactor: 0.62,
  bulgeRadiusFraction: 0.13,
  haloRadiusMultiplier: 1.5,
  starCount: 20000,
  starSizeMultiplier: 1.0,
  clusterCount: 36,
  clusterDensityMultiplier: 1.0,
  cloudCount: 14000,
  cloudCoverage: 1.0,
  cloudOpacity: 1.0,
  dustCount: 4800,
  dustCoverage: 1.0,
  dustOpacity: 0.50,
  haloOpacity: 0.35,
  visualRotationSpeed: 1.0,
  orbitalMotionSpeed: 1.0,
  isPaused: false,
  timeSpeed: 1.0,
  cameraDistanceMultiplier: 1.0,
  cameraViewingAngle: 38.0,
  cameraAzimuthAngle: 45.0,
  cameraFov: 52,
});

/**
 * Return a fresh copy of the default observatory settings.
 */
export function createDefaultObservatorySettings(): GalaxyObservatorySettings {
  return { ...DEFAULT_OBSERVATORY_SETTINGS };
}
