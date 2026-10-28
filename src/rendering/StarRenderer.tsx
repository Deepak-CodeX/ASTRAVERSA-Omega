/**
 * ASTRAVERSA Ω — Star Renderer
 *
 * Renders a host star as an authentic luminous stellar object with:
 * - 60 FPS per-frame position synchronization in Three.js via useFrame
 * - Radiant photosphere core with tone-mapping bypass for bloom/luminosity
 * - Multi-layered translucent coronal radiance (inner corona + outer diffuse halo)
 * - Calibrated stellar point light illuminating orbiting planetary bodies
 *
 * This component only handles visualization — no simulation logic.
 */

import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import type { CelestialBody } from '../universe/CelestialBody';
import { SOLAR_RADIUS, RENDER_SCALE_AU, AU } from '../astronomy/constants';

interface StarRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Convert a star's physical radius to a visual scene radius.
 * Calibrated so the host star commands an authoritative, distinct presence
 * at the center of the solar system without obscuring innermost planets.
 */
function starVisualRadius(physicalRadius: number): number {
  const solarRadii = physicalRadius / SOLAR_RADIUS;
  const visual = 0.65 + 0.3 * Math.log2(Math.max(solarRadii, 0.1));
  return Math.max(visual, 0.4);
}

export function StarRenderer({ body, isSelected, onClick }: StarRendererProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  const visualRadius = starVisualRadius(body.radius);
  const luminosity = body.starProperties?.luminosity ?? 3.828e26;

  // Calibrated illumination for system-scale planetary day/night shading
  const lightIntensity = 20 + 8 * Math.log10(Math.max(luminosity / 3.828e26, 0.05) + 1);

  useFrame(() => {
    if (groupRef.current) {
      const sceneX = (body.position.x / AU) * RENDER_SCALE_AU;
      const sceneY = (body.position.y / AU) * RENDER_SCALE_AU;
      const sceneZ = (body.position.z / AU) * RENDER_SCALE_AU;
      groupRef.current.position.set(sceneX, sceneY, sceneZ);
    }
  });

  const initialX = (body.position.x / AU) * RENDER_SCALE_AU;
  const initialY = (body.position.y / AU) * RENDER_SCALE_AU;
  const initialZ = (body.position.z / AU) * RENDER_SCALE_AU;

  return (
    <group ref={groupRef} position={[initialX, initialY, initialZ]}>
      {/* Omni-directional stellar illumination */}
      <pointLight
        intensity={lightIntensity}
        distance={400}
        decay={1.1}
        color={body.color}
      />

      {/* Outer diffuse stellar halo (visualization effect) */}
      <mesh>
        <sphereGeometry args={[visualRadius * 3.0, 24, 24]} />
        <meshBasicMaterial
          color={body.color}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {/* Inner corona radiance */}
      <mesh>
        <sphereGeometry args={[visualRadius * 1.5, 32, 32]} />
        <meshBasicMaterial
          color={body.color}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Luminous Photosphere Core */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 36, 36]} />
        <meshBasicMaterial
          color={body.color}
          toneMapped={false}
        />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[visualRadius * 1.6, visualRadius * 1.8, 64]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
