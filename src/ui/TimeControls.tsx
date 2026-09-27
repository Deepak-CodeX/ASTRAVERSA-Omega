/**
 * ASTRAVERSA Ω — Time Controls UI
 *
 * Displays simulation time and provides speed/pause controls.
 */

import { SimulationClock, TIME_MULTIPLIERS, TIME_MULTIPLIER_LABELS, type TimeMultiplier } from '../engine/SimulationClock';
import { secondsToYears, SECONDS_PER_DAY } from '../astronomy/constants';

interface TimeControlsProps {
  clock: SimulationClock;
  onMultiplierChange: (multiplier: TimeMultiplier) => void;
}

/**
 * Format simulation time as a human-readable string.
 */
function formatSimTime(seconds: number): string {
  const years = Math.floor(secondsToYears(seconds));
  const remainingAfterYears = seconds - years * 365.25 * SECONDS_PER_DAY;
  const days = Math.floor(remainingAfterYears / SECONDS_PER_DAY);
  const hours = Math.floor((remainingAfterYears % SECONDS_PER_DAY) / 3600);

  if (years > 0) {
    return `Y${years} D${days} H${hours}`;
  }
  if (days > 0) {
    return `D${days} H${hours}`;
  }
  const minutes = Math.floor((remainingAfterYears % 3600) / 60);
  return `H${hours} M${minutes}`;
}

export function TimeControls({ clock, onMultiplierChange }: TimeControlsProps) {
  return (
    <div style={styles.container}>
      <div style={styles.timeDisplay}>
        <span style={styles.label}>SIM TIME</span>
        <span style={styles.value}>{formatSimTime(clock.simulationTime)}</span>
      </div>

      <div style={styles.controls}>
        {TIME_MULTIPLIERS.map((mult) => (
          <button
            key={mult}
            style={{
              ...styles.button,
              ...(clock.multiplier === mult ? styles.buttonActive : {}),
            }}
            onClick={() => onMultiplierChange(mult)}
          >
            {TIME_MULTIPLIER_LABELS[mult]}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: 'rgba(8, 12, 24, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(100, 140, 200, 0.2)',
    borderRadius: 12,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    userSelect: 'none',
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(150, 180, 220, 0.6)',
    textTransform: 'uppercase' as const,
  },
  value: {
    fontSize: 16,
    color: '#c0d8f0',
    fontWeight: 500,
    letterSpacing: 1,
  },
  controls: {
    display: 'flex',
    gap: 4,
  },
  button: {
    padding: '6px 12px',
    background: 'rgba(40, 60, 100, 0.3)',
    border: '1px solid rgba(100, 140, 200, 0.15)',
    borderRadius: 6,
    color: 'rgba(150, 180, 220, 0.7)',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonActive: {
    background: 'rgba(60, 120, 200, 0.3)',
    border: '1px solid rgba(100, 180, 255, 0.4)',
    color: '#80c0ff',
    boxShadow: '0 0 8px rgba(80, 160, 255, 0.15)',
  },
};
