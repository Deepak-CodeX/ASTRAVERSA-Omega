/**
 * ASTRAVERSA Ω — Habitable Zone Renderer
 *
 * Renders a scientifically defensible 3D visual overlay for the circumstellar
 * habitable zone (HZ) boundaries in the star's reference plane (XZ plane).
 *
 * Grounded in the Kopparapu et al. (2013, 2014) polynomial insolation model
 * precalculated on the host star:
 * - Conservative HZ (Runaway Greenhouse to Maximum Greenhouse)
 * - Optimistic HZ (Recent Venus to Early Mars extensions)
 *
 * Disclaimer:
 * The habitable zone indicates orbital radiative-equilibrium suitability for
 * liquid surface water given an Earth-like atmosphere. It is NOT a guarantee of
 * planetary habitability (which depends on mass, atmosphere, magnetosphere, and volatiles).
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop, DoubleSide } from 'three';
import type { CelestialBody } from '../universe/CelestialBody';
import { RENDER_SCALE_AU } from '../astronomy/constants';

interface HabitableZoneRendererProps {
  star: CelestialBody;
}

const SEGMENTS = 96;

function createBoundaryRing(radiusScene: number, color: string, opacity: number): LineLoop {
  const points: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    points.push(
      Math.cos(angle) * radiusScene,
      0,
      Math.sin(angle) * radiusScene
    );
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(points, 3));
  const mat = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new LineLoop(geom, mat);
}

export function HabitableZoneRenderer({ star }: HabitableZoneRendererProps) {
  const hz = star.starProperties?.habitableZone;

  const {
    innerOptScene,
    innerConsScene,
    outerConsScene,
    outerOptScene,
    isValid,
  } = useMemo(() => {
    if (
      !hz ||
      hz.innerConservativeAU <= 0 ||
      hz.outerConservativeAU <= hz.innerConservativeAU
    ) {
      return {
        innerOptScene: 0,
        innerConsScene: 0,
        outerConsScene: 0,
        outerOptScene: 0,
        isValid: false,
      };
    }

    return {
      innerOptScene: Math.max(0.01, hz.innerOptimisticAU * RENDER_SCALE_AU),
      innerConsScene: hz.innerConservativeAU * RENDER_SCALE_AU,
      outerConsScene: hz.outerConservativeAU * RENDER_SCALE_AU,
      outerOptScene: hz.outerOptimisticAU * RENDER_SCALE_AU,
      isValid: true,
    };
  }, [hz]);

  const boundaryRings = useMemo(() => {
    if (!isValid) return null;
    return {
      innerOpt: createBoundaryRing(innerOptScene, '#06b6d4', 0.2),
      innerCons: createBoundaryRing(innerConsScene, '#10b981', 0.45),
      outerCons: createBoundaryRing(outerConsScene, '#10b981', 0.45),
      outerOpt: createBoundaryRing(outerOptScene, '#06b6d4', 0.2),
    };
  }, [isValid, innerOptScene, innerConsScene, outerConsScene, outerOptScene]);

  if (!isValid || !boundaryRings) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Conservative Habitable Zone Band (Runaway Greenhouse to Maximum Greenhouse) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerConsScene, outerConsScene, SEGMENTS]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.09}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Optimistic Inner Extension (Recent Venus to Runaway Greenhouse) */}
      {innerConsScene > innerOptScene && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerOptScene, innerConsScene, SEGMENTS]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.035}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Optimistic Outer Extension (Maximum Greenhouse to Early Mars) */}
      {outerOptScene > outerConsScene && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[outerConsScene, outerOptScene, SEGMENTS]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.035}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Crisp Boundary Ring Lines */}
      <primitive object={boundaryRings.innerOpt} />
      <primitive object={boundaryRings.innerCons} />
      <primitive object={boundaryRings.outerCons} />
      <primitive object={boundaryRings.outerOpt} />
    </group>
  );
}
