/**
 * ASTRAVERSA Ω — Astronomical Data Ingestion Architectures Tests (Mission 002B)
 *
 * Verifies data ingestion and parsing architectures for:
 * 1. NASA / JPL Horizons API:
 *    - Query URL construction for state vectors
 *    - Target body codes registry
 *    - Raw vector output parsing with km to meters conversion and 3D coordinate mapping
 * 2. NASA Planetary Data System (PDS):
 *    - Cartographic products registry (Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)
 *    - Map projections and instrument citations
 * 3. NASA Exoplanet Archive:
 *    - TAP sync query URL builder
 *    - Confirmed exoplanet benchmark records (TRAPPIST-1 e, Kepler-186 f)
 * 4. ESA Gaia DR3:
 *    - Astrometric record parser
 *    - Parallax mas to parsecs distance conversion (d = 1000 / parallax)
 *    - ICRS equatorial to Galactocentric Cartesian coordinates transformation
 */

import { describe, it, expect } from 'vitest';
import {
  buildHorizonsApiUrl,
  parseHorizonsVectorOutput,
  HORIZONS_TARGET_CODES,
} from '../src/data/jplHorizons';
import {
  PDS_CANONICAL_PRODUCTS,
  MapProjectionType,
} from '../src/data/nasaPds';
import {
  buildExoplanetTapUrl,
  BENCHMARK_EXOPLANETS,
} from '../src/data/nasaExoplanetArchive';
import {
  parseGaiaRecord,
  icrsToGalactocentricKpc,
} from '../src/data/esaGaia';
import { AstronomicalProvenance } from '../src/universe/AstronomicalProvenance';

