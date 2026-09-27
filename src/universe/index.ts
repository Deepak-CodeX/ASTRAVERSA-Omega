/**
 * ASTRAVERSA Ω — Universe Module Index
 */

export { SeededRandom } from './SeededRandom';
export { CelestialBodyType, createCelestialBody } from './CelestialBody';
export type { CelestialBody, StarProperties, PlanetProperties } from './CelestialBody';
export { generateSolarSystem } from './SolarSystemGenerator';
export type { SolarSystem } from './SolarSystemGenerator';
export { Universe } from './Universe';

// Mission 002 — Galaxy
export { GalaxyType, QualityLevel, QUALITY_STAR_COUNTS, ViewLevel } from './Galaxy';
export type {
  Galaxy,
  GalaxyStar,
  StarCluster,
  SpiralArmParams,
  BulgeParams,
  NavigationState,
} from './Galaxy';
export { generateGalaxy } from './GalaxyGenerator';
export type { GalaxyGenerationConfig } from './GalaxyGenerator';
