/**
 * ASTRAVERSA Ω — Orbit Renderer
 *
 * Renders the orbital path of a planet or moon as an accurate Keplerian ellipse
 * or circular reference ring.
 *
 * Mathematically derived from the simulation's orbital elements and state vectors:
 * - Solves Keplerian trail points using computeOrbitTrailPoints() in the simulation frame.
 * - Supports eccentric orbits (e > 0) and 3D inclination.
 * - Centers the orbit on the parent body (star for planets, planet for moons).
 * - Fallbacks safely to circular ring if elements are unavailable or degenerate.
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop } from 'three';
import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType } from '../universe/CelestialBody';
import { RENDER_SCALE_AU, AU, G } from '../astronomy/constants';
import {
  computeOrbitTrailPoints,
  cartesianToOrbital,
  type OrbitalElements,
} from '../physics/orbitalElements';

interface OrbitRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  parentBody?: CelestialBody;
}

const ORBIT_SEGMENTS = 128;

export function OrbitRenderer({ body, isSelected, parentBody }: OrbitRendererProps) {
  const isMoon = body.type === CelestialBodyType.MOON;
  const orbitalRadius = body.planetProperties?.orbitalRadius ?? body.moonProperties?.orbitalRadius;

  const lineLoop = useMemo(() => {
    if (!orbitalRadius && !body.planetProperties && !body.moonProperties) {
      return null;
    }

    const parentPos = parentBody?.position ?? { x: 0, y: 0, z: 0 };
    const parentMass = parentBody?.mass ?? 0;
    const points: number[] = [];

    // Attempt to obtain or compute Keplerian elements
    let elements: OrbitalElements | null =
      body.planetProperties?.orbitalElements ?? body.moonProperties?.orbitalElements ?? null;

    if (!elements && parentBody && parentMass > 0) {
      const relPos = body.position.subtract(parentBody.position);
      const relVel = body.velocity.subtract(parentBody.velocity);
      const mu = G * (parentMass + body.mass);
      elements = cartesianToOrbital(relPos, relVel, mu);
    }

    // If valid bound elliptical elements exist (0 <= e < 1 and a > 0), render true Keplerian curve
    if (elements && elements.eccentricity >= 0 && elements.eccentricity < 0.99 && elements.semiMajorAxis > 0) {
      const mu = G * ((parentMass > 0 ? parentMass : 1.989e30) + body.mass);
      const trailPoints = computeOrbitTrailPoints(elements, mu, ORBIT_SEGMENTS);

      for (const p of trailPoints) {
        const sceneX = ((parentPos.x + p.x) / AU) * RENDER_SCALE_AU;
        const sceneY = ((parentPos.y + p.y) / AU) * RENDER_SCALE_AU;
        const sceneZ = ((parentPos.z + p.z) / AU) * RENDER_SCALE_AU;
        points.push(sceneX, sceneY, sceneZ);
      }
    } else if (orbitalRadius && orbitalRadius > 0) {
      // Safe fallback: planar circular ring centered on parent
      const sceneRadius = (orbitalRadius / AU) * RENDER_SCALE_AU;
      const parentSceneX = (parentPos.x / AU) * RENDER_SCALE_AU;
      const parentSceneY = (parentPos.y / AU) * RENDER_SCALE_AU;
      const parentSceneZ = (parentPos.z / AU) * RENDER_SCALE_AU;

      for (let i = 0; i < ORBIT_SEGMENTS; i++) {
        const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
        points.push(
          parentSceneX + Math.cos(angle) * sceneRadius,
          parentSceneY,
          parentSceneZ + Math.sin(angle) * sceneRadius
        );
      }
    } else {
      return null;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(points, 3));

    const color = isMoon
      ? (isSelected ? '#c084fc' : '#4f46e5')
      : (isSelected ? '#38bdf8' : '#334466');

    const opacity = isMoon
      ? (isSelected ? 0.75 : 0.3)
      : (isSelected ? 0.8 : 0.28);

    const mat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    return new LineLoop(geom, mat);
  }, [
    body.position.x,
    body.position.y,
    body.position.z,
    body.velocity.x,
    body.velocity.y,
    body.velocity.z,
    body.mass,
    body.planetProperties?.orbitalRadius,
    body.moonProperties?.orbitalRadius,
    body.planetProperties?.orbitalElements,
    body.moonProperties?.orbitalElements,
    parentBody?.position.x,
    parentBody?.position.y,
    parentBody?.position.z,
    parentBody?.mass,
    isSelected,
    isMoon,
    orbitalRadius,
  ]);

  if (!lineLoop) return null;

  return <primitive object={lineLoop} />;
}
