/**
 * ASTRAVERSA Ω — Galaxy Generator
 *
 * Procedurally generates a spiral galaxy from a seed.
 *
 * Mathematical approach:
 * ─────────────────────
 * Stars are distributed using a combination of:
 *
 * 1. LOGARITHMIC SPIRAL ARMS
 *    θ(r) = windingFactor × ln(r / r₀) + armOffset_i
 *    Stars cluster around these spirals with Gaussian noise.
 *
 * 2. RADIAL DENSITY PROFILE
 *    ρ(r) = exp(-r / scaleLength)
 *    Stars are more concentrated toward the center.
 *
 * 3. CENTRAL BULGE
 *    Separate 3D Gaussian distribution for bulge stars.
 *    Higher vertical extent than the disk.
 *
 * 4. VERTICAL DISTRIBUTION
 *    Disk stars: thin Gaussian in Y (sech² approximation via Gaussian)
 *    Bulge stars: wider Gaussian in all dimensions.
 *
 * 5. INTER-ARM POPULATION
 *    Some stars exist between arms (field stars), providing
 *    a diffuse background population.
 *
 * Hierarchical seeding:
 *    Galaxy Seed → Cluster Seed → Star Seed → System Seed
 *
 * All assumptions documented in TATTVA.md.
 */

import { SeededRandom } from './SeededRandom';
import { computeStellarProperties, getSpectralClass } from '../astronomy/stellar';
import { SOLAR_LUMINOSITY } from '../astronomy/constants';
import type {
  Galaxy,
  GalaxyStar,
  StarCluster,
  SpiralArmParams,
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

function generateGalaxyName(rng: SeededRandom): string {
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

/**
 * Sample a stellar mass from a distribution weighted toward common star types.
 * Same approach as SolarSystemGenerator for consistency.
 */
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
// Spiral Geometry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Compute the angle of a logarithmic spiral arm at a given radius.
 *
 * θ(r) = windingFactor × ln(r / r₀) + armPhaseOffset
 *
 * This approximation produces spiral arms that wind tighter
 * at smaller radii and open up toward the outer edge.
 *
 * @param r - Galactocentric radius (kpc)
 * @param windingFactor - Controls spiral tightness
 * @param armPhaseOffset - Phase offset for this particular arm
 * @param scaleRadius - Inner scale radius to prevent log(0)
 */
function spiralArmAngle(
  r: number,
  windingFactor: number,
  armPhaseOffset: number,
  scaleRadius: number = 0.5
): number {
  return windingFactor * Math.log(Math.max(r, 0.01) / scaleRadius) + armPhaseOffset;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Configuration for galaxy generation.
 */
export interface GalaxyGenerationConfig {
  quality: QualityLevel;
}

const DEFAULT_CONFIG: GalaxyGenerationConfig = {
  quality: 'MEDIUM' as QualityLevel,
};

/**
 * Generate a complete galaxy from a seed.
 *
 * @param seed - Integer seed for deterministic generation
 * @param config - Optional generation configuration
 * @returns A fully generated Galaxy
 */
export function generateGalaxy(
  seed: number,
  config: GalaxyGenerationConfig = DEFAULT_CONFIG
): Galaxy {
  const rng = new SeededRandom(seed);

  // ── Galaxy-wide properties ─────────────────
  const name = generateGalaxyName(rng);
  const radius = rng.range(12, 18);          // kpc (Milky Way ~13.5 kpc)
  const thickness = rng.range(0.3, 0.6);     // kpc disk thickness
  const age = rng.range(10, 13.5);           // billions of years
  const metallicity = rng.range(0.3, 0.8);   // average metallicity index
  const estimatedPopulation = rng.range(100, 400); // billions of stars

  // ── Spiral arm parameters ──────────────────
  const armCount = rng.rangeInt(2, 4);
  const windingFactor = rng.range(0.4, 0.8);
  const armOffset = rng.range(0, Math.PI * 2);
  const armWidth = rng.range(0.08, 0.15);
  const armDensity = rng.range(0.5, 0.8);

  const spiralArms: SpiralArmParams = {
    armCount,
    windingFactor,
    armOffset,
    armWidth,
    armDensity,
  };

  // ── Bulge parameters ───────────────────────
  const bulgeRadiusFraction = rng.range(0.08, 0.15);
  const bulgeVerticalScale = rng.range(1.5, 3.0);
  const bulgeDensityMultiplier = rng.range(3, 6);

  const bulge: BulgeParams = {
    radiusFraction: bulgeRadiusFraction,
    verticalScale: bulgeVerticalScale,
    densityMultiplier: bulgeDensityMultiplier,
  };

  // ── Generate star clusters ─────────────────
  const clusterCount = rng.rangeInt(20, 40);
  const clusters: StarCluster[] = [];
  const clusterRng = rng.fork(1000);

  for (let i = 0; i < clusterCount; i++) {
    const cRng = clusterRng.fork(i);
    clusters.push(generateStarCluster(i, cRng, radius, thickness, spiralArms));
  }

  // ── Generate representative stars ──────────
  const starCount = QUALITY_STAR_COUNTS[config.quality];
  const stars = generateGalaxyStars(
    seed,
    rng.fork(2000),
    starCount,
    radius,
    thickness,
    spiralArms,
    bulge,
    metallicity,
    clusters
  );

  // Assign star indices to clusters
  assignStarsToClusters(stars, clusters);

  return {
    id: `galaxy-${seed}`,
    name,
    seed,
    type: GalaxyType.SPIRAL,
    radius,
    thickness,
    estimatedPopulation,
    age,
    metallicity,
    spiralArms,
    bulge,
    clusters,
    stars,
    quality: config.quality,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Star Cluster Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateStarCluster(
  index: number,
  rng: SeededRandom,
  galaxyRadius: number,
  galaxyThickness: number,
  spiralArms: SpiralArmParams
): StarCluster {
  // Place clusters preferentially along spiral arms
  const r = rng.range(0.5, galaxyRadius * 0.85);

  // Pick a random arm to cluster near
  const armIndex = rng.rangeInt(0, spiralArms.armCount - 1);
  const armPhase = spiralArms.armOffset + (armIndex * Math.PI * 2) / spiralArms.armCount;
  const idealAngle = spiralArmAngle(r, spiralArms.windingFactor, armPhase);
  const theta = idealAngle + rng.gaussian(0, 0.15); // Small scatter from arm

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  const y = rng.gaussian(0, galaxyThickness * 0.3);

  const clusterRadius = rng.range(0.05, 0.3); // kpc
  const populationEstimate = rng.rangeInt(100, 10000);
  const density = populationEstimate / (4 / 3 * Math.PI * Math.pow(clusterRadius, 3));

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
// Galaxy Star Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Generate all representative stars for the galaxy.
 *
 * Distribution strategy:
 * - ~15% in the bulge
 * - ~60% in/near spiral arms
 * - ~25% as field/inter-arm stars
 */
function generateGalaxyStars(
  galaxySeed: number,
  rng: SeededRandom,
  totalStars: number,
  galaxyRadius: number,
  galaxyThickness: number,
  spiralArms: SpiralArmParams,
  bulge: BulgeParams,
  avgMetallicity: number,
  _clusters: StarCluster[]
): GalaxyStar[] {
  const stars: GalaxyStar[] = [];
  const bulgeStarCount = Math.floor(totalStars * 0.15);
  const armStarCount = Math.floor(totalStars * 0.60);
  const fieldStarCount = totalStars - bulgeStarCount - armStarCount;

  // Generate bulge stars
  const bulgeRng = rng.fork(100);
  const bulgeRadius = galaxyRadius * bulge.radiusFraction;
  for (let i = 0; i < bulgeStarCount; i++) {
    const starRng = bulgeRng.fork(i);
    const star = generateBulgeStar(
      stars.length, galaxySeed, starRng,
      bulgeRadius, galaxyThickness * bulge.verticalScale,
      avgMetallicity
    );
    stars.push(star);
  }

  // Generate spiral arm stars
  const armRng = rng.fork(200);
  for (let i = 0; i < armStarCount; i++) {
    const starRng = armRng.fork(i);
    const star = generateArmStar(
      stars.length, galaxySeed, starRng,
      galaxyRadius, galaxyThickness,
      spiralArms, avgMetallicity
    );
    stars.push(star);
  }

  // Generate field/inter-arm stars
  const fieldRng = rng.fork(300);
  for (let i = 0; i < fieldStarCount; i++) {
    const starRng = fieldRng.fork(i);
    const star = generateFieldStar(
      stars.length, galaxySeed, starRng,
      galaxyRadius, galaxyThickness,
      avgMetallicity
    );
    stars.push(star);
  }

  return stars;
}

/**
 * Generate a star in the galactic bulge.
 */
function generateBulgeStar(
  index: number,
  galaxySeed: number,
  rng: SeededRandom,
  bulgeRadius: number,
  bulgeThickness: number,
  avgMetallicity: number
): GalaxyStar {
  // 3D Gaussian distribution for bulge
  const x = rng.gaussian(0, bulgeRadius * 0.4);
  const y = rng.gaussian(0, bulgeThickness * 0.3);
  const z = rng.gaussian(0, bulgeRadius * 0.4);

  return createGalaxyStar(index, galaxySeed, rng, x, y, z, avgMetallicity, -1);
}

/**
 * Generate a star along a spiral arm.
 */
function generateArmStar(
  index: number,
  galaxySeed: number,
  rng: SeededRandom,
  galaxyRadius: number,
  galaxyThickness: number,
  spiralArms: SpiralArmParams,
  avgMetallicity: number
): GalaxyStar {
  // Exponential radial distribution (more stars toward center)
  const scaleLength = galaxyRadius * 0.35;
  const r = sampleExponentialRadius(rng, scaleLength, galaxyRadius);

  // Pick a random arm
  const armIndex = rng.rangeInt(0, spiralArms.armCount - 1);
  const armPhase = spiralArms.armOffset + (armIndex * Math.PI * 2) / spiralArms.armCount;

  // Compute ideal angle on spiral arm
  const idealAngle = spiralArmAngle(r, spiralArms.windingFactor, armPhase);

  // Add scatter perpendicular to arm (width)
  const armWidthKpc = spiralArms.armWidth * galaxyRadius;
  const scatter = rng.gaussian(0, armWidthKpc * (1 - spiralArms.armDensity * 0.5));
  const theta = idealAngle + scatter / Math.max(r, 0.1);

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);

  // Thin disk vertical distribution
  const y = rng.gaussian(0, galaxyThickness * 0.15);

  // Metallicity gradient: higher toward center
  const radialFraction = r / galaxyRadius;
  const localMetallicity = avgMetallicity * (1 - 0.3 * radialFraction) +
    rng.gaussian(0, 0.1);

  return createGalaxyStar(
    index, galaxySeed, rng, x, y, z,
    Math.max(0, Math.min(1, localMetallicity)), -1
  );
}

/**
 * Generate a field star (inter-arm region).
 */
function generateFieldStar(
  index: number,
  galaxySeed: number,
  rng: SeededRandom,
  galaxyRadius: number,
  galaxyThickness: number,
  avgMetallicity: number
): GalaxyStar {
  // Exponential radial distribution
  const scaleLength = galaxyRadius * 0.4;
  const r = sampleExponentialRadius(rng, scaleLength, galaxyRadius);

  // Uniform angular distribution (no arm preference)
  const theta = rng.range(0, Math.PI * 2);

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  const y = rng.gaussian(0, galaxyThickness * 0.2);

  return createGalaxyStar(index, galaxySeed, rng, x, y, z, avgMetallicity, -1);
}

/**
 * Sample radius from an exponential distribution.
 * Uses inverse CDF: r = -scaleLength × ln(1 - u)
 * Capped at maxRadius.
 */
function sampleExponentialRadius(
  rng: SeededRandom,
  scaleLength: number,
  maxRadius: number
): number {
  const u = rng.next();
  // Inverse CDF of exponential distribution, truncated
  const maxCDF = 1 - Math.exp(-maxRadius / scaleLength);
  const r = -scaleLength * Math.log(1 - u * maxCDF);
  return Math.min(r, maxRadius);
}

/**
 * Create a GalaxyStar from position and random state.
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
    radiusSolar: stellar.radius / 6.957e8, // SOLAR_RADIUS
    metallicity: Math.max(0, Math.min(1, metallicity)),
    clusterIndex,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cluster Assignment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Assign nearby stars to clusters for selection purposes.
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
        break; // Assign to first matching cluster
      }
    }
  }
}
