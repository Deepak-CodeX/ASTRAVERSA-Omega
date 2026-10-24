/**
 * ASTRAVERSA Ω — Galaxy Observatory Info Panel (Mission 003A)
 *
 * Rebuilt interaction design for the Galaxy Observatory:
 * - Collapsible organized groups:
 *   1. Structure (Physical model, arm geometry, bulge, halo)
 *   2. Stars & Clusters (Tracer count, point size, clusters, density)
 *   3. Gas & Dust (Cloud tracers, spatial coverage, opacity, dust lanes)
 *   4. Dynamics (Simulation pause, time dilation, rigid rotation, orbital motion)
 *   5. View & Rendering (Scale, distance, viewing angles, FOV, waypoints, layers)
 * - True separation of astronomical population, generated tracers, rendered tracers, and GPU cap
 * - Premium scientific observatory visual direction (deep black, restrained luminous accents, monospace metrics)
 * - Responsive, collapsible layout with non-obscuring minimizer
 */

import { useState } from 'react';
import type { Galaxy, GalaxyStar, StarCluster } from '../universe/Galaxy';
import { type CelestialBody, CelestialBodyType } from '../universe/CelestialBody';
import type {
  CameraPreset,
  GalaxyTelemetry,
  GalaxyLayerVisibility,
  GalaxyObservatorySettings,
} from '../rendering';
import { DEFAULT_OBSERVATORY_SETTINGS } from '../rendering';
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
// Shared UI Primitives
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InfoRow({
  label,
  value,
  subvalue,
  highlight = false,
}: {
  label: string;
  value: string;
  subvalue?: string;
  highlight?: boolean;
}) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ ...styles.value, ...(highlight ? styles.valueHighlight : {}) }}>
          {value}
        </span>
        {subvalue && <div style={styles.subvalue}>{subvalue}</div>}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function SectionHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={styles.sectionHeadingRow}>
      <span style={styles.sectionHeading}>{title}</span>
      {badge && <span style={styles.headingBadge}>{badge}</span>}
    </div>
  );
}

