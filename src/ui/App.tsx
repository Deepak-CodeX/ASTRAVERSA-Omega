/**
 * ASTRAVERSA Ω — Main Application
 *
 * Top-level application shell that integrates:
 * - Galaxy generation and navigation
 * - Cinematic Galaxy Observatory (presets, layers, telemetry)
 * - Solar system drill-down
 * - Simulation engine (for planetary physics)
 * - 3D rendering scenes (galaxy + solar system)
 * - UI overlay controls
 *
 * Navigation hierarchy:
 *   GALAXY VIEW → select star → SYSTEM VIEW → back to galaxy
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Scene,
  GalaxyScene,
  DEFAULT_LAYER_VISIBILITY,
  type CameraPreset,
  type GalaxyTelemetry,
  type GalaxyLayerVisibility,
  type GalaxyObservatorySettings,
  createDefaultObservatorySettings,
  computeActiveRenderedStars,
} from '../rendering';
import { TimeControls } from './TimeControls';
import { UnifiedInfoPanel } from './GalaxyInfoPanel';
import { SimulationEngine } from '../engine/SimulationEngine';
import { Universe } from '../universe/Universe';
import { ViewLevel } from '../universe/Galaxy';
import type { GalaxyStar, StarCluster } from '../universe/Galaxy';
import { type CelestialBody, CelestialBodyType } from '../universe/CelestialBody';
import type { TimeMultiplier } from '../engine/SimulationClock';

/** Default universe seed for deterministic initial experience */
const DEFAULT_SEED = 42;

