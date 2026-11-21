import { describe, it, expect } from 'vitest';
import {
  MARS_GEOLOGY,
  MOON_GEOLOGY,
  getPlanetaryGeology,
  sampleElevationMeters,
  haversineDistanceKm,
  findNearbyFeatures,
  convertPlanetocentricToCartesian,
  convertPlanetocentricToUV,
  GeologicalFeatureType,
} from '../src/astronomy/planetaryGeology';
import { MapProjectionType } from '../src/data/nasaPds';
import { createCanonicalSolarSystem } from '../src/universe/data/canonicalSolarSystem';
import { AstronomicalProvenance } from '../src/universe/AstronomicalProvenance';

describe('Mission 005B — Planetary Surfaces & Geology', () => {
  describe('Authoritative Datasets & DEM Metadata', () => {
    it('validates Mars Global Surveyor (MOLA) MEGDR metadata', () => {
      const mars = MARS_GEOLOGY;
      expect(mars.bodyName).toBe('Mars');
      expect(mars.bodyId).toBe('mars');
      expect(mars.dem.productId).toBe('MGS-M-MOLA-5-MEGDR-L3-V1.0');
      expect(mars.dem.mission).toContain('Mars Global Surveyor');
      expect(mars.dem.instrument).toContain('MOLA');
      expect(mars.dem.verticalDatum).toContain('MOLA Areoid');
      expect(mars.dem.verticalAccuracyMeters).toBe(1.0);
      expect(mars.dem.minElevationMeters).toBe(-8200);
      expect(mars.dem.maxElevationMeters).toBe(21229);
      expect(mars.dem.maxElevationMeters - mars.dem.minElevationMeters).toBe(29429);
      expect(mars.meanCrustalThicknessKm).toBeCloseTo(45, 0);
      expect(mars.crustalThickness.uncertaintyRangeKm).toEqual([30, 72]);
      expect(mars.dem.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(mars.crustalThickness.provenance.classification).toBe(
        AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS
      );
      expect(mars.provenance.classification).toBe(
        AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS
      );
      expect(mars.provenance.sourceArchive).toContain('NASA PDS Geosciences Node');
    });

    it('validates Lunar Reconnaissance Orbiter (LOLA) GDR metadata', () => {
      const moon = MOON_GEOLOGY;
      expect(moon.bodyName).toBe('Moon (Luna)');
      expect(moon.bodyId).toBe('moon');
      expect(moon.dem.productId).toBe('LRO-L-LOLA-4-GDR-V1.0');
      expect(moon.dem.mission).toContain('Lunar Reconnaissance Orbiter');
      expect(moon.dem.instrument).toContain('LOLA');
      expect(moon.dem.verticalDatum).toContain('1,737,400 meters');
      expect(moon.dem.verticalAccuracyMeters).toBeCloseTo(0.8, 1);
      expect(moon.dem.minElevationMeters).toBe(-9120);
      expect(moon.dem.maxElevationMeters).toBe(10786);
      expect(moon.dem.maxElevationMeters - moon.dem.minElevationMeters).toBe(19906);
      expect(moon.meanCrustalThicknessKm).toBeCloseTo(38, 0);
      expect(moon.crustalThickness.uncertaintyRangeKm).toEqual([34, 43]);
      expect(moon.dem.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(moon.crustalThickness.provenance.classification).toBe(
        AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS
      );
      expect(moon.provenance.classification).toBe(
        AstronomicalProvenance.DERIVED_FROM_OBSERVATIONS
      );
      expect(moon.provenance.sourceArchive).toContain('NASA PDS Geosciences Node');
    });

    it('retrieves geology by body name, id, or object', () => {
      expect(getPlanetaryGeology('Mars')).toBe(MARS_GEOLOGY);
      expect(getPlanetaryGeology('mars')).toBe(MARS_GEOLOGY);
      expect(getPlanetaryGeology(MARS_GEOLOGY)).toBe(MARS_GEOLOGY);
      expect(getPlanetaryGeology('Moon')).toBe(MOON_GEOLOGY);
      expect(getPlanetaryGeology('Luna')).toBe(MOON_GEOLOGY);
      expect(getPlanetaryGeology('moon (luna)')).toBe(MOON_GEOLOGY);
      expect(getPlanetaryGeology(MOON_GEOLOGY)).toBe(MOON_GEOLOGY);
      expect(getPlanetaryGeology('Jupiter')).toBeNull();
      expect(getPlanetaryGeology('earth')).toBeNull();
    });
  });

  describe('IAU Planetocentric Coordinate Transformations', () => {
    it('transforms planetocentric coordinates to Cartesian simulation space (Y-up)', () => {
      const R = 3389500; // Mars mean radius (m)

      // North Pole (90°N, 0°E) -> Along +Y
      const northPole = convertPlanetocentricToCartesian(90, 0, R, 0);
      expect(northPole.y).toBeCloseTo(R, 1);
      expect(northPole.x).toBeCloseTo(0, 1);
      expect(northPole.z).toBeCloseTo(0, 1);

      // South Pole (-90°N, 0°E) -> Along -Y
      const southPole = convertPlanetocentricToCartesian(-90, 0, R, 0);
      expect(southPole.y).toBeCloseTo(-R, 1);
      expect(southPole.x).toBeCloseTo(0, 1);
      expect(southPole.z).toBeCloseTo(0, 1);

      // Equator at Prime Meridian (0°N, 0°E) -> (x=0, y=0, z=R)
      const primeMeridian = convertPlanetocentricToCartesian(0, 0, R, 0);
      expect(primeMeridian.y).toBeCloseTo(0, 1);
      expect(primeMeridian.x).toBeCloseTo(0, 1);
      expect(primeMeridian.z).toBeCloseTo(R, 1);

      // Equator at 90° East (0°N, 90°E) -> (x=R, y=0, z=0)
      const ninetyEast = convertPlanetocentricToCartesian(0, 90, R, 0);
      expect(ninetyEast.y).toBeCloseTo(0, 1);
      expect(ninetyEast.x).toBeCloseTo(R, 1);
      expect(ninetyEast.z).toBeCloseTo(0, 1);

      // Elevation offset adds directly to radius
      const elevated = convertPlanetocentricToCartesian(0, 0, R, 21229);
      expect(elevated.z).toBeCloseTo(R + 21229, 1);
    });

    it('transforms planetocentric coordinates to Equirectangular UVs', () => {
      // (0°N, 0°E) -> u=0, v=0.5
      const origin = convertPlanetocentricToUV(0, 0, MapProjectionType.EQUIRECTANGULAR);
      expect(origin.u).toBeCloseTo(0.0, 4);
      expect(origin.v).toBeCloseTo(0.5, 4);

      // (90°N, 180°E) -> u=0.5, v=1.0
      const north180 = convertPlanetocentricToUV(90, 180, MapProjectionType.EQUIRECTANGULAR);
      expect(north180.u).toBeCloseTo(0.5, 4);
      expect(north180.v).toBeCloseTo(1.0, 4);

      // (-90°N, 360°E) -> u=0.0 (wrapped), v=0.0
      const south360 = convertPlanetocentricToUV(-90, 360, MapProjectionType.EQUIRECTANGULAR);
      expect(south360.u).toBeCloseTo(0.0, 4);
      expect(south360.v).toBeCloseTo(0.0, 4);
    });

    it('transforms planetocentric coordinates to Orthographic and Polar UVs', () => {
      const ortho = convertPlanetocentricToUV(18.65, 226.2, MapProjectionType.ORTHOGRAPHIC);
      expect(ortho.u).toBeGreaterThanOrEqual(0);
      expect(ortho.u).toBeLessThanOrEqual(1);
      expect(ortho.v).toBeGreaterThanOrEqual(0);
      expect(ortho.v).toBeLessThanOrEqual(1);

      const polar = convertPlanetocentricToUV(85.0, 45.0, MapProjectionType.POLAR_STEREOGRAPHIC);
      expect(polar.u).toBeGreaterThanOrEqual(0);
      expect(polar.u).toBeLessThanOrEqual(1);
      expect(polar.v).toBeGreaterThanOrEqual(0);
      expect(polar.v).toBeLessThanOrEqual(1);
    });
  });

  describe('Elevation Sampling & Extrema Verification', () => {
    it('samples peak elevation at Olympus Mons on Mars', () => {
      // Olympus Mons caldera at ~ (18.65°N, 226.2°E)
      const elev = sampleElevationMeters(MARS_GEOLOGY, 18.65, 226.2);
      expect(elev).not.toBeNull();
      expect(elev!).toBeGreaterThan(18000);
      expect(elev!).toBeLessThanOrEqual(MARS_GEOLOGY.dem.maxElevationMeters);
    });

    it('samples lowest elevation at Hellas Planitia on Mars', () => {
      // Hellas Planitia deep basin at ~ (-42.4°N, 70.5°E)
      const elev = sampleElevationMeters(MARS_GEOLOGY, -42.4, 70.5);
      expect(elev).not.toBeNull();
      expect(elev!).toBeLessThan(-7500);
      expect(elev!).toBeGreaterThanOrEqual(MARS_GEOLOGY.dem.minElevationMeters);
    });

    it('samples elevation bounds across global Martian test grid', () => {
      const testCoordinates: [number, number][] = [
        [0, 0],
        [45, 90],
        [-30, 180],
        [70, 270],
        [-85, 330],
        [-5.4, 137.8], // Gale
        [18.38, 77.58], // Jezero
      ];

      for (const [lat, lon] of testCoordinates) {
        const elev = sampleElevationMeters('mars', lat, lon);
        expect(elev).not.toBeNull();
        expect(elev!).toBeGreaterThanOrEqual(MARS_GEOLOGY.dem.minElevationMeters);
        expect(elev!).toBeLessThanOrEqual(MARS_GEOLOGY.dem.maxElevationMeters);
      }
    });

    it('samples deepest depression at Antoniadi Crater on the Moon', () => {
      // Antoniadi crater floor in SPA at ~ (-69.7°N, 188.0°E)
      const elev = sampleElevationMeters(MOON_GEOLOGY, -69.7, 188.0);
      expect(elev).not.toBeNull();
      expect(elev!).toBeLessThan(-8500);
      expect(elev!).toBeGreaterThanOrEqual(MOON_GEOLOGY.dem.minElevationMeters);
    });

    it('samples highest elevation near Engelgardt crater on the Moon', () => {
      // Highest point on Moon near rim of Engel'gardt at ~ (5.41°N, 201.37°E)
      const elev = sampleElevationMeters(MOON_GEOLOGY, 5.41, 201.37);
      expect(elev).not.toBeNull();
      expect(elev!).toBeGreaterThan(9500);
      expect(elev!).toBeLessThanOrEqual(MOON_GEOLOGY.dem.maxElevationMeters);
    });

    it('samples elevation bounds across global Lunar test grid', () => {
      const testCoordinates: [number, number][] = [
        [0, 0],
        [0.674, 23.473], // Apollo 11
        [-43.31, 348.64], // Tycho
        [9.62, 339.92], // Copernicus
        [-89.67, 129.78], // Shackleton
        [-50, 180], // SPA basin
      ];

      for (const [lat, lon] of testCoordinates) {
        const elev = sampleElevationMeters('moon', lat, lon);
        expect(elev).not.toBeNull();
        expect(elev!).toBeGreaterThanOrEqual(MOON_GEOLOGY.dem.minElevationMeters);
        expect(elev!).toBeLessThanOrEqual(MOON_GEOLOGY.dem.maxElevationMeters);
      }
    });
  });

  describe('Geological Feature Catalogue & Nomenclature', () => {
    it('verifies Mars features conform to IAU WGPSN standards', () => {
      const features = MARS_GEOLOGY.majorFeatures;
      expect(features.length).toBeGreaterThanOrEqual(10);

      const olympus = features.find((f) => f.id === 'olympus-mons');
      expect(olympus).toBeDefined();
      expect(olympus?.featureType).toBe(GeologicalFeatureType.VOLCANO_MONS);
      expect(olympus?.diameterKm).toBeCloseTo(624, 0);
      expect(olympus?.elevationMeters).toBe(21229);

      const valles = features.find((f) => f.id === 'valles-marineris');
      expect(valles).toBeDefined();
      expect(valles?.featureType).toBe(GeologicalFeatureType.CANYON_VALLIS);
      expect(valles?.diameterKm).toBe(4000);

      const gale = features.find((f) => f.id === 'gale-crater');
      expect(gale).toBeDefined();
      expect(gale?.featureType).toBe(GeologicalFeatureType.IMPACT_CRATER);
      expect(gale?.description).toContain('Curiosity');

      const jezero = features.find((f) => f.id === 'jezero-crater');
      expect(jezero).toBeDefined();
      expect(jezero?.featureType).toBe(GeologicalFeatureType.IMPACT_CRATER);
      expect(jezero?.description).toContain('Perseverance');

      // Check all features have valid coordinates and diameters
      for (const f of features) {
        expect(f.latitudeDeg).toBeGreaterThanOrEqual(-90);
        expect(f.latitudeDeg).toBeLessThanOrEqual(90);
        expect(f.longitudeDeg).toBeGreaterThanOrEqual(0);
        expect(f.longitudeDeg).toBeLessThan(360);
        expect(f.diameterKm).toBeGreaterThan(0);
        expect(f.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      }
    });

    it('verifies Moon features conform to IAU WGPSN standards', () => {
      const features = MOON_GEOLOGY.majorFeatures;
      expect(features.length).toBeGreaterThanOrEqual(10);

      const tycho = features.find((f) => f.id === 'tycho-crater');
      expect(tycho).toBeDefined();
      expect(tycho?.featureType).toBe(GeologicalFeatureType.IMPACT_CRATER);
      expect(tycho?.diameterKm).toBe(85);

      const copernicus = features.find((f) => f.id === 'copernicus-crater');
      expect(copernicus).toBeDefined();
      expect(copernicus?.featureType).toBe(GeologicalFeatureType.IMPACT_CRATER);
      expect(copernicus?.diameterKm).toBe(93);

      const shackleton = features.find((f) => f.id === 'shackleton-crater');
      expect(shackleton).toBeDefined();
      expect(shackleton?.latitudeDeg).toBeCloseTo(-89.67, 1);
      expect(shackleton?.description.toLowerCase()).toContain('permanently shadowed');

      const apollo11 = features.find((f) => f.id === 'mare-tranquillitatis');
      expect(apollo11).toBeDefined();
      expect(apollo11?.featureType).toBe(GeologicalFeatureType.MARE_BASALT_PLAIN);
      expect(apollo11?.description).toContain('Apollo 11');

      for (const f of features) {
        expect(f.latitudeDeg).toBeGreaterThanOrEqual(-90);
        expect(f.latitudeDeg).toBeLessThanOrEqual(90);
        expect(f.longitudeDeg).toBeGreaterThanOrEqual(0);
        expect(f.longitudeDeg).toBeLessThan(360);
        expect(f.diameterKm).toBeGreaterThan(0);
        expect(f.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      }
    });
  });

  describe('Stratigraphic Eras & Chronology', () => {
    it('verifies Mars stratigraphic eras chronology', () => {
      const eras = MARS_GEOLOGY.stratigraphicEras;
      expect(eras.length).toBe(3);
      expect(eras[0].name).toBe('Noachian');
      expect(eras[1].name).toBe('Hesperian');
      expect(eras[2].name).toBe('Amazonian');
      expect(eras[0].ageRangeGa).toContain('4.1 – 3.7 Ga');
    });

    it('verifies Moon stratigraphic eras chronology', () => {
      const eras = MOON_GEOLOGY.stratigraphicEras;
      expect(eras.length).toBe(5);
      expect(eras[0].name).toBe('Pre-Nectarian');
      expect(eras[1].name).toBe('Nectarian');
      expect(eras[2].name).toBe('Imbrian');
      expect(eras[3].name).toBe('Eratosthenian');
      expect(eras[4].name).toBe('Copernican');
    });
  });

  describe('Spatial Calculations & Proximity Search', () => {
    it('computes haversine distances correctly on Mars', () => {
      const R = MARS_GEOLOGY.meanRadiusKm;

      // Distance from a point to itself is 0
      expect(haversineDistanceKm(0, 0, 0, 0, R)).toBeCloseTo(0, 4);

      // Distance from North pole to South pole is pi * R
      const poleToPole = haversineDistanceKm(90, 0, -90, 0, R);
      expect(poleToPole).toBeCloseTo(Math.PI * R, 0);

      // Quarter sphere distance is pi/2 * R
      const equatorToPole = haversineDistanceKm(0, 0, 90, 0, R);
      expect(equatorToPole).toBeCloseTo((Math.PI / 2) * R, 0);
    });

    it('finds nearby features around target landing site', () => {
      // Search exactly at Gale Crater coordinates (-5.37°N, 137.44°E)
      const exact = findNearbyFeatures(MARS_GEOLOGY, -5.37, 137.44, 200);
      expect(exact.length).toBeGreaterThanOrEqual(1);
      expect(exact[0].feature.id).toBe('gale-crater');
      expect(exact[0].distanceKm).toBeCloseTo(0, 1);

      // Search with slight offset (-5.4°N, 137.8°E) finds Gale Crater within 200 km
      const nearby = findNearbyFeatures(MARS_GEOLOGY, -5.4, 137.8, 200);
      expect(nearby.length).toBeGreaterThanOrEqual(1);
      expect(nearby[0].feature.id).toBe('gale-crater');
      expect(nearby[0].distanceKm).toBeCloseTo(21.28, 1);

      // Search with radius 0 km yields empty results
      const empty = findNearbyFeatures(MARS_GEOLOGY, 0, 0, 0);
      expect(empty).toHaveLength(0);
    });
  });

  describe('Integration with Canonical Solar System & CelestialBody', () => {
    it('verifies Mars in Canonical Solar System contains authoritative geology', () => {
      const solarSystem = createCanonicalSolarSystem();
      const mars = solarSystem.planets.find((p) => p.id === 'mars');

      expect(mars).toBeDefined();
      expect(mars?.geology).toBeDefined();
      expect(mars?.geology?.bodyName).toBe('Mars');
      expect(mars?.geology?.dem.productId).toBe('MGS-M-MOLA-5-MEGDR-L3-V1.0');
      expect(mars?.geology?.majorFeatures.length).toBeGreaterThanOrEqual(10);
    });

    it('verifies the Moon in Canonical Solar System contains authoritative geology', () => {
      const solarSystem = createCanonicalSolarSystem();
      const moon = solarSystem.moons.find((m) => m.id === 'moon');

      expect(moon).toBeDefined();
      expect(moon?.geology).toBeDefined();
      expect(moon?.geology?.bodyName).toBe('Moon (Luna)');
      expect(moon?.geology?.dem.productId).toBe('LRO-L-LOLA-4-GDR-V1.0');
      expect(moon?.geology?.majorFeatures.length).toBeGreaterThanOrEqual(10);
    });
  });
});
