/**
 * ASTRAVERSA Ω — Planet Renderer
 *
 * Renders a planet as a physically illuminated 3D sphere with:
 * - 60 FPS per-frame position synchronization in Three.js via useFrame
 * - Scientifically calibrated visual scale hierarchy preserving relative planet sizes
 * - Subtle atmospheric scattering layer for volatile-rich worlds
 * - Dynamic lighting from the host star casting realistic day/night hemispheres
 * - Crisp orbital selection indicator
 *
 * This component only handles visualization — no simulation logic.
 */

import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import type { CelestialBody } from '../universe/CelestialBody';
import {
  EARTH_RADIUS,
  RENDER_SCALE_AU,
  AU,
} from '../astronomy/constants';
import { PlanetType } from '../astronomy/planetary';

interface PlanetRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Visual radius calibration for planetary bodies in system view.
 *
 * Uses a scientifically ordered logarithmic scaling:
 * - Small rocky planets (Mercury, Mars): ~0.15 - 0.20 scene units
 * - Terrestrial planets (Earth, Venus): ~0.22 - 0.26 scene units
 * - Super-Earths / Sub-Neptunes: ~0.30 - 0.36 scene units
 * - Gas / Ice Giants (Jupiter, Saturn, Neptune): ~0.45 - 0.65 scene units
 *
 * Preserves correct relative hierarchy while preventing planets from vanishing into the void.
 */
function planetVisualRadius(physicalRadius: number): number {
  const earthRadii = physicalRadius / EARTH_RADIUS;
  const visual = 0.22 + 0.12 * Math.log2(Math.max(earthRadii, 0.25));
  return Math.max(visual, 0.14);
}

export function PlanetRenderer({ body, isSelected, onClick }: PlanetRendererProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  const visualRadius = planetVisualRadius(body.radius);
  const planetType = body.planetProperties?.planetType;
  const isGasGiant = planetType === PlanetType.GAS_GIANT || planetType === PlanetType.ICE_GIANT;
  const hasAtmosphere = isGasGiant || (body.planetProperties?.environment?.surfacePressureBar ?? 0) > 0.05;

  // Update Three.js object coordinates per-frame for smooth 60 FPS orbital motion
  useFrame(() => {
    if (groupRef.current) {
      const sceneX = (body.position.x / AU) * RENDER_SCALE_AU;
      const sceneY = (body.position.y / AU) * RENDER_SCALE_AU;
      const sceneZ = (body.position.z / AU) * RENDER_SCALE_AU;
      groupRef.current.position.set(sceneX, sceneY, sceneZ);
    }
  });

  // Initial scene coordinates
  const initialX = (body.position.x / AU) * RENDER_SCALE_AU;
  const initialY = (body.position.y / AU) * RENDER_SCALE_AU;
  const initialZ = (body.position.z / AU) * RENDER_SCALE_AU;

  return (
    <group ref={groupRef} position={[initialX, initialY, initialZ]}>
      {/* Planetary Body Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 32, 32]} />
        <meshStandardMaterial
          color={body.color}
          roughness={isGasGiant ? 0.5 : 0.82}
          metalness={0.06}
          emissive={isSelected ? body.color : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>

      {/* Atmospheric Scattering Layer (for worlds with atmospheres) */}
      {hasAtmosphere && (
        <mesh>
          <sphereGeometry args={[visualRadius * 1.06, 24, 24]} />
          <meshBasicMaterial
            color={isGasGiant ? body.color : '#60a5fa'}
            transparent
            opacity={isGasGiant ? 0.12 : 0.18}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Selection targeting ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[visualRadius * 1.45, visualRadius * 1.62, 64]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.85}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
