/**
 * ASTRAVERSA Ω — Planetary Geology, Topography & Surface Features Architecture
 *
 * Grounded in authoritative planetary datasets from NASA PDS, USGS Astrogeology,
 * Mars Global Surveyor (MOLA), and Lunar Reconnaissance Orbiter (LOLA).
 *
 * Epistemic Provenance: OBSERVED (NASA PDS / USGS / IAU WGPSN)
 */

import { Vector3 } from '../physics/Vector3';
import {
  createObservedProvenance,
  createDerivedProvenance,
  type ProvenanceRecord,
} from '../universe/AstronomicalProvenance';
import { MapProjectionType } from '../data/nasaPds';

/**
 * Planetary geological feature classifications (IAU WGPSN nomenclature standards).
 */
export const GeologicalFeatureType = {
  IMPACT_CRATER: 'IMPACT_CRATER',
  VOLCANO_MONS: 'VOLCANO_MONS',
  CANYON_VALLIS: 'CANYON_VALLIS',
  PLANITIA_BASIN: 'PLANITIA_BASIN',
  MARE_BASALT_PLAIN: 'MARE_BASALT_PLAIN',
  TERRA_HIGHLAND: 'TERRA_HIGHLAND',
  PLATEAU_PLANUM: 'PLATEAU_PLANUM',
  CHASMA_RIFT: 'CHASMA_RIFT',
  RIDGE_DORSUM: 'RIDGE_DORSUM',
  LANDING_SITE: 'LANDING_SITE',
} as const;
export type GeologicalFeatureType =
  (typeof GeologicalFeatureType)[keyof typeof GeologicalFeatureType];

/**
 * Representation of a verified planetary surface feature or impact crater.
 */
export interface GeologicalFeature {
  id: string;
  name: string;
  featureType: GeologicalFeatureType;
  /** Planetocentric latitude in degrees in [-90, +90] */
  latitudeDeg: number;
  /** Positive East longitude in degrees in [0, 360) */
  longitudeDeg: number;
  /** Feature diameter in kilometers (or length for linear structures) */
  diameterKm: number;
  /** Topographic elevation relative to the planetary datum in meters */
  elevationMeters?: number;
  /** Relief depth or height relative to surrounding rim in meters */
  depthOrHeightMeters?: number;
  /** Stratigraphic age or period of formation */
  stratigraphicPeriod?: string;
  /** Concise scientific summary */
  description: string;
  /** Epistemic provenance metadata */
  provenance: ProvenanceRecord;
}

/**
 * Geomorphological terrain province (broad regional geological unit).
 */
export interface GeomorphologicalProvince {
  id: string;
  name: string;
  provinceType: string;
  dominantLithology: string;
  centerLatitudeDeg: number;
  centerLongitudeDeg: number;
  areaKm2: number;
  /** Estimated crustal thickness range [min, max] in kilometers */
  crustalThicknessKm: [number, number];
  provenance: ProvenanceRecord;
}

/**
 * Stratigraphic period / era in a celestial body's geological timescale.
 */
export interface StratigraphicEra {
  name: string;
  systemEra: string;
  ageRangeGa: string;
  majorEvents: string;
  referenceCitation: string;
}

/**
 * Metadata record for a calibrated Digital Elevation Model (DEM).
 */
export interface DigitalElevationModel {
  productId: string;
  mission: string;
  instrument: string;
  /** Reference geodetic zero-datum definition */
  verticalDatum: string;
  /** Root-mean-square vertical measurement accuracy in meters */
  verticalAccuracyMeters: number;
  /** Lowest planetary elevation relative to datum in meters */
  minElevationMeters: number;
  /** Highest planetary elevation relative to datum in meters */
  maxElevationMeters: number;
  /** Planetary mean reference elevation in meters */
  meanElevationMeters: number;
  /** Spatial resolution in meters per pixel at equator */
  spatialResolutionMetersPerPixel: number;
  /** Angular sampling in pixels per degree */
  pixelsPerDegree: number;
  /** Native map projection of the gridded raster */
  mapProjection: MapProjectionType;
  /** Coverage bounding box: [minLat, maxLat] */
  coverageLatitudeRange: [number, number];
  /** Coverage bounding box: [minLon, maxLon] */
  coverageLongitudeRange: [number, number];
  archiveUrl: string;
  provenance: ProvenanceRecord;
}

/**
 * Model-derived planetary crustal thickness and geophysical interior structure.
 */
export interface CrustalThicknessModel {
  meanThicknessKm: number;
  uncertaintyRangeKm: [number, number];
  regionalVariationDescription: string;
  methodology: string;
  inSituConstraints?: string;
  provenance: ProvenanceRecord;
}

/**
 * Comprehensive planetary geology profile for a terrestrial planet or moon.
 */
