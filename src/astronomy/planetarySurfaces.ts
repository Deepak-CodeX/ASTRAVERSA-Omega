/**
 * ASTRAVERSA Ω — Planetary Surfaces & Textures Manifest
 *
 * Connects 3D celestial body renderers to scientifically validated planetary surface maps,
 * textures, and multispectral elevation datasets from NASA PDS, ESA, and USGS Astrogeology.
 *
 * Epistemic Provenance: OBSERVED (NASA PDS / ESA / USGS)
 */

import type { ProvenanceRecord } from '../universe/AstronomicalProvenance';
import { PDS_CANONICAL_PRODUCTS, type MapProjectionType } from '../data/nasaPds';

export interface PlanetarySurfaceManifest {
  bodyId: string;
  name: string;
  pdsProductId: string;
  projection: MapProjectionType;
  resolutionMetersPerPixel?: number;
  baseColor: string;
  secondaryColor?: string;
  hasAtmosphere: boolean;
  atmosphereColor?: string;
  atmosphereScaleHeightMeters?: number;
  hasRingSystem?: boolean;
  ringInnerRadiusMeters?: number;
  ringOuterRadiusMeters?: number;
  provenance: ProvenanceRecord;
}

/**
 * Surface texture manifests for all major bodies in the canonical Solar System.
 */