function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(decimals);
  return value.toFixed(decimals);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Collapsible Accordion Group
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CollapsibleGroupProps {
  id: string;
  title: string;
  badge?: string;
  icon?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleGroup({
  title,
  badge,
  icon,
  isOpen,
  onToggle,
  children,
}: CollapsibleGroupProps) {
  return (
    <div style={styles.accordionContainer}>
      <button
        style={{
          ...styles.accordionHeader,
          ...(isOpen ? styles.accordionHeaderOpen : {}),
        }}
        onClick={onToggle}
      >
        <div style={styles.accordionTitleArea}>
          {icon && <span style={styles.accordionIcon}>{icon}</span>}
          <span style={styles.accordionTitle}>{title}</span>
        </div>
        <div style={styles.accordionMetaArea}>
          {badge && <span style={styles.accordionBadge}>{badge}</span>}
          <span style={styles.accordionChevron}>{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>
      {isOpen && <div style={styles.accordionBody}>{children}</div>}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Control Slider Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  subtext?: string;
  badge?: string;
  isModelParam?: boolean;
  onChange: (val: number) => void;
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  subtext,
  badge,
  isModelParam = false,
  onChange,
}: ControlSliderProps) {
  return (
    <div style={styles.controlGroup}>
      <div style={styles.sliderHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={styles.sliderLabel}>{label}</span>
          {badge && <span style={styles.sliderBadge}>{badge}</span>}
          {isModelParam && <span style={styles.modelTag}>MODEL</span>}
        </div>
        <span style={styles.sliderValue}>
          {value.toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.rangeInput}
      />
      {subtext && <div style={styles.controlSubtext}>{subtext}</div>}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Observatory Controls Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ObservatoryControlsProps {
  settings?: GalaxyObservatorySettings;
  onUpdateSettings?: (updates: Partial<GalaxyObservatorySettings>) => void;
  onResetSettings?: () => void;
  onPhysicalDiameterChange?: (diameterLy: number) => void;
  currentPhysicalDiameterLy?: number;
  activePreset?: CameraPreset | null;
  onSelectPreset?: (preset: CameraPreset) => void;
  layers?: GalaxyLayerVisibility;
  onToggleLayer?: (layer: keyof GalaxyLayerVisibility) => void;
  telemetry?: GalaxyTelemetry;
  activeRenderedStars?: number;
  isRegenerating?: boolean;
}

export function ObservatoryControls({
  settings = DEFAULT_OBSERVATORY_SETTINGS,
  onUpdateSettings,
  onResetSettings,
  onPhysicalDiameterChange,
  currentPhysicalDiameterLy,
  activePreset,
  onSelectPreset,
  layers,
  onToggleLayer,
  telemetry,
  activeRenderedStars,
  isRegenerating = false,
}: ObservatoryControlsProps) {
  // Collapsible accordion group open states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    structure: true,
    stars: false,
    clouds: false,
    dynamics: false,
    view: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const currentDiameter = currentPhysicalDiameterLy ?? settings.targetDiameterLy ?? 500000;

  // Preset Configurations for Quick Morphology Loading
  const applyMorphologyPreset = (type: 'milkyWay' | 'canonical' | 'grandDesign' | 'flocculent') => {
    if (!onUpdateSettings) return;
    switch (type) {
      case 'canonical':
        onUpdateSettings({
          targetDiameterLy: 500000,
          armCount: 4,
          armPitchAngleDeg: 13.0,
          armWidthMult: 1.0,
          armWindingFactor: 0.62,
          bulgeRadiusFraction: 0.13,
          haloRadiusMultiplier: 1.5,
        });
        onPhysicalDiameterChange?.(500000);
        break;
      case 'milkyWay':
        onUpdateSettings({
          targetDiameterLy: 100000,
          armCount: 4,
          armPitchAngleDeg: 12.0,
          armWidthMult: 0.85,
          armWindingFactor: 0.70,
          bulgeRadiusFraction: 0.15,
          haloRadiusMultiplier: 1.4,
        });
        onPhysicalDiameterChange?.(100000);
        break;
      case 'grandDesign':
        onUpdateSettings({
          targetDiameterLy: 250000,
          armCount: 2,
          armPitchAngleDeg: 18.0,
          armWidthMult: 0.80,
          armWindingFactor: 0.85,
          bulgeRadiusFraction: 0.12,
          haloRadiusMultiplier: 1.3,
        });
        onPhysicalDiameterChange?.(250000);
        break;
      case 'flocculent':
        onUpdateSettings({
          targetDiameterLy: 400000,
          armCount: 6,
          armPitchAngleDeg: 9.5,
          armWidthMult: 1.4,
          armWindingFactor: 0.50,
          bulgeRadiusFraction: 0.16,
          haloRadiusMultiplier: 1.6,
        });
        onPhysicalDiameterChange?.(400000);
        break;
    }
  };

  // Preset Configurations for Stellar Density / Quality
  const applyDensityPreset = (level: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA') => {
    if (!onUpdateSettings) return;
    switch (level) {
      case 'LOW':
        onUpdateSettings({ starCount: 8000, cloudCount: 6000, dustCount: 2400 });
        break;
      case 'MEDIUM':
        onUpdateSettings({ starCount: 20000, cloudCount: 14000, dustCount: 4800 });
        break;
      case 'HIGH':
        onUpdateSettings({ starCount: 40000, cloudCount: 22000, dustCount: 7500 });
        break;
      case 'ULTRA':
        onUpdateSettings({ starCount: 75000, cloudCount: 28000, dustCount: 10000 });
        break;
    }
  };

  return (
    <div style={styles.observatoryWrapper}>
      {/* Synchronization & Status Indicator */}
      <div style={styles.syncStatusBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: isRegenerating ? '#f59e0b' : '#10b981',
          }} />
          <span style={styles.statusText}>
            {isRegenerating ? 'REGENERATING MODEL...' : 'MODEL SYNCHRONIZED'}
          </span>
        </div>
        <span style={styles.statusSeed}>SEED 42</span>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GROUP 1: STRUCTURE (PHYSICAL GALAXY MODEL)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <CollapsibleGroup
        id="structure"
        title="1. STRUCTURE"
        badge={`${(currentDiameter / 1000).toFixed(0)}k ly · ${settings.armCount ?? 4} Arms`}
        icon="🌌"
        isOpen={openGroups.structure}
        onToggle={() => toggleGroup('structure')}
      >
        {/* Morphology Quick Presets */}
        <div style={{ marginBottom: 10 }}>
          <div style={styles.subHeading}>MORPHOLOGY ARCHITECTURE PRESETS</div>
          <div style={styles.presetGrid}>
            <button
              style={{
                ...styles.miniPresetButton,
                ...(currentDiameter === 500000 && settings.armCount === 4 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyMorphologyPreset('canonical')}
            >
              ANANTARA α
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...(currentDiameter === 100000 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyMorphologyPreset('milkyWay')}
            >
              Milky Way
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...(settings.armCount === 2 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyMorphologyPreset('grandDesign')}
            >
              Grand Design
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...(settings.armCount === 6 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyMorphologyPreset('flocculent')}
            >
              Flocculent
            </button>
          </div>
        </div>

        {/* Physical Disk Diameter */}
        <ControlSlider
          label="PHYSICAL DISK DIAMETER"
          value={currentDiameter}
          min={50000}
          max={1500000}
          step={25000}
          unit=" ly"
          subtext="Main stellar disk body physical diameter (~3,261.56 ly = 1 kpc)."
          isModelParam
          onChange={(v) => {
            onPhysicalDiameterChange?.(v);
            onUpdateSettings?.({ targetDiameterLy: v });
          }}
        />

        {/* Spiral Arm Count */}
        <ControlSlider
          label="SPIRAL ARM COUNT"
          value={settings.armCount ?? 4}
          min={2}
          max={8}
          step={1}
          unit=" arms"
          subtext="Number of continuous logarithmic density waves originating from bar tips."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ armCount: Math.round(v) })}
        />

        {/* Spiral Pitch Angle */}
        <ControlSlider
          label="SPIRAL PITCH ANGLE (ψ)"
          value={settings.armPitchAngleDeg ?? 13.0}
          min={6.0}
          max={30.0}
          step={0.5}
          unit="°"
          subtext="Angle between spiral arm tangent and circle of constant radius."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ armPitchAngleDeg: v })}
        />

        {/* Spiral Arm Width Multiplier */}
        <ControlSlider
          label="SPIRAL ARM WIDTH"
          value={settings.armWidthMult ?? 1.0}
          min={0.3}
          max={2.5}
          step={0.05}
          unit="x"
          subtext="Radial broadening and dispersion along the density wave ridges."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ armWidthMult: v })}
        />

        {/* Spiral Winding Factor */}
        <ControlSlider
          label="SPIRAL WINDING FACTOR"
          value={settings.armWindingFactor ?? 0.62}
          min={0.2}
          max={1.5}
          step={0.05}
          unit="x"
          subtext="Angular winding rate controlling spiral density curvature."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ armWindingFactor: v })}
        />

        {/* Bulge Radius Fraction */}
        <ControlSlider
          label="BULGE RADIUS FRACTION"
          value={settings.bulgeRadiusFraction ?? 0.13}
          min={0.05}
          max={0.30}
          step={0.01}
          unit=""
          subtext={`Bulge extent relative to disk radius (~${((settings.bulgeRadiusFraction ?? 0.13) * (currentDiameter / 3261.56 / 2)).toFixed(1)} kpc).`}
          isModelParam
          onChange={(v) => onUpdateSettings?.({ bulgeRadiusFraction: v })}
        />

        {/* Halo Extent Multiplier */}
        <ControlSlider
          label="HALO EXTENT MULTIPLIER"
          value={settings.haloRadiusMultiplier ?? 1.5}
          min={1.0}
          max={2.5}
          step={0.1}
          unit="x"
          subtext={`Outer Pop II stellar halo boundary (~${((settings.haloRadiusMultiplier ?? 1.5) * currentDiameter / 1000).toFixed(0)}k ly diameter).`}
          isModelParam
          onChange={(v) => onUpdateSettings?.({ haloRadiusMultiplier: v })}
        />
      </CollapsibleGroup>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GROUP 2: STARS & CLUSTERS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <CollapsibleGroup
        id="stars"
        title="2. STARS & CLUSTERS"
        badge={`${formatNumber(settings.starCount ?? 20000, 0)} Stars`}
        icon="✨"
        isOpen={openGroups.stars}
        onToggle={() => toggleGroup('stars')}
      >
        {/* Density Quality Presets */}
        <div style={{ marginBottom: 10 }}>
          <div style={styles.subHeading}>TRACER DENSITY PRESETS</div>
          <div style={styles.presetGrid}>
            <button
              style={{
                ...styles.miniPresetButton,
                ...((settings.starCount ?? 20000) <= 10000 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyDensityPreset('LOW')}
            >
              Low (8k)
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...((settings.starCount ?? 20000) === 20000 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyDensityPreset('MEDIUM')}
            >
              Med (20k)
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...((settings.starCount ?? 20000) === 40000 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyDensityPreset('HIGH')}
            >
              High (40k)
            </button>
            <button
              style={{
                ...styles.miniPresetButton,
                ...((settings.starCount ?? 20000) >= 70000 ? styles.miniPresetButtonActive : {}),
              }}
              onClick={() => applyDensityPreset('ULTRA')}
            >
              Ultra (75k)
            </button>
          </div>
        </div>

        {/* Stellar Tracer Count Slider */}
        <ControlSlider
          label="STELLAR TRACER COUNT"
          value={settings.starCount ?? 20000}
          min={5000}
          max={80000}
          step={2500}
          unit=" tracers"
          subtext="Explicit GPU points generated for individual stars (Safe hardware cap: 100,000)."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ starCount: Math.round(v) })}
        />

        {/* Optical Point Size */}
        <ControlSlider
          label="OPTICAL POINT SIZE"
          value={settings.starSizeMultiplier}
          min={0.5}
          max={2.5}
          step={0.1}
          unit="x"
          subtext="Diffraction disc shader size multiplier (uniform uSizeMul)."
          onChange={(v) => onUpdateSettings?.({ starSizeMultiplier: v })}
        />

        {/* Star Nurseries / Clusters Count */}
        <ControlSlider
          label="STAR NURSERIES COUNT"
          value={settings.clusterCount ?? 36}
          min={8}
          max={100}
          step={4}
          unit=" clusters"
          subtext="Discrete H II star-forming nursery complexes along density wave fronts."
          isModelParam
          onChange={(v) => onUpdateSettings?.({ clusterCount: Math.round(v) })}
        />

        {/* Cluster Particle Density Multiplier */}
        <ControlSlider
          label="CLUSTER PARTICLE DENSITY"
          value={settings.clusterDensityMultiplier ?? 1.0}
          min={0.2}
          max={3.0}
          step={0.1}
          unit="x"
          subtext={`Particles rendered per cluster (~${Math.round(32 * (settings.clusterDensityMultiplier ?? 1.0))} pts/cluster).`}
          onChange={(v) => onUpdateSettings?.({ clusterDensityMultiplier: v })}
        />

        {/* Population & Tracer Statistics Breakdown */}
        <div style={styles.statsCard}>
          <div style={styles.statsHeader}>TRACER TELEMETRY BREAKDOWN</div>
          <InfoRow
            label="EST. GALAXY POPULATION"
            value="420 Billion"
            subvalue="Astronomical Population"
          />
          <InfoRow
            label="GENERATED TRACERS"
            value={`${formatNumber(settings.starCount ?? 20000, 0)} stars`}
            subvalue="Procedural Domain Buffer"
          />
          <InfoRow
            label="ACTIVE RENDERED TRACERS"
            value={`${formatNumber(activeRenderedStars ?? settings.starCount ?? 20000, 0)} stars`}
            subvalue="Visible Layer Pipeline"
            highlight
          />
          <InfoRow
            label="HARDWARE SAFETY CAP"
            value="100,000 max"
            subvalue="Explicit Resource Limit"
          />
        </div>
      </CollapsibleGroup>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GROUP 3: GAS & DUST (CLOUDS & INTERSTELLAR MEDIUM)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <CollapsibleGroup
        id="clouds"
        title="3. GAS & DUST"
        badge={`${formatNumber((settings.cloudCount ?? 14000) + (settings.dustCount ?? 4800), 0)} Particles`}
        icon="☁️"
        isOpen={openGroups.clouds}
        onToggle={() => toggleGroup('clouds')}
      >
        <div style={styles.subHeading}>DIFFUSE GAS &amp; NEBULA EMISSION</div>

        {/* Gas Cloud Tracer Count */}
        <ControlSlider
          label="CLOUD TRACER COUNT"
          value={settings.cloudCount ?? 14000}
          min={4000}
          max={30000}
          step={1000}
          unit=" pts"
          subtext="Interstellar medium gas cloud particles uploaded to GPU continuum buffer."
          onChange={(v) => onUpdateSettings?.({ cloudCount: Math.round(v) })}
        />

        {/* Gas Cloud Spatial Coverage */}
        <ControlSlider
          label="CLOUD SPATIAL COVERAGE"
          value={settings.cloudCoverage ?? 1.0}
          min={0.5}
          max={2.0}
          step={0.1}
          unit="x"
          subtext="Gaussian radial and vertical dispersion scale of diffuse emission."
          onChange={(v) => onUpdateSettings?.({ cloudCoverage: v })}
        />

        {/* Gas Cloud Opacity */}
        <ControlSlider
          label="CLOUD EMISSION OPACITY"
          value={settings.cloudOpacity ?? 1.0}
          min={0.0}
          max={2.0}
          step={0.1}
          unit="x"
          subtext="Silky emission continuum starlight and H II glow intensity."
          onChange={(v) => onUpdateSettings?.({ cloudOpacity: v })}
        />

        <Divider />
        <div style={styles.subHeading}>DARK DUST EXTINCTION LANES</div>

        {/* Dust Lane Count */}
        <ControlSlider
          label="DUST TRACER COUNT"
          value={settings.dustCount ?? 4800}
          min={1500}
          max={12000}
          step={500}
          unit=" pts"
          subtext="Absorption lane tracers along concave arm edges and bar shock fronts."
          onChange={(v) => onUpdateSettings?.({ dustCount: Math.round(v) })}
        />

        {/* Dust Spatial Width */}
        <ControlSlider
          label="DUST SHOCK SPATIAL WIDTH"
          value={settings.dustCoverage ?? 1.0}
          min={0.5}
          max={2.0}
          step={0.1}
          unit="x"
          subtext="Filament width and shock compression lane offset."
          onChange={(v) => onUpdateSettings?.({ dustCoverage: v })}
        />

        {/* Dust Extinction Opacity */}
        <ControlSlider
          label="DUST EXTINCTION OPACITY"
          value={settings.dustOpacity}
          min={0.0}
          max={2.0}
          step={0.1}
          unit="x"
          subtext="Absorption silhouette strength blocking background disk emission."
          onChange={(v) => onUpdateSettings?.({ dustOpacity: v })}
        />

        {/* Stellar Halo Opacity */}
        <ControlSlider
          label="HALO ENVELOPE OPACITY"
          value={settings.haloOpacity}
          min={0.0}
          max={1.0}
          step={0.05}
          unit="x"
          subtext="Visibility of extended Population II stellar halo envelope."
          onChange={(v) => onUpdateSettings?.({ haloOpacity: v })}
        />
      </CollapsibleGroup>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GROUP 4: DYNAMICS (ROTATION & SIMULATION CLOCK)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <CollapsibleGroup
        id="dynamics"
        title="4. DYNAMICS"
        badge={settings.isPaused ? 'PAUSED' : `${settings.timeSpeed}x Speed`}
        icon="⏱️"
        isOpen={openGroups.dynamics}
        onToggle={() => toggleGroup('dynamics')}
      >
        {/* Pause / Resume Button */}
        <div style={{ marginBottom: 10 }}>
          <button
            style={{
              ...styles.playPauseButton,
              ...(settings.isPaused ? styles.pausedButton : styles.runningButton),
            }}
            onClick={() => onUpdateSettings?.({ isPaused: !settings.isPaused })}
          >
            {settings.isPaused ? '▶ RESUME SIMULATION CLOCK' : '⏸ PAUSE SIMULATION CLOCK'}
          </button>
        </div>

        {/* Time Multiplier Buttons */}
        <div style={{ marginBottom: 10 }}>
          <div style={styles.subHeading}>SIMULATION TIME MULTIPLIER</div>
          <div style={styles.speedGrid}>
            {[0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 10.0].map((spd) => (
              <button
                key={spd}
                style={{
                  ...styles.speedButton,
                  ...(settings.timeSpeed === spd && !settings.isPaused ? styles.speedButtonActive : {}),
                }}
                onClick={() => onUpdateSettings?.({ timeSpeed: spd, isPaused: false })}
              >
                {spd}x
              </button>
            ))}
          </div>
          <div style={styles.controlSubtext}>
            Scales time advancement for orbital mechanics, accretion disc, and jet knots.
          </div>
        </div>

        {/* Rigid Visual Rotation */}
        <ControlSlider
          label="RIGID VISUAL ROTATION"
          value={settings.visualRotationSpeed}
          min={0.0}
          max={5.0}
          step={0.1}
          unit="x"
          subtext="Kinematic rigid-body orientation spin of the 3D scene group around polar Y-axis."
          onChange={(v) => onUpdateSettings?.({ visualRotationSpeed: v })}
        />

        {/* Internal Orbital Dynamics */}
        <ControlSlider
          label="ORBITAL MOTION SPEED"
          value={settings.orbitalMotionSpeed}
          min={0.0}
          max={5.0}
          step={0.1}
          unit="x"
          subtext="Internal differential Keplerian rotation, accretion flows, and stellar phase twinkling."
          onChange={(v) => onUpdateSettings?.({ orbitalMotionSpeed: v })}
        />

        <div style={styles.noticeBox}>
          <div style={styles.noticeTitle}>SCIENTIFIC INTEGRITY NOTE</div>
          <div style={styles.noticeText}>
            Rigid-body visual rotation is strictly separated from internal differential orbital mechanics. Modifying visual rotation does not claim to alter gravitational rotation curves.
          </div>
        </div>
      </CollapsibleGroup>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GROUP 5: VIEW & RENDERING (CAMERA & OPTICS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <CollapsibleGroup
        id="view"
        title="5. VIEW & RENDERING"
        badge={`${settings.cameraFov}° FOV · ${settings.renderScale}x Scale`}
        icon="🔭"
        isOpen={openGroups.view}
        onToggle={() => toggleGroup('view')}
      >
        {/* Visual Rendering Scale */}
        <ControlSlider
          label="VISUAL RENDERING SCALE"
          value={settings.renderScale}
          min={0.25}
          max={2.5}
          step={0.05}
          unit="x"
          subtext="Optical 3D scene group scale without altering physical parsec coordinates."
          onChange={(v) => onUpdateSettings?.({ renderScale: v })}
        />

        {/* Camera Viewing Distance */}
        <ControlSlider
          label="CAMERA VIEWING DISTANCE"
          value={settings.cameraDistanceMultiplier}
          min={0.3}
          max={3.0}
          step={0.05}
          unit="x"
          subtext="Scales camera distance along look-at axis with immediate orbit update."
          onChange={(v) => onUpdateSettings?.({ cameraDistanceMultiplier: v })}
        />

        {/* Camera Elevation (Tilt) Angle */}
        <ControlSlider
          label="VIEWING ELEVATION (TILT)"
          value={settings.cameraViewingAngle ?? 38.0}
          min={-85.0}
          max={85.0}
          step={1.0}
          unit="°"
          subtext="Camera elevation tilt: 0° is edge-on, 85° is top-down north pole."
          onChange={(v) => onUpdateSettings?.({ cameraViewingAngle: v })}
        />

        {/* Camera Azimuth (Yaw) Angle */}
        <ControlSlider
          label="VIEWING AZIMUTH (YAW)"
          value={settings.cameraAzimuthAngle ?? 45.0}
          min={-180.0}
          max={180.0}
          step={5.0}
          unit="°"
          subtext="Orbital azimuth angle in the horizontal plane around the galaxy center."
          onChange={(v) => onUpdateSettings?.({ cameraAzimuthAngle: v })}
        />

        {/* Camera Optical FOV */}
        <ControlSlider
          label="OPTICAL FIELD OF VIEW (FOV)"
          value={settings.cameraFov}
          min={25}
          max={90}
          step={1}
          unit="°"
          subtext="Perspective camera focal angle (25° telephoto to 90° wide-field)."
          onChange={(v) => onUpdateSettings?.({ cameraFov: v })}
        />

        {/* Cinematic Waypoints */}
        <div style={{ marginTop: 10 }}>
          <div style={styles.subHeading}>CINEMATIC OBSERVATORY WAYPOINTS</div>
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
        </div>

        {/* Layer Visibility Toggles */}
        <div style={{ marginTop: 10 }}>
          <div style={styles.subHeading}>LAYER VISIBILITY TOGGLES</div>
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
        </div>
      </CollapsibleGroup>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TELEMETRY & RESET CONTROLS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {telemetry && (
        <div style={styles.telemetryCard}>
          <div style={styles.statsHeader}>LIVE OBSERVATORY TELEMETRY</div>
          <div style={styles.telemetryGrid}>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>CAMERA R</span>
              <span style={styles.telemetryValue}>{telemetry.distanceKpc.toFixed(1)} kpc</span>
            </div>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>ORBIT SPEED</span>
              <span style={styles.telemetryValue}>~{telemetry.speedKms} km/s</span>
            </div>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>FRAME RATE</span>
              <span style={{
                ...styles.telemetryValue,
                color: telemetry.fps >= 50 ? '#10b981' : telemetry.fps >= 30 ? '#f59e0b' : '#ef4444',
              }}>
                {telemetry.fps} FPS
              </span>
            </div>
            <div style={styles.telemetryItem}>
              <span style={styles.telemetryLabel}>GAS &amp; DUST</span>
              <span style={styles.telemetryValue}>
                {formatNumber((settings.cloudCount ?? 14000) + (settings.dustCount ?? 4800), 0)} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reset Defaults Button */}
      <div style={{ marginTop: 14 }}>
        <button
          style={styles.resetButton}
          onClick={onResetSettings}
        >
          ↺ RESTORE OBSERVATORY CANONICAL DEFAULTS
        </button>
        <div style={styles.controlSubtext}>
          Restores canonical 500k ly model, 4 arms, 20k stars, 1.0x scales, and layers without modifying seed 42.
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Info Main Wrapper Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyInfoProps {
  galaxy: Galaxy;
  activePreset?: CameraPreset | null;
  onSelectPreset?: (preset: CameraPreset) => void;
  onSelectNucleus?: () => void;
  layers?: GalaxyLayerVisibility;
  onToggleLayer?: (layer: keyof GalaxyLayerVisibility) => void;
  telemetry?: GalaxyTelemetry;
  observatorySettings?: GalaxyObservatorySettings;
  onUpdateObservatorySettings?: (updates: Partial<GalaxyObservatorySettings>) => void;
  onResetObservatorySettings?: () => void;
  onPhysicalDiameterChange?: (diameterLy: number) => void;
  currentPhysicalDiameterLy?: number;
  activeRenderedStars?: number;
  isRegenerating?: boolean;
}

function GalaxyInfo({
  galaxy,
  activePreset,
  onSelectPreset,
  onSelectNucleus,
  layers,
  onToggleLayer,
  telemetry,
  observatorySettings,
  onUpdateObservatorySettings,
  onResetObservatorySettings,
  onPhysicalDiameterChange,
  currentPhysicalDiameterLy,
  activeRenderedStars,
  isRegenerating,
}: GalaxyInfoProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const isBarred = galaxy.bar !== undefined;
  const armNames = galaxy.spiralArmDefinitions
    ? galaxy.spiralArmDefinitions.map((a) => a.name.split(' ')[0]).join(', ')
    : `${galaxy.spiralArms.armCount} Arms`;

  if (isMinimized) {
    return (
      <div style={styles.minimizedContainer}>
        <div style={styles.minimizedContent} onClick={() => setIsMinimized(false)}>
          <span style={styles.minimizedDot} />
          <span style={styles.minimizedTitle}>{galaxy.displayName ?? galaxy.name}</span>
          <span style={styles.minimizedFps}>{telemetry?.fps ?? 60} FPS</span>
          <button style={styles.minimizeBtn} title="Expand Observatory Panel">
            ▢ EXPAND
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.container}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Panel Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...styles.colorDot, backgroundColor: '#ffe8c0' }} />
          <div>
            <div style={styles.name}>{galaxy.displayName ?? galaxy.name}</div>
            <div style={styles.typeLabel}>GALAXY OBSERVATORY · {isBarred ? 'SBbc BARRED SPIRAL' : galaxy.type}</div>
          </div>
        </div>
        <button
          style={styles.minimizeBtn}
          onClick={() => setIsMinimized(true)}
          title="Minimize Panel to Clear Viewport"
        >
          — HIDE
        </button>
      </div>

      <Divider />

      {/* Astronomy Facts Pill Header */}
      <div style={styles.quickFactsRow}>
        <div style={styles.quickFact}>
          <span style={styles.quickFactLabel}>DISK ⌀</span>
          <span style={styles.quickFactVal}>{((currentPhysicalDiameterLy ?? 500000) / 1000).toFixed(0)}k ly</span>
        </div>
        <div style={styles.quickFact}>
          <span style={styles.quickFactLabel}>RADIUS</span>
          <span style={styles.quickFactVal}>{galaxy.radius.toFixed(1)} kpc</span>
        </div>
        <div style={styles.quickFact}>
          <span style={styles.quickFactLabel}>ARMS</span>
          <span style={styles.quickFactVal} title={armNames}>{galaxy.spiralArms.armCount} Continuous</span>
        </div>
        <div style={styles.quickFact}>
          <span style={styles.quickFactLabel}>AGE</span>
          <span style={styles.quickFactVal}>{galaxy.age.toFixed(1)} Gyr</span>
        </div>
      </div>

      {/* Central Supermassive Black Hole Summary */}
      {galaxy.nucleus && (
        <div style={styles.nucleusBanner} onClick={onSelectNucleus}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={styles.nucleusIcon}>⚫</span>
              <div>
                <span style={styles.nucleusName}>{galaxy.nucleus.name}</span>
                <span style={styles.nucleusSub}>{formatNumber(galaxy.nucleus.massSolar)} M☉ SMBH</span>
              </div>
            </div>
            <span style={styles.nucleusAction}>INSPECT →</span>
          </div>
        </div>
      )}

      {/* Comprehensive 5-Group Observatory Controls */}
      <ObservatoryControls
        settings={observatorySettings}
        onUpdateSettings={onUpdateObservatorySettings}
        onResetSettings={onResetObservatorySettings}
        onPhysicalDiameterChange={onPhysicalDiameterChange}
        currentPhysicalDiameterLy={currentPhysicalDiameterLy}
        activePreset={activePreset}
        onSelectPreset={onSelectPreset}
        layers={layers}
        onToggleLayer={onToggleLayer}
        telemetry={telemetry}
        activeRenderedStars={activeRenderedStars}
        isRegenerating={isRegenerating}
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-Information Panels (Clusters, Stars, Systems)
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

      <button style={styles.enterButton} onClick={onEnterSystem}>
        ENTER STAR SYSTEM →
      </button>
    </div>
  );
}

