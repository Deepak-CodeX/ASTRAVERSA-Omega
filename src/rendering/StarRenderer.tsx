/**
 * ASTRAVERSA Ω — Star Renderer
 *
 * Renders a star as a glowing emissive sphere with a point light.
 * Visual properties are derived from the star's physical properties.
 *
 * This component only handles visualization — no simulation logic.
 */

import { useRef } from 'react';
import { Mesh } from 'three';
import type { CelestialBody } from '../universe/CelestialBody';
import { SOLAR_RADIUS, RENDER_SCALE_AU, AU, MIN_RENDER_RADIUS } from '../astronomy/constants';

interface StarRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Convert a star's physical radius to a visual scene radius.
 * Stars are enormously larger than planets in reality, so we use
 * a log-scaled representation to keep the scene readable.
 */
function starVisualRadius(physicalRadius: number): number {
  // Log-scale: makes different star sizes visible without overwhelming the scene
  const solarRadii = physicalRadius / SOLAR_RADIUS;
  const visual = 0.3 + 0.2 * Math.log2(Math.max(solarRadii, 0.1));
  return Math.max(visual, MIN_RENDER_RADIUS);
}

export function StarRenderer({ body, isSelected, onClick }: StarRendererProps) {
  const meshRef = useRef<Mesh>(null);

  const visualRadius = starVisualRadius(body.radius);
  const luminosity = body.starProperties?.luminosity ?? 1;

  // Scale light intensity based on luminosity (log scale)
  const lightIntensity = Math.min(5, 1 + Math.log10(luminosity / 3.828e26 + 1));

  // Position in scene coordinates
  const sceneX = (body.position.x / AU) * RENDER_SCALE_AU;
  const sceneY = (body.position.y / AU) * RENDER_SCALE_AU;
  const sceneZ = (body.position.z / AU) * RENDER_SCALE_AU;

  return (
    <group position={[sceneX, sceneY, sceneZ]}>
      {/* Point light emanating from the star */}
      <pointLight
        intensity={lightIntensity}
        distance={200}
        decay={2}
        color={body.color}
      />

      {/* Ambient glow (larger, transparent sphere) */}
      <mesh>
        <sphereGeometry args={[visualRadius * 2, 16, 16]} />
        <meshBasicMaterial
          color={body.color}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Star body */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 32, 32]} />
        <meshBasicMaterial
          color={body.color}
          toneMapped={false}
        />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[visualRadius * 1.4, visualRadius * 1.6, 64]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
}
