/**
 * ASTRAVERSA Ω — Orbit Renderer
 *
 * Renders the orbital path of a planet as a translucent ring in the XZ plane.
 * Uses the orbital radius from the planet's properties.
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop } from 'three';
import type { CelestialBody } from '../universe/CelestialBody';
import { RENDER_SCALE_AU, AU } from '../astronomy/constants';

interface OrbitRendererProps {
  body: CelestialBody;
  isSelected: boolean;
}

const ORBIT_SEGMENTS = 128;

export function OrbitRenderer({ body, isSelected }: OrbitRendererProps) {
  const orbitalRadius = body.planetProperties?.orbitalRadius;

  const lineLoop = useMemo(() => {
    if (!orbitalRadius) return null;

    const sceneRadius = (orbitalRadius / AU) * RENDER_SCALE_AU;
    const points: number[] = [];

    for (let i = 0; i < ORBIT_SEGMENTS; i++) {
      const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      points.push(
        Math.cos(angle) * sceneRadius,
        0,
        Math.sin(angle) * sceneRadius
      );
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(points, 3));

    const mat = new LineBasicMaterial({
      color: isSelected ? '#00ffff' : '#334466',
      transparent: true,
      opacity: isSelected ? 0.6 : 0.25,
    });

    return new LineLoop(geom, mat);
  }, [orbitalRadius, isSelected]);

  if (!lineLoop) return null;

  return <primitive object={lineLoop} />;
}
