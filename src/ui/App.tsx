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
import { SystemEditor } from './SystemEditor';
import { SimulationEngine } from '../engine/SimulationEngine';
import { Universe } from '../universe/Universe';
import { ViewLevel } from '../universe/Galaxy';
import type { GalaxyStar, StarCluster, QualityLevel } from '../universe/Galaxy';
import { type CelestialBody, CelestialBodyType } from '../universe/CelestialBody';
import type { TimeMultiplier } from '../engine/SimulationClock';
import type { OrbitalElements } from '../physics/orbitalElements';

/** Default universe seed for deterministic initial experience */
const DEFAULT_SEED = 42;

export function App() {
  // ── Universe initialization ─────────────────────
  const universeRef = useRef<Universe | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  if (!universeRef.current) {
    universeRef.current = new Universe(DEFAULT_SEED);
    universeRef.current.loadMilkyWay('MEDIUM');
  }
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  const universe = universeRef.current;
  const engine = engineRef.current;
  const galaxy = universe.galaxy;

  // ── UI State ────────────────────────────────────
  const [galaxyMode, setGalaxyMode] = useState<'MILKY_WAY' | 'ANANTARA'>('MILKY_WAY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [viewLevel, setViewLevel] = useState<string>(ViewLevel.GALAXY);
  const [selectedStarIndex, setSelectedStarIndex] = useState<number | null>(null);
  const [selectedNucleus, setSelectedNucleus] = useState<boolean>(false);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [tick, setTick] = useState(0);

  // ── Observatory State ───────────────────────────
  const [layers, setLayers] = useState<GalaxyLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>(null);
  const [telemetry, setTelemetry] = useState<GalaxyTelemetry | undefined>(undefined);
  const [observatorySettings, setObservatorySettings] = useState<GalaxyObservatorySettings>(() =>
    createDefaultObservatorySettings()
  );
  const [currentPhysicalDiameterLy, setCurrentPhysicalDiameterLy] = useState<number>(100000);
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

  // Current selected body in system view (authoritative engine state)
  const selectedBody: CelestialBody | null = useMemo(() => {
    if (inSystemView) {
      if (selectedBodyId) {
        return engine.getBody(selectedBodyId) ?? engine.bodies[0] ?? null;
      }
      return engine.bodies[0] ?? null;
    }
    return null;
  }, [inSystemView, selectedBodyId, engine, tick]);

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

  const currentQuality: QualityLevel =
    starCount <= 12000 ? 'LOW' : starCount <= 30000 ? 'MEDIUM' : 'HIGH';

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
      if (galaxyMode === 'MILKY_WAY') {
        universe.loadMilkyWay(currentQuality, starCount);
        setCurrentPhysicalDiameterLy(100000);
      } else {
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
        setCurrentPhysicalDiameterLy(targetDiameterLy);
      }
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

  const handleEnterSystem = useCallback((targetIndex?: number) => {
    const idx = targetIndex ?? selectedStarIndex ?? 0;
    setSelectedStarIndex(idx);

    const system = universe.enterStarSystem(idx);
    if (system) {
      engine.initialize(system.bodies);
      engine.start(10_000);
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
    setIsEditorOpen(false);
    setTick(t => t + 1);
  }, [universe, engine]);

  const handleSwitchGalaxy = useCallback((mode: 'MILKY_WAY' | 'ANANTARA') => {
    if (viewLevel !== ViewLevel.GALAXY) {
      universe.exitStarSystem();
      engine.pause();
      setViewLevel(ViewLevel.GALAXY);
      setSelectedBodyId(null);
      setIsEditorOpen(false);
    }
    if (mode === 'MILKY_WAY') {
      universe.loadMilkyWay(currentQuality);
      setGalaxyMode('MILKY_WAY');
      setCurrentPhysicalDiameterLy(100000);
      setSearchFeedback('Loaded real Milky Way (Akashaganga) · 100,000 ly');
    } else {
      universe.loadAnantara({
        targetDiameterLy: 500000,
        quality: currentQuality,
      });
      setGalaxyMode('ANANTARA');
      setCurrentPhysicalDiameterLy(500000);
      setSearchFeedback('Loaded procedural ANANTARA α (seed 42) · 500,000 ly');
    }
    setSelectedStarIndex(null);
    setSelectedNucleus(false);
    setTick(t => t + 1);
  }, [viewLevel, universe, engine, currentQuality]);

  const handleGoToOurSolarSystem = useCallback(() => {
    if (galaxyMode !== 'MILKY_WAY') {
      universe.loadMilkyWay(currentQuality);
      setGalaxyMode('MILKY_WAY');
      setCurrentPhysicalDiameterLy(100000);
    }
    const sunIdx = universe.getSunStarIndex();
    if (sunIdx >= 0) {
      handleEnterSystem(sunIdx);
      setSelectedBodyId('earth');
      setSearchFeedback('Entered canonical Solar System (NASA/JPL Horizons)');
    }
    setTick(t => t + 1);
  }, [galaxyMode, universe, currentQuality, handleEnterSystem]);

  const handleSearch = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // 1. Search for Sol / Sun / Earth / Solar System
    if (q.includes('sun') || q.includes('sol') || q.includes('earth') || q.includes('solar')) {
      if (galaxyMode !== 'MILKY_WAY') {
        universe.loadMilkyWay(currentQuality);
        setGalaxyMode('MILKY_WAY');
        setCurrentPhysicalDiameterLy(100000);
      }
      const sunIdx = universe.getSunStarIndex();
      if (sunIdx >= 0) {
        setSelectedStarIndex(sunIdx);
        setSelectedNucleus(false);
        setSearchFeedback('Located Sun (Sol) on the Orion Spur');
        if (q.includes('earth') || q.includes('system') || q.includes('solar')) {
          handleEnterSystem(sunIdx);
          if (q.includes('earth')) {
            setSelectedBodyId('earth');
          }
        }
      }
      setTick(t => t + 1);
      return;
    }

    // 2. Search for Sagittarius A* / Nucleus
    if (q.includes('sagittarius') || q.includes('sgr') || q.includes('nucleus') || q.includes('black hole') || q.includes('anantara a')) {
      setSelectedNucleus(true);
      setSelectedStarIndex(null);
      setActivePreset('nucleus');
      setSearchFeedback(`Targeted Galactic Nucleus: ${universe.nucleus?.name ?? 'SMBH'}`);
      setTick(t => t + 1);
      return;
    }

    // 3. Search for Milky Way
    if (q.includes('milky') || q.includes('akashaganga')) {
      handleSwitchGalaxy('MILKY_WAY');
      return;
    }

    // 4. Search for ANANTARA
    if (q.includes('anantara')) {
      handleSwitchGalaxy('ANANTARA');
      return;
    }

    // 5. Search in active galaxy stars
    if (universe.galaxy) {
      const starIdx = universe.galaxy.stars.findIndex(
        s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      );
      if (starIdx >= 0) {
        setSelectedStarIndex(starIdx);
        setSelectedNucleus(false);
        setSearchFeedback(`Located star: ${universe.galaxy.stars[starIdx].name}`);
        setTick(t => t + 1);
        return;
      }
    }

    setSearchFeedback(`No target matching "${query}" found.`);
  }, [galaxyMode, universe, currentQuality, handleEnterSystem, handleSwitchGalaxy]);

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
    const star = engine.bodies.find(b => b.type === CelestialBodyType.STAR);
    if (star) {
      engine.setStarAge(star, 0);
      setTick(t => t + 1);
    }
  }, [engine]);

  const handleApplyBodyEdits = useCallback((
    bodyId: string,
    physicalUpdates: { name: string; mass: number; radius: number; color: string },
    orbitalUpdates?: OrbitalElements
  ) => {
    engine.updateBodyProperties(bodyId, physicalUpdates);
    if (orbitalUpdates) {
      engine.updateBodyOrbit(bodyId, orbitalUpdates);
    }
    // Update universe active system body metadata if present so system transitions stay aligned
    const b = universe.findBody(bodyId);
    if (b) {
      b.name = physicalUpdates.name;
      b.mass = physicalUpdates.mass;
      b.radius = physicalUpdates.radius;
      b.color = physicalUpdates.color;
      if (orbitalUpdates) {
        if (b.planetProperties) {
          b.planetProperties.orbitalElements = orbitalUpdates;
        } else if (b.moonProperties) {
          b.moonProperties.orbitalElements = orbitalUpdates;
        }
      }
    }
    setTick(t => t + 1);
  }, [engine, universe]);

  const handleAddPlanet = useCallback((newPlanet: CelestialBody) => {
    universe.addBody(newPlanet);
    engine.addBody(newPlanet);
    setSelectedBodyId(newPlanet.id);
    setTick(t => t + 1);
  }, [universe, engine]);

  const handleDeleteBody = useCallback((bodyId: string) => {
    universe.removeBody(bodyId);
    engine.removeBody(bodyId);
    setSelectedBodyId(engine.bodies[0]?.id ?? null);
    setTick(t => t + 1);
  }, [universe, engine]);

  // Expose test/debug handle on window
  useEffect(() => {
    (window as any).__astraversa = {
      universe,
      engine,
      enterSystem: (starIndex: number = 0) => {
        handleEnterSystem(starIndex);
      },
      enterSolarSystem: () => {
        handleGoToOurSolarSystem();
      },
      loadMilkyWay: () => handleSwitchGalaxy('MILKY_WAY'),
      loadAnantara: () => handleSwitchGalaxy('ANANTARA'),
      selectBody: (id: string | null) => {
        setSelectedBodyId(id);
        setTick(t => t + 1);
      },
    };
  }, [universe, engine, handleEnterSystem, handleGoToOurSolarSystem, handleSwitchGalaxy]);

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
                {universe.isCanonicalSolarSystem ? (
                  <span style={styles.observedBadge}> · OBSERVED (NASA/JPL)</span>
                ) : (
                  <span style={styles.seedLabel}> · Procedural System</span>
                )}
              </>
            )
            : (
              <>
                {galaxy?.displayName ?? galaxy?.name ?? 'Galaxy'}
                {galaxyMode === 'MILKY_WAY' ? (
                  <span style={styles.observedBadge}> · REAL OBSERVED (100k ly)</span>
                ) : (
                  <span style={styles.seedLabel}> · Seed {DEFAULT_SEED} (500k ly)</span>
                )}
              </>
            )
          }
        </p>

        {/* Galaxy Toggle / Mode */}
        <div style={styles.galaxyToggleRow}>
          <button
            style={{
              ...styles.galaxyToggleBtn,
              ...(galaxyMode === 'MILKY_WAY' ? styles.galaxyToggleBtnActive : {}),
            }}
            onClick={() => handleSwitchGalaxy('MILKY_WAY')}
          >
            MILKY WAY (REAL)
          </button>
          <button
            style={{
              ...styles.galaxyToggleBtn,
              ...(galaxyMode === 'ANANTARA' ? styles.galaxyToggleBtnActive : {}),
            }}
            onClick={() => handleSwitchGalaxy('ANANTARA')}
          >
            ANANTARA α (PROCEDURAL)
          </button>
        </div>

        {/* View indicator */}
        <div style={styles.viewIndicator}>
          <button
            style={{
              ...styles.viewBadge,
              ...(viewLevel === ViewLevel.GALAXY ? styles.viewBadgeActive : {}),
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (viewLevel !== ViewLevel.GALAXY) {
                handleExitSystem();
              }
            }}
          >
            GALAXY
          </button>
          <span style={styles.viewArrow}>{inSystemView ? '→' : ''}</span>
          <button
            style={{
              ...styles.viewBadge,
              ...(viewLevel === ViewLevel.SYSTEM ? styles.viewBadgeActive : {}),
              opacity: inSystemView ? 1 : 0.6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (viewLevel !== ViewLevel.SYSTEM) {
                handleEnterSystem();
              }
            }}
          >
            SYSTEM
          </button>

          {/* Quick Action: OUR SOLAR SYSTEM */}
          <button
            style={styles.ourSolarSystemButton}
            onClick={handleGoToOurSolarSystem}
            title="Jump to Earth & Our Canonical Solar System"
          >
            ☀️ OUR SOLAR SYSTEM
          </button>
        </div>

        {/* Astronomical Search Bar */}
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="Search Sol, Earth, Sgr A*, Milky Way..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(searchQuery);
            }}
            style={styles.searchInput}
          />
          <button
            style={styles.searchSubmitBtn}
            onClick={() => handleSearch(searchQuery)}
            title="Execute Astronomical Search"
          >
            FIND
          </button>
        </div>
        {searchFeedback && (
          <div style={styles.searchFeedbackText}>{searchFeedback}</div>
        )}
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
          bodies={engine.bodies}
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
        isEditorOpen={isEditorOpen}
        onToggleEditor={() => setIsEditorOpen(prev => !prev)}
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

      {/* Minimal System Editor (Mission P1-A) */}
      {inSystemView && isEditorOpen && (
        <SystemEditor
          selectedBody={selectedBody}
          allBodies={engine.bodies}
          onApplyBodyEdits={handleApplyBodyEdits}
          onAddPlanet={handleAddPlanet}
          onAddMoon={handleAddPlanet}
          onDeleteBody={handleDeleteBody}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
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
  galaxyToggleRow: {
    display: 'flex',
    gap: 6,
    marginTop: 8,
  },
  galaxyToggleBtn: {
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    padding: '3px 8px',
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  galaxyToggleBtnActive: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.45)',
    color: '#38bdf8',
    fontWeight: 600,
  },
  ourSolarSystemButton: {
    fontSize: 8.5,
    letterSpacing: 1,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 4,
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 88, 12, 0.25))',
    border: '1px solid rgba(245, 158, 11, 0.5)',
    color: '#fbbf24',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginLeft: 6,
  },
  observedBadge: {
    color: '#10b981',
    fontWeight: 600,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  searchInput: {
    fontSize: 9.5,
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 4,
    color: '#e2e8f0',
    padding: '4px 8px',
    width: 210,
    outline: 'none',
  },
  searchSubmitBtn: {
    fontSize: 8.5,
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 4,
    color: '#38bdf8',
    padding: '4px 8px',
    cursor: 'pointer',
  },
  searchFeedbackText: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#38bdf8',
    background: 'rgba(15, 23, 42, 0.85)',
    padding: '2px 6px',
    borderRadius: 3,
    display: 'inline-block',
  },
};
