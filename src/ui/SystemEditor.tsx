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
  G,
} from '../astronomy/constants';
import { getPlanetType, circularOrbitalVelocity, orbitalPeriod } from '../astronomy/planetary';
import { Vector3 } from '../physics/Vector3';
import type { OrbitalElements } from '../physics/orbitalElements';
import { computeHillRadius } from '../universe/SolarSystemGenerator';
import {
  computeHabitableZone,
  computeEquilibriumTemperature,
  computeInsolationFlux,
  computeRelativeInsolation,
  classifyHabitability,
  getDefaultBondAlbedo,
} from '../astronomy/stellarPlanetaryCoupling';
import { computePlanetaryEnvironment } from '../astronomy/planetaryEnvironment';

interface SystemEditorProps {
  selectedBody: CelestialBody | null;
  allBodies: CelestialBody[];
  onApplyBodyEdits: (
    bodyId: string,
    physicalUpdates: { name: string; mass: number; radius: number; color: string },
    orbitalUpdates?: OrbitalElements
  ) => void;
  onAddPlanet: (newPlanet: CelestialBody) => void;
  onAddMoon?: (newMoon: CelestialBody) => void;
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
  onAddMoon,
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
    const isMoon = selectedBody.type === CelestialBodyType.MOON;

    const massValue = isStar
      ? (selectedBody.mass / SOLAR_MASS).toFixed(3)
      : isMoon
      ? (selectedBody.mass / EARTH_MASS).toPrecision(4)
      : (selectedBody.mass / EARTH_MASS).toFixed(2);

    const radiusValue = isStar
      ? (selectedBody.radius / SOLAR_RADIUS).toFixed(3)
      : isMoon
      ? (selectedBody.radius / EARTH_RADIUS).toPrecision(4)
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
  const isMoon = selectedBody.type === CelestialBodyType.MOON;

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

