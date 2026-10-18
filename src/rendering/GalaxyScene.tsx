/**
 * ASTRAVERSA Ω — Galaxy Scene
 *
 * Main 3D scene for galaxy-scale viewing.
 * Provides cosmic environment, camera controls, background starfield,
 * cinematic camera waypoint transitions, and live telemetry tracking.
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Galaxy } from '../universe/Galaxy';
import { GalaxyRenderer, DEFAULT_LAYER_VISIBILITY, type GalaxyLayerVisibility } from './GalaxyRenderer';
import {
  type GalaxyObservatorySettings,
  DEFAULT_OBSERVATORY_SETTINGS,
} from './GalaxyObservatoryTypes';
import { RENDER_SCALE_KPC } from '../astronomy/constants';
import { SeededRandom } from '../universe/SeededRandom';

export type CameraPreset = 'overview' | 'topDown' | 'nucleus' | 'bar' | 'core' | 'arm' | 'edge' | 'cluster' | 'jets';

export interface GalaxyTelemetry {
  distanceKpc: number;
  speedKms: number;
  fps: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Cosmic Background Starfield
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BG_STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aTwinkleSpeed;
  attribute float aTwinkleOffset;

  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float twinkle = 0.70 + 0.30 * sin(uTime * aTwinkleSpeed + aTwinkleOffset);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * twinkle, 1.0, 16.0);
    vAlpha = 0.85 * twinkle;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const BG_STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float core = smoothstep(0.48, 0.0, dist);
    float halo = exp(-dist * 5.8) * 0.45;
    float a = (core + halo) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

function CosmicBackgroundStarfield({ time }: { time: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const { geometry, material } = useMemo(() => {
    // Fixed deterministic seed for cosmic skybox, completely independent of galaxy seed
    const rng = new SeededRandom(987654321);
    const count = 9000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Placed far beyond the 500,000 ly galaxy (radius 22,000 - 48,000 scene units)
      const r = 22000 + Math.pow(rng.next(), 0.5) * 26000;
      const th = rng.range(0, Math.PI * 2);
      const ph = Math.acos(2 * rng.next() - 1);

      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.cos(ph) * 0.85;
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);

      // Stellar spectral classes OBAFGKM
      const roll = rng.next();
      if (roll < 0.18) {
        // Hot blue O/B
        colors[i * 3] = 0.65; colors[i * 3 + 1] = 0.80; colors[i * 3 + 2] = 1.0;
        sizes[i] = rng.range(1.6, 3.4);
      } else if (roll < 0.45) {
        // Pure white A/F
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.97; colors[i * 3 + 2] = 1.0;
        sizes[i] = rng.range(1.2, 2.4);
      } else if (roll < 0.75) {
        // Solar golden G/K
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 0.68;
        sizes[i] = rng.range(1.1, 2.2);
      } else {
        // Cool red M
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.60; colors[i * 3 + 2] = 0.42;
        sizes[i] = rng.range(1.0, 1.8);
      }

      speeds[i] = rng.range(0.8, 2.5);
      offsets[i] = rng.range(0, Math.PI * 2);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(speeds, 1));
    geom.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(offsets, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: BG_STAR_VERTEX_SHADER,
      fragmentShader: BG_STAR_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, []);

  useFrame((_, delta) => {
    // Camera-relative positioning: center deep background sphere on camera so it covers entire viewport
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
      // Smooth, subtle apparent cosmic rotation
      groupRef.current.rotation.y += delta * 0.0018;
      groupRef.current.rotation.x += delta * 0.0006;
    }
    if (material && material.uniforms) {
      material.uniforms.uTime.value = time;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Scene Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxySceneContentProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  selectedNucleus?: boolean;
  onStarClick: (index: number) => void;
  onNucleusClick?: () => void;
  onBackgroundClick: () => void;
  layers?: GalaxyLayerVisibility;
  settings?: GalaxyObservatorySettings;
  activePreset?: CameraPreset | null;
  onPresetComplete?: () => void;
  onTelemetryUpdate?: (telemetry: GalaxyTelemetry) => void;
}

function GalaxySceneContent({
  galaxy,
  selectedStarIndex,
  selectedNucleus = false,
  onStarClick,
  onNucleusClick,
  onBackgroundClick: _onBackgroundClick,
  layers = DEFAULT_LAYER_VISIBILITY,
  settings = DEFAULT_OBSERVATORY_SETTINGS,
  activePreset = null,
  onPresetComplete,
  onTelemetryUpdate,
}: GalaxySceneContentProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Animation & transition state
  const isTransitioningRef = useRef<boolean>(false);
  const transitionT = useRef<number>(1);
  const startPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const startTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetTarget = useRef<THREE.Vector3>(new THREE.Vector3());

  // Performance telemetry
  const fpsFrames = useRef<number>(0);
  const fpsTime = useRef<number>(0);
  const [simTime, setSimTime] = useState<number>(0);

  // Dynamically update camera FOV from observatory settings
  useEffect(() => {
    if (settings.cameraFov && (camera as THREE.PerspectiveCamera).fov !== settings.cameraFov) {
      (camera as THREE.PerspectiveCamera).fov = settings.cameraFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, settings.cameraFov]);

  // Adjust camera distance along current view axis when distance multiplier changes
  const prevDistMul = useRef(settings.cameraDistanceMultiplier);
  useEffect(() => {
    const newDistMul = settings.cameraDistanceMultiplier;
    if (controlsRef.current && prevDistMul.current !== newDistMul && prevDistMul.current > 0) {
      const ratio = newDistMul / prevDistMul.current;
      const target = controlsRef.current.target;
      const offset = camera.position.clone().sub(target);
      offset.multiplyScalar(ratio);
      camera.position.copy(target).add(offset);
      controlsRef.current.update();
    }
    prevDistMul.current = newDistMul;
  }, [camera, settings.cameraDistanceMultiplier]);

  // Helper to compute preset positions
  const getPresetVectors = (preset: CameraPreset): { pos: THREE.Vector3; target: THREE.Vector3 } => {
    const R = galaxy.radius * RENDER_SCALE_KPC;
    const distMul = settings.cameraDistanceMultiplier;
    let basePos: THREE.Vector3;
    let baseTarget = new THREE.Vector3(0, 0, 0);

    switch (preset) {
      case 'overview':
        basePos = new THREE.Vector3(R * 0.45, R * 0.95, R * 0.75);
        break;
      case 'topDown':
        basePos = new THREE.Vector3(0, R * 1.55, R * 0.04);
        break;
      case 'nucleus':
        basePos = new THREE.Vector3(R * 0.022, R * 0.012, R * 0.028);
        break;
      case 'bar': {
        const phi = galaxy.bar?.angle ?? 0.4886;
        basePos = new THREE.Vector3(R * 0.28 * Math.cos(phi - 0.5), R * 0.16, R * 0.28 * Math.sin(phi - 0.5));
        break;
      }
      case 'core':
        basePos = new THREE.Vector3(R * 0.16, R * 0.10, R * 0.20);
        break;
      case 'arm':
        basePos = new THREE.Vector3(R * 0.65, R * 0.15, R * 0.35);
        baseTarget = new THREE.Vector3(R * 0.40, 0, R * 0.15);
        break;
      case 'edge':
        basePos = new THREE.Vector3(R * 1.35, R * 0.02, 0);
        break;
      case 'jets':
        basePos = new THREE.Vector3(R * 0.90, R * 0.45, R * 0.90);
        break;
      case 'cluster':
        if (galaxy.clusters.length > 0) {
          const c = galaxy.clusters[0];
          basePos = new THREE.Vector3(c.x * RENDER_SCALE_KPC + 18, c.y * RENDER_SCALE_KPC + 10, c.z * RENDER_SCALE_KPC + 18);
          baseTarget = new THREE.Vector3(c.x * RENDER_SCALE_KPC, c.y * RENDER_SCALE_KPC, c.z * RENDER_SCALE_KPC);
        } else {
          basePos = new THREE.Vector3(R * 0.45, R * 0.95, R * 0.75);
        }
        break;
    }

    basePos.multiplyScalar(distMul);
    return { pos: basePos, target: baseTarget };
  };

  // Initial camera placement on load
  useEffect(() => {
    const { pos, target } = getPresetVectors('overview');
    camera.position.copy(pos);
    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [galaxy, camera]);

  // Handle preset trigger
  useEffect(() => {
    if (!activePreset || !controlsRef.current) return;

    const { pos, target } = getPresetVectors(activePreset);
    startPos.current.copy(camera.position);
    targetPos.current.copy(pos);
    startTarget.current.copy(controlsRef.current.target);
    targetTarget.current.copy(target);

    transitionT.current = 0;
    isTransitioningRef.current = true;
  }, [activePreset, camera, galaxy]);

  // Main animation frame loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!settings.isPaused) {
      setSimTime(t => t + dt * settings.timeSpeed);
    }

    // Camera preset cubic ease-out interpolation
    if (isTransitioningRef.current && controlsRef.current) {
      controlsRef.current.autoRotate = false;
      if (controlsRef.current.sphericalDelta) {
        controlsRef.current.sphericalDelta.set(0, 0, 0);
      }
      transitionT.current = Math.min(1.0, transitionT.current + dt * 0.85);
      // Cubic ease-out curve
      const k = 1 - Math.pow(1 - transitionT.current, 3);

      camera.position.lerpVectors(startPos.current, targetPos.current, k);
      controlsRef.current.target.lerpVectors(startTarget.current, targetTarget.current, k);
      controlsRef.current.update();

      if (transitionT.current >= 1.0) {
        camera.position.copy(targetPos.current);
        controlsRef.current.target.copy(targetTarget.current);
        controlsRef.current.update();
        isTransitioningRef.current = false;
        onPresetComplete?.();
      }
    }

    // Auto-rotate when idle on overview and no specific target is inspected
    if (
      controlsRef.current &&
      selectedStarIndex === null &&
      !selectedNucleus &&
      !isTransitioningRef.current &&
      (activePreset === null || activePreset === 'overview')
    ) {
      controlsRef.current.autoRotate = !settings.isPaused;
      controlsRef.current.autoRotateSpeed = 0.08 * settings.visualRotationSpeed;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }

    // Telemetry computation (FPS & distance)
    fpsFrames.current++;
    fpsTime.current += dt;
    if (fpsTime.current >= 0.5) {
      const calculatedFps = Math.round(fpsFrames.current / fpsTime.current);
      fpsFrames.current = 0;
      fpsTime.current = 0;

      const distKpc = camera.position.length() / RENDER_SCALE_KPC;
      // Flat rotation curve estimate: v(r) ~ 220 * sqrt(r / (r + 1.2))
      const speedKms = Math.round(220 * Math.sqrt(distKpc / (distKpc + 1.2)));

      onTelemetryUpdate?.({
        distanceKpc: distKpc,
        speedKms,
        fps: calculatedFps,
      });
    }
  });

  return (
    <>
      {/* Deep space background stars — camera-relative cosmic sphere */}
      <CosmicBackgroundStarfield time={simTime} />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={galaxy.radius * RENDER_SCALE_KPC * 3.5}
        zoomSpeed={0.7}
        rotateSpeed={0.45}
        panSpeed={0.5}
        enableDamping
        dampingFactor={0.06}
        makeDefault
      />

      {/* Layered Galaxy Rendering */}
      <GalaxyRenderer
        galaxy={galaxy}
        selectedStarIndex={selectedStarIndex}
        selectedNucleus={selectedNucleus}
        onStarClick={onStarClick}
        onNucleusClick={onNucleusClick}
        layers={layers}
        settings={settings}
        time={simTime}
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
  selectedNucleus?: boolean;
  onStarClick: (index: number) => void;
  onNucleusClick?: () => void;
  onBackgroundClick: () => void;
  layers?: GalaxyLayerVisibility;
  settings?: GalaxyObservatorySettings;
  activePreset?: CameraPreset | null;
  onPresetComplete?: () => void;
  onTelemetryUpdate?: (telemetry: GalaxyTelemetry) => void;
}

export function GalaxyScene({
  galaxy,
  selectedStarIndex,
  selectedNucleus,
  onStarClick,
  onNucleusClick,
  onBackgroundClick,
  layers,
  settings,
  activePreset,
  onPresetComplete,
  onTelemetryUpdate,
}: GalaxySceneProps) {
  return (
    <Canvas
      camera={{
        position: [200, 450, 350],
        fov: settings?.cameraFov ?? 52,
        near: 0.1,
        far: 60000,
      }}
      style={{ background: '#000004' }}
      onPointerMissed={onBackgroundClick}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <GalaxySceneContent
        galaxy={galaxy}
        selectedStarIndex={selectedStarIndex}
        selectedNucleus={selectedNucleus}
        onStarClick={onStarClick}
        onNucleusClick={onNucleusClick}
        onBackgroundClick={onBackgroundClick}
        layers={layers}
        settings={settings}
        activePreset={activePreset}
        onPresetComplete={onPresetComplete}
        onTelemetryUpdate={onTelemetryUpdate}
      />
    </Canvas>
  );
}
