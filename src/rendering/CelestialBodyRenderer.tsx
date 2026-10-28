/**
 * ASTRAVERSA Ω — Celestial Body Renderer
 *
 * Dispatches rendering to the appropriate component based on body type.
 * Supports STAR, PLANET, and MOON (Mission P1-A).
 */

import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType } from '../universe/CelestialBody';
import { StarRenderer } from './StarRenderer';
import { PlanetRenderer } from './PlanetRenderer';
import { OrbitRenderer } from './OrbitRenderer';
import { RENDER_SCALE_AU, AU } from '../astronomy/constants';

import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';

interface CelestialBodyRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
  parentBody?: CelestialBody;
}

function MoonRenderer({
  body,
  isSelected,
  onClick,
}: {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const visualRadius = Math.max(0.065, Math.min(0.12, 0.07 * (body.radius / 1737e3)));

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
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 20, 20]} />
        <meshStandardMaterial
          color={body.color || '#a5b4fc'}
          roughness={0.85}
          metalness={0.08}
          emissive={isSelected ? '#c084fc' : '#000000'}
          emissiveIntensity={isSelected ? 0.45 : 0}
        />
      </mesh>

      {/* Selection targeting ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[visualRadius * 1.5, visualRadius * 1.75, 48]} />
          <meshBasicMaterial
            color="#c084fc"
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

export function CelestialBodyRenderer({
  body,
  isSelected,
  onClick,
  parentBody,
}: CelestialBodyRendererProps) {
  return (
    <>
      {body.type === CelestialBodyType.STAR && (
        <StarRenderer body={body} isSelected={isSelected} onClick={onClick} />
      )}
      {body.type === CelestialBodyType.PLANET && (
        <>
          <OrbitRenderer body={body} isSelected={isSelected} parentBody={parentBody} />
          <PlanetRenderer body={body} isSelected={isSelected} onClick={onClick} />
        </>
      )}
      {body.type === CelestialBodyType.MOON && (
        <>
          <OrbitRenderer body={body} isSelected={isSelected} parentBody={parentBody} />
          <MoonRenderer body={body} isSelected={isSelected} onClick={onClick} />
        </>
      )}
    </>
  );
}
