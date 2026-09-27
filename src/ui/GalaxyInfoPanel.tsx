/**
 * ASTRAVERSA Ω — Galaxy Info Panel
 *
 * Displays information about selected galactic objects:
 * - Galaxy properties
 * - Star cluster properties
 * - Galaxy-scale star properties
 *
 * Shows actual generated data, never fake placeholder values.
 */

import type { Galaxy, GalaxyStar, StarCluster } from '../universe/Galaxy';
import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType } from '../universe/CelestialBody';
import {
  SOLAR_MASS,
  SOLAR_RADIUS,
  EARTH_MASS,
  EARTH_RADIUS,
  AU,
  SECONDS_PER_DAY,
  SECONDS_PER_YEAR,
} from '../astronomy/constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared UI Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(decimals);
  return value.toFixed(decimals);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyInfoProps {
  galaxy: Galaxy;
}

function GalaxyInfo({ galaxy }: GalaxyInfoProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ ...styles.colorDot, backgroundColor: '#ffe8c0' }} />
        <span style={styles.name}>{galaxy.name}</span>
      </div>
      <div style={styles.typeLabel}>GALAXY</div>
      <Divider />
      <InfoRow label="TYPE" value={galaxy.type} />
      <InfoRow label="RADIUS" value={`${galaxy.radius.toFixed(1)} kpc`} />
      <InfoRow label="AGE" value={`${galaxy.age.toFixed(1)} Gyr`} />
      <InfoRow label="POPULATION" value={`~${formatNumber(galaxy.estimatedPopulation)}B stars`} />
      <InfoRow label="ARMS" value={galaxy.spiralArms.armCount.toString()} />
      <InfoRow label="CLUSTERS" value={galaxy.clusters.length.toString()} />
      <InfoRow label="METALLICITY" value={galaxy.metallicity.toFixed(2)} />
      <Divider />
      <InfoRow label="SEED" value={galaxy.seed.toString()} />
      <InfoRow label="VISIBLE" value={`${formatNumber(galaxy.stars.length)} stars`} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Star Cluster Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ClusterInfoProps {
  cluster: StarCluster;
}

function ClusterInfo({ cluster }: ClusterInfoProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ ...styles.colorDot, backgroundColor: '#c0e0ff' }} />
        <span style={styles.name}>{cluster.id}</span>
      </div>
      <div style={styles.typeLabel}>STAR CLUSTER</div>
      <Divider />
      <InfoRow label="POPULATION" value={`~${formatNumber(cluster.populationEstimate)}`} />
      <InfoRow label="RADIUS" value={`${cluster.radius.toFixed(3)} kpc`} />
      <InfoRow label="POSITION" value={`(${cluster.x.toFixed(2)}, ${cluster.y.toFixed(2)}, ${cluster.z.toFixed(2)})`} />
      <InfoRow label="DENSITY" value={`${formatNumber(cluster.density)} /kpc³`} />
      <InfoRow label="VISIBLE" value={`${cluster.starIndices.length} stars`} />
      <Divider />
      <InfoRow label="SEED" value={cluster.seed.toString()} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Star Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyStarInfoProps {
  star: GalaxyStar;
  onEnterSystem: () => void;
}

function GalaxyStarInfo({ star, onEnterSystem }: GalaxyStarInfoProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ ...styles.colorDot, backgroundColor: star.color }} />
        <span style={styles.name}>{star.name}</span>
      </div>
      <div style={styles.typeLabel}>{star.spectralClass}-TYPE STAR</div>
      <Divider />
      <InfoRow label="MASS" value={`${star.massSolar.toFixed(3)} M☉`} />
      <InfoRow label="RADIUS" value={`${star.radiusSolar.toFixed(3)} R☉`} />
      <InfoRow label="TEMPERATURE" value={`${formatNumber(star.temperature, 0)} K`} />
      <InfoRow label="LUMINOSITY" value={`${formatNumber(star.luminositySolar)} L☉`} />
      <InfoRow label="SPECTRAL" value={star.spectralClass} />
      <InfoRow label="METALLICITY" value={star.metallicity.toFixed(2)} />
      <InfoRow label="POSITION" value={`(${star.x.toFixed(2)}, ${star.y.toFixed(2)}, ${star.z.toFixed(2)}) kpc`} />
      <Divider />
      <InfoRow label="SEED" value={star.seed.toString()} />

      {/* Enter System button */}
      <button
        style={styles.enterButton}
        onClick={onEnterSystem}
      >
        ENTER STAR SYSTEM →
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Solar System Star Info (when in system view)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SystemStarInfo({ body }: { body: CelestialBody }) {
  const sp = body.starProperties;
  return (
    <>
      <InfoRow label="TYPE" value={`${sp?.spectralClass ?? '?'}-type Star`} />
      <InfoRow label="MASS" value={`${(body.mass / SOLAR_MASS).toFixed(3)} M☉`} />
      <InfoRow label="RADIUS" value={`${(body.radius / SOLAR_RADIUS).toFixed(3)} R☉`} />
      <InfoRow label="TEMPERATURE" value={`${formatNumber(sp?.temperature ?? 0, 0)} K`} />
      <InfoRow label="LUMINOSITY" value={`${formatNumber((sp?.luminosity ?? 0) / 3.828e26)} L☉`} />
    </>
  );
}

