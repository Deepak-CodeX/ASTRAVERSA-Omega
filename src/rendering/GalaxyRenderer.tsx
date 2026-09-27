/**
 * ASTRAVERSA Ω — Galaxy Renderer
 *
 * Renders the entire galaxy using efficient GPU techniques:
 * - Points geometry for stars (single draw call for all stars)
 * - Custom shader for temperature-based coloring and size
 * - Galactic core glow effect
 * - Dust/nebula approximation via additive particles
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Galaxy, GalaxyStar } from '../universe/Galaxy';
import { RENDER_SCALE_KPC } from '../astronomy/constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aLuminosity;

  varying vec3 vColor;
  varying float vLuminosity;

  void main() {
    vColor = aColor;
    vLuminosity = aLuminosity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    // Scale point size: larger stars remain bigger, but all attenuate with distance
    float baseSize = aSize;
    float attenuation = 300.0 / max(dist, 1.0);
    gl_PointSize = baseSize * attenuation;

    // Clamp so stars don't vanish or explode
    gl_PointSize = clamp(gl_PointSize, 0.5, 24.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vLuminosity;

  void main() {
    // Circular falloff from center of point sprite
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Discard outside circle
    if (dist > 0.5) discard;

    // Soft glow falloff
    float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
    intensity *= intensity; // Quadratic falloff for softer glow

    // Brightness from luminosity
    float brightness = 0.4 + 0.6 * min(vLuminosity, 3.0) / 3.0;

    vec3 finalColor = vColor * brightness * intensity;

    // Add slight bloom to brighter stars
    float bloom = max(0.0, vLuminosity - 1.0) * 0.15 * intensity;
    finalColor += vec3(bloom);

    gl_FragColor = vec4(finalColor, intensity * brightness);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dust/Nebula Shaders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DUST_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    vOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);
    gl_PointSize = aSize * 800.0 / max(dist, 1.0);
    gl_PointSize = clamp(gl_PointSize, 2.0, 80.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
    intensity = intensity * intensity * intensity; // Very soft falloff

    gl_FragColor = vec4(vColor, intensity * vOpacity);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper: Parse CSS color to RGB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Star Field
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyStarFieldProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  onStarClick: (index: number) => void;
}

/**
 * Renders all galaxy stars as a single Points geometry.
 * Uses custom ShaderMaterial for temperature-based coloring.
 */
