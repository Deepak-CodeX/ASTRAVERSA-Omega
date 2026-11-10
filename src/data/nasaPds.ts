/**
 * ASTRAVERSA Ω — NASA Planetary Data System (PDS) Client & Product Registry
 *
 * Sourced from the NASA Planetary Data System (PDS): https://pds.nasa.gov/
 * Cartographic datasets, surface elevations, multispectral mosaics, and topography.
 *
 * Epistemic Provenance: OBSERVED (NASA PDS / USGS Astrogeology / Instrument Teams)
 */

import { createObservedProvenance, type ProvenanceRecord } from '../universe/AstronomicalProvenance';

/**
 * Standard map projection types for planetary textures.
 */
export const MapProjectionType = {
  EQUIRECTANGULAR: 'EQUIRECTANGULAR',
  ORTHOGRAPHIC: 'ORTHOGRAPHIC',
  POLAR_STEREOGRAPHIC: 'POLAR_STEREOGRAPHIC',
  SINUSOIDAL: 'SINUSOIDAL',
} as const;
export type MapProjectionType = typeof MapProjectionType[keyof typeof MapProjectionType];

/**
 * Metadata record for a PDS cartographic product.
 */
export interface PdsCartographicProduct {
  productId: string;
  targetBody: string;
  missionName: string;
  instrument: string;
  projection: MapProjectionType;
  resolutionMetersPerPixel?: number;
  wavelengthBand: string; // e.g. "Visible True Color", "SAR Radar", "Infrared", "Topography"
  archiveUrl: string;
  provenance: ProvenanceRecord;
}

/**
 * Registry of canonical NASA PDS surface maps for Solar System bodies.
 */