      if (isPlanet) {
        if (star && aMeters <= star.radius * 1.5) {
          setValidationError('Orbit cannot be inside the stellar radius.');
          return;
        }
      } else if (isMoon) {
        const parentId = selectedBody.parentId ?? selectedBody.moonProperties?.parentId;
        const parentPlanet = allBodies.find((b) => b.id === parentId);
        if (parentPlanet) {
          if (aMeters <= parentPlanet.radius * 1.5) {
            setValidationError('Moon orbit cannot be inside the parent planet radius.');
            return;
          }
          if (star) {
            const planetSemiMajor =
              parentPlanet.planetProperties?.orbitalRadius ?? parentPlanet.position.magnitude();
            const rH = computeHillRadius(planetSemiMajor, parentPlanet.mass, star.mass);
            const maxStableRadius = 0.49 * rH;
            if (rH > 0 && aMeters > maxStableRadius) {
              setValidationError(
                `Moon orbit (${semiMajorAU.toFixed(5)} AU) exceeds Hill sphere stability limit (${(maxStableRadius / AU).toFixed(5)} AU, 0.49 r_H).`
              );
              return;
            }
          }
        }
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

    const starLuminosity = star.starProperties?.luminosity ?? 3.828e26;
    const albedo = getDefaultBondAlbedo(planetType);
    const insolationFlux = computeInsolationFlux(starLuminosity, newDistM);
    const insolationRelative = computeRelativeInsolation(insolationFlux);
    const equilibriumTemperature = computeEquilibriumTemperature(starLuminosity, newDistM, albedo);
    const hz =
      star.starProperties?.habitableZone ??
      computeHabitableZone(starLuminosity, star.starProperties?.temperature ?? 5780);
    const habitabilityStatus = classifyHabitability(newDistM, hz);

    const environment = computePlanetaryEnvironment({
      planetType,
      massKg: newMassKg,
      radiusMeters: newRadiusM,
      luminosityWatts: starLuminosity,
      orbitalDistanceMeters: newDistM,
      albedo,
    });

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
        albedo,
        equilibriumTemperature,
        insolationFlux,
        insolationRelative,
        habitabilityStatus,
        environment,
      },
    });

    onAddPlanet(newPlanet);
  };

  const handleCreateNewMoon = () => {
    if (!isPlanet || !selectedBody || !star) return;

    const parentPlanet = selectedBody;
    const pp = parentPlanet.planetProperties;
    const parentSemiMajor = pp?.orbitalRadius ?? parentPlanet.position.magnitude();
    const rH = computeHillRadius(parentSemiMajor, parentPlanet.mass, star.mass);
    const rMin = Math.max(3 * parentPlanet.radius, 50_000_000);
    const rMax = 0.35 * rH;

    if (rH <= 0 || rMin >= rMax) {
      setValidationError('Planet Hill sphere is too small or compressed to host a stable moon.');
      return;
    }

    const existingMoons = allBodies.filter(
      (b) =>
        b.type === CelestialBodyType.MOON &&
        (b.parentId === parentPlanet.id || b.moonProperties?.parentId === parentPlanet.id)
    );

    let nextDistanceM = rMin * 1.5;
    if (existingMoons.length > 0) {
      let maxMoonDist = 0;
      for (const m of existingMoons) {
        const d = m.moonProperties?.orbitalRadius ?? 0;
        if (d > maxMoonDist) maxMoonDist = d;
      }
      nextDistanceM = Math.min(maxMoonDist * 1.4 + 20_000_000, rMax * 0.95);
      if (nextDistanceM <= maxMoonDist) {
        nextDistanceM = (maxMoonDist + rMax) * 0.5;
      }
    }

    const moonMass = parentPlanet.mass * 5e-5;
    const density = 3000;
    const moonVolume = moonMass / density;
    const moonRadius = Math.cbrt((3 * moonVolume) / (4 * Math.PI));

    const mu = G * (parentPlanet.mass + moonMass);
    const period = 2 * Math.PI * Math.sqrt(Math.pow(nextDistanceM, 3) / mu);
    const vCircular = Math.sqrt((G * parentPlanet.mass) / nextDistanceM);

    const relPos = new Vector3(nextDistanceM, 0, 0);
    const relVel = new Vector3(0, 0, vCircular);

    const moonLetters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const suffix = moonLetters[existingMoons.length] ?? `${existingMoons.length + 1}`;
    const newMoonId = `moon-${parentPlanet.id}-${Date.now()}`;

    const newMoon = createCelestialBody({
      id: newMoonId,
      name: `${parentPlanet.name} ${suffix}`,
      type: CelestialBodyType.MOON,
      mass: moonMass,
      radius: moonRadius,
      position: parentPlanet.position.add(relPos),
      velocity: parentPlanet.velocity.add(relVel),
      color: '#cbd5e1',
      seed: Math.floor(Math.random() * 100000),
      parentId: parentPlanet.id,
      moonProperties: {
        orbitalRadius: nextDistanceM,
        orbitalPeriod: period,
        parentId: parentPlanet.id,
        orbitalElements: {
          semiMajorAxis: nextDistanceM,
          eccentricity: 0.0,
          inclination: 0.0,
          longitudeOfAscendingNode: 0.0,
          argumentOfPeriapsis: 0.0,
          trueAnomaly: 0.0,
        },
      },
    });

    if (onAddMoon) {
      onAddMoon(newMoon);
    } else {
      onAddPlanet(newMoon);
    }
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
          Mass ({isStar ? 'M☉' : isMoon ? 'M⊕' : 'M⊕'})
        </label>
        <input
          style={styles.textInput}
          type="number"
          step={isStar ? '0.05' : isMoon ? '0.0001' : '0.1'}
          value={draft.massInput}
          onChange={(e) => setDraft({ ...draft, massInput: e.target.value })}
        />
      </div>

      {/* Radius Input */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          Radius ({isStar ? 'R☉' : isMoon ? 'R⊕' : 'R⊕'})
        </label>
        <input
          style={styles.textInput}
          type="number"
          step={isStar ? '0.05' : isMoon ? '0.0001' : '0.05'}
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
              step={isMoon ? '0.0005' : '0.05'}
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

        {isPlanet && (
          <button style={styles.addMoonButton} onClick={handleCreateNewMoon}>
            + ADD MOON TO PLANET
          </button>
        )}

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
  addMoonButton: {
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.45)',
    color: '#c084fc',
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
