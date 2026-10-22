/**
 * ASTRAVERSA Ω — Galaxy Generator
 *
 * Procedurally generates a Milky Way-class barred spiral galaxy (ANANTARA α)
 * from a deterministic seed.
 *
 * Astronomical & Mathematical Architecture:
 * ──────────────────────────────────────────
 * 1. SCALE & PHYSICAL EXTENT
 *    - Main stellar-body disk diameter: 500,000 light-years (~153.3 kpc diameter, R_disk ~76.65 kpc)
 *    - Extended diffuse stellar halo: ~750,000 light-years (~230 kpc diameter, R_halo ~115 kpc)
 *    - Central disk thickness: ~4.0 kpc
 *
 * 2. CENTRAL STELLAR BAR
 *    - Triaxial prolate ellipsoidal stellar bar with semi-major axis a_bar ~20 kpc,
 *      axial ratio b/a ~0.33 (semi-minor axis b_bar ~6.6 kpc), vertical scale ~3.5 kpc,
 *      oriented at position angle φ_bar = 28° (~0.489 rad).
 *
 * 3. FOUR PRINCIPAL CONTINUOUS LOGARITHMIC SPIRAL ARMS
 *    - Continuous logarithmic arms emerging from the bar tips and inner resonance:
 *      1. Scutum-Centaurus Arm (Major, bar tip 1 at φ_bar)
 *      2. Perseus Arm (Major, bar tip 2 at φ_bar + π)
 *      3. Sagittarius-Carina Arm (Minor, inner transition at φ_bar + π/2)
 *      4. Norma-Outer Arm (Minor, resonance transition at φ_bar + 3π/2)
 *    - θ(r) = θ_start + ln(r / r_start) / tan(ψ), pitch angle ψ ~ 13°
 *    - Pitch-angle-dependent radial broadening: w(r) = w_0 + 0.08 * r
 *
 * 4. DUAL THIN & THICK STELLAR DISKS
 *    - Thin disk (85% of disk stars): h_z ~1.5 kpc, young metal-rich Population I, OB stars
 *    - Thick disk (15% of disk stars): h_z ~4.5 kpc, older intermediate-metallicity Population II
 *
 * 5. GALACTIC NUCLEUS & SUPERMASSIVE BLACK HOLE (ANANTARA A*)
 *    - Central singularity mass M = 4.154 × 10⁶ M☉
 *    - Schwarzschild radius r_s = 2GM/c² ≈ 12.269 × 10⁶ km (~0.082 AU)
 *    - Surrounded by dense Nuclear Star Cluster cusp
 *
 * 6. DETERMINISTIC REPRODUCIBILITY
 *    - Isolated PRNG child forks preserve seed stream determinism across components.
 */

import { SeededRandom } from './SeededRandom';
import { computeStellarProperties, getSpectralClass } from '../astronomy/stellar';
import {
  SOLAR_MASS,
  SOLAR_LUMINOSITY,
  lightYearsToKpc,
  kpcToLightYears,
  schwarzschildRadiusMeters,
  schwarzschildRadiusKm,
  schwarzschildRadiusAU,
} from '../astronomy/constants';
import type {
  Galaxy,
  GalaxyStar,
  StarCluster,
  SpiralArmParams,
  SpiralArmDefinition,
  BarParams,
  DiskStructureParams,
  SupermassiveBlackHole,
  BulgeParams,
  QualityLevel,
} from './Galaxy';
import { GalaxyType, QUALITY_STAR_COUNTS } from './Galaxy';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Name Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GALAXY_PREFIXES = [
  'Andromeda', 'Centaurus', 'Triangulum', 'Sculptor', 'Fornax',
  'Virgo', 'Cygnus', 'Pegasus', 'Aquila', 'Serpens',
  'Perseus', 'Carina', 'Orion', 'Sagittarius', 'Corvus',
  'Hydra', 'Lyra', 'Draco', 'Vela', 'Phoenix',
];

