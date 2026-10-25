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
import { CelestialBodyRenderer } from './CelestialBodyRenderer';
import { HabitableZoneRenderer } from './HabitableZoneRenderer';
import { type CelestialBody, CelestialBodyType } from '../universe/CelestialBody';
import type { SimulationEngine } from '../engine/SimulationEngine';

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

  // Update simulation each frame
  useFrame((state) => {
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
  });

  const star = bodies.find((b) => b.type === CelestialBodyType.STAR);

  return (
    <>
      {/* Ambient light for minimum visibility */}
      <ambientLight intensity={0.05} />

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

      {/* Camera controls */}
      <OrbitControls
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
