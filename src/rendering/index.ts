/**
 * ASTRAVERSA Ω — Rendering Module Index
 */

export { Scene } from './Scene';
export { StarRenderer } from './StarRenderer';
export { PlanetRenderer } from './PlanetRenderer';
export { OrbitRenderer } from './OrbitRenderer';
export { CelestialBodyRenderer } from './CelestialBodyRenderer';

// Mission 002 — Galaxy Rendering & Cinematic Observatory
export {
  GalaxyRenderer,
  DEFAULT_LAYER_VISIBILITY,
  type GalaxyLayerVisibility,
} from './GalaxyRenderer';
export {
  GalaxyScene,
  type CameraPreset,
  type GalaxyTelemetry,
} from './GalaxyScene';
export {
  type GalaxyObservatorySettings,
  DEFAULT_OBSERVATORY_SETTINGS,
  createDefaultObservatorySettings,
  computeActiveRenderedStars,
} from './GalaxyObservatoryTypes';

