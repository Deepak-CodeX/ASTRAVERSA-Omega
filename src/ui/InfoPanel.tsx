/**
 * ASTRAVERSA Ω — Info Panel
 *
 * Displays properties of the selected celestial body.
 * Shows different information for stars vs. planets.
 */

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

interface InfoPanelProps {
  body: CelestialBody | null;
}

/**
 * Format a number with appropriate SI prefix or scientific notation.
 */
function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(decimals);
  return value.toFixed(decimals);
}

function formatStellarAge(years: number): string {
  if (years >= 1e9) return `${(years / 1e9).toFixed(2)} Gyr`;
  if (years >= 1e6) return `${(years / 1e6).toFixed(1)} Myr`;
  if (years >= 1e3) return `${(years / 1e3).toFixed(0)} Kyr`;
  return `${years.toFixed(0)} yr`;
}

function StarInfo({ body }: { body: CelestialBody }) {
  const sp = body.starProperties;
  const evo = sp?.evolution;

  return (
    <>
      {evo ? (
        <>
          <InfoRow
            label="Phase"
            value={`${evo.phaseLabel}`}
          />
          <InfoRow
            label="Class"
            value={`${evo.spectralClass}${evo.luminosityClass}`}
          />
          <InfoRow
            label="Age"
            value={formatStellarAge(evo.ageYears)}
          />
          <InfoRow
            label="MS Life"
            value={formatStellarAge(evo.mainSequenceLifetimeYears)}
          />
          <InfoRow
            label="Progress"
            value={`${(evo.phaseProgress * 100).toFixed(1)}%`}
          />
        </>
      ) : (
        <InfoRow label="Type" value={`${sp?.spectralClass ?? '?'}-type Star`} />
      )}
      <InfoRow label="Mass" value={`${(body.mass / SOLAR_MASS).toFixed(3)} M☉`} />
      <InfoRow label="Radius" value={`${(body.radius / SOLAR_RADIUS).toFixed(3)} R☉`} />
      <InfoRow label="Temperature" value={`${formatNumber(sp?.temperature ?? 0, 0)} K`} />
      <InfoRow label="Luminosity" value={`${formatNumber((sp?.luminosity ?? 0) / 3.828e26)} L☉`} />
      {sp?.habitableZone && (
        <InfoRow
          label="Habitable Zone"
          value={`${sp.habitableZone.innerConservativeAU.toFixed(2)} – ${sp.habitableZone.outerConservativeAU.toFixed(2)} AU`}
        />
      )}
    </>
  );
}

function PlanetInfo({ body }: { body: CelestialBody }) {
  const pp = body.planetProperties;
  const orbitalAU = (pp?.orbitalRadius ?? 0) / AU;
  const periodDays = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_DAY;
  const periodYears = (pp?.orbitalPeriod ?? 0) / SECONDS_PER_YEAR;

  return (
    <>
      <InfoRow label="Type" value={pp?.planetType ?? 'Unknown'} />
      <InfoRow label="Mass" value={`${(body.mass / EARTH_MASS).toFixed(2)} M⊕`} />
      <InfoRow label="Radius" value={`${(body.radius / EARTH_RADIUS).toFixed(2)} R⊕`} />
      <InfoRow label="Orbit" value={`${orbitalAU.toFixed(3)} AU`} />
      <InfoRow
        label="Period"
        value={periodYears >= 1
          ? `${periodYears.toFixed(2)} years`
          : `${periodDays.toFixed(1)} days`
        }
      />
      <InfoRow
        label="Velocity"
        value={`${formatNumber(Math.sqrt(
          body.velocity.x ** 2 + body.velocity.y ** 2 + body.velocity.z ** 2
        ) / 1000)} km/s`}
      />
      {pp && pp.equilibriumTemperature !== undefined && (
        <>
          <InfoRow
            label="Equilibrium Temp"
            value={`${pp.equilibriumTemperature.toFixed(1)} K (${(pp.equilibriumTemperature - 273.15).toFixed(1)} °C)`}
          />
          <InfoRow label="Bond Albedo" value={pp.albedo.toFixed(2)} />
          <InfoRow
            label="Insolation"
            value={`${pp.insolationRelative.toFixed(2)} S⊕`}
          />
          <InfoRow
            label="Habitability"
            value={
              pp.habitabilityStatus === 'CONSERVATIVE_HZ'
                ? 'Conservative HZ'
                : pp.habitabilityStatus === 'OPTIMISTIC_INNER'
                ? 'Optimistic Inner'
                : pp.habitabilityStatus === 'OPTIMISTIC_OUTER'
                ? 'Optimistic Outer'
                : pp.habitabilityStatus === 'TOO_HOT'
                ? 'Too Hot'
                : 'Too Cold'
            }
          />
        </>
      )}

      {pp?.environment && (
        <>
          <div style={styles.divider} />
          <InfoRow
            label="Surface Temp"
            value={`${pp.environment.surfaceTemperatureK.toFixed(1)} K (${(pp.environment.surfaceTemperatureK - 273.15).toFixed(1)} °C)`}
          />
          <InfoRow
            label="Greenhouse ΔT"
            value={`+${pp.environment.greenhouseWarmingK.toFixed(1)} K`}
          />
          <InfoRow
            label="Surface Gravity"
            value={`${pp.environment.surfaceGravity.toFixed(2)} m/s² (${pp.environment.relativeGravity.toFixed(2)} g)`}
          />
          <InfoRow
            label="Escape Velocity"
            value={`${pp.environment.escapeVelocityKmPerSec.toFixed(2)} km/s`}
          />
          <InfoRow
            label="Atmosphere"
            value={pp.environment.surfacePressureBar > 0 ? `${pp.environment.surfacePressureBar.toFixed(2)} bar` : 'Airless (0.00 bar)'}
          />
          <InfoRow
            label="Water Stability"
            value={
              pp.environment.waterPhaseState === 'LIQUID_STABLE'
                ? 'Liquid Stable'
                : pp.environment.waterPhaseState === 'SOLID_ICE'
                ? 'Solid Ice'
                : pp.environment.waterPhaseState === 'SUBLIMATING_ICE'
                ? 'Sublimating Ice'
                : pp.environment.waterPhaseState === 'SUPERHEATED_STEAM'
                ? 'Superheated Steam'
                : 'N/A'
            }
          />
          <InfoRow
            label="Thermal Regime"
            value={pp.environment.regimeLabel}
          />
        </>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

export function InfoPanel({ body }: InfoPanelProps) {
  if (!body) return null;

  return (
    <div style={styles.container}>
      {/* Body name and color indicator */}
      <div style={styles.header}>
        <div
          style={{
            ...styles.colorDot,
            backgroundColor: body.color,
          }}
        />
        <span style={styles.name}>{body.name}</span>
      </div>

      <div style={styles.divider} />

      {/* Type-specific information */}
      {body.type === CelestialBodyType.STAR && <StarInfo body={body} />}
      {body.type === CelestialBodyType.PLANET && <PlanetInfo body={body} />}

      <div style={styles.divider} />

      {/* Seed info (for reproducibility) */}
      <InfoRow label="Seed" value={body.seed.toString()} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 80,
    right: 24,
    width: 260,
    padding: '16px 20px',
    background: 'rgba(8, 12, 24, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(100, 140, 200, 0.2)',
    borderRadius: 12,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#c0d8f0',
    userSelect: 'none',
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
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    background: 'rgba(100, 140, 200, 0.15)',
    margin: '10px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
  },
  label: {
    fontSize: 11,
    color: 'rgba(150, 180, 220, 0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  value: {
    fontSize: 13,
    color: '#d0e4f4',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
};
