/**
 * ASTRAVERSA Ω — Galaxy Scene
 *
 * Main 3D scene for galaxy-scale viewing.
 * Provides cosmic environment, camera controls, and background starfield.
 *
 * Separate from the solar system Scene to allow different camera parameters,
 * scale, and controls appropriate for galactic navigation.
 */

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Galaxy } from '../universe/Galaxy';
import { GalaxyRenderer } from './GalaxyRenderer';
import { RENDER_SCALE_KPC } from '../astronomy/constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Scene Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxySceneContentProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  onStarClick: (index: number) => void;
  onBackgroundClick: () => void;
}

function GalaxySceneContent({
  galaxy,
  selectedStarIndex,
  onStarClick,
  onBackgroundClick: _onBackgroundClick,
}: GalaxySceneContentProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Initial camera position — elevated and angled for cinematic view
  useEffect(() => {
    const viewRadius = galaxy.radius * RENDER_SCALE_KPC;
    camera.position.set(viewRadius * 0.3, viewRadius * 0.8, viewRadius * 1.2);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [galaxy, camera]);

  // Subtle slow rotation when no star is selected (cinematic feel)
  useFrame(() => {
    if (controlsRef.current && selectedStarIndex === null) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.08;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  return (
    <>
      {/* Deep space background stars */}
      <Stars
        radius={600}
        depth={100}
        count={3000}
        factor={3}
        saturation={0.05}
        fade
        speed={0}
      />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={galaxy.radius * RENDER_SCALE_KPC * 3}
        zoomSpeed={0.6}
        rotateSpeed={0.4}
        panSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        makeDefault
      />

      {/* Galaxy rendering */}
      <GalaxyRenderer
        galaxy={galaxy}
        selectedStarIndex={selectedStarIndex}
        onStarClick={onStarClick}
      />
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Scene (Canvas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GalaxySceneProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  onStarClick: (index: number) => void;
  onBackgroundClick: () => void;
}

export function GalaxyScene({
  galaxy,
  selectedStarIndex,
  onStarClick,
  onBackgroundClick,
}: GalaxySceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 200, 400],
        fov: 55,
        near: 0.1,
        far: 50000,
      }}
      style={{ background: '#000004' }}
      onClick={onBackgroundClick}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
    >
      <GalaxySceneContent
        galaxy={galaxy}
        selectedStarIndex={selectedStarIndex}
        onStarClick={onStarClick}
        onBackgroundClick={onBackgroundClick}
      />
    </Canvas>
  );
}