function formatStellarAge(years: number): string {
  if (years >= 1e9) return `${(years / 1e9).toFixed(2)} Gyr`;
  if (years >= 1e6) return `${(years / 1e6).toFixed(1)} Myr`;
  if (years >= 1e3) return `${(years / 1e3).toFixed(0)} Kyr`;
  return `${years.toFixed(0)} yr`;
}

function SystemStarInfo({
  body,
  onAdvanceAge,
  onResetZAMS,
}: {
  body: CelestialBody;
  onAdvanceAge?: (years: number) => void;
  onResetZAMS?: () => void;
}) {
  const sp = body.starProperties;
  const evo = sp?.evolution;

  return (
    <>
      {evo ? (
        <>
          <InfoRow label="EVOLUTIONARY PHASE" value={evo.phaseLabel} />
          <InfoRow label="CLASSIFICATION" value={`${evo.spectralClass} ${evo.luminosityClass}`} />
          <InfoRow label="STELLAR AGE" value={formatStellarAge(evo.ageYears)} />
          <InfoRow label="MS LIFETIME" value={formatStellarAge(evo.mainSequenceLifetimeYears)} />
          <InfoRow label="PHASE PROGRESS" value={`${(evo.phaseProgress * 100).toFixed(1)}%`} />
        </>
      ) : (
        <InfoRow label="TYPE" value={`${sp?.spectralClass ?? '?'}-type Star`} />
      )}
      <InfoRow label="MASS" value={`${(body.mass / SOLAR_MASS).toFixed(3)} M☉`} />
      <InfoRow label="RADIUS" value={`${(body.radius / SOLAR_RADIUS).toFixed(3)} R☉`} />
      <InfoRow label="TEMPERATURE" value={`${formatNumber(sp?.temperature ?? 0, 0)} K`} />
      <InfoRow label="LUMINOSITY" value={`${formatNumber((sp?.luminosity ?? 0) / 3.828e26)} L☉`} />

      {sp?.habitableZone && (
        <>
          <Divider />
          <div style={styles.sectionHeader}>CIRCUMSTELLAR HABITABLE ZONE</div>
          <InfoRow
            label="CONSERVATIVE HZ"
            value={`${sp.habitableZone.innerConservativeAU.toFixed(2)} – ${sp.habitableZone.outerConservativeAU.toFixed(2)} AU`}
          />
          <InfoRow
            label="OPTIMISTIC HZ"
            value={`${sp.habitableZone.innerOptimisticAU.toFixed(2)} – ${sp.habitableZone.outerOptimisticAU.toFixed(2)} AU`}
          />
          {sp.habitableZone.isTemperatureClamped && (
            <div style={styles.disclaimerText}>
              * Star Teff clamped to Kopparapu validity [2,600–7,200 K]
            </div>
          )}
        </>
      )}

      {evo && onAdvanceAge && (
        <>
          <Divider />
          <div style={styles.sectionHeader}>STELLAR EVOLUTION TIMELINE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <button
              style={styles.timeStepButton}
              onClick={(e) => {
                e.stopPropagation();
                onAdvanceAge(5.0e8); // +500 Myr
              }}
            >
              +500 MYR
            </button>
            <button
              style={styles.timeStepButton}
              onClick={(e) => {
                e.stopPropagation();
                onAdvanceAge(1.0e9); // +1.0 Gyr
              }}
            >
              +1.0 GYR
            </button>
            <button
              style={styles.timeStepButton}
              onClick={(e) => {
                e.stopPropagation();
                onAdvanceAge(2.5e9); // +2.5 Gyr
              }}
            >
              +2.5 GYR
            </button>
            <button
              style={{ ...styles.timeStepButton, color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              onClick={(e) => {
                e.stopPropagation();
                onResetZAMS?.();
              }}
            >
              ↺ RESET ZAMS
            </button>
          </div>
        </>
      )}
    </>
  );
}

function SystemPlanetInfo({ body }: { body: CelestialBody }) {
  const pp = body.planetProperties;
  const orbitalAU = (pp?.orbitalRadius ?? 0) / AU;
  const periodDays = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_DAY;
  const periodYears = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_YEAR;

  const habitabilityColor =
    pp?.habitabilityStatus === 'CONSERVATIVE_HZ'
      ? '#10b981'
      : pp?.habitabilityStatus === 'OPTIMISTIC_INNER'
      ? '#06b6d4'
      : pp?.habitabilityStatus === 'OPTIMISTIC_OUTER'
      ? '#38bdf8'
      : pp?.habitabilityStatus === 'TOO_HOT'
      ? '#f59e0b'
      : '#94a3b8';

  const habitabilityLabel =
    pp?.habitabilityStatus === 'CONSERVATIVE_HZ'
      ? 'CONSERVATIVE HZ'
      : pp?.habitabilityStatus === 'OPTIMISTIC_INNER'
      ? 'OPTIMISTIC INNER'
      : pp?.habitabilityStatus === 'OPTIMISTIC_OUTER'
      ? 'OPTIMISTIC OUTER'
      : pp?.habitabilityStatus === 'TOO_HOT'
      ? 'TOO HOT'
      : pp?.habitabilityStatus === 'TOO_COLD'
      ? 'TOO COLD'
      : 'UNKNOWN';

  return (
    <>
      <InfoRow label="TYPE" value={pp?.planetType ?? 'Unknown'} />
      <InfoRow label="MASS" value={`${(body.mass / EARTH_MASS).toFixed(2)} M⊕`} />
      <InfoRow label="RADIUS" value={`${(body.radius / EARTH_RADIUS).toFixed(2)} R⊕`} />
      <InfoRow label="ORBIT" value={`${orbitalAU.toFixed(3)} AU`} />
      <InfoRow
        label="PERIOD"
        value={periodYears >= 1 ? `${periodYears.toFixed(2)} years` : `${periodDays.toFixed(1)} days`}
      />
      <InfoRow
        label="VELOCITY"
        value={`${formatNumber(Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2 + body.velocity.z ** 2) / 1000)} km/s`}
      />

      {pp && pp.equilibriumTemperature !== undefined && (
        <>
          <Divider />
          <div style={styles.sectionHeader}>STELLAR–PLANETARY COUPLING</div>
          <InfoRow
            label="EQUILIBRIUM TEMP"
            value={`${formatNumber(pp.equilibriumTemperature, 1)} K (${formatNumber(pp.equilibriumTemperature - 273.15, 1)} °C)`}
          />
          <InfoRow label="BOND ALBEDO" value={pp.albedo.toFixed(2)} />
          <InfoRow
            label="STELLAR FLUX"
            value={`${formatNumber(pp.insolationFlux, 1)} W/m² (${pp.insolationRelative.toFixed(2)} S⊕)`}
          />
          <div style={styles.hzStatusRow}>
            <span style={styles.label}>HABITABILITY</span>
            <span
              style={{
                ...styles.hzBadge,
                color: habitabilityColor,
                borderColor: habitabilityColor,
                backgroundColor: `${habitabilityColor}18`,
              }}
            >
              {habitabilityLabel}
            </span>
          </div>
        </>
      )}

      {pp?.environment && (
        <>
          <Divider />
          <div style={styles.sectionHeader}>PLANETARY ENVIRONMENT (MISSION 005A)</div>
          <InfoRow
            label="SURFACE TEMP"
            value={`${formatNumber(pp.environment.surfaceTemperatureK, 1)} K (${formatNumber(pp.environment.surfaceTemperatureK - 273.15, 1)} °C)`}
          />
          <InfoRow
            label="GREENHOUSE ΔT"
            value={`+${formatNumber(pp.environment.greenhouseWarmingK, 1)} K`}
          />
          <InfoRow
            label="SURFACE GRAVITY"
            value={`${pp.environment.surfaceGravity.toFixed(2)} m/s² (${pp.environment.relativeGravity.toFixed(2)} g)`}
          />
          <InfoRow
            label="ESCAPE VELOCITY"
            value={`${pp.environment.escapeVelocityKmPerSec.toFixed(2)} km/s`}
          />
          <InfoRow
            label="SURFACE PRESSURE"
            value={pp.environment.surfacePressureBar > 0 ? `${formatNumber(pp.environment.surfacePressureBar, 2)} bar` : 'Airless (0.00 bar)'}
          />
          <InfoRow
            label="WATER STABILITY"
            value={
              pp.environment.waterPhaseState === 'LIQUID_STABLE'
                ? 'Liquid Stable'
                : pp.environment.waterPhaseState === 'SOLID_ICE'
                ? 'Solid Glaciation'
                : pp.environment.waterPhaseState === 'SUBLIMATING_ICE'
                ? 'Sublimating Ice'
                : pp.environment.waterPhaseState === 'SUPERHEATED_STEAM'
                ? 'Superheated Steam'
                : 'Not Applicable'
            }
          />
          <div style={styles.hzStatusRow}>
            <span style={styles.label}>THERMAL REGIME</span>
            <span
              style={{
                ...styles.hzBadge,
                color:
                  pp.environment.thermalRegime === 'TEMPERATE_MODEL_REGIME'
                    ? '#10b981'
                    : pp.environment.thermalRegime === 'GLACIATED_TERRESTRIAL'
                    ? '#38bdf8'
                    : pp.environment.thermalRegime === 'AIRLESS_CRYOWORLD'
                    ? '#818cf8'
                    : pp.environment.thermalRegime === 'AIRLESS_DESOLATION'
                    ? '#f59e0b'
                    : pp.environment.thermalRegime === 'HYPERTHERMIC_RUNAWAY'
                    ? '#ef4444'
                    : '#a855f7',
                borderColor:
                  pp.environment.thermalRegime === 'TEMPERATE_MODEL_REGIME'
                    ? '#10b981'
                    : pp.environment.thermalRegime === 'GLACIATED_TERRESTRIAL'
                    ? '#38bdf8'
                    : pp.environment.thermalRegime === 'AIRLESS_CRYOWORLD'
                    ? '#818cf8'
                    : pp.environment.thermalRegime === 'AIRLESS_DESOLATION'
                    ? '#f59e0b'
                    : pp.environment.thermalRegime === 'HYPERTHERMIC_RUNAWAY'
                    ? '#ef4444'
                    : '#a855f7',
                backgroundColor:
                  pp.environment.thermalRegime === 'TEMPERATE_MODEL_REGIME'
                    ? '#10b98118'
                    : pp.environment.thermalRegime === 'GLACIATED_TERRESTRIAL'
                    ? '#38bdf818'
                    : pp.environment.thermalRegime === 'AIRLESS_CRYOWORLD'
                    ? '#818cf818'
                    : pp.environment.thermalRegime === 'AIRLESS_DESOLATION'
                    ? '#f59e0b18'
                    : pp.environment.thermalRegime === 'HYPERTHERMIC_RUNAWAY'
                    ? '#ef444418'
                    : '#a855f718',
              }}
            >
              {pp.environment.regimeLabel.toUpperCase()}
            </span>
          </div>

          <div style={styles.disclaimerBox}>
            <div style={styles.disclaimerTitle}>MODEL ASSUMPTIONS & LIMITATIONS</div>
            <div style={styles.disclaimerText}>
              • Radiative equilibrium (Teq) assumes uniform 4π global heat redistribution and blackbody emission (ε = 1).
            </div>
            <div style={styles.disclaimerText}>
              • Surface temperature (Tsurf) modeled via 1D semi-grey radiative equilibrium (τ_IR ∝ P^0.5).
            </div>
            <div style={styles.disclaimerText}>
              • Atmospheric retention governed by thermal Jeans escape (vesc ≥ 3.0 km/s).
            </div>
            <div style={styles.disclaimerText}>
              • Thermal regimes and liquid water stability are approximate physical model states, NOT proof of habitability or life.
            </div>
          </div>
        </>
      )}
    </>
  );
}

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
        {massPresets.map((preset) => {
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
// Unified Info Panel (Top-Level Container)
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
  observatorySettings?: GalaxyObservatorySettings;
  onUpdateObservatorySettings?: (updates: Partial<GalaxyObservatorySettings>) => void;
  onResetObservatorySettings?: () => void;
  onPhysicalDiameterChange?: (diameterLy: number) => void;
  currentPhysicalDiameterLy?: number;
  activeRenderedStars?: number;
  isRegenerating?: boolean;
  onAdvanceStellarAge?: (years: number) => void;
  onResetStellarAge?: () => void;
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
  observatorySettings,
  onUpdateObservatorySettings,
  onResetObservatorySettings,
  onPhysicalDiameterChange,
  currentPhysicalDiameterLy,
  activeRenderedStars,
  isRegenerating,
  onAdvanceStellarAge,
  onResetStellarAge,
}: UnifiedInfoPanelProps) {
  // System view: show celestial body info
  if (inSystemView && selectedBody) {
    return (
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <button style={styles.backButton} onClick={onExitSystem}>
          ← BACK TO GALAXY
        </button>
        <div style={styles.header}>
          <div style={{ ...styles.colorDot, backgroundColor: selectedBody.color }} />
          <span style={styles.name}>{selectedBody.name}</span>
        </div>
        <Divider />
        {selectedBody.type === CelestialBodyType.STAR && (
          <SystemStarInfo
            body={selectedBody}
            onAdvanceAge={onAdvanceStellarAge}
            onResetZAMS={onResetStellarAge}
          />
        )}
        {selectedBody.type === CelestialBodyType.PLANET && <SystemPlanetInfo body={selectedBody} />}
        <Divider />
        <InfoRow label="SEED" value={selectedBody.seed.toString()} />
      </div>
    );
  }

  // System view: no body selected, show back button
  if (inSystemView) {
    return (
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
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
        observatorySettings={observatorySettings}
        onUpdateObservatorySettings={onUpdateObservatorySettings}
        onResetObservatorySettings={onResetObservatorySettings}
        onPhysicalDiameterChange={onPhysicalDiameterChange}
        currentPhysicalDiameterLy={currentPhysicalDiameterLy}
        activeRenderedStars={activeRenderedStars}
        isRegenerating={isRegenerating}
      />
    );
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Observatory Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 70,
    right: 20,
    width: 330,
    maxHeight: 'calc(100vh - 90px)',
    overflowY: 'auto',
    padding: '16px 18px',
    background: 'rgba(3, 7, 18, 0.90)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(56, 189, 248, 0.20)',
    borderRadius: 12,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#e2e8f0',
    userSelect: 'none',
    zIndex: 20,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  minimizedContainer: {
    position: 'absolute',
    top: 70,
    right: 20,
    zIndex: 20,
    userSelect: 'none',
  },
  minimizedContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    background: 'rgba(3, 7, 18, 0.88)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    borderRadius: 20,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  minimizedDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
    boxShadow: '0 0 8px #38bdf8',
  },
  minimizedTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  minimizedFps: {
    fontSize: 10,
    color: '#10b981',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  minimizeBtn: {
    fontSize: 10,
    letterSpacing: 1,
    padding: '3px 8px',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 4,
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 10px rgba(255, 232, 192, 0.5)',
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: '#f8fafc',
  },
  typeLabel: {
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: '#38bdf8',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 2,
  },
  quickFactsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 4,
    marginBottom: 10,
  },
  quickFact: {
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    borderRadius: 6,
    padding: '4px 6px',
    textAlign: 'center',
  },
  quickFactLabel: {
    display: 'block',
    fontSize: 7.5,
    letterSpacing: 1,
    color: '#64748b',
    fontFamily: "'JetBrains Mono', monospace",
  },
  quickFactVal: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#e2e8f0',
    marginTop: 1,
  },
  nucleusBanner: {
    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.8))',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  nucleusIcon: {
    fontSize: 14,
  },
  nucleusName: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#f8fafc',
  },
  nucleusSub: {
    display: 'block',
    fontSize: 9,
    color: '#c084fc',
    fontFamily: "'JetBrains Mono', monospace",
  },
  nucleusAction: {
    fontSize: 9.5,
    letterSpacing: 1,
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  observatoryWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  syncStatusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  statusText: {
    fontSize: 8.5,
    letterSpacing: 1,
    color: '#94a3b8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  statusSeed: {
    fontSize: 8.5,
    color: '#64748b',
    fontFamily: "'JetBrains Mono', monospace",
  },
  accordionContainer: {
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(56, 189, 248, 0.14)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(15, 23, 42, 0.4)',
    border: 'none',
    borderBottom: '1px solid transparent',
    color: '#f1f5f9',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease',
  },
  accordionHeaderOpen: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
  },
  accordionTitleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  accordionIcon: {
    fontSize: 12,
  },
  accordionTitle: {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: '#f8fafc',
    fontFamily: "'JetBrains Mono', monospace",
  },
  accordionMetaArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  accordionBadge: {
    fontSize: 8,
    letterSpacing: 0.5,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  accordionChevron: {
    fontSize: 10,
    color: '#64748b',
  },
  accordionBody: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  subHeading: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#94a3b8',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  sectionHeadingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#38bdf8',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', monospace",
  },
  headingBadge: {
    fontSize: 7.5,
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  divider: {
    height: 1,
    background: 'rgba(56, 189, 248, 0.12)',
    margin: '10px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '2px 0',
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#94a3b8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  value: {
    fontSize: 10.5,
    fontWeight: 500,
    color: '#f1f5f9',
    fontFamily: "'JetBrains Mono', monospace",
  },
  valueHighlight: {
    color: '#38bdf8',
    fontWeight: 600,
  },
  subvalue: {
    fontSize: 8,
    color: '#64748b',
    fontFamily: "'JetBrains Mono', monospace",
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: '#cbd5e1',
    fontFamily: "'JetBrains Mono', monospace",
  },
  sliderBadge: {
    fontSize: 7.5,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
  },
  modelTag: {
    fontSize: 7,
    letterSpacing: 0.5,
    padding: '1px 3px',
    borderRadius: 2,
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    fontFamily: "'JetBrains Mono', monospace",
  },
  sliderValue: {
    fontSize: 10,
    fontWeight: 600,
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  rangeInput: {
    width: '100%',
    height: 4,
    accentColor: '#38bdf8',
    cursor: 'pointer',
  },
  controlSubtext: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.3,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 4,
  },
  miniPresetButton: {
    padding: '5px 8px',
    fontSize: 8.5,
    letterSpacing: 0.5,
    borderRadius: 4,
    border: '1px solid rgba(56, 189, 248, 0.2)',
    background: 'rgba(15, 23, 42, 0.7)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s ease',
  },
  miniPresetButtonActive: {
    background: 'rgba(56, 189, 248, 0.22)',
    borderColor: '#38bdf8',
    color: '#f8fafc',
    fontWeight: 600,
  },
  speedGrid: {
    display: 'flex',
    gap: 3,
    flexWrap: 'wrap',
  },
  speedButton: {
    flex: '1 0 20%',
    padding: '4px 6px',
    fontSize: 8.5,
    borderRadius: 4,
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  speedButtonActive: {
    background: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38bdf8',
    color: '#38bdf8',
    fontWeight: 600,
  },
  playPauseButton: {
    width: '100%',
    padding: '7px 12px',
    fontSize: 9.5,
    letterSpacing: 1.2,
    fontWeight: 600,
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s ease',
  },
  runningButton: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
  },
  pausedButton: {
    background: 'rgba(239, 68, 68, 0.18)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
  },
  presetButton: {
    padding: '5px 4px',
    fontSize: 8,
    letterSpacing: 0.8,
    borderRadius: 4,
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.65)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    textAlign: 'center',
  },
  presetButtonActive: {
    background: 'rgba(56, 189, 248, 0.22)',
    borderColor: '#38bdf8',
    color: '#f8fafc',
    fontWeight: 600,
  },
  layerRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  layerBadge: {
    padding: '3px 7px',
    fontSize: 8,
    letterSpacing: 0.5,
    borderRadius: 4,
    border: '1px solid rgba(148, 163, 184, 0.15)',
    background: 'rgba(15, 23, 42, 0.4)',
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  layerBadgeActive: {
    background: 'rgba(56, 189, 248, 0.18)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
  },
  statsCard: {
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: 6,
    padding: '8px 10px',
  },
  statsHeader: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 6,
  },
  telemetryCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(56, 189, 248, 0.18)',
    borderRadius: 8,
    padding: '10px 12px',
    marginTop: 4,
  },
  telemetryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 6,
  },
  telemetryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  telemetryLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: '#64748b',
    fontFamily: "'JetBrains Mono', monospace",
  },
  telemetryValue: {
    fontSize: 11,
    fontWeight: 600,
    color: '#f8fafc',
    fontFamily: "'JetBrains Mono', monospace",
  },
  noticeBox: {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: 6,
    padding: '7px 9px',
  },
  noticeTitle: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: '#94a3b8',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 3,
  },
  noticeText: {
    fontSize: 8,
    color: '#94a3b8',
    lineHeight: 1.35,
  },
  resetButton: {
    width: '100%',
    padding: '7px 10px',
    fontSize: 8.5,
    letterSpacing: 1,
    fontWeight: 600,
    borderRadius: 6,
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 4,
  },
  enterButton: {
    width: '100%',
    marginTop: 10,
    padding: '8px 12px',
    background: 'rgba(56, 189, 248, 0.18)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: 6,
    color: '#38bdf8',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  backButton: {
    width: '100%',
    marginBottom: 10,
    padding: '6px 10px',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 6,
    color: '#94a3b8',
    fontSize: 9,
    letterSpacing: 1,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    padding: '20px 0',
  },
  timeStepButton: {
    padding: '6px 8px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.8,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s ease',
  },
  sectionHeader: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#38bdf8',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', monospace",
  },
  hzStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
  },
  hzBadge: {
    fontSize: 8.5,
    fontWeight: 600,
    letterSpacing: 0.8,
    fontFamily: "'JetBrains Mono', monospace",
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid currentColor',
  },
  disclaimerBox: {
    marginTop: 8,
    padding: '8px 10px',
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  disclaimerTitle: {
    fontSize: 7.5,
    letterSpacing: 1,
    fontWeight: 600,
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: '#94a3b8',
    lineHeight: 1.35,
    fontFamily: "'Inter', sans-serif",
  },
};
