/**
 * ASTRAVERSA Ω — Galaxy Info Panel
 *
 * Displays information about selected galactic objects:
 * - Galaxy properties
 * - Star cluster properties
 * - Galaxy-scale star properties
 * - Cinematic Observatory Camera Presets
 * - Layer Visibility Toggles
 * - Real-time Astronomical Telemetry
 *
 * Shows actual generated data, never fake placeholder values.
 */

import type { Galaxy, GalaxyStar, StarCluster } from '../universe/Galaxy';
import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType } from '../universe/CelestialBody';
import type { CameraPreset, GalaxyTelemetry, GalaxyLayerVisibility } from '../rendering';
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

function SectionHeading({ title }: { title: string }) {
  return <div style={styles.sectionHeading}>{title}</div>;
}

function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(decimals);
  return value.toFixed(decimals);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Observatory Controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ObservatoryControlsProps {
  activePreset?: CameraPreset | null;
  onSelectPreset?: (preset: CameraPreset) => void;
  layers?: GalaxyLayerVisibility;
  onToggleLayer?: (layer: keyof GalaxyLayerVisibility) => void;
  telemetry?: GalaxyTelemetry;
}

function ObservatoryControls({
  activePreset,
  onSelectPreset,
  layers,
  onToggleLayer,
  telemetry,
}: ObservatoryControlsProps) {
  const presets: { id: CameraPreset; label: string }[] = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'topDown', label: 'TOP-DOWN' },
    { id: 'nucleus', label: 'ANANTARA A*' },
    { id: 'jets', label: 'RADIO JETS' },
    { id: 'bar', label: 'BAR' },
    { id: 'core', label: 'CORE' },
    { id: 'arm', label: 'ARM' },
    { id: 'edge', label: 'EDGE' },
    { id: 'cluster', label: 'CLUSTER' },
  ];

  const layerKeys: { key: keyof GalaxyLayerVisibility; label: string }[] = [
    { key: 'disk', label: 'DISK' },
    { key: 'bar', label: 'BAR' },
    { key: 'bulge', label: 'BULGE' },
    { key: 'dust', label: 'DUST' },
    { key: 'clusters', label: 'CLUSTERS' },
    { key: 'halo', label: 'HALO' },
    { key: 'nucleus', label: 'NUCLEUS' },
    { key: 'jets', label: 'JETS' },
    { key: 'accretion', label: 'ACCRETION' },
  ];

  return (
    <div>
      <SectionHeading title="CINEMATIC WAYPOINTS" />
      <div style={styles.buttonGrid}>
        {presets.map((p) => (
          <button
            key={p.id}
            style={{
              ...styles.presetButton,
              ...(activePreset === p.id ? styles.presetButtonActive : {}),
            }}
            onClick={() => onSelectPreset?.(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Divider />
      <SectionHeading title="LAYER VISIBILITY" />
      <div style={styles.layerRow}>
        {layerKeys.map(({ key, label }) => {
          const isActive = layers ? layers[key] : true;
          return (
            <button
              key={key}
              style={{
                ...styles.layerBadge,
                ...(isActive ? styles.layerBadgeActive : {}),
              }}
              onClick={() => onToggleLayer?.(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {telemetry && (
        <>
          <Divider />
          <SectionHeading title="OBSERVATORY TELEMETRY" />
          <InfoRow label="CAMERA R" value={`${telemetry.distanceKpc.toFixed(1)} kpc`} />
          <InfoRow label="ORBITAL SPEED" value={`~${telemetry.speedKms} km/s`} />
          <InfoRow label="RENDER FPS" value={`${telemetry.fps} fps`} />
        </>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyInfoProps {
  galaxy: Galaxy;
  activePreset?: CameraPreset | null;
  onSelectPreset?: (preset: CameraPreset) => void;
  onSelectNucleus?: () => void;
  layers?: GalaxyLayerVisibility;
  onToggleLayer?: (layer: keyof GalaxyLayerVisibility) => void;
  telemetry?: GalaxyTelemetry;
}

function GalaxyInfo({
  galaxy,
  activePreset,
  onSelectPreset,
  onSelectNucleus,
  layers,
  onToggleLayer,
  telemetry,
}: GalaxyInfoProps) {
  const isBarred = galaxy.bar !== undefined;
  const armNames = galaxy.spiralArmDefinitions
    ? galaxy.spiralArmDefinitions.map(a => a.name.split(' ')[0]).join(', ')
    : `${galaxy.spiralArms.armCount} Arms`;

  return (
    <div
      style={styles.container}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={styles.header}>
        <div style={{ ...styles.colorDot, backgroundColor: '#ffe8c0' }} />
        <span style={styles.name}>{galaxy.displayName ?? galaxy.name}</span>
      </div>
      <div style={styles.typeLabel}>GALAXY OBSERVATORY · {galaxy.type.toUpperCase()}</div>
      <Divider />
      <InfoRow label="MORPHOLOGY" value={isBarred ? 'SBbc Barred Spiral' : galaxy.type} />
      {galaxy.diskStructure ? (
        <>
          <InfoRow
            label="MAIN STELLAR DISK ⌀"
            value={`${galaxy.diskStructure.mainDiskDiameterLy.toLocaleString()} ly (${(galaxy.diskStructure.mainDiskRadiusKpc * 2).toFixed(1)} kpc)`}
          />
          <InfoRow
            label="STELLAR HALO ⌀"
            value={`${galaxy.diskStructure.extendedHaloDiameterLy.toLocaleString()} ly (${(galaxy.diskStructure.extendedHaloRadiusKpc * 2).toFixed(1)} kpc)`}
          />
          {galaxy.nucleus?.jetLengthKpc && (
            <InfoRow
              label="RADIO JETS EXTENT"
              value={`~${(galaxy.nucleus.jetLengthKpc * 2 * 3261.56).toFixed(0)} ly (${(galaxy.nucleus.jetLengthKpc * 2).toFixed(1)} kpc tip-to-tip)`}
            />
          )}
          <InfoRow
            label="DISK SCALE H"
            value={`${galaxy.diskStructure.thinScaleHeight} / ${galaxy.diskStructure.thickScaleHeight} kpc (thin/thick)`}
          />
        </>
      ) : (
        <InfoRow label="RADIUS" value={`${galaxy.radius.toFixed(1)} kpc`} />
      )}
      <div style={styles.disclaimerNote}>
        *Main stellar diameter (500k ly) excludes circumgalactic radio lobes &amp; faint halo.
      </div>
      {galaxy.bar && (
        <InfoRow
          label="STELLAR BAR"
          value={`${galaxy.bar.length.toFixed(1)} × ${galaxy.bar.width.toFixed(1)} kpc (${((galaxy.bar.angle * 180) / Math.PI).toFixed(0)}°)`}
        />
      )}
      <InfoRow label="ARMS" value={`${galaxy.spiralArms.armCount} Logarithmic (${armNames})`} />
      {galaxy.nucleus && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div style={styles.row}>
            <span style={styles.label}>NUCLEUS</span>
            <button
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onClick={onSelectNucleus}
            >
              {galaxy.nucleus.name} ↗
            </button>
          </div>
        </div>
      )}
      <InfoRow label="AGE" value={`${galaxy.age.toFixed(1)} Gyr`} />
      <InfoRow label="POPULATION" value={`~${formatNumber(galaxy.estimatedPopulation)}B stars`} />
      <InfoRow label="CLUSTERS" value={`${galaxy.clusters.length} Nurseries`} />
      <InfoRow label="METALLICITY" value={galaxy.metallicity.toFixed(2)} />
      <InfoRow label="SEED" value={galaxy.seed.toString()} />
      <InfoRow label="VISIBLE" value={`${formatNumber(galaxy.stars.length)} stars`} />

      <Divider />
      <ObservatoryControls
        activePreset={activePreset}
        onSelectPreset={onSelectPreset}
        layers={layers}
        onToggleLayer={onToggleLayer}
        telemetry={telemetry}
      />
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
      <div style={styles.typeLabel}>STAR CLUSTER NURSERY</div>
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
// Solar System Star & Planet Info
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
// Supermassive Black Hole Nucleus Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface NucleusInfoProps {
  galaxy: Galaxy;
  onSelectPreset?: (preset: CameraPreset) => void;
  onUpdateMass?: (massSolar: number) => void;
  onClose?: () => void;
}

function NucleusInfo({ galaxy, onSelectPreset, onUpdateMass, onClose }: NucleusInfoProps) {
  const nucleus = galaxy.nucleus;
  if (!nucleus) return null;

  const massPresets = [
    { label: '4.15M', mass: 4.154e6, note: 'Milky Way Sgr A* Analogue' },
    { label: '50M', mass: 5.0e7, note: 'Supermassive Core' },
    { label: '1.0B', mass: 1.0e9, note: 'Giant Galaxy SMBH' },
    { label: '40B', mass: 4.0e10, note: 'IC 1101 Colossal Analogue' },
  ];

  return (
    <div
      style={styles.container}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={styles.header}>
        <div style={{ ...styles.colorDot, backgroundColor: '#ffb84d' }} />
        <span style={styles.name}>{nucleus.name}</span>
      </div>
      <div style={styles.typeLabel}>SUPERMASSIVE BLACK HOLE (SMBH)</div>
      <Divider />

      <SectionHeading title="CONFIGURABLE MASS (SIMULATION)" />
      <div style={styles.buttonGrid}>
        {massPresets.map(preset => {
          const isCurrent = Math.abs(nucleus.massSolar - preset.mass) / preset.mass < 0.05;
          return (
            <button
              key={preset.label}
              style={{
                ...styles.presetButton,
                ...(isCurrent ? styles.presetButtonActive : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateMass?.(preset.mass);
              }}
              title={preset.note}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <Divider />
      <SectionHeading title="PHYSICAL PROPERTIES" />
      <InfoRow label="MASS" value={`${formatNumber(nucleus.massSolar)} M☉ (${(nucleus.massKg / 1e30).toExponential(2)} kg)`} />
      <InfoRow label="SCHWARZSCHILD R" value={`${nucleus.schwarzschildRadiusAU.toFixed(4)} AU (${formatNumber(nucleus.schwarzschildRadiusKm)} km)`} />
      <InfoRow label="EVENT HORIZON ⌀" value={`${formatNumber(nucleus.schwarzschildRadiusKm * 2)} km`} />
      <InfoRow label="PHOTON SPHERE ⌀" value={`${((nucleus.photonRingAU ?? (nucleus.schwarzschildRadiusAU * 1.5)) * 2).toFixed(4)} AU`} />
      <InfoRow label="SPIN PARAMETER a*" value={`${nucleus.spinParameter.toFixed(2)} (Relativistic Kerr)`} />
      <InfoRow label="ACCRETION STATE" value={nucleus.accretionState.toUpperCase()} />
      {nucleus.eddingtonLuminosityWatts && (
        <InfoRow label="EDDINGTON POWER" value={`${nucleus.eddingtonLuminosityWatts.toExponential(2)} W`} />
      )}
      <InfoRow label="SPHERE OF INFLUENCE" value={`${nucleus.sphereOfInfluencePc.toFixed(1)} pc`} />
      <InfoRow label="VELOCITY DISPERSION" value={`${nucleus.velocityDispersionKms} km/s`} />
      {nucleus.jetLengthKpc && (
        <InfoRow
          label="RADIO JETS SPAN"
          value={`~${(nucleus.jetLengthKpc * 2 * 3261.56).toFixed(0)} ly (${(nucleus.jetLengthKpc * 2).toFixed(1)} kpc tip-to-tip)`}
        />
      )}
      {nucleus.radioLobeRadiusKpc && (
        <InfoRow
          label="RADIO LOBES ⌀"
          value={`~${(nucleus.radioLobeRadiusKpc * 2 * 3261.56).toFixed(0)} ly (${(nucleus.radioLobeRadiusKpc * 2).toFixed(1)} kpc)`}
        />
      )}
      <InfoRow label="LOCATION" value="(0, 0, 0) Galactic Center" />

      <Divider />
      <div style={styles.noticeBox}>
        <div style={styles.noticeTitle}>SCALE &amp; SEPARATION NOTICE</div>
        <div style={styles.noticeText}>
          • Visual marker scaled for galactic visibility; physical Schwarzschild radius is {nucleus.schwarzschildRadiusAU.toFixed(4)} AU ({formatNumber(nucleus.schwarzschildRadiusKm)} km).
          <br />
          • Bipolar radio jets &amp; lobes represent circumgalactic magnetized plasma extending beyond the 500,000 ly stellar body.
          <br />
          • Fictional simulation parameters inspired by IC 1101 &amp; Milky Way architecture.
        </div>
      </div>

      <Divider />
      <button
        style={styles.enterButton}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPreset?.('nucleus');
        }}
      >
        CENTER NUCLEUS CAMERA →
      </button>
      {onClose && (
        <button
          style={{ ...styles.backButton, marginTop: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ← BACK TO GALAXY OVERVIEW
        </button>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unified Info Panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UnifiedInfoPanelProps {
  galaxy: Galaxy | null;
  selectedStar: GalaxyStar | null;
  selectedCluster: StarCluster | null;
  selectedBody: CelestialBody | null;
  selectedNucleus?: boolean;
  onSelectNucleus?: (selected: boolean) => void;
  onUpdateNucleusMass?: (massSolar: number) => void;
  inSystemView: boolean;
  onEnterSystem: () => void;
  onExitSystem: () => void;
  activePreset?: CameraPreset | null;
  onSelectPreset?: (preset: CameraPreset) => void;
  layers?: GalaxyLayerVisibility;
  onToggleLayer?: (layer: keyof GalaxyLayerVisibility) => void;
  telemetry?: GalaxyTelemetry;
}

export function UnifiedInfoPanel({
  galaxy,
  selectedStar,
  selectedCluster,
  selectedBody,
  selectedNucleus = false,
  onSelectNucleus,
  onUpdateNucleusMass,
  inSystemView,
  onEnterSystem,
  onExitSystem,
  activePreset,
  onSelectPreset,
  layers,
  onToggleLayer,
  telemetry,
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

  // Galaxy view: nucleus selected
  if (selectedNucleus && galaxy) {
    return (
      <NucleusInfo
        galaxy={galaxy}
        onSelectPreset={onSelectPreset}
        onUpdateMass={onUpdateNucleusMass}
        onClose={() => onSelectNucleus?.(false)}
      />
    );
  }

  // Galaxy view: star selected
  if (selectedStar) {
    return <GalaxyStarInfo star={selectedStar} onEnterSystem={onEnterSystem} />;
  }

  // Galaxy view: cluster selected
  if (selectedCluster) {
    return <ClusterInfo cluster={selectedCluster} />;
  }

  // Galaxy view: default view — show galaxy info with observatory controls
  if (galaxy) {
    return (
      <GalaxyInfo
        galaxy={galaxy}
        activePreset={activePreset}
        onSelectPreset={onSelectPreset}
        onSelectNucleus={() => onSelectNucleus?.(true)}
        layers={layers}
        onToggleLayer={onToggleLayer}
        telemetry={telemetry}
      />
    );
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
    width: 295,
    maxHeight: 'calc(100vh - 110px)',
    overflowY: 'auto',
    padding: '16px 18px',
    background: 'rgba(4, 6, 16, 0.88)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(80, 120, 180, 0.22)',
    borderRadius: 12,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#c0d8f0',
    userSelect: 'none',
    zIndex: 20,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
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
    color: 'rgba(120, 160, 220, 0.6)',
    textTransform: 'uppercase' as const,
    marginTop: 2,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#80c8ff',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    marginBottom: 6,
  },
  divider: {
    height: 1,
    background: 'rgba(80, 120, 180, 0.16)',
    margin: '10px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  },
  label: {
    fontSize: 10,
    color: 'rgba(140, 170, 210, 0.65)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  value: {
    fontSize: 12,
    color: '#d0e4f4',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    marginBottom: 4,
  },
  presetButton: {
    padding: '6px 4px',
    background: 'rgba(40, 60, 100, 0.25)',
    border: '1px solid rgba(80, 120, 200, 0.2)',
    borderRadius: 6,
    color: 'rgba(160, 200, 255, 0.75)',
    fontSize: 9,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    letterSpacing: 0.8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center' as const,
  },
  presetButtonActive: {
    background: 'rgba(40, 100, 220, 0.45)',
    border: '1px solid rgba(80, 180, 255, 0.6)',
    color: '#ffffff',
    boxShadow: '0 0 10px rgba(80, 160, 255, 0.3)',
  },
  layerRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 4,
  },
  layerBadge: {
    padding: '4px 8px',
    background: 'rgba(20, 30, 50, 0.4)',
    border: '1px solid rgba(60, 80, 120, 0.25)',
    borderRadius: 4,
    color: 'rgba(120, 150, 190, 0.4)',
    fontSize: 9,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    letterSpacing: 0.8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  layerBadgeActive: {
    background: 'rgba(40, 80, 160, 0.3)',
    border: '1px solid rgba(100, 180, 255, 0.4)',
    color: '#90d0ff',
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
  disclaimerNote: {
    fontSize: 9,
    lineHeight: 1.4,
    color: 'rgba(140, 190, 255, 0.55)',
    fontStyle: 'italic',
    padding: '4px 0 6px 0',
    borderBottom: '1px solid rgba(80, 120, 180, 0.12)',
    marginBottom: 6,
  },
  noticeBox: {
    padding: '8px 10px',
    background: 'rgba(30, 45, 75, 0.35)',
    border: '1px solid rgba(80, 150, 240, 0.25)',
    borderRadius: 6,
    margin: '6px 0',
  },
  noticeTitle: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#93c5fd',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: 'rgba(180, 210, 245, 0.75)',
  },
};