export function App() {
  // ── Universe initialization ─────────────────────
  const universeRef = useRef<Universe | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  if (!universeRef.current) {
    universeRef.current = new Universe(DEFAULT_SEED);
    universeRef.current.generateGalaxy({ quality: 'MEDIUM' as const });
  }
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  const universe = universeRef.current;
  const engine = engineRef.current;
  const galaxy = universe.galaxy;

  // ── UI State ────────────────────────────────────
  const [viewLevel, setViewLevel] = useState<string>(ViewLevel.GALAXY);
  const [selectedStarIndex, setSelectedStarIndex] = useState<number | null>(null);
  const [selectedNucleus, setSelectedNucleus] = useState<boolean>(false);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Observatory State ───────────────────────────
  const [layers, setLayers] = useState<GalaxyLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>(null);
  const [telemetry, setTelemetry] = useState<GalaxyTelemetry | undefined>(undefined);
  const [observatorySettings, setObservatorySettings] = useState<GalaxyObservatorySettings>(() =>
    createDefaultObservatorySettings()
  );
  const [currentPhysicalDiameterLy, setCurrentPhysicalDiameterLy] = useState<number>(500000);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef<boolean>(true);
  const lastGeneratedConfigRef = useRef({
    targetDiameterLy: 500000,
    starCount: 20000,
    armCount: 4,
    armPitchAngleDeg: 13.0,
    armWidthMult: 1.0,
    armWindingFactor: 0.62,
    bulgeRadiusFraction: 0.13,
    haloRadiusMultiplier: 1.5,
    clusterCount: 36,
  });

  const inSystemView = viewLevel === ViewLevel.SYSTEM;

  // Current selected galaxy star
  const selectedStar: GalaxyStar | null = useMemo(() => {
    if (galaxy && selectedStarIndex !== null) {
      return galaxy.stars[selectedStarIndex] ?? null;
    }
    return null;
  }, [galaxy, selectedStarIndex]);

  // Current selected cluster (from star's cluster membership)
  const selectedCluster: StarCluster | null = useMemo(() => {
    if (galaxy && selectedStar && selectedStar.clusterIndex >= 0) {
      return galaxy.clusters[selectedStar.clusterIndex] ?? null;
    }
    return null;
  }, [galaxy, selectedStar]);

  // Current selected body in system view
  const selectedBody: CelestialBody | null = useMemo(() => {
    if (inSystemView) {
      if (selectedBodyId) {
        return universe.findBody(selectedBodyId) ?? universe.bodies[0] ?? null;
      }
      return universe.bodies[0] ?? null;
    }
    return null;
  }, [inSystemView, selectedBodyId, universe, tick]);

  // ── Galaxy View Handlers ────────────────────────

  const handleStarClick = useCallback((index: number) => {
    setSelectedStarIndex(index);
    setSelectedNucleus(false);
  }, []);

  const handleNucleusClick = useCallback(() => {
    setSelectedNucleus(true);
    setSelectedStarIndex(null);
  }, []);

  const handleGalaxyBackgroundClick = useCallback(() => {
    setSelectedStarIndex(null);
    setSelectedNucleus(false);
  }, []);

  const handleSelectPreset = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
  }, []);

  const handlePresetComplete = useCallback(() => {
    // Keep activePreset set so specific viewpoints remain locked without autoRotate drift
  }, []);

  const handleToggleLayer = useCallback((layer: keyof GalaxyLayerVisibility) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const handleTelemetryUpdate = useCallback((t: GalaxyTelemetry) => {
    setTelemetry(t);
  }, []);

  const handleUpdateNucleusMass = useCallback((massSolar: number) => {
    universe.setNucleusMass(massSolar);
    setSelectedNucleus(true);
    setTick(t => t + 1);
  }, [universe]);

  const handleUpdateObservatorySettings = useCallback((updates: Partial<GalaxyObservatorySettings>) => {
    setObservatorySettings(prev => ({ ...prev, ...updates }));
  }, []);

  const handlePhysicalDiameterChange = useCallback((diameterLy: number) => {
    setCurrentPhysicalDiameterLy(diameterLy);
    setObservatorySettings(prev => ({ ...prev, targetDiameterLy: diameterLy }));
  }, []);

  // Debounced procedural galaxy regeneration for structural / model parameters
  const {
    targetDiameterLy,
    starCount,
    armCount,
    armPitchAngleDeg,
    armWidthMult,
    armWindingFactor,
    bulgeRadiusFraction,
    haloRadiusMultiplier,
    clusterCount,
  } = observatorySettings;

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    const prev = lastGeneratedConfigRef.current;
    const isSame =
      prev.targetDiameterLy === targetDiameterLy &&
      prev.starCount === starCount &&
      prev.armCount === armCount &&
      prev.armPitchAngleDeg === armPitchAngleDeg &&
      prev.armWidthMult === armWidthMult &&
      prev.armWindingFactor === armWindingFactor &&
      prev.bulgeRadiusFraction === bulgeRadiusFraction &&
      prev.haloRadiusMultiplier === haloRadiusMultiplier &&
      prev.clusterCount === clusterCount;

    if (isSame) return;

    setIsRegenerating(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      universe.generateGalaxy({
        targetDiameterLy,
        starCount,
        armCount,
        armPitchAngleDeg,
        armWidthMult,
        armWindingFactor,
        bulgeRadiusFraction,
        haloRadiusMultiplier,
        clusterCount,
        quality: 'MEDIUM',
      });
      lastGeneratedConfigRef.current = {
        targetDiameterLy,
        starCount,
        armCount,
        armPitchAngleDeg,
        armWidthMult,
        armWindingFactor,
        bulgeRadiusFraction,
        haloRadiusMultiplier,
        clusterCount,
      };
      setCurrentPhysicalDiameterLy(targetDiameterLy);
      setSelectedStarIndex(null);
      setIsRegenerating(false);
      setTick(t => t + 1);
    }, 120);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    targetDiameterLy,
    starCount,
    armCount,
    armPitchAngleDeg,
    armWidthMult,
    armWindingFactor,
    bulgeRadiusFraction,
    haloRadiusMultiplier,
    clusterCount,
    universe,
  ]);

  const handleResetObservatorySettings = useCallback(() => {
    const defaults = createDefaultObservatorySettings();
    setObservatorySettings(defaults);
    setLayers(DEFAULT_LAYER_VISIBILITY);
    setActivePreset('overview');
    setCurrentPhysicalDiameterLy(defaults.targetDiameterLy);
    setSelectedStarIndex(null);
    setSelectedNucleus(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    universe.generateGalaxy({
      targetDiameterLy: defaults.targetDiameterLy,
      starCount: defaults.starCount,
      armCount: defaults.armCount,
      armPitchAngleDeg: defaults.armPitchAngleDeg,
      armWidthMult: defaults.armWidthMult,
      armWindingFactor: defaults.armWindingFactor,
      bulgeRadiusFraction: defaults.bulgeRadiusFraction,
      haloRadiusMultiplier: defaults.haloRadiusMultiplier,
      clusterCount: defaults.clusterCount,
      quality: 'MEDIUM',
    });

    lastGeneratedConfigRef.current = {
      targetDiameterLy: defaults.targetDiameterLy,
      starCount: defaults.starCount,
      armCount: defaults.armCount,
      armPitchAngleDeg: defaults.armPitchAngleDeg,
      armWidthMult: defaults.armWidthMult,
      armWindingFactor: defaults.armWindingFactor,
      bulgeRadiusFraction: defaults.bulgeRadiusFraction,
      haloRadiusMultiplier: defaults.haloRadiusMultiplier,
      clusterCount: defaults.clusterCount,
    };
    setIsRegenerating(false);
    setTick(t => t + 1);
  }, [universe]);

  // Compute active rendered stars based on enabled visual layers
  const activeRenderedStars = useMemo(() => {
    if (!galaxy) return 0;
    return computeActiveRenderedStars(galaxy.stars.length, galaxy.bar !== undefined, layers);
  }, [galaxy, layers.bulge, layers.bar, layers.disk]);

  // ── System View Handlers ────────────────────────

  const handleEnterSystem = useCallback(() => {
    if (selectedStarIndex === null) return;

    const system = universe.enterStarSystem(selectedStarIndex);
    if (system) {
      engine.initialize(system.bodies);
      engine.start(1);
      setViewLevel(ViewLevel.SYSTEM);
      setSelectedBodyId(system.bodies[0]?.id ?? null);
      setTick(t => t + 1);
    }
  }, [selectedStarIndex, universe, engine]);

  const handleExitSystem = useCallback(() => {
    universe.exitStarSystem();
    engine.pause();
    setViewLevel(ViewLevel.GALAXY);
    setSelectedBodyId(null);
    setTick(t => t + 1);
  }, [universe, engine]);

  const handleBodySelect = useCallback((id: string | null) => {
    setSelectedBodyId(id);
  }, []);

  const handleMultiplierChange = useCallback((multiplier: TimeMultiplier) => {
    engine.setTimeMultiplier(multiplier);
    setTick(t => t + 1);
  }, [engine]);

  const handleAdvanceStellarAge = useCallback((years: number) => {
    engine.advanceStellarAge(years);
    setTick(t => t + 1);
  }, [engine]);

  const handleResetStellarAge = useCallback(() => {
    const star = universe.bodies.find(b => b.type === CelestialBodyType.STAR);
    if (star) {
      engine.setStarAge(star, 0);
      setTick(t => t + 1);
    }
  }, [universe, engine]);

  // Expose test/debug handle on window
  useEffect(() => {
    (window as any).__astraversa = {
      universe,
      engine,
      enterSystem: (starIndex: number = 0) => {
        setSelectedStarIndex(starIndex);
        const system = universe.enterStarSystem(starIndex);
        if (system) {
          engine.initialize(system.bodies);
          engine.start(1);
          setViewLevel(ViewLevel.SYSTEM);
          setSelectedBodyId(system.bodies[0]?.id ?? null);
          setTick(t => t + 1);
        }
      },
      selectBody: (id: string | null) => {
        setSelectedBodyId(id);
        setTick(t => t + 1);
      },
    };
  }, [universe, engine]);

  // Periodically update time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // ── Render ──────────────────────────────────────

  return (
    <div style={styles.root}>
      {/* Title bar */}
      <div style={styles.titleBar}>
        <h1 style={styles.title}>
          <span style={styles.titleMain}>ASTRAVERSA</span>
          <span style={styles.titleOmega}> Ω</span>
        </h1>
        <p style={styles.subtitle}>
          {inSystemView
            ? (
              <>
                {universe.activeStar?.name ?? 'Star System'}
                <span style={styles.seedLabel}> · System</span>
              </>
            )
            : (
              <>
                {galaxy?.name ?? 'Galaxy'}
                <span style={styles.seedLabel}> · Seed {DEFAULT_SEED}</span>
              </>
            )
          }
        </p>
        {/* View indicator */}
        <div style={styles.viewIndicator}>
          <span style={{
            ...styles.viewBadge,
            ...(viewLevel === ViewLevel.GALAXY ? styles.viewBadgeActive : {}),
          }}>
            GALAXY
          </span>
          <span style={styles.viewArrow}>{inSystemView ? '→' : ''}</span>
          <span style={{
            ...styles.viewBadge,
            ...(viewLevel === ViewLevel.SYSTEM ? styles.viewBadgeActive : {}),
            opacity: inSystemView ? 1 : 0.3,
          }}>
            SYSTEM
          </span>
        </div>
      </div>

      {/* 3D Viewport — Galaxy or System */}
      {!inSystemView && galaxy && (
        <GalaxyScene
          galaxy={galaxy}
          selectedStarIndex={selectedStarIndex}
          selectedNucleus={selectedNucleus}
          onStarClick={handleStarClick}
          onNucleusClick={handleNucleusClick}
          onBackgroundClick={handleGalaxyBackgroundClick}
          layers={layers}
          settings={observatorySettings}
          activePreset={activePreset}
          onPresetComplete={handlePresetComplete}
          onTelemetryUpdate={handleTelemetryUpdate}
        />
      )}

      {inSystemView && (
        <Scene
          engine={engine}
          bodies={universe.bodies}
          selectedId={selectedBodyId}
          onSelect={handleBodySelect}
        />
      )}

      {/* Time controls (only in system view) */}
      {inSystemView && (
        <TimeControls
          clock={engine.clock}
          onMultiplierChange={handleMultiplierChange}
        />
      )}

      {/* Unified info panel */}
      <UnifiedInfoPanel
        galaxy={galaxy}
        selectedStar={selectedStar}
        selectedCluster={selectedCluster}
        selectedBody={selectedBody}
        selectedNucleus={selectedNucleus}
        onSelectNucleus={setSelectedNucleus}
        onUpdateNucleusMass={handleUpdateNucleusMass}
        inSystemView={inSystemView}
        onEnterSystem={handleEnterSystem}
        onExitSystem={handleExitSystem}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        telemetry={telemetry}
        observatorySettings={observatorySettings}
        onUpdateObservatorySettings={handleUpdateObservatorySettings}
        onResetObservatorySettings={handleResetObservatorySettings}
        onPhysicalDiameterChange={handlePhysicalDiameterChange}
        currentPhysicalDiameterLy={currentPhysicalDiameterLy}
        activeRenderedStars={activeRenderedStars}
        isRegenerating={isRegenerating}
        onAdvanceStellarAge={handleAdvanceStellarAge}
        onResetStellarAge={handleResetStellarAge}
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#000004',
  },
  titleBar: {
    position: 'absolute',
    top: 20,
    left: 24,
    zIndex: 10,
    userSelect: 'none',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 300,
    letterSpacing: 6,
    color: '#c0d8f0',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  titleMain: {
    fontWeight: 200,
  },
  titleOmega: {
    fontWeight: 400,
    color: '#6090c0',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 12,
    color: 'rgba(150, 180, 220, 0.5)',
    letterSpacing: 1,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  seedLabel: {
    color: 'rgba(150, 180, 220, 0.3)',
  },
  viewIndicator: {
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  viewBadge: {
    fontSize: 8,
    letterSpacing: 2,
    padding: '3px 8px',
    borderRadius: 4,
    background: 'rgba(40, 60, 100, 0.2)',
    border: '1px solid rgba(80, 120, 200, 0.1)',
    color: 'rgba(140, 170, 210, 0.4)',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  viewBadgeActive: {
    background: 'rgba(40, 80, 150, 0.3)',
    border: '1px solid rgba(80, 160, 255, 0.3)',
    color: '#80c8ff',
  },
  viewArrow: {
    fontSize: 10,
    color: 'rgba(140, 170, 210, 0.3)',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
};
