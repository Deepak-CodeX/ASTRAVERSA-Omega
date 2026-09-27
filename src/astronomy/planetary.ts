/**
 * ASTRAVERSA Ω — Planetary Properties
 *
 * Simplified planetary property generation and orbital mechanics.
 *
 * This module provides:
 * - Planet type classification (rocky, gas giant, ice giant)
 * - Circular orbit velocity calculation
 * - Planetary property ranges
 *
 * All orbital mechanics use Newtonian gravity with circular orbit approximations
 * for the initial implementation. Elliptical orbits are a future milestone.
 *
 * See TATTVA.md for simplifications and limitations.
 */

import { G, EARTH_MASS, EARTH_RADIUS, JUPITER_MASS, JUPITER_RADIUS } from './constants';

/**
 * Classification of planet types.
 * Simplified to three categories for Mission 001.
 */
export const PlanetType = {
  ROCKY: 'ROCKY',
  GAS_GIANT: 'GAS_GIANT',
  ICE_GIANT: 'ICE_GIANT',
} as const;
export type PlanetType = typeof PlanetType[keyof typeof PlanetType];

/**
 * Properties specific to a planet.
 */
export interface PlanetaryProperties {
  planetType: PlanetType;
  mass: number;          // kg
  radius: number;        // m
  orbitalRadius: number; // m (semi-major axis, circular approximation)
  orbitalVelocity: number; // m/s
  orbitalPeriod: number; // seconds
  color: string;         // CSS color for rendering
}

/**
 * Planet type property ranges (in Earth/Jupiter units).
 */
const PLANET_TYPE_DATA: Record<PlanetType, {
  massMin: number;   // Earth masses
  massMax: number;
  radiusMin: number; // Earth radii
  radiusMax: number;
  colors: string[];
}> = {
  [PlanetType.ROCKY]: {
    massMin: 0.1,
    massMax: 5,
    radiusMin: 0.4,
    radiusMax: 1.6,
    colors: ['#c4a882', '#8b7355', '#a0522d', '#cd853f', '#8b4513', '#b8860b'],
  },
  [PlanetType.GAS_GIANT]: {
    massMin: 50,
    massMax: 4000,
    radiusMin: 6,
    radiusMax: 15,
    colors: ['#daa520', '#cd853f', '#f4a460', '#d2691e', '#b8860b', '#deb887'],
  },
  [PlanetType.ICE_GIANT]: {
    massMin: 10,
    massMax: 50,
    radiusMin: 3,
    radiusMax: 6,
    colors: ['#4682b4', '#5f9ea0', '#87ceeb', '#6495ed', '#7b98b5', '#708090'],
  },
};

/**
 * Determine planet type based on orbital distance from star (in AU).
 * Simplified zone model: rocky < 2 AU, gas giant 2-10 AU, ice giant > 10 AU.
 */
export function getPlanetType(orbitalRadiusAU: number): PlanetType {
  if (orbitalRadiusAU < 2) return PlanetType.ROCKY;
  if (orbitalRadiusAU < 10) return PlanetType.GAS_GIANT;
  return PlanetType.ICE_GIANT;
}

/**
 * Get property ranges for a planet type.
 */
export function getPlanetTypeData(type: PlanetType) {
  return PLANET_TYPE_DATA[type];
}

/**
 * Compute circular orbital velocity for a body orbiting a central mass.
 *
 * v = sqrt(G * M / r)
 *
 * @param centralMass - Mass of the central body (kg)
 * @param orbitalRadius - Orbital radius (m)
 * @returns Orbital velocity (m/s)
 */
export function circularOrbitalVelocity(centralMass: number, orbitalRadius: number): number {
  return Math.sqrt(G * centralMass / orbitalRadius);
}

/**
 * Compute orbital period for a circular orbit.
 *
 * T = 2π * r / v = 2π * sqrt(r³ / (G * M))
 *
 * @param centralMass - Mass of the central body (kg)
 * @param orbitalRadius - Orbital radius (m)
 * @returns Orbital period (seconds)
 */
export function orbitalPeriod(centralMass: number, orbitalRadius: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(orbitalRadius, 3) / (G * centralMass));
}

/**
 * Convert mass from Earth masses to kg.
 */
export function earthMassesToKg(earthMasses: number): number {
  return earthMasses * EARTH_MASS;
}

/**
 * Convert radius from Earth radii to meters.
 */
export function earthRadiiToMeters(earthRadii: number): number {
  return earthRadii * EARTH_RADIUS;
}

/**
 * Convert mass from Jupiter masses to kg.
 */
export function jupiterMassesToKg(jupiterMasses: number): number {
  return jupiterMasses * JUPITER_MASS;
}

/**
 * Convert radius from Jupiter radii to meters.
 */
export function jupiterRadiiToMeters(jupiterRadii: number): number {
  return jupiterRadii * JUPITER_RADIUS;
}
