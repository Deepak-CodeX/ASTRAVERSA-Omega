/**
 * ASTRAVERSA Ω — Orbit Renderer
 *
 * Renders the orbital path of a planet or moon as an accurate Keplerian ellipse
 * or circular reference ring.
 *
 * Mathematically derived from the simulation's orbital elements and state vectors:
 * - Solves Keplerian trail points using computeOrbitTrailPoints() relative to parent focus.
 * - Supports eccentric orbits (0 <= e < 0.99) and 3D inclination.
 * - Parent-relative coordinate frame: orbits are centered on parent body via group transform.
 * - Restrained visual treatment ensuring orbital lines do not visually overpower planets.
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop } from 'three';
import { useFrame } from '@react-three/fiber';
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
  const groupRef = useRef<Group>(null);
  const isMoon = body.type === CelestialBodyType.MOON;
  const orbitalRadius = body.planetProperties?.orbitalRadius ?? body.moonProperties?.orbitalRadius;

  // Track parent body position per-frame (essential for moons orbiting moving planets)
  useFrame(() => {
    if (groupRef.current && parentBody) {
      const px = (parentBody.position.x / AU) * RENDER_SCALE_AU;
      const py = (parentBody.position.y / AU) * RENDER_SCALE_AU;
      const pz = (parentBody.position.z / AU) * RENDER_SCALE_AU;
      groupRef.current.position.set(px, py, pz);
    }
  });

  const lineLoop = useMemo(() => {
    if (!orbitalRadius && !body.planetProperties && !body.moonProperties) {
      return null;
    }

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

    // If valid bound elliptical elements exist (0 <= e < 0.99 and a > 0), render true Keplerian curve
    if (elements && elements.eccentricity >= 0 && elements.eccentricity < 0.99 && elements.semiMajorAxis > 0) {
      const mu = G * ((parentMass > 0 ? parentMass : 1.989e30) + body.mass);
      const trailPoints = computeOrbitTrailPoints(elements, mu, ORBIT_SEGMENTS);

      for (const p of trailPoints) {
        const sceneX = (p.x / AU) * RENDER_SCALE_AU;
        const sceneY = (p.y / AU) * RENDER_SCALE_AU;
        const sceneZ = (p.z / AU) * RENDER_SCALE_AU;
        points.push(sceneX, sceneY, sceneZ);
      }
    } else if (orbitalRadius && orbitalRadius > 0) {
      // Safe fallback: planar circular ring relative to parent origin
      const sceneRadius = (orbitalRadius / AU) * RENDER_SCALE_AU;

      for (let i = 0; i < ORBIT_SEGMENTS; i++) {
        const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
        points.push(
          Math.cos(angle) * sceneRadius,
          0,
          Math.sin(angle) * sceneRadius
        );
      }
    } else {
      return null;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(points, 3));

    // Refined restrained color palette: subtle astronomical guides that do not compete with bodies
    const color = isMoon
      ? (isSelected ? '#c084fc' : '#6366f1')
      : (isSelected ? '#38bdf8' : '#334466');

    const opacity = isMoon
      ? (isSelected ? 0.75 : 0.18)
      : (isSelected ? 0.80 : 0.16);

    const mat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    return new LineLoop(geom, mat);
  }, [
    body.mass,
    body.planetProperties?.orbitalRadius,
    body.moonProperties?.orbitalRadius,
    body.planetProperties?.orbitalElements,
    body.moonProperties?.orbitalElements,
    parentBody?.mass,
    isSelected,
    isMoon,
    orbitalRadius,
  ]);

  if (!lineLoop) return null;

  const initialParentX = ((parentBody?.position.x ?? 0) / AU) * RENDER_SCALE_AU;
  const initialParentY = ((parentBody?.position.y ?? 0) / AU) * RENDER_SCALE_AU;
  const initialParentZ = ((parentBody?.position.z ?? 0) / AU) * RENDER_SCALE_AU;

  return (
    <group ref={groupRef} position={[initialParentX, initialParentY, initialParentZ]}>
      <primitive object={lineLoop} />
    </group>
  );
}