export const PDS_CANONICAL_PRODUCTS: Record<string, PdsCartographicProduct> = {
  sun: {
    productId: 'SDO_AIA_4500_SYNOPTIC',
    targetBody: 'Sun',
    missionName: 'Solar Dynamics Observatory (SDO)',
    instrument: 'Atmospheric Imaging Assembly (AIA)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    wavelengthBand: 'Visible Continuum 4500 Å',
    archiveUrl: 'https://sdo.gsfc.nasa.gov/data/',
    provenance: createObservedProvenance(
      'SDO-AIA-4500',
      'NASA SDO / PDS Heliophysics',
      'Lemen et al. (2012), Solar Physics 275'
    ),
  },
  mercury: {
    productId: 'MESSENGER_MDIS_GLOBAL_LOI_COLOR',
    targetBody: 'Mercury',
    missionName: 'MESSENGER',
    instrument: 'Mercury Dual Imaging System (MDIS)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 665,
    wavelengthBand: 'Visible Enhanced Color (1000, 750, 430 nm)',
    archiveUrl: 'https://pds-imaging.jpl.nasa.gov/volumes/messenger.html',
    provenance: createObservedProvenance(
      'MESSENGER-MDIS-MERCURY-MOSAIC',
      'NASA PDS Cartography and Imaging Sciences Node',
      'Hawkins et al. (2007), Space Science Reviews 131'
    ),
  },
  venus: {
    productId: 'MAGELLAN_SAR_FMAP_GLOBAL',
    targetBody: 'Venus',
    missionName: 'Magellan',
    instrument: 'Synthetic Aperture Radar (SAR)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 75,
    wavelengthBand: 'S-band Radar (12.6 cm wavelength)',
    archiveUrl: 'https://pds-geosciences.wustl.edu/missions/magellan/',
    provenance: createObservedProvenance(
      'MAGELLAN-SAR-FMAP',
      'NASA PDS Geosciences Node',
      'Saunders et al. (1992), JGR Planets 97'
    ),
  },
  earth: {
    productId: 'SNPP_VIIRS_BLUE_MARBLE_NEXTGEN',
    targetBody: 'Earth',
    missionName: 'Suomi National Polar-orbiting Partnership (S-NPP)',
    instrument: 'Visible Infrared Imaging Radiometer Suite (VIIRS)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 500,
    wavelengthBand: 'Visible True Color RGB',
    archiveUrl: 'https://earthobservatory.nasa.gov/features/BlueMarble',
    provenance: createObservedProvenance(
      'NASA-BLUE-MARBLE-VIIRS',
      'NASA Earth Observatory / PDS',
      'Stöckli et al. (2005), NASA Earth Observatory'
    ),
  },
  moon: {
    productId: 'LRO_LROC_WAC_GLOBAL_COLOR',
    targetBody: 'Moon',
    missionName: 'Lunar Reconnaissance Orbiter (LRO)',
    instrument: 'Lunar Reconnaissance Orbiter Camera (LROC)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 100,
    wavelengthBand: 'Visible 7-color Multispectral',
    archiveUrl: 'https://pds.lroc.asu.edu/',
    provenance: createObservedProvenance(
      'LRO-LROC-WAC-GLOBAL',
      'NASA PDS Imaging Node / ASU LROC',
      'Robinson et al. (2010), Space Science Reviews 150'
    ),
  },
  mars: {
    productId: 'VIKING_MDIM_2_1_COLORIZED',
    targetBody: 'Mars',
    missionName: 'Viking 1 & 2',
    instrument: 'Viking Orbiter Visual Imaging Subsystem (VIS)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 231,
    wavelengthBand: 'Visible True Color (MDIM 2.1 calibrated by MGS MOC)',
    archiveUrl: 'https://astrogeology.usgs.gov/search/map/Mars/Global/Mars_Viking_MDIM21_mosaic',
    provenance: createObservedProvenance(
      'USGS-VIKING-MDIM-2.1',
      'NASA PDS Imaging Node / USGS Astrogeology',
      'Archinal et al. (2003), USGS Open-File Report'
    ),
  },
  jupiter: {
    productId: 'HST_WFC3_OPAL_GLOBAL_MAP',
    targetBody: 'Jupiter',
    missionName: 'Hubble Space Telescope (HST)',
    instrument: 'Wide Field Camera 3 (WFC3)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    resolutionMetersPerPixel: 150000,
    wavelengthBand: 'Visible True Color (F395N, F502N, F631N)',
    archiveUrl: 'https://archive.stsci.edu/prepds/opal/',
    provenance: createObservedProvenance(
      'HST-OPAL-JUPITER',
      'NASA STScI / PDS Atmospheres Node',
      'Simon et al. (2015), Astrophysical Journal 812'
    ),
  },
  saturn: {
    productId: 'CASSINI_ISS_GLOBAL_MOSAIC_EQUILAT',
    targetBody: 'Saturn',
    missionName: 'Cassini-Huygens',
    instrument: 'Imaging Science Subsystem (ISS)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    wavelengthBand: 'Visible Broad-band RGB Filters',
    archiveUrl: 'https://pds-imaging.jpl.nasa.gov/volumes/cassini.html',
    provenance: createObservedProvenance(
      'CASSINI-ISS-SATURN',
      'NASA PDS Imaging Node / Cassini ISS Team',
      'Porco et al. (2004), Space Science Reviews 115'
    ),
  },
  uranus: {
    productId: 'KECK_NIRC2_AO_GLOBAL_SYNTHESIS',
    targetBody: 'Uranus',
    missionName: 'W.M. Keck Observatory',
    instrument: 'Near-Infrared Camera 2 (NIRC2) + Adaptive Optics',
    projection: MapProjectionType.EQUIRECTANGULAR,
    wavelengthBand: 'Near-Infrared H-band / J-band False Color',
    archiveUrl: 'https://pds-atmospheres.nmsu.edu/',
    provenance: createObservedProvenance(
      'KECK-NIRC2-URANUS',
      'NASA PDS Atmospheres Node',
      'Sromovsky et al. (2015), Icarus 258'
    ),
  },
  neptune: {
    productId: 'VOYAGER2_ISS_GLOBAL_CYLINDRICAL',
    targetBody: 'Neptune',
    missionName: 'Voyager 2',
    instrument: 'Imaging Science Subsystem (ISS)',
    projection: MapProjectionType.EQUIRECTANGULAR,
    wavelengthBand: 'Visible Blue / Clear / Orange Composite',
    archiveUrl: 'https://pds-imaging.jpl.nasa.gov/volumes/voyager.html',
    provenance: createObservedProvenance(
      'VOYAGER-2-ISS-NEPTUNE',
      'NASA PDS Imaging Node',
      'Smith et al. (1989), Science 246'
    ),
  },
};