export const PLANETARY_SURFACE_MANIFESTS: Record<string, PlanetarySurfaceManifest> = {
  sun: {
    bodyId: 'sun',
    name: 'Sun (Sol)',
    pdsProductId: PDS_CANONICAL_PRODUCTS.sun.productId,
    projection: PDS_CANONICAL_PRODUCTS.sun.projection,
    baseColor: '#ffcc33',
    secondaryColor: '#ff6600',
    hasAtmosphere: false,
    provenance: PDS_CANONICAL_PRODUCTS.sun.provenance,
  },
  mercury: {
    bodyId: 'mercury',
    name: 'Mercury',
    pdsProductId: PDS_CANONICAL_PRODUCTS.mercury.productId,
    projection: PDS_CANONICAL_PRODUCTS.mercury.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.mercury.resolutionMetersPerPixel,
    baseColor: '#9e9e9e',
    secondaryColor: '#5c544d',
    hasAtmosphere: false,
    provenance: PDS_CANONICAL_PRODUCTS.mercury.provenance,
  },
  venus: {
    bodyId: 'venus',
    name: 'Venus',
    pdsProductId: PDS_CANONICAL_PRODUCTS.venus.productId,
    projection: PDS_CANONICAL_PRODUCTS.venus.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.venus.resolutionMetersPerPixel,
    baseColor: '#e0a96d',
    secondaryColor: '#c2854e',
    hasAtmosphere: true,
    atmosphereColor: '#ffeaa7',
    atmosphereScaleHeightMeters: 15900,
    provenance: PDS_CANONICAL_PRODUCTS.venus.provenance,
  },
  earth: {
    bodyId: 'earth',
    name: 'Earth',
    pdsProductId: PDS_CANONICAL_PRODUCTS.earth.productId,
    projection: PDS_CANONICAL_PRODUCTS.earth.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.earth.resolutionMetersPerPixel,
    baseColor: '#1e3799', // ocean blue
    secondaryColor: '#2ed573', // continent green/brown
    hasAtmosphere: true,
    atmosphereColor: '#4a69bd',
    atmosphereScaleHeightMeters: 8500,
    provenance: PDS_CANONICAL_PRODUCTS.earth.provenance,
  },
  moon: {
    bodyId: 'moon',
    name: 'Moon (Luna)',
    pdsProductId: PDS_CANONICAL_PRODUCTS.moon.productId,
    projection: PDS_CANONICAL_PRODUCTS.moon.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.moon.resolutionMetersPerPixel,
    baseColor: '#c0c0c0',
    secondaryColor: '#707070',
    hasAtmosphere: false,
    provenance: PDS_CANONICAL_PRODUCTS.moon.provenance,
  },
  mars: {
    bodyId: 'mars',
    name: 'Mars',
    pdsProductId: PDS_CANONICAL_PRODUCTS.mars.productId,
    projection: PDS_CANONICAL_PRODUCTS.mars.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.mars.resolutionMetersPerPixel,
    baseColor: '#c1440e',
    secondaryColor: '#8a2b08',
    hasAtmosphere: true,
    atmosphereColor: '#e58e26',
    atmosphereScaleHeightMeters: 11100,
    provenance: PDS_CANONICAL_PRODUCTS.mars.provenance,
  },
  jupiter: {
    bodyId: 'jupiter',
    name: 'Jupiter',
    pdsProductId: PDS_CANONICAL_PRODUCTS.jupiter.productId,
    projection: PDS_CANONICAL_PRODUCTS.jupiter.projection,
    resolutionMetersPerPixel: PDS_CANONICAL_PRODUCTS.jupiter.resolutionMetersPerPixel,
    baseColor: '#c88b3a',
    secondaryColor: '#e0c088',
    hasAtmosphere: true,
    atmosphereColor: '#dfb76c',
    atmosphereScaleHeightMeters: 27000,
    hasRingSystem: true,
    ringInnerRadiusMeters: 92000000,
    ringOuterRadiusMeters: 182000000,
    provenance: PDS_CANONICAL_PRODUCTS.jupiter.provenance,
  },
  saturn: {
    bodyId: 'saturn',
    name: 'Saturn',
    pdsProductId: PDS_CANONICAL_PRODUCTS.saturn.productId,
    projection: PDS_CANONICAL_PRODUCTS.saturn.projection,
    baseColor: '#e4d5b7',
    secondaryColor: '#bfa378',
    hasAtmosphere: true,
    atmosphereColor: '#f7f1e3',
    atmosphereScaleHeightMeters: 59500,
    hasRingSystem: true,
    ringInnerRadiusMeters: 66900000, // C Ring inner
    ringOuterRadiusMeters: 140220000, // A Ring outer
    provenance: PDS_CANONICAL_PRODUCTS.saturn.provenance,
  },
  uranus: {
    bodyId: 'uranus',
    name: 'Uranus',
    pdsProductId: PDS_CANONICAL_PRODUCTS.uranus.productId,
    projection: PDS_CANONICAL_PRODUCTS.uranus.projection,
    baseColor: '#4b70dd',
    secondaryColor: '#70a1ff',
    hasAtmosphere: true,
    atmosphereColor: '#70a1ff',
    atmosphereScaleHeightMeters: 27700,
    hasRingSystem: true,
    ringInnerRadiusMeters: 38000000,
    ringOuterRadiusMeters: 51149000,
    provenance: PDS_CANONICAL_PRODUCTS.uranus.provenance,
  },
  neptune: {
    bodyId: 'neptune',
    name: 'Neptune',
    pdsProductId: PDS_CANONICAL_PRODUCTS.neptune.productId,
    projection: PDS_CANONICAL_PRODUCTS.neptune.projection,
    baseColor: '#274687',
    secondaryColor: '#3742fa',
    hasAtmosphere: true,
    atmosphereColor: '#3867d6',
    atmosphereScaleHeightMeters: 20000,
    hasRingSystem: true,
    ringInnerRadiusMeters: 41900000,
    ringOuterRadiusMeters: 62930000,
    provenance: PDS_CANONICAL_PRODUCTS.neptune.provenance,
  },
};

/**
 * Get surface manifest for a celestial body by ID or name.
 */
export function getPlanetarySurfaceManifest(idOrName: string): PlanetarySurfaceManifest | null {
  const key = idOrName.toLowerCase().trim();
  if (PLANETARY_SURFACE_MANIFESTS[key]) {
    return PLANETARY_SURFACE_MANIFESTS[key];
  }
  for (const m of Object.values(PLANETARY_SURFACE_MANIFESTS)) {
    if (m.name.toLowerCase().includes(key) || key.includes(m.name.toLowerCase())) {
      return m;
    }
  }
  return null;
}