const GALAXY_SUFFIXES = [
  'Nexus', 'Rift', 'Expanse', 'Stream', 'Vortex',
  'Void', 'Gate', 'Crown', 'Arc', 'Span',
  'Deep', 'Reach', 'Haven', 'Core', 'Edge',
];

export function generateGalaxyName(rng: SeededRandom): string {
  return `${rng.pick(GALAXY_PREFIXES)} ${rng.pick(GALAXY_SUFFIXES)}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Star Name Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STAR_PREFIXES = [
  'Astra', 'Sol', 'Vega', 'Altair', 'Rigel', 'Sirius', 'Deneb',
  'Polaris', 'Antares', 'Castor', 'Spica', 'Regulus', 'Betel',
  'Capella', 'Procyon', 'Achernar', 'Canopus', 'Aldebaran',
  'Mira', 'Arcturus', 'Fomalhaut', 'Rasalhague', 'Shaula',
  'Nunki', 'Kochab', 'Eltanin', 'Alioth', 'Alkaid',
];

const STAR_SUFFIXES = [
  'Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'Gamma', 'Delta',
  'Nova', 'Tau', 'Sigma', 'Omega', 'Zeta', 'Epsilon', 'Theta',
  'Lambda', 'Kappa', 'Iota', 'Rho', 'Phi', 'Psi',
];

function generateStarName(rng: SeededRandom): string {
  return `${rng.pick(STAR_PREFIXES)} ${rng.pick(STAR_SUFFIXES)}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Stellar Mass Sampling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sampleStellarMass(rng: SeededRandom): number {
  const roll = rng.next();

  if (roll < 0.30) {
    return rng.range(0.08, 0.45); // M-type
  } else if (roll < 0.55) {
    return rng.range(0.45, 0.8);  // K-type
  } else if (roll < 0.80) {
    return rng.range(0.8, 1.04);  // G-type
  } else if (roll < 0.90) {
    return rng.range(1.04, 1.4);  // F-type
  } else if (roll < 0.96) {
    return rng.range(1.4, 2.1);   // A-type
  } else if (roll < 0.99) {
    return rng.range(2.1, 10);    // B-type
  } else {
    return rng.range(10, 30);     // O-type
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Barred Spiral Geometry Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute the angle of a continuous logarithmic spiral arm originating from bar tip.
 * θ(r) = θ_start + ln(r / r_start) / tan(pitchAngle)
 */
export function barredSpiralArmAngle(
  r: number,
  rStart: number,
  thetaStart: number,
  pitchAngleRad: number
): number {
  if (r <= rStart) return thetaStart;
  return thetaStart + Math.log(r / rStart) / Math.tan(pitchAngleRad);
}

/**
 * Construct the canonical four major logarithmic spiral arms.
 */
export function createDefaultSpiralArmDefinitions(
  barLength: number,
  barAngle: number,
  armCount: number = 4,
  pitchAngleDeg: number = 13.0,
  armWidthMult: number = 1.0
): SpiralArmDefinition[] {
  const pitchAngleRad = pitchAngleDeg * (Math.PI / 180);

  // Exact canonical four major logarithmic spiral arms when using defaults
  if (armCount === 4 && Math.abs(pitchAngleDeg - 13.0) < 0.001 && Math.abs(armWidthMult - 1.0) < 0.001) {
    return [
      {
        name: 'Scutum-Centaurus Arm',
        armIndex: 0,
        startRadius: barLength,
        startAngle: barAngle,
        pitchAngleRad,
        widthExpansionCoeff: 0.08,
        isMajor: true,
      },
      {
        name: 'Perseus Arm',
        armIndex: 1,
        startRadius: barLength,
        startAngle: barAngle + Math.PI,
        pitchAngleRad,
        widthExpansionCoeff: 0.08,
        isMajor: true,
      },
      {
        name: 'Sagittarius-Carina Arm',
        armIndex: 2,
        startRadius: barLength * 0.70,
        startAngle: barAngle + Math.PI * 0.5,
        pitchAngleRad: 12.0 * (Math.PI / 180),
        widthExpansionCoeff: 0.07,
        isMajor: false,
      },
      {
        name: 'Norma-Outer Arm',
        armIndex: 3,
        startRadius: barLength * 0.85,
        startAngle: barAngle + Math.PI * 1.5,
        pitchAngleRad: 12.5 * (Math.PI / 180),
        widthExpansionCoeff: 0.075,
        isMajor: false,
      },
    ];
  }

  // Generalized arm generation for armCount 2..8
  const armNames = [
    'Scutum-Centaurus Arm',
    'Perseus Arm',
    'Sagittarius-Carina Arm',
    'Norma-Outer Arm',
    'Cygnus-Orion Arm',
    'Crux-Centaurus Arm',
    'Vela-Outer Arm',
    'Hydra-Resonance Arm',
  ];

  const defs: SpiralArmDefinition[] = [];
  for (let i = 0; i < armCount; i++) {
    const isMajor = i % 2 === 0;
    const startRadius = isMajor ? barLength : barLength * 0.75;
    const angleOffset = (i * 2 * Math.PI) / armCount;
    defs.push({
      name: armNames[i] ?? `Spiral Arm ${i + 1}`,
      armIndex: i,
      startRadius,
      startAngle: barAngle + angleOffset,
      pitchAngleRad,
      widthExpansionCoeff: (isMajor ? 0.08 : 0.072) * armWidthMult,
      isMajor,
    });
  }
  return defs;
}

/**
 * Instantiate the central supermassive black hole (ANANTARA A*).
 */
export function createSupermassiveBlackHole(
  massSolar: number = 4.154e6
): SupermassiveBlackHole {
  return recalculateSupermassiveBlackHole(massSolar);
}

/**
 * Recompute astrophysical properties when black hole mass is reconfigured.
 */
export function recalculateSupermassiveBlackHole(
  massSolar: number,
  existing?: Partial<SupermassiveBlackHole>
): SupermassiveBlackHole {
  const massKg = massSolar * SOLAR_MASS;
  const rsMeters = schwarzschildRadiusMeters(massSolar);
  const rsKm = schwarzschildRadiusKm(massSolar);
  const rsAU = schwarzschildRadiusAU(massSolar);
  const photonRingAU = rsAU * 1.5;
  const eddingtonLuminosityWatts = 1.26e31 * massSolar;

  // Scale sphere of influence and velocity dispersion according to M-sigma relation
  const massRatio = Math.max(1e-4, massSolar / 4.154e6);
  const sphereOfInfluencePc = 3.0 * Math.pow(massRatio, 0.5);
  const velocityDispersionKms = Math.round(105 * Math.pow(massRatio, 0.25));

  // Relativistic jet properties (fictional simulation setting inspired by giant radio galaxies)
  // Jet length scales gently with SMBH mass, typical colossal galaxy jet ~50-80 kpc
  const jetLengthKpc = Math.min(120, 52.0 * Math.pow(massRatio, 0.15));
  const radioLobeRadiusKpc = Math.min(45, 18.0 * Math.pow(massRatio, 0.15));
  const jetLuminosityWatts = 1.0e37 * Math.pow(massRatio, 1.1);

  return {
    id: existing?.id ?? 'smbh-anantara-a-star',
    name: existing?.name ?? 'ANANTARA A*',
    massSolar,
    massKg,
    schwarzschildRadiusMeters: rsMeters,
    schwarzschildRadiusKm: rsKm,
    schwarzschildRadiusAU: rsAU,
    photonRingAU,
    eddingtonLuminosityWatts,
    spinParameter: existing?.spinParameter ?? 0.94,
    accretionState: existing?.accretionState ?? (massSolar > 1e8 ? 'active' : 'quiescent'),
    sphereOfInfluencePc,
    velocityDispersionKms,
    jetLengthKpc,
    jetLuminosityWatts,
    radioLobeRadiusKpc,
    visualScaleNotice: 'Optical event-horizon marker scaled for galactic visibility; physical Schwarzschild radius is exact.',
    isFictionalSimulation: true,
    x: 0,
    y: 0,
    z: 0,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GalaxyGenerationConfig {
  quality?: QualityLevel;
  targetDiameterLy?: number;
  generationVersion?: number;
  /** Explicit star tracer count (5,000 to 100,000, overrides quality if specified) */
  starCount?: number;
  /** Spiral arm count (2 to 8, default 4) */
  armCount?: number;
  /** Spiral arm width multiplier (0.3x to 2.5x, default 1.0x) */
  armWidthMult?: number;
  /** Spiral arm pitch angle in degrees (6° to 30°, default 13.0°) */
  armPitchAngleDeg?: number;
  /** Spiral arm winding factor (0.2 to 1.5, default 0.62) */
  armWindingFactor?: number;
  /** Bulge radius fraction of galactic radius (0.05 to 0.30, default 0.13) */
  bulgeRadiusFraction?: number;
  /** Extended halo radius multiplier relative to main disk (1.0x to 2.5x, default 1.5x) */
  haloRadiusMultiplier?: number;
  /** Star nursery / cluster count (8 to 100, default 36) */
  clusterCount?: number;
}

const DEFAULT_CONFIG: GalaxyGenerationConfig = {
  quality: 'MEDIUM' as QualityLevel,
  generationVersion: 2,
};

/**
 * Generate a complete Milky Way-class barred spiral galaxy (ANANTARA α).
 *
 * @param seed - Integer seed for deterministic generation (default 42 for ANANTARA α)
 * @param config - Optional configuration override
 */
export function generateGalaxy(
  seed: number,
  config: GalaxyGenerationConfig = DEFAULT_CONFIG
): Galaxy {
  const rng = new SeededRandom(seed);

  // Canonical name for default universe seed 42 is ANANTARA α
  const isCanonicalAnantara = seed === 42;
  const name = isCanonicalAnantara ? 'ANANTARA α' : generateGalaxyName(rng);
  const displayName = isCanonicalAnantara ? 'ANANTARA α' : name;

  // ── Dimensions & Physical Scales ─────────────────────────
  // ANANTARA α targets 500,000-light-year main stellar disk body diameter
  const mainDiskDiameterLy = config.targetDiameterLy !== undefined
    ? config.targetDiameterLy
    : (isCanonicalAnantara ? 500000 : kpcToLightYears(rng.range(12, 18) * 2));
  const radius = lightYearsToKpc(mainDiskDiameterLy / 2);
  const haloRadiusMultiplier = config.haloRadiusMultiplier ?? 1.5;
  const extendedHaloRadiusKpc = radius * haloRadiusMultiplier;
  const extendedHaloDiameterLy = kpcToLightYears(extendedHaloRadiusKpc * 2);

  const thickness = isCanonicalAnantara ? 4.0 : radius * 0.05;
  const age = isCanonicalAnantara ? 12.8 : rng.range(10.0, 13.5);
  const metallicity = isCanonicalAnantara ? 0.58 : rng.range(0.3, 0.8);
  const estimatedPopulation = isCanonicalAnantara ? 420 : rng.range(100, 400);

  // ── Central Stellar Bar ──────────────────────────────────
  const barLength = radius * 0.26; // ~19.93 kpc semi-major axis
  const barWidth = barLength * 0.33; // ~6.58 kpc semi-minor axis
  const barThickness = 3.5; // kpc vertical scale height
  const barAngle = 28.0 * (Math.PI / 180); // 28 degrees position angle (~0.48869 rad)

  const bar: BarParams = {
    length: barLength,
    width: barWidth,
    thickness: barThickness,
    angle: barAngle,
    densityMultiplier: 5.0,
  };

  // ── Central Spheroidal Bulge ─────────────────────────────
  const bulgeRadiusFraction = config.bulgeRadiusFraction ?? 0.13; // ~9.96 kpc radius default
  const bulge: BulgeParams = {
    radiusFraction: bulgeRadiusFraction,
    verticalScale: 2.2, // ~8.8 kpc vertical extent
    densityMultiplier: 4.5,
  };

  // ── Dual Thin & Thick Disk Structure ─────────────────────
  const diskStructure: DiskStructureParams = {
    thinScaleHeight: 1.5, // kpc (thin disk, young Pop I)
    thickScaleHeight: 4.5, // kpc (thick disk, older Pop II)
    radialScaleLength: radius * 0.32, // ~24.5 kpc exponential radial scale length
    thickDiskFraction: 0.15, // 15% thick disk, 85% thin disk
    mainDiskRadiusKpc: radius,
    mainDiskDiameterLy,
    extendedHaloRadiusKpc,
    extendedHaloDiameterLy,
  };

  // ── Spiral Arms ──────────────────────────────────────────
  const armCount = config.armCount ?? 4;
  const armPitchAngleDeg = config.armPitchAngleDeg ?? 13.0;
  const armWidthMult = config.armWidthMult ?? 1.0;
  const armWindingFactor = config.armWindingFactor ?? 0.62;

  const spiralArmDefinitions = createDefaultSpiralArmDefinitions(
    barLength,
    barAngle,
    armCount,
    armPitchAngleDeg,
    armWidthMult
  );

  const spiralArms: SpiralArmParams = {
    armCount,
    windingFactor: armWindingFactor,
    armOffset: barAngle,
    armWidth: 0.10 * armWidthMult,
    armDensity: 0.72,
  };

  // ── Galactic Nucleus (Supermassive Black Hole) ───────────
  const nucleus = createSupermassiveBlackHole(4.154e6);

  // ── Generate Star Clusters (Nurseries) ───────────────────
  const clusterCount = config.clusterCount ?? 36;
  const clusters: StarCluster[] = [];
  const clusterRng = rng.fork(1000);

  for (let i = 0; i < clusterCount; i++) {
    const cRng = clusterRng.fork(i);
    clusters.push(
      generateBarredStarCluster(i, cRng, radius, thickness, bar, spiralArmDefinitions)
    );
  }

  // ── Generate Representative Stars ────────────────────────
  const resolvedQuality: QualityLevel = config.quality ?? (
    config.starCount !== undefined
      ? (config.starCount <= 12000 ? 'LOW' : config.starCount <= 30000 ? 'MEDIUM' : 'HIGH')
      : 'MEDIUM'
  );
  const starCount = config.starCount ?? QUALITY_STAR_COUNTS[resolvedQuality];
  const stars = generateBarredGalaxyStars(
    seed,
    rng.fork(2000),
    starCount,
    radius,
    thickness,
    bar,
    bulge,
    diskStructure,
    spiralArmDefinitions,
    metallicity,
    clusters,
    armWidthMult
  );

  // Assign star indices to clusters
  assignStarsToClusters(stars, clusters);

  return {
    id: `galaxy-${seed}`,
    name,
    displayName,
    generationVersion: config.generationVersion ?? 2,
    seed,
    type: GalaxyType.BARRED_SPIRAL,
    radius,
    thickness,
    estimatedPopulation,
    age,
    metallicity,
    spiralArms,
    spiralArmDefinitions,
    bar,
    bulge,
    diskStructure,
    nucleus,
    clusters,
    stars,
    quality: resolvedQuality,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Star Cluster Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateBarredStarCluster(
  index: number,
  rng: SeededRandom,
  galaxyRadius: number,
  galaxyThickness: number,
  _bar: BarParams,
  armDefs: SpiralArmDefinition[]
): StarCluster {
  // Place clusters along the 4 spiral arms or near the active bar tips
  const arm = armDefs[index % armDefs.length];
  const rFraction = Math.pow(rng.next(), 0.65);
  const r = arm.startRadius + rFraction * (galaxyRadius * 0.82 - arm.startRadius);

  const armAngle = barredSpiralArmAngle(r, arm.startRadius, arm.startAngle, arm.pitchAngleRad);
  const widthAtR = (arm.startRadius * 0.12 + arm.widthExpansionCoeff * r);
  const theta = armAngle + rng.gaussian(0, widthAtR / Math.max(r, 1.0));

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  const y = rng.gaussian(0, galaxyThickness * 0.18);

  const clusterRadius = rng.range(0.2, 0.9); // kpc
  const populationEstimate = rng.rangeInt(500, 25000);
  const density = populationEstimate / ((4 / 3) * Math.PI * Math.pow(clusterRadius, 3));

  return {
    id: `cluster-${index}`,
    seed: rng.deriveSeed(index),
    x,
    y,
    z,
    radius: clusterRadius,
    populationEstimate,
    starIndices: [],
    density,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Star Generation (Barred Spiral Model)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate all representative stars for ANANTARA α.
 *
 * Population allocation:
 * - ~10% Spheroidal Bulge
 * - ~16% Central Elongated Stellar Bar
 * - ~54% Four Continuous Spiral Arms (Thin disk with OB star clusters)
 * - ~20% Inter-arm & Thick Disk population
 */
function generateBarredGalaxyStars(
  galaxySeed: number,
  rng: SeededRandom,
  totalStars: number,
  galaxyRadius: number,
  galaxyThickness: number,
  bar: BarParams,
  bulge: BulgeParams,
  diskStructure: DiskStructureParams,
  armDefs: SpiralArmDefinition[],
  avgMetallicity: number,
  _clusters: StarCluster[],
  armWidthMult: number = 1.0
): GalaxyStar[] {
  const stars: GalaxyStar[] = [];

  const bulgeCount = Math.floor(totalStars * 0.10);
  const barCount = Math.floor(totalStars * 0.16);
  const armCount = Math.floor(totalStars * 0.54);
  const diskCount = totalStars - bulgeCount - barCount - armCount;

  // 1. Spheroidal Bulge Stars
  const bulgeRng = rng.fork(100);
  const bulgeRadius = galaxyRadius * bulge.radiusFraction;
  for (let i = 0; i < bulgeCount; i++) {
    const sRng = bulgeRng.fork(i);
    const x = sRng.gaussian(0, bulgeRadius * 0.38);
    const z = sRng.gaussian(0, bulgeRadius * 0.38);
    const y = sRng.gaussian(0, galaxyThickness * bulge.verticalScale * 0.28);
    stars.push(createGalaxyStar(stars.length, galaxySeed, sRng, x, y, z, avgMetallicity * 1.15, -1));
  }

  // 2. Central Stellar Bar Stars (Triaxial rotated profile)
  const barRng = rng.fork(150);
  const cosA = Math.cos(bar.angle);
  const sinA = Math.sin(bar.angle);

  for (let i = 0; i < barCount; i++) {
    const sRng = barRng.fork(i);
    // Prolate distribution along bar major axis
    const u = sRng.gaussian(0, bar.length * 0.45);
    const v = sRng.gaussian(0, bar.width * 0.40);
    const y = sRng.gaussian(0, bar.thickness * 0.32);

    // Rotate to position angle φ_bar
    const x = u * cosA - v * sinA;
    const z = u * sinA + v * cosA;

    stars.push(createGalaxyStar(stars.length, galaxySeed, sRng, x, y, z, avgMetallicity * 1.08, -1));
  }

  // 3. Four Spiral Arms (Continuous logarithmic curves emerging from bar tips)
  const armRng = rng.fork(200);
  for (let i = 0; i < armCount; i++) {
    const sRng = armRng.fork(i);
    const arm = armDefs[i % armDefs.length];

    // Radial distribution along arms (exponential falloff along arms)
    const rFraction = Math.pow(sRng.next(), 0.72);
    const r = arm.startRadius + rFraction * (galaxyRadius * 0.90 - arm.startRadius);

    const idealAngle = barredSpiralArmAngle(r, arm.startRadius, arm.startAngle, arm.pitchAngleRad);
    // Tighter arm spine width for crisp, coherent four-arm definition
    const widthAtR = (arm.startRadius * 0.040 + arm.widthExpansionCoeff * 0.38 * r) * armWidthMult;
    const scatter = sRng.gaussian(0, widthAtR);
    // Organic spur branches on ~10% of stars with constant PRNG call sequence
    const spurRoll = sRng.next();
    const spurScatter = sRng.gaussian(0, 0.35);
    const spur = spurRoll < 0.10 ? spurScatter : 0;
    const theta = idealAngle + scatter / Math.max(r, 1.0) + spur;

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    // Dual thin/thick disk vertical distribution
    const isThick = sRng.next() < diskStructure.thickDiskFraction;
    const scaleH = isThick ? diskStructure.thickScaleHeight : diskStructure.thinScaleHeight;
    const y = sRng.gaussian(0, scaleH * 0.35);

    // Metallicity gradient
    const radialFrac = r / galaxyRadius;
    const localMet = avgMetallicity * (1 - 0.28 * radialFrac) + sRng.gaussian(0, 0.08);

    stars.push(createGalaxyStar(stars.length, galaxySeed, sRng, x, y, z, localMet, -1));
  }

  // 4. Inter-Arm & Thick Disk Field Population
  const fieldRng = rng.fork(300);
  for (let i = 0; i < diskCount; i++) {
    const sRng = fieldRng.fork(i);
    const r = sampleExponentialRadius(sRng, diskStructure.radialScaleLength, galaxyRadius);
    const theta = sRng.range(0, Math.PI * 2);

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    // Predominantly thick disk / older stars
    const y = sRng.gaussian(0, diskStructure.thickScaleHeight * 0.38);
    const localMet = avgMetallicity * 0.85 + sRng.gaussian(0, 0.1);

    stars.push(createGalaxyStar(stars.length, galaxySeed, sRng, x, y, z, localMet, -1));
  }

  return stars;
}

/**
 * Sample radius from an exponential distribution: r = -scaleLength * ln(1 - u)
 */
function sampleExponentialRadius(
  rng: SeededRandom,
  scaleLength: number,
  maxRadius: number
): number {
  const u = rng.next();
  const maxCDF = 1 - Math.exp(-maxRadius / scaleLength);
  const r = -scaleLength * Math.log(1 - u * maxCDF);
  return Math.min(r, maxRadius);
}

/**
 * Create a GalaxyStar from position and physical attributes.
 */
function createGalaxyStar(
  index: number,
  galaxySeed: number,
  rng: SeededRandom,
  x: number,
  y: number,
  z: number,
  metallicity: number,
  clusterIndex: number
): GalaxyStar {
  const massSolar = sampleStellarMass(rng);
  const stellar = computeStellarProperties(massSolar);

  const starSeed = rng.deriveSeed(index);
  const nameRng = new SeededRandom(starSeed);
  const name = generateStarName(nameRng);

  return {
    id: `gs-${galaxySeed}-${index}`,
    name,
    seed: starSeed,
    x,
    y,
    z,
    massSolar,
    temperature: stellar.temperature,
    luminositySolar: stellar.luminosity / SOLAR_LUMINOSITY,
    spectralClass: getSpectralClass(massSolar),
    color: stellar.color,
    radiusSolar: stellar.radius / 6.957e8,
    metallicity: Math.max(0, Math.min(1, metallicity)),
    clusterIndex,
  };
}

/**
 * Assign nearby stars to clusters for selection.
 */
function assignStarsToClusters(stars: GalaxyStar[], clusters: StarCluster[]): void {
  for (let si = 0; si < stars.length; si++) {
    const star = stars[si];
    for (let ci = 0; ci < clusters.length; ci++) {
      const cluster = clusters[ci];
      const dx = star.x - cluster.x;
      const dy = star.y - cluster.y;
      const dz = star.z - cluster.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < cluster.radius * cluster.radius) {
        star.clusterIndex = ci;
        cluster.starIndices.push(si);
        break;
      }
    }
  }
}