export interface PlanetaryGeology {
  bodyId: string;
  bodyName: string;
  meanRadiusKm: number;
  dem: DigitalElevationModel;
  crustalDichotomyDescription?: string;
  crustalThickness: CrustalThicknessModel;
  /** Convenience backward-compatible accessor for mean crustal thickness in km */
  meanCrustalThicknessKm: number;
  stratigraphicEras: StratigraphicEra[];
  provinces: GeomorphologicalProvince[];
  majorFeatures: GeologicalFeature[];
  provenance: ProvenanceRecord;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Canonical Geological Profiles: Mars & the Moon (Luna)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Mars Global Surveyor (MGS) MOLA calibrated geology and topography.
 * Sourced from NASA PDS Geosciences Node / USGS Astrogeology.
 */
export const MARS_GEOLOGY: PlanetaryGeology = {
  bodyId: 'mars',
  bodyName: 'Mars',
  meanRadiusKm: 3389.5,
  dem: {
    productId: 'MGS-M-MOLA-5-MEGDR-L3-V1.0',
    mission: 'Mars Global Surveyor (MGS)',
    instrument: 'Mars Orbiter Laser Altimeter (MOLA)',
    verticalDatum: 'Mars MOLA Areoid (6.105 mbar equipotential potential surface)',
    verticalAccuracyMeters: 1.0,
    minElevationMeters: -8200, // Hellas Planitia basin floor
    maxElevationMeters: 21229, // Olympus Mons summit caldera
    meanElevationMeters: 0,
    spatialResolutionMetersPerPixel: 463, // 128 pixels/degree at equator
    pixelsPerDegree: 128,
    mapProjection: MapProjectionType.EQUIRECTANGULAR,
    coverageLatitudeRange: [-90, 90],
    coverageLongitudeRange: [0, 360],
    archiveUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    provenance: createObservedProvenance(
      'MOLA-MEGDR-MARS-TOPOGRAPHY',
      'NASA PDS Geosciences Node / MGS MOLA Science Team',
      'Smith et al. (2001), Mars Orbiter Laser Altimeter: Experiment summary and planetary topography, JGR Planets 106(E10)'
    ),
  },
  crustalDichotomyDescription:
    'Pronounced crustal dichotomy separating the low-elevation, lightly cratered Northern Lowlands (crustal thickness ~32 km) from the high-standing, densely cratered Southern Highlands (crustal thickness ~58 km).',
  crustalThickness: {
    meanThicknessKm: 45,
    uncertaintyRangeKm: [30, 72],
    regionalVariationDescription:
      'Northern Lowlands (~32 km) vs Southern Highlands (~58 km); Tharsis volcanic province reaches 65–85 km.',
    methodology:
      'Geophysical potential field inversion (MGS/MRO orbital gravity models GMM-3 / MGS95J combined with MOLA topography), constrained in situ by Mars InSight SEIS seismometer.',
    inSituConstraints:
      'NASA InSight SEIS receiver functions (Knapmeyer-Endrun et al. 2021): local crust thickness at Elysium Planitia is 20–39 km (2-layer vs 3-layer model).',
    provenance: createDerivedProvenance(
      'MARS-CRUST-MODEL-INSIGHT-GRAV',
      'NASA InSight Science Team / NASA PDS Geophysics',
      'Knapmeyer-Endrun et al. (2021), Science 373; Wieczorek et al. (2022), JGR Planets 127',
      'Geophysical interior model derived from orbital gravimetry and in situ seismology; NOT an observed altimetric measurement.'
    ),
  },
  meanCrustalThicknessKm: 45,
  stratigraphicEras: [
    {
      name: 'Noachian',
      systemEra: 'Early Mars',
      ageRangeGa: '4.1 – 3.7 Ga',
      majorEvents:
        'Intense impact bombardment, formation of giant impact basins (Hellas, Argyre, Isidis), widespread precipitation, valley network incision, and phyllosilicate clay synthesis.',
      referenceCitation: 'Carr & Head (2010), Geologic history of Mars, Earth and Planetary Science Letters 294',
    },
    {
      name: 'Hesperian',
      systemEra: 'Middle Mars',
      ageRangeGa: '3.7 – 3.0 Ga',
      majorEvents:
        'Catastrophic outflow channel floods, transition from neutral to acidic aqueous environments, massive flood basalt volcanism, and sulfate precipitation.',
      referenceCitation: 'Bibring et al. (2006), Global mineralogical and aqueous history of Mars, Science 312',
    },
    {
      name: 'Amazonian',
      systemEra: 'Late / Modern Mars',
      ageRangeGa: '3.0 Ga – Present',
      majorEvents:
        'Hyper-arid, cold desert conditions, slow aeolian deflation and sand dune migration, iron oxidation (pervasive anhydrous ferric oxides), and localized episodic glacial and volcanic activity.',
      referenceCitation: 'Hartmann & Neukum (2001), Cratering chronology and the evolution of Mars, Space Science Reviews 96',
    },
  ],
  provinces: [
    {
      id: 'tharsis-rise',
      name: 'Tharsis Volcanic Province',
      provinceType: 'Volcanic Plateau / Igneous Province',
      dominantLithology: 'Tholeiitic Flood Basalts & Andesitic Lavas',
      centerLatitudeDeg: 0.0,
      centerLongitudeDeg: 250.0,
      areaKm2: 30000000,
      crustalThicknessKm: [65, 85],
      provenance: createDerivedProvenance(
        'MARS-PROVINCE-THARSIS',
        'USGS Astrogeology / NASA PDS',
        'Zuber et al. (2000), Science 287'
      ),
    },
    {
      id: 'valles-marineris-system',
      name: 'Valles Marineris Rift System',
      provinceType: 'Tectonic Rift Valley & Chasmata',
      dominantLithology: 'Layered Mafic Volcanics & Sulfate Sedimentary Deposits',
      centerLatitudeDeg: -13.9,
      centerLongitudeDeg: 300.8,
      areaKm2: 4000000,
      crustalThicknessKm: [40, 50],
      provenance: createObservedProvenance(
        'MARS-PROVINCE-VALLES-MARINERIS',
        'NASA PDS Geosciences Node',
        'Lucchitta et al. (1992), Mars, Univ. Arizona Press'
      ),
    },
    {
      id: 'vastitas-borealis',
      name: 'Vastitas Borealis (Northern Lowlands)',
      provinceType: 'Sedimentary & Volcanic Lowland Plains',
      dominantLithology: 'Basaltic Regolith, Aeolian Silt & Permafrost Sediments',
      centerLatitudeDeg: 60.0,
      centerLongitudeDeg: 180.0,
      areaKm2: 45000000,
      crustalThicknessKm: [28, 38],
      provenance: createDerivedProvenance(
        'MARS-PROVINCE-NORTHERN-LOWLANDS',
        'NASA PDS / MOLA Team',
        'Head et al. (2002), JGR Planets 107'
      ),
    },
    {
      id: 'southern-highlands',
      name: 'Noachian Southern Highlands',
      provinceType: 'Cratered Ancient Crustal Terrane',
      dominantLithology: 'Plagioclase-rich Basaltic Regolith & Breccia',
      centerLatitudeDeg: -40.0,
      centerLongitudeDeg: 120.0,
      areaKm2: 60000000,
      crustalThicknessKm: [50, 70],
      provenance: createObservedProvenance(
        'MARS-PROVINCE-SOUTHERN-HIGHLANDS',
        'USGS Astrogeology / NASA PDS',
        'Tanaka et al. (2014), Geologic Map of Mars, USGS SIM 3292'
      ),
    },
  ],
  majorFeatures: [
    {
      id: 'olympus-mons',
      name: 'Olympus Mons',
      featureType: GeologicalFeatureType.VOLCANO_MONS,
      latitudeDeg: 18.65,
      longitudeDeg: 226.2,
      diameterKm: 624,
      elevationMeters: 21229,
      depthOrHeightMeters: 21229,
      stratigraphicPeriod: 'Amazonian',
      description:
        'Largest planetary shield volcano in the Solar System, crowned by a 80 km wide multi-ring caldera complex and bounded by a 6 km basal scarp.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-OLYMPUS-MONS',
        'NASA PDS Geosciences / MOLA Team',
        'Smith et al. (2001), JGR Planets 106'
      ),
    },
    {
      id: 'valles-marineris',
      name: 'Valles Marineris',
      featureType: GeologicalFeatureType.CANYON_VALLIS,
      latitudeDeg: -13.9,
      longitudeDeg: 300.8,
      diameterKm: 4000,
      elevationMeters: -5000,
      depthOrHeightMeters: 7000,
      stratigraphicPeriod: 'Hesperian',
      description:
        'Vast continental tectonic canyon system spanning over 4,000 km in length, up to 200 km in width, and descending to 7 km depth.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-VALLES-MARINERIS',
        'NASA PDS / USGS Astrogeology',
        'Lucchitta et al. (1992)'
      ),
    },
    {
      id: 'hellas-planitia',
      name: 'Hellas Planitia',
      featureType: GeologicalFeatureType.PLANITIA_BASIN,
      latitudeDeg: -42.4,
      longitudeDeg: 70.5,
      diameterKm: 2300,
      elevationMeters: -8200,
      depthOrHeightMeters: 9000,
      stratigraphicPeriod: 'Noachian',
      description:
        'Enormous impact basin reaching 8,200 meters below the datum, representing the lowest elevation on Mars.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-HELLAS-PLANITIA',
        'NASA PDS / MOLA Team',
        'Smith et al. (2001)'
      ),
    },
    {
      id: 'gale-crater',
      name: 'Gale Crater (Curiosity Landing Site)',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: -5.37,
      longitudeDeg: 137.44,
      diameterKm: 154,
      elevationMeters: -4450,
      depthOrHeightMeters: 5000,
      stratigraphicPeriod: 'Late Noachian / Early Hesperian',
      description:
        'Impact crater featuring a central layered sedimentary mound (Aeolis Mons / Mount Sharp) rising 5.5 km from the crater floor, explored by the Mars Science Laboratory (Curiosity) rover.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-GALE-CRATER',
        'NASA PDS / MSL Science Team',
        'Grotzinger et al. (2014), Science 343'
      ),
    },
    {
      id: 'jezero-crater',
      name: 'Jezero Crater (Perseverance Landing Site)',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: 18.38,
      longitudeDeg: 77.58,
      diameterKm: 49,
      elevationMeters: -2500,
      depthOrHeightMeters: 1000,
      stratigraphicPeriod: 'Noachian',
      description:
        'Ancient paleolake basin featuring a prominent preserved river delta with clay and carbonate deposits, explored by the Mars 2020 (Perseverance) rover.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-JEZERO-CRATER',
        'NASA PDS / Mars 2020 Science Team',
        'Fassett & Head (2005), GRL 32'
      ),
    },
    {
      id: 'ascraeus-mons',
      name: 'Ascraeus Mons',
      featureType: GeologicalFeatureType.VOLCANO_MONS,
      latitudeDeg: 11.9,
      longitudeDeg: 255.5,
      diameterKm: 480,
      elevationMeters: 18225,
      depthOrHeightMeters: 18225,
      stratigraphicPeriod: 'Amazonian',
      description:
        'Northernmost and second-highest shield volcano in the Tharsis Montes volcanic chain.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-ASCRAEUS-MONS',
        'NASA PDS / MOLA Team',
        'Smith et al. (2001)'
      ),
    },
    {
      id: 'alba-mons',
      name: 'Alba Mons (Alba Patera)',
      featureType: GeologicalFeatureType.VOLCANO_MONS,
      latitudeDeg: 40.5,
      longitudeDeg: 250.1,
      diameterKm: 1600,
      elevationMeters: 6800,
      depthOrHeightMeters: 6800,
      stratigraphicPeriod: 'Hesperian',
      description:
        'Enormous low-profile volcanic construct with a gentle slope (< 1°) spanning 1,600 km across northern Tharsis.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-ALBA-MONS',
        'NASA PDS / USGS',
        'Plescia (2004), JGR Planets 109'
      ),
    },
    {
      id: 'gusev-crater',
      name: 'Gusev Crater (Spirit Landing Site)',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: -14.57,
      longitudeDeg: 175.47,
      diameterKm: 166,
      elevationMeters: -1900,
      depthOrHeightMeters: 3000,
      stratigraphicPeriod: 'Noachian',
      description:
        'Large impact crater breached by the ancient Ma’adim Vallis outflow channel, landing site of NASA Spirit rover.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-GUSEV-CRATER',
        'NASA PDS / MER Science Team',
        'Squyres et al. (2004), Science 305'
      ),
    },
    {
      id: 'isidis-planitia',
      name: 'Isidis Planitia',
      featureType: GeologicalFeatureType.PLANITIA_BASIN,
      latitudeDeg: 12.9,
      longitudeDeg: 87.0,
      diameterKm: 1500,
      elevationMeters: -3800,
      depthOrHeightMeters: 6000,
      stratigraphicPeriod: 'Noachian',
      description:
        'Third-largest impact basin on Mars, located east of the Syrtis Major volcanic plateau.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-ISIDIS-PLANITIA',
        'NASA PDS / MOLA Team',
        'Bridges et al. (2003), JGR Planets 108'
      ),
    },
    {
      id: 'elysium-mons',
      name: 'Elysium Mons',
      featureType: GeologicalFeatureType.VOLCANO_MONS,
      latitudeDeg: 25.0,
      longitudeDeg: 147.2,
      diameterKm: 240,
      elevationMeters: 14100,
      depthOrHeightMeters: 14100,
      stratigraphicPeriod: 'Amazonian / Hesperian',
      description:
        'Primary volcanic peak of the Elysium volcanic province, isolated from the larger Tharsis rise.',
      provenance: createObservedProvenance(
        'MOLA-FEAT-ELYSIUM-MONS',
        'NASA PDS / MOLA Team',
        'Smith et al. (2001)'
      ),
    },
  ],
  provenance: createDerivedProvenance(
    'MOLA-MARS-GEOLOGY-MASTER',
    'NASA PDS Geosciences Node / USGS Astrogeology',
    'Smith et al. (2001), Knapmeyer-Endrun et al. (2021), Tanaka et al. (2014)',
    'Composite planetary geology profile integrating observed laser altimetry (MOLA: OBSERVED) with geophysical interior structure models (InSight/gravity: DERIVED).'
  ),
};

