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
  const sceneX = (body.position.x / AU) * RENDER_SCALE_AU;
  const sceneY = (body.position.y / AU) * RENDER_SCALE_AU;
  const sceneZ = (body.position.z / AU) * RENDER_SCALE_AU;
  const visualRadius = 0.04;

  return (
    <group position={[sceneX, sceneY, sceneZ]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[visualRadius, 16, 16]} />
        <meshStandardMaterial
          color={body.color || '#a5b4fc'}
          roughness={0.9}
          metalness={0.1}
          emissive={isSelected ? '#818cf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.6 : 0}
        />
      </mesh>
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
