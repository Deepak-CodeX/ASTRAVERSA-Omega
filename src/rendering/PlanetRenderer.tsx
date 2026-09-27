/**
 * ASTRAVERSA Ω — Planet Renderer
 *
 * Renders a planet as a colored sphere with size derived from physical radius.
 * Supports click selection.
 *
 * This component only handles visualization — no simulation logic.
 */

import { useRef } from 'react';
import { Mesh } from 'three';
import type { CelestialBody } from '../universe/CelestialBody';
import {
  EARTH_RADIUS,
  RENDER_SCALE_AU,
  AU,
  MIN_RENDER_RADIUS,
} from '../astronomy/constants';

interface PlanetRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Convert a planet's physical radius to a visual scene radius.
 * Uses log-scaling to keep tiny rocky planets visible alongside gas giants.
 */
function planetVisualRadius(physicalRadius: number): number {
  const earthRadii = physicalRadius / EARTH_RADIUS;
  // Log-scale with minimum size
  const visual = 0.06 + 0.08 * Math.log2(Math.max(earthRadii, 0.1));
  return Math.max(visual, MIN_RENDER_RADIUS);
}

export function PlanetRenderer({ body, isSelected, onClick }: PlanetRendererProps) {
  const meshRef = useRef<Mesh>(null);

  const visualRadius = planetVisualRadius(body.radius);

  // Position in scene coordinates
  const sceneX = (body.position.x / AU) * RENDER_SCALE_AU;
  const sceneY = (body.position.y / AU) * RENDER_SCALE_AU;
  const sceneZ = (body.position.z / AU) * RENDER_SCALE_AU;

  return (
    <group position={[sceneX, sceneY, sceneZ]}>
      {/* Planet body */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 24, 24]} />
        <meshStandardMaterial
          color={body.color}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[visualRadius * 1.5, visualRadius * 1.7, 64]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.7}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
}