function SystemPlanetInfo({ body }: { body: CelestialBody }) {
  const pp = body.planetProperties;
  const orbitalAU = (pp?.orbitalRadius ?? 0) / AU;
  const periodDays = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_DAY;
  const periodYears = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_YEAR;

  return (
    <>
      <InfoRow label="TYPE" value={pp?.planetType ?? 'Unknown'} />
      <InfoRow label="MASS" value={`${(body.mass / EARTH_MASS).toFixed(2)} M⊕`} />
      <InfoRow label="RADIUS" value={`${(body.radius / EARTH_RADIUS).toFixed(2)} R⊕`} />
      <InfoRow label="ORBIT" value={`${orbitalAU.toFixed(3)} AU`} />
      <InfoRow
        label="PERIOD"
        value={periodYears >= 1
          ? `${periodYears.toFixed(2)} years`
          : `${periodDays.toFixed(1)} days`
        }
      />
      <InfoRow
        label="VELOCITY"
        value={`${formatNumber(Math.sqrt(
          body.velocity.x ** 2 + body.velocity.y ** 2 + body.velocity.z ** 2
        ) / 1000)} km/s`}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unified Info Panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UnifiedInfoPanelProps {
  /** Galaxy (always available after init) */
  galaxy: Galaxy | null;
  /** Selected star at galaxy scale */
  selectedStar: GalaxyStar | null;
  /** Selected cluster */
  selectedCluster: StarCluster | null;
  /** Selected body at system scale */
  selectedBody: CelestialBody | null;
  /** Whether we're in system view */
  inSystemView: boolean;
  /** Callback to enter a star system */
  onEnterSystem: () => void;
  /** Callback to exit back to galaxy */
  onExitSystem: () => void;
}

export function UnifiedInfoPanel({
  galaxy,
  selectedStar,
  selectedCluster,
  selectedBody,
  inSystemView,
  onEnterSystem,
  onExitSystem,
}: UnifiedInfoPanelProps) {
  // System view: show celestial body info
  if (inSystemView && selectedBody) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={onExitSystem}>
          ← BACK TO GALAXY
        </button>
        <div style={styles.header}>
          <div style={{ ...styles.colorDot, backgroundColor: selectedBody.color }} />
          <span style={styles.name}>{selectedBody.name}</span>
        </div>
        <Divider />
        {selectedBody.type === CelestialBodyType.STAR && <SystemStarInfo body={selectedBody} />}
        {selectedBody.type === CelestialBodyType.PLANET && <SystemPlanetInfo body={selectedBody} />}
        <Divider />
        <InfoRow label="SEED" value={selectedBody.seed.toString()} />
      </div>
    );
  }

  // System view: no body selected, show back button
  if (inSystemView) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={onExitSystem}>
          ← BACK TO GALAXY
        </button>
        <div style={styles.hint}>Click a star or planet to inspect</div>
      </div>
    );
  }

  // Galaxy view: star selected
  if (selectedStar) {
    return <GalaxyStarInfo star={selectedStar} onEnterSystem={onEnterSystem} />;
  }

  // Galaxy view: cluster selected (future)
  if (selectedCluster) {
    return <ClusterInfo cluster={selectedCluster} />;
  }

  // Galaxy view: nothing selected — show galaxy info
  if (galaxy) {
    return <GalaxyInfo galaxy={galaxy} />;
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 80,
    right: 24,
    width: 280,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '16px 20px',
    background: 'rgba(4, 6, 16, 0.88)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(80, 120, 180, 0.18)',
    borderRadius: 12,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#c0d8f0',
    userSelect: 'none',
    zIndex: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  typeLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(120, 160, 220, 0.5)',
    textTransform: 'uppercase' as const,
    marginTop: 2,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    background: 'rgba(80, 120, 180, 0.12)',
    margin: '8px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  },
  label: {
    fontSize: 10,
    color: 'rgba(140, 170, 210, 0.55)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    color: '#d0e4f4',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  enterButton: {
    width: '100%',
    marginTop: 12,
    padding: '10px 16px',
    background: 'rgba(40, 80, 150, 0.25)',
    border: '1px solid rgba(80, 160, 255, 0.3)',
    borderRadius: 8,
    color: '#80c8ff',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    letterSpacing: 1.5,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  backButton: {
    width: '100%',
    marginBottom: 8,
    padding: '8px 12px',
    background: 'rgba(40, 60, 100, 0.2)',
    border: '1px solid rgba(80, 120, 200, 0.2)',
    borderRadius: 6,
    color: 'rgba(150, 190, 240, 0.7)',
    fontSize: 10,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    letterSpacing: 1,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  hint: {
    fontSize: 11,
    color: 'rgba(140, 170, 210, 0.4)',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
};