describe('Mission 002B — Astronomical Data Ingestion Architectures', () => {
  describe('NASA / JPL Horizons API', () => {
    it('constructs well-formed Horizons API vector query URLs', () => {
      const url = buildHorizonsApiUrl({
        targetCommand: HORIZONS_TARGET_CODES.EARTH,
        center: '@0',
        startTime: '2025-01-01',
        stopTime: '2025-01-02',
        stepSize: '1d',
      });

      expect(url).toContain('https://ssd-api.jpl.nasa.gov/horizons.api');
      expect(url).toContain('COMMAND=%27399%27');
      expect(url).toContain('CENTER=%27%400%27');
      expect(url).toContain('EPHEM_TYPE=VECTORS');
      expect(url).toContain('OUT_UNITS=KM-S');
    });

    it('parses raw Horizons vector output and converts km to meters with Y-up simulation mapping', () => {
      const sampleHorizonsText = `
*******************************************************************************
$$SOE
2451545.000000000 = A.D. 2000-Jan-01 12:00:00.0000 TDB 
 X =-2.470405230043878E+07 Y = 1.328328701625946E+08 Z = 5.759492160690022E+07
 VX=-2.983995818784347E+01 VY=-4.832269938561421E+00 VZ=-2.095593125211925E+00
 LT= 4.908028795556209E+02 RG= 1.471391942129759E+08 RR= 1.157640248887853E-01
$$EOE
*******************************************************************************
      `;

      const vectors = parseHorizonsVectorOutput(sampleHorizonsText, '399', 'Earth');

      expect(vectors.length).toBe(1);
      const v = vectors[0];
      expect(v.targetId).toBe('399');
      expect(v.targetName).toBe('Earth');
      expect(v.julianDate).toBe(2451545.0);
      expect(v.calendarDate).toContain('2000-Jan-01');

      // km to meters conversion:
      // pos.x = X * 1000 = -2.470405230043878e10
      // pos.y = Z * 1000 = 5.759492160690022e10
      // pos.z = -Y * 1000 = -1.328328701625946e11
      expect(v.position.x).toBeCloseTo(-2.470405230043878e10, -5);
      expect(v.position.y).toBeCloseTo(5.759492160690022e10, -5);
      expect(v.position.z).toBeCloseTo(-1.328328701625946e11, -5);

      // km/s to m/s conversion: -29.839 km/s = -29839.95 m/s
      expect(v.velocity.x).toBeCloseTo(-29839.958, 2);

      // Provenance
      expect(v.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(v.provenance.sourceArchive).toContain('JPL Horizons');
    });

    it('returns empty array if Horizons markers $$SOE / $$EOE are absent', () => {
      const invalidText = 'Error 404: Body not found';
      const result = parseHorizonsVectorOutput(invalidText, '999', 'Invalid');
      expect(result).toEqual([]);
    });
  });

  describe('NASA Planetary Data System (PDS)', () => {
    it('registers canonical PDS products for Sun and all 8 planets', () => {
      const keys = Object.keys(PDS_CANONICAL_PRODUCTS);
      expect(keys).toContain('sun');
      expect(keys).toContain('mercury');
      expect(keys).toContain('venus');
      expect(keys).toContain('earth');
      expect(keys).toContain('mars');
      expect(keys).toContain('jupiter');
      expect(keys).toContain('saturn');
      expect(keys).toContain('uranus');
      expect(keys).toContain('neptune');
      expect(keys).toContain('moon');
    });

    it('contains valid cartographic metadata and projections', () => {
      const earthProduct = PDS_CANONICAL_PRODUCTS['earth'];
      expect(earthProduct.targetBody).toBe('Earth');
      expect(earthProduct.missionName).toContain('S-NPP');
      expect(earthProduct.projection).toBe(MapProjectionType.EQUIRECTANGULAR);
      expect(earthProduct.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(earthProduct.provenance.sourceArchive).toContain('PDS');
    });
  });

  describe('NASA Exoplanet Archive', () => {
    it('builds valid TAP sync queries with adql parameters', () => {
      const url = buildExoplanetTapUrl(['pl_name', 'hostname', 'sy_dist'], 'default_flag=1');

      expect(url).toContain('https://exoplanetarchive.ipac.caltech.edu/TAP/sync');
      expect(url).toContain('format=json');
      expect(url).toContain('query=');
    });

    it('contains confirmed benchmark exoplanets with OBSERVED provenance', () => {
      const trappist1e = BENCHMARK_EXOPLANETS.find(p => p.planetName === 'TRAPPIST-1 e');
      expect(trappist1e).toBeDefined();
      expect(trappist1e?.radiusEarth).toBeCloseTo(0.92, 2);
      expect(trappist1e?.semiMajorAxisAU).toBeCloseTo(0.029, 3);
      expect(trappist1e?.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(trappist1e?.provenance.sourceArchive).toContain('Exoplanet Archive');

      const kepler186f = BENCHMARK_EXOPLANETS.find(p => p.planetName === 'Kepler-186 f');
      expect(kepler186f).toBeDefined();
      expect(kepler186f?.orbitalPeriodDays).toBeCloseTo(129.9, 1);
    });
  });

  describe('ESA Gaia DR3', () => {
    it('parses Gaia DR3 source records and computes distance from parallax', () => {
      // Proxima Centauri: parallax ~ 768.5 mas => ~ 1.301 parsecs
      const record = parseGaiaRecord({
        source_id: '5853498713190525696',
        ra: 217.4289,
        dec: -62.6795,
        parallax: 768.50,
        phot_g_mean_mag: 11.01,
        teff_gspphot: 3042,
      });

      expect(record).not.toBeNull();
      expect(record!.sourceId).toBe('5853498713190525696');
      expect(record!.distanceParsecs).toBeCloseTo(1.301, 2);
      expect(record!.provenance.classification).toBe(AstronomicalProvenance.OBSERVED);
      expect(record!.provenance.sourceArchive).toContain('Gaia DR3');
    });

    it('converts ICRS coordinates to Galactocentric frame with Sun at (0, 0.020, 8.2) kpc', () => {
      // A point at zero distance from Sun should be at the Sun's Galactocentric position
      const sunPos = icrsToGalactocentricKpc(0, 0, 0);
      expect(sunPos.x).toBeCloseTo(0.0, 3);
      expect(sunPos.y).toBeCloseTo(0.020, 3);
      expect(sunPos.z).toBeCloseTo(8.2, 3);
    });

    it('rejects negative or zero parallax rows as unphysical', () => {
      const invalidRecord = parseGaiaRecord({
        source_id: 'bad-parallax',
        ra: 100,
        dec: 20,
        parallax: -0.5,
        phot_g_mean_mag: 18.0,
      });

      expect(invalidRecord).toBeNull();
    });
  });
});