function GalaxyStarField({ galaxy, onStarClick }: GalaxyStarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const { camera } = useThree();

  // Build the geometry buffers once from galaxy data
  const { geometry, material } = useMemo(() => {
    const stars = galaxy.stars;
    const count = stars.length;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const luminosities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const star = stars[i];

      // Convert galactic kpc to scene units
      positions[i * 3] = star.x * RENDER_SCALE_KPC;
      positions[i * 3 + 1] = star.y * RENDER_SCALE_KPC;
      positions[i * 3 + 2] = star.z * RENDER_SCALE_KPC;

      const [r, g, b] = hexToRgb(star.color);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Size based on stellar properties
      const baseSizeFactor = 0.5 + Math.log2(Math.max(star.radiusSolar, 0.1)) * 0.3;
      sizes[i] = Math.max(0.3, Math.min(3.0, baseSizeFactor));

      // Luminosity for brightness
      luminosities[i] = Math.min(5, Math.log10(Math.max(star.luminositySolar, 0.01)) + 1.5);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aLuminosity', new THREE.BufferAttribute(luminosities, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy]);

  // Set up raycaster threshold for star picking
  raycasterRef.current.params.Points = { threshold: 1.5 };

  // Handle pointer for star selection via manual raycasting
  const handlePointerDown = useCallback((e: { nativeEvent: PointerEvent }) => {
    if (!pointsRef.current) return;

    const domEvent = e.nativeEvent;
    const canvas = domEvent.target as HTMLCanvasElement;
    if (!canvas || !canvas.getBoundingClientRect) return;

    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((domEvent.clientX - rect.left) / rect.width) * 2 - 1,
      -((domEvent.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(pointer, camera);
    const intersects = raycasterRef.current.intersectObject(pointsRef.current);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      onStarClick(intersects[0].index);
    }
  }, [camera, onStarClick]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onPointerDown={handlePointerDown as any}
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Selection Indicator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StarSelectionProps {
  star: GalaxyStar;
}

function StarSelectionIndicator({ star }: StarSelectionProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 3) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const pos: [number, number, number] = [
    star.x * RENDER_SCALE_KPC,
    star.y * RENDER_SCALE_KPC,
    star.z * RENDER_SCALE_KPC,
  ];

  return (
    <group position={pos}>
      <mesh ref={meshRef}>
        <ringGeometry args={[0.6, 0.75, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Outer glow ring */}
      <mesh>
        <ringGeometry args={[0.75, 1.2, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galactic Core Glow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CoreGlowProps {
  galaxy: Galaxy;
}

function GalacticCoreGlow({ galaxy }: CoreGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.lookAt(state.camera.position);
    }
  });

  const coreRadius = galaxy.radius * galaxy.bulge.radiusFraction * RENDER_SCALE_KPC;

  return (
    <group>
      {/* Inner bright core */}
      <mesh ref={meshRef}>
        <planeGeometry args={[coreRadius * 4, coreRadius * 4]} />
        <meshBasicMaterial
          color="#ffe8c0"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wider subtle glow */}
      <mesh>
        <sphereGeometry args={[coreRadius * 2, 16, 16]} />
        <meshBasicMaterial
          color="#ffd8a0"
          transparent
          opacity={0.04}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Point light at center */}
      <pointLight
        intensity={0.8}
        distance={coreRadius * 10}
        decay={2}
        color="#ffe4c4"
      />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dust / Nebula Approximation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DustFieldProps {
  galaxy: Galaxy;
}

function DustField({ galaxy }: DustFieldProps) {
  const { geometry, material } = useMemo(() => {
    // Create a much smaller set of large, soft particles
    const dustCount = Math.floor(galaxy.stars.length * 0.06);
    const positions = new Float32Array(dustCount * 3);
    const colors = new Float32Array(dustCount * 3);
    const sizes = new Float32Array(dustCount);
    const opacities = new Float32Array(dustCount);

    // Dust colors: warm tones near core, blue-ish in arms
    const dustColors: [number, number, number][] = [
      [0.4, 0.25, 0.15],  // Warm brown
      [0.3, 0.2, 0.35],   // Purple-ish
      [0.15, 0.2, 0.35],  // Cool blue
      [0.35, 0.3, 0.2],   // Amber
      [0.2, 0.15, 0.3],   // Dark violet
    ];

    for (let i = 0; i < dustCount; i++) {
      // Sample positions near existing stars but offset
      const starIndex = Math.floor(i * galaxy.stars.length / dustCount);
      const star = galaxy.stars[starIndex];

      positions[i * 3] = (star.x + (Math.sin(i * 7.3) * 0.5)) * RENDER_SCALE_KPC;
      positions[i * 3 + 1] = (star.y + (Math.cos(i * 5.1) * 0.1)) * RENDER_SCALE_KPC;
      positions[i * 3 + 2] = (star.z + (Math.sin(i * 3.7) * 0.5)) * RENDER_SCALE_KPC;

      // Pick dust color based on position
      const r = Math.sqrt(star.x * star.x + star.z * star.z);
      const colorIndex = Math.floor(r / galaxy.radius * dustColors.length) % dustColors.length;
      const dc = dustColors[colorIndex];
      colors[i * 3] = dc[0];
      colors[i * 3 + 1] = dc[1];
      colors[i * 3 + 2] = dc[2];

      sizes[i] = 1.5 + Math.sin(i * 2.7) * 0.8;

      // Fainter toward edges
      const radialFraction = r / galaxy.radius;
      opacities[i] = Math.max(0.01, 0.06 * (1 - radialFraction));
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy]);

  return <points geometry={geometry} material={material} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Galaxy Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GalaxyRendererProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  onStarClick: (index: number) => void;
}

export function GalaxyRenderer({ galaxy, selectedStarIndex, onStarClick }: GalaxyRendererProps) {
  const selectedStar = selectedStarIndex !== null
    ? galaxy.stars[selectedStarIndex] ?? null
    : null;

  return (
    <group>
      {/* Core glow */}
      <GalacticCoreGlow galaxy={galaxy} />

      {/* Dust / Nebula field */}
      <DustField galaxy={galaxy} />

      {/* Star field */}
      <GalaxyStarField
        galaxy={galaxy}
        selectedStarIndex={selectedStarIndex}
        onStarClick={onStarClick}
      />

      {/* Selection indicator */}
      {selectedStar && <StarSelectionIndicator star={selectedStar} />}

      {/* Ambient light for minimum visibility */}
      <ambientLight intensity={0.03} />
    </group>
  );
}
