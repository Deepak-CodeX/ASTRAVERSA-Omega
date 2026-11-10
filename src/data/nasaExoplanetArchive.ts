/**
 * ASTRAVERSA Ω — NASA Exoplanet Archive Client & Catalogue Ingestion
 *
 * Sourced from the NASA Exoplanet Archive: https://exoplanetarchive.ipac.caltech.edu/
 *
 * Epistemic Provenance: OBSERVED (NASA Exoplanet Science Institute / IPAC / Caltech)
 */

import { createObservedProvenance, type ProvenanceRecord } from '../universe/AstronomicalProvenance';

/**
 * Record returned by NASA Exoplanet Archive TAP table 'ps' (Planetary Systems).
 */
export interface ConfirmedExoplanetRecord {
  planetName: string;
  hostName: string;
  discoveryMethod: string;
  discoveryYear: number;
  orbitalPeriodDays: number;
  semiMajorAxisAU: number;
  radiusEarth: number;
  massEarth?: number;
  equilibriumTempK?: number;
  stellarSpectralType?: string;
  stellarTeffK?: number;
  stellarRadiusSolar?: number;
  stellarMassSolar?: number;
  distanceParsecs?: number;
  provenance: ProvenanceRecord;
}

/**
 * Benchmark confirmed exoplanets for observational validation.
 */
export const BENCHMARK_EXOPLANETS: ConfirmedExoplanetRecord[] = [
  {
    planetName: 'TRAPPIST-1 e',
    hostName: 'TRAPPIST-1',
    discoveryMethod: 'Transit',
    discoveryYear: 2017,
    orbitalPeriodDays: 6.0996,
    semiMajorAxisAU: 0.02928,
    radiusEarth: 0.920,
    massEarth: 0.692,
    equilibriumTempK: 251,
    stellarSpectralType: 'M8V',
    stellarTeffK: 2566,
    stellarRadiusSolar: 0.121,
    stellarMassSolar: 0.0898,
    distanceParsecs: 12.43,
    provenance: createObservedProvenance(
      'TRAPPIST-1 e',
      'NASA Exoplanet Archive',
      'Gillon et al. (2017), Nature 542',
      'Temperate terrestrial planet in the conservative habitable zone of an ultra-cool M dwarf.'
    ),
  },
  {
    planetName: 'Kepler-186 f',
    hostName: 'Kepler-186',
    discoveryMethod: 'Transit',
    discoveryYear: 2014,
    orbitalPeriodDays: 129.9441,
    semiMajorAxisAU: 0.432,
    radiusEarth: 1.17,
    massEarth: 1.4, // theoretical estimate
    equilibriumTempK: 188,
    stellarSpectralType: 'M1V',
    stellarTeffK: 3755,
    stellarRadiusSolar: 0.523,
    stellarMassSolar: 0.544,
    distanceParsecs: 178.5,
    provenance: createObservedProvenance(
      'Kepler-186 f',
      'NASA Exoplanet Archive',
      'Quintana et al. (2014), Science 344',
      'First validated Earth-sized planet orbiting in the habitable zone of another star.'
    ),
  },
  {
    planetName: 'Proxima Centauri b',
    hostName: 'Proxima Centauri',
    discoveryMethod: 'Radial Velocity',
    discoveryYear: 2016,
    orbitalPeriodDays: 11.186,
    semiMajorAxisAU: 0.0485,
    radiusEarth: 1.07,
    massEarth: 1.173,
    equilibriumTempK: 234,
    stellarSpectralType: 'M5.5V',
    stellarTeffK: 3042,
    stellarRadiusSolar: 0.154,
    stellarMassSolar: 0.122,
    distanceParsecs: 1.301,
    provenance: createObservedProvenance(
      'Proxima Centauri b',
      'NASA Exoplanet Archive / ESO',
      'Anglada-Escudé et al. (2016), Nature 536',
      'Nearest known terrestrial exoplanet to the Solar System.'
    ),
  },
  {
    planetName: '51 Pegasi b',
    hostName: '51 Pegasi',
    discoveryMethod: 'Radial Velocity',
    discoveryYear: 1995,
    orbitalPeriodDays: 4.230785,
    semiMajorAxisAU: 0.0527,
    radiusEarth: 14.3, // ~1.27 Jupiter radii
    massEarth: 150.0, // ~0.47 Jupiter mass
    equilibriumTempK: 1284,
    stellarSpectralType: 'G2IV',
    stellarTeffK: 5790,
    stellarRadiusSolar: 1.237,
    stellarMassSolar: 1.11,
    distanceParsecs: 15.48,
    provenance: createObservedProvenance(
      '51 Pegasi b (Dimidium)',
      'NASA Exoplanet Archive',
      'Mayor & Queloz (1995), Nature 378 / Nobel Prize 2019',
      'First exoplanet discovered around a main-sequence Sun-like star.'
    ),
  },
];

/**
 * Constructs a NASA Exoplanet Archive TAP sync query URL.
 */
export function buildExoplanetTapUrl(columns?: string[], whereClause?: string): string {
  const base = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
  const defaultCols = [
    'pl_name',
    'hostname',
    'discoverymethod',
    'disc_year',
    'pl_orbper',
    'pl_orbsmax',
    'pl_rade',
    'pl_bmasse',
    'pl_eqt',
    'st_spectype',
    'st_teff',
    'st_rad',
    'st_mass',
    'sy_dist',
  ];
  const selectCols = (columns && columns.length > 0 ? columns : defaultCols).join(',');
  const query = `select ${selectCols} from ps where default_flag=1 ${whereClause ? `and ${whereClause}` : ''}`;
  const params = new URLSearchParams({
    query,
    format: 'json',
  });
  return `${base}?${params.toString()}`;
}

