/**
 * ASTRAVERSA Ω — Main 3D Scene
 *
 * Sets up the React Three Fiber canvas with:
 * - Dark cosmic background
 * - Star field backdrop
 * - Camera with orbit controls
 * - Ambient lighting
 * - Renders all celestial bodies
 *
 * The scene reads simulation state each frame and updates visual positions.
 * It does NOT perform simulation logic.
 */

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CelestialBodyRenderer } from './CelestialBodyRenderer';
import { HabitableZoneRenderer } from './HabitableZoneRenderer';
import { type CelestialBody, CelestialBodyType } from '../universe/CelestialBody';
import type { SimulationEngine } from '../engine/SimulationEngine';
import { AU, RENDER_SCALE_AU } from '../astronomy/constants';

interface SceneContentProps {
  engine: SimulationEngine;
  bodies: CelestialBody[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Inner scene content — must be inside the Canvas.
 */
function SceneContent({ engine, bodies, selectedId, onSelect }: SceneContentProps) {
  const lastTimeRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Update simulation each frame
  useFrame((state, deltaSec) => {
    const now = state.clock.getElapsedTime() * 1000; // ms
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = now;
      return;
    }

    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Cap wall delta to prevent huge jumps on tab switch
    const cappedDelta = Math.min(delta, 100);
    engine.update(cappedDelta);

    // Smooth camera target tracking towards selected body or back to center
    if (controlsRef.current) {
      if (selectedId) {
        const selectedBody = bodies.find((b) => b.id === selectedId);
        if (selectedBody) {
          const targetX = (selectedBody.position.x / AU) * RENDER_SCALE_AU;
          const targetY = (selectedBody.position.y / AU) * RENDER_SCALE_AU;
          const targetZ = (selectedBody.position.z / AU) * RENDER_SCALE_AU;
          const lerpFactor = Math.min(1, deltaSec * 3.5);
          controlsRef.current.target.x += (targetX - controlsRef.current.target.x) * lerpFactor;
          controlsRef.current.target.y += (targetY - controlsRef.current.target.y) * lerpFactor;
          controlsRef.current.target.z += (targetZ - controlsRef.current.target.z) * lerpFactor;
          controlsRef.current.update();
        }
      } else if (
        Math.abs(controlsRef.current.target.x) > 0.001 ||
        Math.abs(controlsRef.current.target.y) > 0.001 ||
        Math.abs(controlsRef.current.target.z) > 0.001
      ) {
        const lerpFactor = Math.min(1, deltaSec * 2.0);
        controlsRef.current.target.x += (0 - controlsRef.current.target.x) * lerpFactor;
        controlsRef.current.target.y += (0 - controlsRef.current.target.y) * lerpFactor;
        controlsRef.current.target.z += (0 - controlsRef.current.target.z) * lerpFactor;
        controlsRef.current.update();
      }
    }
  });

  const star = bodies.find((b) => b.type === CelestialBodyType.STAR);

  return (
    <>
      {/* Ambient light for minimum visibility */}
      <ambientLight intensity={0.12} />

      {/* Background star field */}
      <Stars
        radius={300}
        depth={60}
        count={5000}
        factor={4}
        saturation={0.1}
        fade
        speed={0}
      />

      {/* Camera controls with selection tracking */}
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={1}
        maxDistance={200}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        makeDefault
      />

      {/* Circumstellar Habitable Zone overlay (Mission P1-A) */}
      {star && <HabitableZoneRenderer star={star} />}

      {/* Render all celestial bodies */}
      {bodies.map((body) => {
        const parentBody = body.parentId
          ? bodies.find((b) => b.id === body.parentId)
          : undefined;
        return (
          <CelestialBodyRenderer
            key={body.id}
            body={body}
            isSelected={body.id === selectedId}
            onClick={() => onSelect(body.id)}
            parentBody={parentBody}
          />
        );
      })}
    </>
  );
}

interface SceneProps {
  engine: SimulationEngine;
  bodies: CelestialBody[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Main 3D scene component.
 */
export function Scene({ engine, bodies, selectedId, onSelect }: SceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 30, 50],
        fov: 60,
        near: 0.01,
        far: 10000,
      }}
      style={{ background: '#000008' }}
      onClick={() => onSelect(null)}
    >
      <SceneContent
        engine={engine}
        bodies={bodies}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
