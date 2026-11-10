/**
 * ASTRAVERSA Ω — NASA / JPL Horizons API Client & Data Ingestion
 *
 * Provides type-safe interfaces and integration for the NASA/JPL Horizons on-line solar system
 * data and ephemeris computation service.
 *
 * Documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html
 * Service: https://ssd.jpl.nasa.gov/horizons/
 *
 * Epistemic Provenance: OBSERVED (NASA / JPL Solar System Dynamics Group)
 */

import { Vector3 } from '../physics/Vector3';
import type { OrbitalElements } from '../physics/orbitalElements';
import { createObservedProvenance, type ProvenanceRecord } from '../universe/AstronomicalProvenance';

/**
 * Standard Horizons query parameters for vector table.
 */
export interface HorizonsVectorQueryParams {
  /** Target body ID (e.g. '399' for Earth, '499' for Mars, '10' for Sun) */
  targetCommand: string;
  /** Center origin coordinate code (e.g. '@0' for Solar System Barycenter, '@sun' for heliocentric) */
  center: string;
  /** Start time in ISO or Julian Date (e.g. '2025-01-01') */
  startTime: string;
  /** Stop time in ISO or Julian Date (e.g. '2025-01-02') */
  stopTime: string;
  /** Output step size (e.g. '1d', '1h') */
  stepSize?: string;
  /** Reference plane: 'ECLIPTIC' or 'FRAME' (ICRF) */
  refPlane?: 'ECLIPTIC' | 'FRAME';
}

/**
 * Ephemeris Cartesian state vector returned by Horizons.
 */
export interface HorizonsStateVector {
  targetName: string;
  targetId: string;
  julianDate: number;
  calendarDate: string;
  /** Cartesian position in meters */
  position: Vector3;
  /** Cartesian velocity in meters/second */
  velocity: Vector3;
  /** Light travel time in seconds */
  lightTimeSeconds: number;
  /** Range to center in meters */
  rangeMeters: number;
  /** Range rate in meters/second */
  rangeRateMetersPerSec: number;
  /** Provenance record */
  provenance: ProvenanceRecord;
}

/**
 * Osculating Keplerian orbital elements returned by Horizons.
 */
export interface HorizonsOrbitalElementsResult {
  targetName: string;
  targetId: string;
  epochJulianDate: number;
  elements: OrbitalElements;
  provenance: ProvenanceRecord;
}

/**
 * Known Horizons Target Body Codes.
 */
export const HORIZONS_TARGET_CODES = {
  SUN: '10',
  MERCURY_BARYCENTER: '1',
  MERCURY: '199',
  VENUS_BARYCENTER: '2',
  VENUS: '299',
  EARTH_BARYCENTER: '3',
  EARTH: '399',
  MOON: '301',
  MARS_BARYCENTER: '4',
  MARS: '499',
  PHOBOS: '401',
  DEIMOS: '402',
  JUPITER_BARYCENTER: '5',
  JUPITER: '599',
  IO: '501',
  EUROPA: '502',
  GANYMEDE: '503',
  CALLISTO: '504',
  SATURN_BARYCENTER: '6',
  SATURN: '699',
  TITAN: '606',
  ENCELADUS: '602',
  URANUS_BARYCENTER: '7',
  URANUS: '799',
  TITANIA: '703',
  NEPTUNE_BARYCENTER: '8',
  NEPTUNE: '899',
  TRITON: '801',
  PLUTO_BARYCENTER: '9',
  PLUTO: '999',
  CHARON: '901',
} as const;

/**
 * Build a standard Horizons API request URL.
 */
export function buildHorizonsApiUrl(params: HorizonsVectorQueryParams): string {
  const base = 'https://ssd-api.jpl.nasa.gov/horizons.api';
  const query = new URLSearchParams({
    format: 'json',
    COMMAND: `'${params.targetCommand}'`,
    CENTER: `'${params.center}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    START_TIME: `'${params.startTime}'`,
    STOP_TIME: `'${params.stopTime}'`,
    STEP_SIZE: `'${params.stepSize ?? '1d'}'`,
    REF_PLANE: `'${params.refPlane ?? 'ECLIPTIC'}'`,
    VEC_TABLE: '3', // Position + velocity + light-time
    OUT_UNITS: 'KM-S', // Kilometers & seconds
  });
  return `${base}?${query.toString()}`;
}

/**
 * Parse a raw text section from Horizons vector output into state vectors.
 * Handles KM to Meters unit conversion.
 */
export function parseHorizonsVectorOutput(
  rawText: string,
  targetId: string,
  targetName: string
): HorizonsStateVector[] {
  const results: HorizonsStateVector[] = [];
  const soeIdx = rawText.indexOf('$$SOE');
  const eoeIdx = rawText.indexOf('$$EOE');

  if (soeIdx === -1 || eoeIdx === -1) {
    return results;
  }

  const dataBlock = rawText.substring(soeIdx + 5, eoeIdx).trim();
  const records = dataBlock.split(/\r?\n\s*\r?\n/);

  for (const record of records) {
    const lines = record.split(/\r?\n/).map(l => l.trim());
    if (lines.length < 3) continue;

    // Line 0: JD, calendar date
    const jdMatch = lines[0].match(/(\d+\.\d+)\s+=\s+A\.D\.\s+(\d{4}-[A-Za-z]{3}-\d{2}\s+[\d:]+)/);
    const jd = jdMatch ? parseFloat(jdMatch[1]) : 0;
    const calDate = jdMatch ? jdMatch[2] : '';

    // Line 1: X, Y, Z (km)
    const posMatch = lines[1].match(/X\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)\s+Y\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)\s+Z\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/);
    // Line 2: VX, VY, VZ (km/s)
    const velMatch = lines[2].match(/VX\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)\s+VY\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)\s+VZ\s*=\s*([+-]?\d+\.?\d*E?[+-]?\d*)/);

    if (posMatch && velMatch) {
      // Convert km to m (x1000)
      const x = parseFloat(posMatch[1]) * 1000;
      const y = parseFloat(posMatch[2]) * 1000;
      const z = parseFloat(posMatch[3]) * 1000;

      const vx = parseFloat(velMatch[1]) * 1000;
      const vy = parseFloat(velMatch[2]) * 1000;
      const vz = parseFloat(velMatch[3]) * 1000;

      // Coordinate mapping to simulation Y-up: [x, z, -y] or standard ICRF
      const position = new Vector3(x, z, -y);
      const velocity = new Vector3(vx, vz, -vy);

      results.push({
        targetName,
        targetId,
        julianDate: jd,
        calendarDate: calDate,
        position,
        velocity,
        lightTimeSeconds: 0,
        rangeMeters: position.magnitude(),
        rangeRateMetersPerSec: 0,
        provenance: createObservedProvenance(
          `JPL-Horizons-${targetId}`,
          'NASA/JPL Horizons On-Line Ephemeris System',
          'Giorgini et al. (1996), Solar System Dynamics Group'
        ),
      });
    }
  }

  return results;
}

