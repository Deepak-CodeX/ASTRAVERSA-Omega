/**
 * ASTRAVERSA Ω — Minimal System Editor (Mission P1-A)
 *
 * Integrated, compact celestial body and planetary system editor:
 * - Allows selecting and inspecting celestial bodies in the active system
 * - Validates physical inputs (mass, radius) and orbital elements (a, e, i)
 * - Supports adding and removing planets with safe physics reinitialization
 * - Strict Apply and Cancel semantics: draft state does not mutate live simulation until confirmed
 * - Prevents unphysical values (e >= 0.9, negative mass, stellar collisions)
 */

import { useState, useEffect } from 'react';
import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType, createCelestialBody } from '../universe/CelestialBody';
import {
  SOLAR_MASS,
  SOLAR_RADIUS,
  EARTH_MASS,
  EARTH_RADIUS,
  AU,
} from '../astronomy/constants';
import { getPlanetType, circularOrbitalVelocity, orbitalPeriod } from '../astronomy/planetary';
import { Vector3 } from '../physics/Vector3';
import type { OrbitalElements } from '../physics/orbitalElements';

interface SystemEditorProps {
  selectedBody: CelestialBody | null;
  allBodies: CelestialBody[];
  onApplyBodyEdits: (
    bodyId: string,
    physicalUpdates: { name: string; mass: number; radius: number; color: string },
    orbitalUpdates?: OrbitalElements
  ) => void;
  onAddPlanet: (newPlanet: CelestialBody) => void;
  onDeleteBody: (bodyId: string) => void;
  onClose: () => void;
}

interface DraftState {
  name: string;
  massInput: string;
  radiusInput: string;
  color: string;
  semiMajorAxisAUInput: string;
  eccentricityInput: string;
  inclinationDegInput: string;
}

