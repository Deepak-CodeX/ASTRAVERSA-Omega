/**
 * ASTRAVERSA Ω — ESA Gaia DR3 Client & Astrometric Ingestion
 *
 * Sourced from the European Space Agency Gaia Data Release 3 (DR3):
 * https://www.cosmos.esa.int/web/gaia/dr3
 *
 * Epistemic Provenance: OBSERVED (European Space Agency / Gaia DPAC)
 */

import { Vector3 } from '../physics/Vector3';
import { createObservedProvenance, type ProvenanceRecord } from '../universe/AstronomicalProvenance';

/**
 * Astrometric source record from Gaia DR3 gaia_source table.
 */
export interface GaiaSourceRecord {
  sourceId: string;
  raDeg: number;
  decDeg: number;
  parallaxMas: number;
  parallaxErrorMas: number;
  pmRaMasYr?: number;
  pmDecMasYr?: number;
  radialVelocityKms?: number;
  photGMeanMag: number;
  bpRpColor?: number;
  teffGspphotK?: number;
  distanceParsecs: number;
  galactocentricPositionKpc: Vector3;
  provenance: ProvenanceRecord;
}

/**
 * Standard IAU Galactic Coordinate Transformation Matrix (ICRS to Galactic).
 * Sourced from ESA Gaia DPAC coordinate definitions.
 */
const DEG2RAD = Math.PI / 180;

// Galactic North Pole in ICRS (J2000)
const RA_NGP = 192.85948 * DEG2RAD;
const DEC_NGP = 27.12825 * DEG2RAD;
const THETA_0 = 122.93192 * DEG2RAD; // Galactic longitude of ascending node

/**
 * Transform ICRS equatorial coordinates (RA, Dec in degrees, distance in parsecs)
 * to Galactocentric Cartesian coordinates (X, Y, Z in kpc).
 *
 * Coordinate convention:
 * - Galactic Center (Sgr A*) at origin (0, 0, 0)
 * - X-axis points towards Galactic Center from the Sun
 * - Y-axis points perpendicular to disk (North Galactic Pole)
 * - Z-axis completes right-handed system in the galactic plane
 * - Sun placed at [0, +0.020, 8.2] kpc
 */
export function icrsToGalactocentricKpc(
  raDeg: number,
  decDeg: number,
  distPc: number
): Vector3 {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;

  // 1. Direction cosines relative to Galactic North Pole:
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const deltaRa = ra - RA_NGP;

  const sinB = sinDec * Math.sin(DEC_NGP) + cosDec * Math.cos(DEC_NGP) * Math.cos(deltaRa);
  const cosB = Math.sqrt(Math.max(0, 1 - sinB * sinB));

  const yGal = cosDec * Math.sin(deltaRa);
  const xGal = sinDec * Math.cos(DEC_NGP) - cosDec * Math.sin(DEC_NGP) * Math.cos(deltaRa);
  const l = (THETA_0 - Math.atan2(yGal, xGal) + 2 * Math.PI) % (2 * Math.PI);

  // Heliocentric Galactic Cartesian (kpc)
  const distKpc = distPc / 1000.0;
  const xGalHelio = distKpc * cosB * Math.cos(l);
  const zGalHelio = distKpc * cosB * Math.sin(l);
  const yGalHelio = distKpc * sinB;

  // 3. Shift from Sun to Galactocentric frame (Sun at R0 = 8.2 kpc, Y0 = +0.020 kpc)
  const xGalacto = xGalHelio;
  const yGalacto = yGalHelio + 0.020;
  const zGalacto = 8.2 - zGalHelio;

  return new Vector3(xGalacto, yGalacto, zGalacto);
}

/**
 * Parse an ESA Gaia DR3 TAP query row into a typed GaiaSourceRecord.
 */
export function parseGaiaRecord(row: {
  source_id: string | number;
  ra: number;
  dec: number;
  parallax: number;
  parallax_error?: number;
  pmra?: number;
  pmdec?: number;
  radial_velocity?: number;
  phot_g_mean_mag: number;
  bp_rp?: number;
  teff_gspphot?: number;
}): GaiaSourceRecord | null {
  if (row.parallax <= 0) return null; // Unphysical parallax or distant quasar

  const distPc = 1000.0 / row.parallax;
  const galPos = icrsToGalactocentricKpc(row.ra, row.dec, distPc);

  return {
    sourceId: row.source_id.toString(),
    raDeg: row.ra,
    decDeg: row.dec,
    parallaxMas: row.parallax,
    parallaxErrorMas: row.parallax_error ?? 0,
    pmRaMasYr: row.pmra,
    pmDecMasYr: row.pmdec,
    radialVelocityKms: row.radial_velocity,
    photGMeanMag: row.phot_g_mean_mag,
    bpRpColor: row.bp_rp,
    teffGspphotK: row.teff_gspphot,
    distanceParsecs: distPc,
    galactocentricPositionKpc: galPos,
    provenance: createObservedProvenance(
      `Gaia DR3 ${row.source_id}`,
      'ESA Gaia DR3',
      'Gaia Collaboration et al. (2023), A&A 674, A1',
      'High-precision astrometry from ESA Gaia mission.'
    ),
  };
}