/**
 * Lunar Reconnaissance Orbiter (LRO) LOLA calibrated geology and topography.
 * Sourced from NASA PDS Geosciences Node / USGS Astrogeology / LROC Science Team.
 */
export const MOON_GEOLOGY: PlanetaryGeology = {
  bodyId: 'moon',
  bodyName: 'Moon (Luna)',
  meanRadiusKm: 1737.4,
  dem: {
    productId: 'LRO-L-LOLA-4-GDR-V1.0',
    mission: 'Lunar Reconnaissance Orbiter (LRO)',
    instrument: 'Lunar Orbiter Laser Altimeter (LOLA)',
    verticalDatum: 'Lunar Mean Radius Sphere (1,737,400 meters)',
    verticalAccuracyMeters: 0.8,
    minElevationMeters: -9120, // Antoniadi crater floor (South Pole-Aitken Basin)
    maxElevationMeters: 10786, // Highlands north of Engel'gardt crater (farside)
    meanElevationMeters: 0,
    spatialResolutionMetersPerPixel: 118, // 256 pixels/degree at equator
    pixelsPerDegree: 256,
    mapProjection: MapProjectionType.EQUIRECTANGULAR,
    coverageLatitudeRange: [-90, 90],
    coverageLongitudeRange: [0, 360],
    archiveUrl: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
    provenance: createObservedProvenance(
      'LOLA-GDR-LUNAR-TOPOGRAPHY',
      'NASA PDS Geosciences Node / LRO LOLA Science Team',
      'Smith et al. (2010), The Lunar Orbiter Laser Altimeter Investigation on the Lunar Reconnaissance Orbiter Mission, Space Sci. Rev. 150'
    ),
  },
  crustalDichotomyDescription:
    'Nearside-Farside asymmetry: the nearside is dominated by dark, low-elevation volcanic maria with thinner crust (~30 km), whereas the farside is dominated by ancient, heavily cratered anorthositic highlands with crustal thickness up to 60 km.',
  crustalThickness: {
    meanThicknessKm: 38,
    uncertaintyRangeKm: [34, 43],
    regionalVariationDescription:
      'Nearside maria (~15–35 km, thinning to <10 km beneath Crisium and Orientale basins) vs Farside highlands (~45–65 km).',
    methodology:
      'High-resolution orbital gravity field spherical harmonics (GRAIL primary & extended mission) combined with LOLA topography, anchored by Apollo 12/14 seismic reanalyses.',
    inSituConstraints:
      'Apollo 12 and 14 passive seismic experiment re-evaluations (Lognonné et al. 2003, Weber et al. 2011).',
    provenance: createDerivedProvenance(
      'MOON-CRUST-MODEL-GRAIL',
      'NASA GRAIL Science Team / NASA PDS Geosciences',
      'Wieczorek et al. (2013), Science 339, 671–675',
      'Geophysical interior model derived from orbital gravimetry and Apollo seismology; NOT an observed altimetric measurement.'
    ),
  },
  meanCrustalThicknessKm: 38,
  stratigraphicEras: [
    {
      name: 'Pre-Nectarian',
      systemEra: 'Lunar Origin & Magma Ocean',
      ageRangeGa: '4.53 – 3.92 Ga',
      majorEvents:
        'Lunar Magma Ocean crystallization, plagioclase flotation crust (ferroan anorthosite), and early basin formation including South Pole-Aitken.',
      referenceCitation: 'Wilhelms (1987), The Geologic History of the Moon, USGS Professional Paper 1348',
    },
    {
      name: 'Nectarian',
      systemEra: 'Basin Forming Era',
      ageRangeGa: '3.92 – 3.85 Ga',
      majorEvents:
        'Peak of the Late Heavy Bombardment, excavation of Nectaris, Crisium, and Serenitatis multi-ring impact basins.',
      referenceCitation: 'Stöffler et al. (2006), Cratering history and lunar chronology, Rev. Mineral. Geochem. 60',
    },
    {
      name: 'Imbrian',
      systemEra: 'Basaltic Volcanism Peak',
      ageRangeGa: '3.85 – 3.20 Ga',
      majorEvents:
        'Formation of the Imbrium and Orientale multi-ring basins followed by extensive flood basalt volcanism filling nearside impact depressions with mare basalts.',
      referenceCitation: 'Head (1976), Lunar volcanism in space and time, Rev. Geophys. 14',
    },
    {
      name: 'Eratosthenian',
      systemEra: 'Declining Volcanism',
      ageRangeGa: '3.20 – 1.10 Ga',
      majorEvents:
        'Waning effusive mare volcanism; moderate impact cratering whose optical ray systems have been degraded by space weathering.',
      referenceCitation: 'Wilhelms (1987)',
    },
    {
      name: 'Copernican',
      systemEra: 'Modern Impact Regime',
      ageRangeGa: '1.10 Ga – Present',
      majorEvents:
        'Fresh impact craters displaying bright, juvenile radial ray systems (Tycho, Copernicus), micrometeorite space weathering, and regolith maturation.',
      referenceCitation: 'Neukum et al. (2001), Cratering chronology of the inner solar system, Chronology and Evolution of Mars 96',
    },
  ],
  provinces: [
    {
      id: 'lunar-maria',
      name: 'Nearside Lunar Maria',
      provinceType: 'Volcanic Flood Basalt Plains',
      dominantLithology: 'Titanium-rich High-Fe/Low-Al Tholeiitic Basalt',
      centerLatitudeDeg: 15.0,
      centerLongitudeDeg: 340.0,
      areaKm2: 6400000,
      crustalThicknessKm: [28, 38],
      provenance: createObservedProvenance(
        'LUNA-PROVINCE-MARIA',
        'NASA PDS / LROC Team',
        'Jolliff et al. (2000), JGR Planets 105'
      ),
    },
    {
      id: 'lunar-highlands',
      name: 'Lunar Terrae (Farside Anorthosite Highlands)',
      provinceType: 'Ancient Primordial Crust',
      dominantLithology: 'Ferroan Anorthosite (FAN) & Noritic Anorthosite',
      centerLatitudeDeg: 0.0,
      centerLongitudeDeg: 180.0,
      areaKm2: 31000000,
      crustalThicknessKm: [45, 60],
      provenance: createObservedProvenance(
        'LUNA-PROVINCE-HIGHLANDS',
        'NASA PDS / LOLA Team',
        'Wieczorek et al. (2013), Science 339'
      ),
    },
    {
      id: 'south-pole-aitken',
      name: 'South Pole-Aitken (SPA) Basin',
      provinceType: 'Ultra-Deep Impact Basin',
      dominantLithology: 'Mafic Lower Crustal Norites & Mantle-Excavated Materials',
      centerLatitudeDeg: -53.0,
      centerLongitudeDeg: 191.0,
      areaKm2: 5000000,
      crustalThicknessKm: [15, 25],
      provenance: createObservedProvenance(
        'LUNA-PROVINCE-SPA',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
  ],
  majorFeatures: [
    {
      id: 'tycho-crater',
      name: 'Tycho Crater',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: -43.31,
      longitudeDeg: 348.64,
      diameterKm: 85,
      elevationMeters: -1400,
      depthOrHeightMeters: 4800,
      stratigraphicPeriod: 'Copernican (~108 Ma)',
      description:
        'Iconic young impact crater in the southern highlands with prominent high-albedo radial rays spanning over 1,500 km across the lunar disk.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-TYCHO',
        'NASA PDS / LRO LOLA Team',
        'Smith et al. (2010)'
      ),
    },
    {
      id: 'copernicus-crater',
      name: 'Copernicus Crater',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: 9.62,
      longitudeDeg: 339.92,
      diameterKm: 93,
      elevationMeters: -1200,
      depthOrHeightMeters: 3800,
      stratigraphicPeriod: 'Copernican (~800 Ma)',
      description:
        'Classic complex lunar crater with terraced walls, multiple central peaks rising 1.2 km, and extensive ray patterns in Oceanus Procellarum.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-COPERNICUS',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
    {
      id: 'shackleton-crater',
      name: 'Shackleton Crater (Lunar South Pole)',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: -89.67,
      longitudeDeg: 129.78,
      diameterKm: 21,
      elevationMeters: -1500,
      depthOrHeightMeters: 4200,
      stratigraphicPeriod: 'Eratosthenian',
      description:
        'Ultra-cold impact crater situated at the lunar South Pole whose floor contains Permanently Shadowed Regions (PSRs) harboring volatile water-ice deposits.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-SHACKLETON',
        'NASA PDS / LOLA Science Team',
        'Zuber et al. (2012), Nature 486'
      ),
    },
    {
      id: 'mare-tranquillitatis',
      name: 'Mare Tranquillitatis (Apollo 11 Base)',
      featureType: GeologicalFeatureType.MARE_BASALT_PLAIN,
      latitudeDeg: 0.674,
      longitudeDeg: 23.473,
      diameterKm: 873,
      elevationMeters: -1400,
      depthOrHeightMeters: 2000,
      stratigraphicPeriod: 'Late Imbrian',
      description:
        'High-titanium basalt plain site of humanity’s first crewed lunar landing (Apollo 11 Tranquility Base, July 20, 1969).',
      provenance: createObservedProvenance(
        'LOLA-FEAT-TRANQUILLITATIS',
        'NASA PDS / LROC Team',
        'Robinson et al. (2010)'
      ),
    },
    {
      id: 'oceanus-procellarum',
      name: 'Oceanus Procellarum (Ocean of Storms)',
      featureType: GeologicalFeatureType.MARE_BASALT_PLAIN,
      latitudeDeg: 18.4,
      longitudeDeg: 302.6,
      diameterKm: 2500,
      elevationMeters: -1800,
      depthOrHeightMeters: 2500,
      stratigraphicPeriod: 'Imbrian',
      description:
        'Largest lunar mare deposit covering over 4 million square kilometers on the western nearside.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-PROCELLARUM',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
    {
      id: 'mare-imbrium',
      name: 'Mare Imbrium (Sea of Rains)',
      featureType: GeologicalFeatureType.MARE_BASALT_PLAIN,
      latitudeDeg: 32.8,
      longitudeDeg: 344.4,
      diameterKm: 1145,
      elevationMeters: -2600,
      depthOrHeightMeters: 3000,
      stratigraphicPeriod: 'Early Imbrian (~3.85 Ga)',
      description:
        'Second largest impact basin on the nearside, ringed by Montes Apenninus and Montes Caucasus mountain ranges.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-IMBRIUM',
        'NASA PDS / LOLA Team',
        'Wilhelms (1987)'
      ),
    },
    {
      id: 'montes-apenninus',
      name: 'Montes Apenninus',
      featureType: GeologicalFeatureType.TERRA_HIGHLAND,
      latitudeDeg: 18.9,
      longitudeDeg: 3.7,
      diameterKm: 600,
      elevationMeters: 5400,
      depthOrHeightMeters: 5400,
      stratigraphicPeriod: 'Early Imbrian',
      description:
        'Rugged lunar mountain range forming the southeastern rim of the Imbrium impact basin, visited by Apollo 15.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-APENNINUS',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
    {
      id: 'aristarchus-crater',
      name: 'Aristarchus Crater',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: 23.7,
      longitudeDeg: 312.6,
      diameterKm: 40,
      elevationMeters: -800,
      depthOrHeightMeters: 3000,
      stratigraphicPeriod: 'Copernican (~450 Ma)',
      description:
        'Brightest major feature on the Moon with an albedo nearly double that of most lunar surfaces; contains the meandering volcanic sinuous rille Vallis Schröteri.',
      provenance: createObservedProvenance(
        'LOLA-FEAT-ARISTARCHUS',
        'NASA PDS / LROC Team',
        'Zisk et al. (1977), The Moon 17'
      ),
    },
    {
      id: 'antoniadi-crater',
      name: 'Antoniadi Crater (Lowest Lunar Point)',
      featureType: GeologicalFeatureType.IMPACT_CRATER,
      latitudeDeg: -69.7,
      longitudeDeg: 188.0,
      diameterKm: 143,
      elevationMeters: -9120,
      depthOrHeightMeters: 4500,
      stratigraphicPeriod: 'Late Imbrian',
      description:
        'Impact crater in the South Pole-Aitken basin whose floor marks the lowest elevation on the Moon (-9,120 meters below the mean lunar radius).',
      provenance: createObservedProvenance(
        'LOLA-FEAT-ANTONIADI',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
    {
      id: 'engelgardt-highland',
      name: 'Engel’gardt Crater Highlands (Highest Lunar Point)',
      featureType: GeologicalFeatureType.TERRA_HIGHLAND,
      latitudeDeg: 5.4,
      longitudeDeg: 201.4,
      diameterKm: 120,
      elevationMeters: 10786,
      depthOrHeightMeters: 10786,
      stratigraphicPeriod: 'Pre-Nectarian',
      description:
        'Farside anorthositic ridge north of Engel’gardt crater marking the highest elevation on the Moon (+10,786 meters above the mean lunar radius).',
      provenance: createObservedProvenance(
        'LOLA-FEAT-ENGELGARDT-HIGH',
        'NASA PDS / LOLA Team',
        'Smith et al. (2010)'
      ),
    },
  ],
  provenance: createDerivedProvenance(
    'LOLA-MOON-GEOLOGY-MASTER',
    'NASA PDS Geosciences Node / LRO LOLA Science Team',
    'Smith et al. (2010), Wieczorek et al. (2013), Wilhelms (1987)',
    'Composite lunar geology profile integrating observed laser altimetry (LOLA: OBSERVED) with geophysical interior structure models (GRAIL/Apollo: DERIVED).'
  ),
};

/**
 * Registry of all available planetary geology profiles.
 */
export const PLANETARY_GEOLOGY_REGISTRY: Record<string, PlanetaryGeology> = {
  mars: MARS_GEOLOGY,
  moon: MOON_GEOLOGY,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Analytical Spatial & Cartographic Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Retrieve the planetary geology profile for a body by ID, name, or existing profile.
 */
export function getPlanetaryGeology(bodyOrId: string | PlanetaryGeology): PlanetaryGeology | null {
  if (typeof bodyOrId === 'object' && bodyOrId !== null) {
    return bodyOrId;
  }
  if (typeof bodyOrId !== 'string') return null;
  const key = bodyOrId.toLowerCase().trim();
  if (PLANETARY_GEOLOGY_REGISTRY[key]) {
    return PLANETARY_GEOLOGY_REGISTRY[key];
  }
  for (const g of Object.values(PLANETARY_GEOLOGY_REGISTRY)) {
    if (g.bodyName.toLowerCase().includes(key) || key.includes(g.bodyName.toLowerCase())) {
      return g;
    }
  }
  return null;
}

/**
 * Calculate great-circle distance between two points on a sphere (Haversine formula).
 */
export function haversineDistanceKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
  radiusKm: number
): number {
  const toRad = Math.PI / 180.0;
  const phi1 = lat1Deg * toRad;
  const phi2 = lat2Deg * toRad;
  const deltaPhi = (lat2Deg - lat1Deg) * toRad;
  const deltaLambda = (lon2Deg - lon1Deg) * toRad;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1.0 - a)));

  return radiusKm * c;
}

/**
 * Find all major geological features within radiusKm of a planetocentric coordinate,
 * returning them sorted by distance.
 */
export function findNearbyFeatures(
  bodyOrId: string | PlanetaryGeology,
  latDeg: number,
  lonDeg: number,
  radiusKm: number
): { feature: GeologicalFeature; distanceKm: number }[] {
  const geology = getPlanetaryGeology(bodyOrId);
  if (!geology || radiusKm <= 0) return [];

  const bodyRadiusKm = geology.meanRadiusKm;
  const matches: { feature: GeologicalFeature; distanceKm: number }[] = [];

  for (const feat of geology.majorFeatures) {
    const dist = haversineDistanceKm(
      latDeg,
      lonDeg,
      feat.latitudeDeg,
      feat.longitudeDeg,
      bodyRadiusKm
    );
    if (dist <= radiusKm) {
      matches.push({ feature: feat, distanceKm: dist });
    }
  }

  return matches.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Analytically sample the digital elevation model (in meters relative to datum)
 * at any geodetic coordinate using calibrated regional feature influence.
 */
export function sampleElevationMeters(
  bodyOrId: string | PlanetaryGeology,
  latDeg: number,
  lonDeg: number
): number | null {
  const geology = getPlanetaryGeology(bodyOrId);
  if (!geology) return null;

  const dem = geology.dem;
  const bodyRadiusKm = geology.meanRadiusKm;

  // Baseline elevation: interpolated background baseline
  let baseZ = dem.meanElevationMeters;

  // Mars crustal dichotomy gradient: low in north, high in south
  if (geology.bodyId === 'mars') {
    // S-N transition around 0° latitude
    const latFactor = Math.sin((latDeg * Math.PI) / 180.0);
    // Northern plains are ~4 km below southern highlands
    baseZ = -2000.0 * latFactor;
  } else if (geology.bodyId === 'moon') {
    // Farside (around 180° lon) is higher than nearside (0° lon)
    const lonRad = (lonDeg * Math.PI) / 180.0;
    const farsideFactor = -Math.cos(lonRad); // +1 at 180°, -1 at 0°
    baseZ = 1200.0 * farsideFactor;
  }

  // Weight elevation contributions from known prominent features
  let weightedDelta = 0;
  let totalWeight = 0;

  for (const feat of geology.majorFeatures) {
    if (feat.elevationMeters === undefined) continue;
    const distKm = haversineDistanceKm(
      latDeg,
      lonDeg,
      feat.latitudeDeg,
      feat.longitudeDeg,
      bodyRadiusKm
    );

    const influenceRadius = Math.max(feat.diameterKm * 1.5, 100);
    if (distKm < influenceRadius) {
      // Gaussian spatial kernel
      const weight = Math.exp(-Math.pow(distKm / (influenceRadius * 0.5), 2));
      const targetElevation = feat.elevationMeters;
      weightedDelta += (targetElevation - baseZ) * weight;
      totalWeight += weight;
    }
  }

  let finalZ = baseZ;
  if (totalWeight > 0) {
    finalZ = baseZ + weightedDelta / Math.max(1.0, totalWeight);
  }

  // Clamp within validated DEM extrema
  return Math.max(dem.minElevationMeters, Math.min(dem.maxElevationMeters, finalZ));
}

/**
 * Transform IAU planetocentric spherical coordinates (lat, lon, elevation)
 * into a 3D Cartesian Vector3 in simulation space (Y-up, XZ plane).
 */
export function convertPlanetocentricToCartesian(
  latDeg: number,
  lonDeg: number,
  meanRadiusMeters: number,
  elevationMeters: number = 0
): Vector3 {
  const toRad = Math.PI / 180.0;
  const phi = latDeg * toRad; // latitude (-pi/2 to pi/2)
  const lambda = lonDeg * toRad; // east longitude (0 to 2pi)

  const r = meanRadiusMeters + elevationMeters;

  // Y-up coordinate convention:
  // Y = r * sin(latitude) (North pole along +Y)
  // X = r * cos(latitude) * sin(longitude)
  // Z = r * cos(latitude) * cos(longitude)
  const y = r * Math.sin(phi);
  const x = r * Math.cos(phi) * Math.sin(lambda);
  const z = r * Math.cos(phi) * Math.cos(lambda);

  return new Vector3(x, y, z);
}

/**
 * Convert planetocentric latitude/longitude to normalized texture UV coordinates [0, 1].
 */
export function convertPlanetocentricToUV(
  latDeg: number,
  lonDeg: number,
  projection: MapProjectionType = MapProjectionType.EQUIRECTANGULAR
): { u: number; v: number } {
  // Normalize longitude to [0, 360)
  const normLon = ((lonDeg % 360) + 360) % 360;
  // Clamp latitude to [-90, +90]
  const clampLat = Math.max(-90, Math.min(90, latDeg));

  switch (projection) {
    case MapProjectionType.EQUIRECTANGULAR:
    default: {
      const u = normLon / 360.0;
      const v = (clampLat + 90.0) / 180.0;
      return { u, v };
    }
    case MapProjectionType.ORTHOGRAPHIC: {
      // Perspective projection on hemisphere visible from (0° lat, 0° lon)
      const toRad = Math.PI / 180.0;
      const phi = clampLat * toRad;
      const lambda = normLon > 180 ? (normLon - 360) * toRad : normLon * toRad;
      const x = Math.cos(phi) * Math.sin(lambda);
      const y = Math.sin(phi);
      return {
        u: Math.max(0, Math.min(1, 0.5 + 0.5 * x)),
        v: Math.max(0, Math.min(1, 0.5 + 0.5 * y)),
      };
    }
    case MapProjectionType.POLAR_STEREOGRAPHIC: {
      // Polar stereographic: v represents distance from north pole (for north) or south
      const toRad = Math.PI / 180.0;
      const colat = (90.0 - Math.abs(clampLat)) * toRad;
      const r = 2.0 * Math.tan(colat / 2.0);
      const lambda = normLon * toRad;
      const x = r * Math.sin(lambda);
      const y = r * Math.cos(lambda);
      return {
        u: Math.max(0, Math.min(1, 0.5 + 0.25 * x)),
        v: Math.max(0, Math.min(1, 0.5 + 0.25 * y)),
      };
    }
  }
}