export function SystemEditor({
  selectedBody,
  allBodies,
  onApplyBodyEdits,
  onAddPlanet,
  onDeleteBody,
  onClose,
}: SystemEditorProps) {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const star = allBodies.find((b) => b.type === CelestialBodyType.STAR);

  // Synchronize draft state whenever selectedBody changes
  useEffect(() => {
    if (!selectedBody) {
      setDraft(null);
      setValidationError(null);
      return;
    }

    const isStar = selectedBody.type === CelestialBodyType.STAR;
    const massValue = isStar
      ? (selectedBody.mass / SOLAR_MASS).toFixed(3)
      : (selectedBody.mass / EARTH_MASS).toFixed(2);

    const radiusValue = isStar
      ? (selectedBody.radius / SOLAR_RADIUS).toFixed(3)
      : (selectedBody.radius / EARTH_RADIUS).toFixed(2);

    const orbitalRadiusAU = selectedBody.planetProperties
      ? (selectedBody.planetProperties.orbitalRadius / AU).toFixed(3)
      : selectedBody.moonProperties
      ? (selectedBody.moonProperties.orbitalRadius / AU).toFixed(5)
      : '1.000';

    const elements =
      selectedBody.planetProperties?.orbitalElements ??
      selectedBody.moonProperties?.orbitalElements;

    const ecc = elements ? elements.eccentricity.toFixed(3) : '0.000';
    const incDeg = elements ? ((elements.inclination * 180) / Math.PI).toFixed(1) : '0.0';

    setDraft({
      name: selectedBody.name,
      massInput: massValue,
      radiusInput: radiusValue,
      color: selectedBody.color,
      semiMajorAxisAUInput: orbitalRadiusAU,
      eccentricityInput: ecc,
      inclinationDegInput: incDeg,
    });
    setValidationError(null);
  }, [selectedBody?.id]);

  if (!selectedBody || !draft) {
    return null;
  }

  const isStar = selectedBody.type === CelestialBodyType.STAR;
  const isPlanet = selectedBody.type === CelestialBodyType.PLANET;

  const handleApply = () => {
    const massNum = parseFloat(draft.massInput);
    const radiusNum = parseFloat(draft.radiusInput);
    const semiMajorAU = parseFloat(draft.semiMajorAxisAUInput);
    const eccNum = parseFloat(draft.eccentricityInput);
    const incDegNum = parseFloat(draft.inclinationDegInput);

    // Validation
    if (!draft.name.trim()) {
      setValidationError('Name cannot be empty.');
      return;
    }
    if (isNaN(massNum) || massNum <= 0) {
      setValidationError('Mass must be a positive number.');
      return;
    }
    if (isNaN(radiusNum) || radiusNum <= 0) {
      setValidationError('Radius must be a positive number.');
      return;
    }

    const massKg = isStar ? massNum * SOLAR_MASS : massNum * EARTH_MASS;
    const radiusM = isStar ? radiusNum * SOLAR_RADIUS : radiusNum * EARTH_RADIUS;

    let orbitalUpdates: OrbitalElements | undefined = undefined;

    if (!isStar) {
      if (isNaN(semiMajorAU) || semiMajorAU <= 0) {
        setValidationError('Semi-major axis must be greater than 0 AU.');
        return;
      }
      if (isNaN(eccNum) || eccNum < 0 || eccNum >= 0.88) {
        setValidationError('Eccentricity must be between 0.00 and 0.88.');
        return;
      }
      if (isNaN(incDegNum) || incDegNum < 0 || incDegNum > 60) {
        setValidationError('Inclination must be between 0° and 60°.');
        return;
      }

      const aMeters = semiMajorAU * AU;
      if (star && aMeters <= star.radius * 1.5) {
        setValidationError('Orbit cannot be inside the stellar radius.');
        return;
      }

      const existingElements =
        selectedBody.planetProperties?.orbitalElements ??
        selectedBody.moonProperties?.orbitalElements;

      orbitalUpdates = {
        semiMajorAxis: aMeters,
        eccentricity: eccNum,
        inclination: (incDegNum * Math.PI) / 180,
        longitudeOfAscendingNode: existingElements?.longitudeOfAscendingNode ?? 0,
        argumentOfPeriapsis: existingElements?.argumentOfPeriapsis ?? 0,
        trueAnomaly: existingElements?.trueAnomaly ?? 0,
      };
    }

    setValidationError(null);
    onApplyBodyEdits(
      selectedBody.id,
      {
        name: draft.name.trim(),
        mass: massKg,
        radius: radiusM,
        color: draft.color,
      },
      orbitalUpdates
    );
  };

  const handleCreateNewPlanet = () => {
    if (!star) return;

    // Place new planet outside the current outermost planet
    const planets = allBodies.filter((b) => b.type === CelestialBodyType.PLANET);
    let maxDistAU = 0.5;
    for (const p of planets) {
      if (p.planetProperties) {
        const dAU = p.planetProperties.orbitalRadius / AU;
        if (dAU > maxDistAU) maxDistAU = dAU;
      }
    }

    const newDistAU = maxDistAU * 1.45 + 0.2;
    const newDistM = newDistAU * AU;
    const planetType = getPlanetType(newDistAU);
    const newMassKg = 1.0 * EARTH_MASS;
    const newRadiusM = 1.0 * EARTH_RADIUS;
    const vCirc = circularOrbitalVelocity(star.mass, newDistM);
    const period = orbitalPeriod(star.mass, newDistM);

    const newId = `planet-${Date.now()}`;
    const newPlanet = createCelestialBody({
      id: newId,
      name: `${star.name} Planet ${planets.length + 1}`,
      type: CelestialBodyType.PLANET,
      mass: newMassKg,
      radius: newRadiusM,
      position: new Vector3(newDistM, 0, 0),
      velocity: new Vector3(0, 0, vCirc),
      color: '#38bdf8',
      seed: Math.floor(Math.random() * 100000),
      parentId: star.id,
      planetProperties: {
        planetType,
        orbitalRadius: newDistM,
        orbitalPeriod: period,
        parentId: star.id,
        orbitalElements: {
          semiMajorAxis: newDistM,
          eccentricity: 0.0,
          inclination: 0.0,
          longitudeOfAscendingNode: 0.0,
          argumentOfPeriapsis: 0.0,
          trueAnomaly: 0.0,
        },
        albedo: 0.3,
        equilibriumTemperature: 250,
        insolationFlux: 1361 / (newDistAU * newDistAU),
        insolationRelative: 1 / (newDistAU * newDistAU),
        habitabilityStatus: 'TOO_COLD',
      },
    });

    onAddPlanet(newPlanet);
  };

  return (
    <div style={styles.editorContainer} onClick={(e) => e.stopPropagation()}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>SYSTEM LABORATORY EDITOR</span>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={styles.bodyTypeBadge}>
        {isStar ? 'STAR PROPERTIES' : isPlanet ? 'PLANET PROPERTIES' : 'MOON PROPERTIES'}
      </div>

      {validationError && <div style={styles.errorBanner}>{validationError}</div>}

      {/* Name Input */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Name</label>
        <input
          style={styles.textInput}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>

      {/* Mass Input */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          Mass ({isStar ? 'M☉' : 'M⊕'})
        </label>
        <input
          style={styles.textInput}
          type="number"
          step={isStar ? '0.05' : '0.1'}
          value={draft.massInput}
          onChange={(e) => setDraft({ ...draft, massInput: e.target.value })}
        />
      </div>

      {/* Radius Input */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          Radius ({isStar ? 'R☉' : 'R⊕'})
        </label>
        <input
          style={styles.textInput}
          type="number"
          step="0.05"
          value={draft.radiusInput}
          onChange={(e) => setDraft({ ...draft, radiusInput: e.target.value })}
        />
      </div>

      {/* Orbital Parameters (Only for Planets and Moons) */}
      {!isStar && (
        <>
          <div style={styles.divider} />
          <div style={styles.subHeading}>KEPLERIAN ORBIT</div>

          {/* Semi-major axis */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Semi-Major Axis (AU)</label>
            <input
              style={styles.textInput}
              type="number"
              step="0.05"
              value={draft.semiMajorAxisAUInput}
              onChange={(e) => setDraft({ ...draft, semiMajorAxisAUInput: e.target.value })}
            />
          </div>

          {/* Eccentricity slider & input */}
          <div style={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={styles.label}>Eccentricity (e)</label>
              <span style={styles.sliderValue}>{draft.eccentricityInput}</span>
            </div>
            <input
              style={styles.slider}
              type="range"
              min="0"
              max="0.85"
              step="0.01"
              value={draft.eccentricityInput}
              onChange={(e) => setDraft({ ...draft, eccentricityInput: e.target.value })}
            />
          </div>

          {/* Inclination slider & input */}
          <div style={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={styles.label}>Inclination (deg)</label>
              <span style={styles.sliderValue}>{draft.inclinationDegInput}°</span>
            </div>
            <input
              style={styles.slider}
              type="range"
              min="0"
              max="45"
              step="0.5"
              value={draft.inclinationDegInput}
              onChange={(e) => setDraft({ ...draft, inclinationDegInput: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        <button style={styles.applyButton} onClick={handleApply}>
          APPLY CHANGES
        </button>
        <button style={styles.cancelButton} onClick={onClose}>
          CANCEL
        </button>
      </div>

      <div style={styles.divider} />

      {/* Structural System Actions */}
      <div style={styles.systemActions}>
        <button style={styles.addPlanetButton} onClick={handleCreateNewPlanet}>
          + ADD NEW PLANET
        </button>

        {!isStar && (
          <button
            style={styles.deleteButton}
            onClick={() => onDeleteBody(selectedBody.id)}
          >
            DELETE {isPlanet ? 'PLANET' : 'MOON'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  editorContainer: {
    position: 'absolute',
    top: 75,
    left: 24,
    width: 290,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    background: 'rgba(6, 10, 22, 0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    padding: '16px 18px',
    color: '#e2e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    zIndex: 25,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1.5,
    color: '#38bdf8',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
  },
  bodyTypeBadge: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 11,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sliderValue: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: "'JetBrains Mono', monospace",
  },
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(100, 140, 200, 0.25)',
    borderRadius: 6,
    padding: '6px 8px',
    color: '#f8fafc',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
  },
  slider: {
    width: '100%',
    accentColor: '#38bdf8',
    cursor: 'pointer',
  },
  divider: {
    height: 1,
    background: 'rgba(100, 140, 200, 0.18)',
    margin: '12px 0',
  },
  subHeading: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#60a5fa',
    marginBottom: 8,
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
  },
  applyButton: {
    flex: 2,
    background: 'rgba(56, 189, 248, 0.2)',
    border: '1px solid rgba(56, 189, 248, 0.6)',
    color: '#38bdf8',
    padding: '7px 0',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cancelButton: {
    flex: 1,
    background: 'rgba(100, 116, 139, 0.2)',
    border: '1px solid rgba(100, 116, 139, 0.4)',
    color: '#cbd5e1',
    padding: '7px 0',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
  },
  systemActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  addPlanetButton: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.45)',
    color: '#34d399',
    padding: '7px 0',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    cursor: 'pointer',
  },
  deleteButton: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
    padding: '6px 0',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    cursor: 'pointer',
  },
};
