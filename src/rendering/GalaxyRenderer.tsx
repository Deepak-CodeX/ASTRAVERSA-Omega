/**
 * ASTRAVERSA Ω — Galaxy Renderer
 *
 * Renders the entire procedural galaxy using layered GPU techniques:
 * - Points geometry for stars with custom optical dual-profile shader
 * - Smooth radial core glow shader
 * - Procedural dark dust extinction lanes tracing spiral arms
 * - Stellar cluster field highlighting active star-forming nurseries
 * - 3D diffuse galactic halo population
 * - Temperature-based and population-based spectral coloring
 *
 * This component only handles visualization — no simulation logic.
 */

import { useMemo, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Galaxy, GalaxyStar } from '../universe/Galaxy';
import { RENDER_SCALE_KPC } from '../astronomy/constants';
import { SeededRandom } from '../universe/SeededRandom';
import {
  type GalaxyObservatorySettings,
  DEFAULT_OBSERVATORY_SETTINGS,
} from './GalaxyObservatoryTypes';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layer Visibility Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GalaxyLayerVisibility {
  disk: boolean;
  bar: boolean;
  bulge: boolean;
  dust: boolean;
  clusters: boolean;
  halo: boolean;
  nucleus: boolean;
  jets: boolean;
  accretion: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: GalaxyLayerVisibility = {
  disk: true,
  bar: true,
  bulge: true,
  dust: true,
  clusters: true,
  halo: true,
  nucleus: true,
  jets: false,
  accretion: true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Stellar Field
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aLuminosity;
  attribute float aSeed;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSizeMul;

  varying vec3 vColor;
  varying float vLuminosity;
  varying float vTwinkle;

  void main() {
    vColor = aColor;
    vLuminosity = aLuminosity;

    // Organic twinkle phase based on star seed and luminosity
    float twinkleSpeed = 2.0 + fract(aSeed * 7.1) * 2.0;
    float twinkle = 0.85 + 0.15 * sin(uTime * twinkleSpeed + aSeed * 37.0);
    vTwinkle = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    // Physically-inspired attenuation with distance
    float attenuation = 2400.0 / (dist + 750.0);
    float size = aSize * uSizeMul * uPixelRatio * attenuation * twinkle;

    // Clamp point size so distant stars stay crisp and luminous stars maintain presence
    gl_PointSize = clamp(size, 1.2, 42.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vLuminosity;
  varying float vTwinkle;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Dual-component optical profile:
    // 1. Crisp, concentrated stellar diffraction core
    float core = smoothstep(0.48, 0.0, dist);
    core = core * core * core; // Cubic falloff for ultra-sharp core

    // 2. Exponential airy-disk atmospheric halo
    float halo = exp(-dist * 6.5) * 0.65;

    float intensity = core + halo;

    // Luminous stars saturate towards diamond-white optical center
    float whiteHot = smoothstep(0.18, 0.0, dist) * clamp(vLuminosity * 0.32, 0.0, 0.90);
    vec3 saturatedColor = mix(vColor, vec3(1.0, 1.0, 1.0), whiteHot);

    float alpha = intensity * clamp(vLuminosity * 0.35 + 0.40, 0.35, 1.0);

    if (alpha < 0.02) discard;

    gl_FragColor = vec4(saturatedColor * intensity, alpha);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Dust Extinction Field
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DUST_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;

  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    vOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    float attenuation = 2600.0 / (dist + 800.0);
    gl_PointSize = clamp(aSize * uPixelRatio * attenuation, 2.0, 48.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT_SHADER = `
  uniform float uOpacityMultiplier;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Smooth volumetric filament falloff with dense core
    float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = pow(falloff, 1.6) * vOpacity * uOpacityMultiplier;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Diffuse Galactic Body & Arm Emission
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DIFFUSE_EMISSION_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;

  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    vOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    float attenuation = 2800.0 / (dist + 800.0);
    gl_PointSize = clamp(aSize * uPixelRatio * attenuation, 2.0, 48.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DIFFUSE_EMISSION_FRAGMENT_SHADER = `
  uniform float uOpacityMultiplier;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Ultra-smooth exponential falloff for silky, seamless nebular continuum
    float falloff = exp(-dist * 5.0);
    float alpha = falloff * vOpacity * uOpacityMultiplier;

    if (alpha < 0.005) discard;

    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Galactic Core Glow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CORE_GLOW_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CORE_GLOW_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec2 center = vUv - vec2(0.5);
    float dist = length(center) * 2.0;

    if (dist > 1.0) discard;

    float falloff = 1.0 - smoothstep(0.0, 1.0, dist);
    float intensity = pow(falloff, 2.2);

    gl_FragColor = vec4(uColor, 1.0) * (intensity * uOpacity);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Cluster H II Emission Nebulae
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CLUSTER_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;

  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    vOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    float attenuation = 2200.0 / (dist + 800.0);
    gl_PointSize = clamp(aSize * uPixelRatio * attenuation, 2.0, 68.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CLUSTER_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = pow(falloff, 2.0) * vOpacity;

    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Galactic Halo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HALO_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;

  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    vOpacity = aOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);

    float attenuation = 1800.0 / (dist + 800.0);
    gl_PointSize = clamp(aSize * uPixelRatio * attenuation, 1.0, 24.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const HALO_FRAGMENT_SHADER = `
  uniform float uOpacityMultiplier;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Smooth airy falloff for faint Population II envelope
    float falloff = exp(-dist * 5.2);
    float alpha = falloff * vOpacity * uOpacityMultiplier;

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galaxy Star Field (Disk, Bar, Bulge, & Arms)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalaxyStarFieldProps {
  galaxy: Galaxy;
  time: number;
  layers: GalaxyLayerVisibility;
  onStarClick: (index: number) => void;
  starSizeMultiplier?: number;
}

function GalaxyStarField({
  galaxy,
  time,
  layers,
  onStarClick,
  starSizeMultiplier = 1.0,
}: GalaxyStarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const { camera } = useThree();

  const { geometry, material } = useMemo(() => {
    const stars = galaxy.stars;
    const count = stars.length;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const luminosities = new Float32Array(count);
    const seeds = new Float32Array(count);

    const isBarred = galaxy.bar !== undefined;
    const bulgeCount = isBarred ? Math.floor(count * 0.10) : Math.floor(count * 0.15);
    const barCount = isBarred ? Math.floor(count * 0.16) : 0;
    const armCount = isBarred ? Math.floor(count * 0.54) : Math.floor(count * 0.60);

    for (let i = 0; i < count; i++) {
      const star = stars[i];

      // Convert galactic kpc to scene units
      positions[i * 3] = star.x * RENDER_SCALE_KPC;
      positions[i * 3 + 1] = star.y * RENDER_SCALE_KPC;
      positions[i * 3 + 2] = star.z * RENDER_SCALE_KPC;

      const isBulge = i < bulgeCount;
      const isBar = isBarred && i >= bulgeCount && i < bulgeCount + barCount;
      const isArm = i >= bulgeCount + barCount && i < bulgeCount + barCount + armCount;
      const isField = i >= bulgeCount + barCount + armCount;
      const inCluster = star.clusterIndex >= 0;

      // Layer visibility suppression
      const visible =
        (isBulge && layers.bulge) ||
        (isBar && layers.bar) ||
        (isArm && layers.disk) ||
        (isField && layers.disk);

      let r = 1.0;
      let g = 1.0;
      let b = 1.0;
      let baseSize = 1.0;
      let lum = Math.min(6.0, Math.log10(Math.max(star.luminositySolar, 0.01)) + 1.8);

      // Deterministic stochastic factor from star seed
      const starRand = (star.seed % 1000) / 1000.0;

      if (!visible) {
        baseSize = 0.0;
        lum = 0.0;
      } else if (isBulge) {
        // Mature Population II stars: dense warm golden / amber core
        r = 1.0;
        g = 0.82 + starRand * 0.12;
        b = 0.52 + starRand * 0.22;
        baseSize = 1.2 + starRand * 1.0;
        lum += 0.8;
      } else if (isBar) {
        // Triaxial Stellar Bar: mature Population II / intermediate old disk stars
        // Warmer golden-amber hue, moderate density concentration
        r = 1.0;
        g = 0.86 + starRand * 0.08;
        b = 0.55 + starRand * 0.18;
        baseSize = 1.15 + starRand * 0.95;
        lum += 0.7;
      } else if (isArm) {
        // Density wave star formation: massive young OB associations define arm ridges
        const isOB = starRand < 0.38 || star.spectralClass === 'O' || star.spectralClass === 'B' || star.spectralClass === 'A';
        if (isOB) {
          // Radiant diamond blue-white OB complexes
          r = 0.72 + starRand * 0.12;
          g = 0.84 + starRand * 0.10;
          b = 1.0;
          baseSize = 2.4 + starRand * 1.8;
          lum += 1.6;
        } else {
          // Intermediate population along spiral arms
          r = 1.0;
          g = 0.90 + starRand * 0.08;
          b = 0.76 + starRand * 0.18;
          baseSize = 1.1 + starRand * 0.9;
          lum += 0.5;
        }
      } else if (isField) {
        // Inter-arm field stars: quieter, mature disk population
        r = 1.0;
        g = 0.78 + starRand * 0.14;
        b = 0.50 + starRand * 0.20;
        baseSize = 0.75 + starRand * 0.65;
        lum = Math.min(2.2, lum);
      }

      if (inCluster && visible) {
        // Star nurseries pop out as luminous radiant knots
        r = 0.76;
        g = 0.88;
        b = 1.0;
        baseSize = Math.max(baseSize, 2.8 + starRand * 1.6);
        lum += 1.8;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      sizes[i] = Math.max(0.0, Math.min(5.2, baseSize));
      luminosities[i] = lum;
      seeds[i] = (star.seed % 10000) / 10000.0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aLuminosity', new THREE.BufferAttribute(luminosities, 1));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        uSizeMul: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy, layers.disk, layers.bar, layers.bulge]);

  // Update time and size uniforms
  useFrame(() => {
    if (material && material.uniforms) {
      material.uniforms.uTime.value = time;
      if (material.uniforms.uSizeMul) {
        material.uniforms.uSizeMul.value = starSizeMultiplier;
      }
    }
  });

  // Set up raycaster threshold for star picking
  raycasterRef.current.params.Points = { threshold: 1.5 };

  // Handle pointer for star selection via manual raycasting
  const handlePointerDown = useCallback((e: any) => {
    if (!pointsRef.current) return;

    const domEvent = e.nativeEvent || e;
    const canvas = (domEvent.target as HTMLCanvasElement) || e.gl?.domElement;
    if (!canvas || !canvas.getBoundingClientRect) return;

    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((domEvent.clientX - rect.left) / rect.width) * 2 - 1,
      -((domEvent.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(pointer, camera);
    const intersects = raycasterRef.current.intersectObject(pointsRef.current);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      e.stopPropagation?.();
      onStarClick(intersects[0].index);
    }
  }, [camera, onStarClick]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (e.index !== undefined) {
          e.stopPropagation();
          onStarClick(e.index);
        }
      }}
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dark Dust Extinction Lanes (Tracing Spiral Arms & Bar Shocks)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DustFieldProps {
  galaxy: Galaxy;
  dustCount?: number;
  dustCoverage?: number;
  opacityMultiplier?: number;
}

function DustField({
  galaxy,
  dustCount = 4800,
  dustCoverage = 1.0,
  opacityMultiplier = 1.0,
}: DustFieldProps) {
  const { geometry, material } = useMemo(() => {
    const rng = new SeededRandom(galaxy.seed + 777);
    const armDefs = galaxy.spiralArmDefinitions;
    const armCount = armDefs && armDefs.length > 0 ? armDefs.length : galaxy.spiralArms.armCount;
    const windingFactor = galaxy.spiralArms.windingFactor;
    const galaxyRadius = galaxy.radius;
    const bar = galaxy.bar;

    // Configurable dark dust tracers tracing spiral arm compression and bar shocks
    const actualDustCount = Math.max(1000, Math.min(20000, dustCount));
    const positions = new Float32Array(actualDustCount * 3);
    const colors = new Float32Array(actualDustCount * 3);
    const sizes = new Float32Array(actualDustCount);
    const opacities = new Float32Array(actualDustCount);

    const barDustCount = bar ? Math.floor(actualDustCount * 0.25) : 0;
    const armDustCount = actualDustCount - barDustCount;

    // 1. Bar-leading shock dust lanes (curved dust lanes on leading edges of the rotating bar)
    if (bar && barDustCount > 0) {
      const a = bar.length * 0.5;
      const b = bar.width * 0.5;
      const phi = bar.angle;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let i = 0; i < barDustCount; i++) {
        // Parametric position along the bar major axis u in [-a, a]
        const u = rng.range(-a * 0.95, a * 0.95);
        // Leading edge: shock lane offset v on leading side relative to rotation
        const sideSign = u >= 0 ? 1 : -1;
        const v = sideSign * b * 0.42 * dustCoverage + rng.gaussian(0, b * 0.16 * dustCoverage);
        const w = rng.gaussian(0, bar.thickness * 0.18);

        // Rotate into galactic plane coordinates
        const x = u * cosPhi - v * sinPhi;
        const z = u * sinPhi + v * cosPhi;
        const y = w;

        positions[i * 3] = x * RENDER_SCALE_KPC;
        positions[i * 3 + 1] = y * RENDER_SCALE_KPC;
        positions[i * 3 + 2] = z * RENDER_SCALE_KPC;

        // Warm-amber forward scattering on dark dust filaments
        const tone = rng.range(0.08, 0.20);
        colors[i * 3] = tone * 2.8;
        colors[i * 3 + 1] = tone * 1.3;
        colors[i * 3 + 2] = tone * 0.6;

        sizes[i] = rng.range(8.0, 18.0) * Math.sqrt(dustCoverage);
        opacities[i] = rng.range(0.40, 0.70);
      }
    }

    // 2. Spiral arm compression dust lanes (situated along the inner concave edges of arms)
    for (let i = 0; i < armDustCount; i++) {
      const idx = barDustCount + i;
      const rFraction = Math.pow(rng.next(), 0.62);
      const rMin = bar ? bar.length * 0.48 : 2.0;
      const r = rMin + rFraction * (galaxyRadius * 0.88 - rMin);

      let theta = 0;
      if (armDefs && armDefs.length > 0) {
        const armIndex = i % armDefs.length;
        const arm = armDefs[armIndex];
        const idealAngle = arm.startAngle + (1.0 / Math.tan(arm.pitchAngleRad)) * Math.log(Math.max(r, 0.1) / Math.max(arm.startRadius, 0.1));
        const armWidthKpc = (arm.startRadius * 0.08 + arm.widthExpansionCoeff * 0.70 * r) * dustCoverage;
        // Shift to inner concave edge of the density wave
        const dustOffset = -armWidthKpc * 0.40 + rng.gaussian(0, armWidthKpc * 0.20);
        theta = idealAngle + dustOffset / Math.max(r, 0.5);
      } else {
        const armIndex = i % armCount;
        const armPhase = galaxy.spiralArms.armOffset + (armIndex * Math.PI * 2) / armCount;
        const idealAngle = windingFactor * Math.log(Math.max(r, 0.1) / 0.5) + armPhase;
        const armWidthKpc = galaxy.spiralArms.armWidth * galaxyRadius * 0.65 * dustCoverage;
        const dustOffset = -armWidthKpc * 0.40 + rng.gaussian(0, armWidthKpc * 0.20);
        theta = idealAngle + dustOffset / Math.max(r, 0.5);
      }

      positions[idx * 3] = r * Math.cos(theta) * RENDER_SCALE_KPC;
      positions[idx * 3 + 1] = rng.gaussian(0, 0.14) * RENDER_SCALE_KPC;
      positions[idx * 3 + 2] = r * Math.sin(theta) * RENDER_SCALE_KPC;

      // Dark soot absorption with subtle warm forward-scattering starlight
      const tone = rng.range(0.06, 0.16);
      colors[idx * 3] = tone * 2.6;
      colors[idx * 3 + 1] = tone * 1.2;
      colors[idx * 3 + 2] = tone * 0.55;

      sizes[idx] = rng.range(7.0, 16.0) * Math.sqrt(dustCoverage);
      opacities[idx] = rng.range(0.35, 0.65);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    // Normal blending allows dust to absorb and silhouette background star light
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      uniforms: {
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        uOpacityMultiplier: { value: opacityMultiplier },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy, dustCount, dustCoverage]);

  useFrame(() => {
    if (material && material.uniforms && material.uniforms.uOpacityMultiplier) {
      material.uniforms.uOpacityMultiplier.value = opacityMultiplier;
    }
  });

  return <points geometry={geometry} material={material} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Stellar Clusters Field (Active Nurseries)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ClusterFieldProps {
  galaxy: Galaxy;
  densityMultiplier?: number;
}

function ClusterField({ galaxy, densityMultiplier = 1.0 }: ClusterFieldProps) {
  const { geometry, material } = useMemo(() => {
    const clusters = galaxy.clusters;
    const particlesPerCluster = Math.max(8, Math.min(96, Math.round(32 * densityMultiplier)));
    const totalCount = clusters.length * particlesPerCluster;

    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    const opacities = new Float32Array(totalCount);

    const rng = new SeededRandom(galaxy.seed + 3333);

    let idx = 0;
    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];
      for (let p = 0; p < particlesPerCluster; p++) {
        // Tight scatter inside the cluster radius
        const offsetR = rng.gaussian(0, cluster.radius * 0.38);
        const phi = rng.range(0, Math.PI * 2);
        const theta = rng.range(-Math.PI * 0.4, Math.PI * 0.4);

        positions[idx * 3] = (cluster.x + offsetR * Math.cos(theta) * Math.cos(phi)) * RENDER_SCALE_KPC;
        positions[idx * 3 + 1] = (cluster.y + offsetR * Math.sin(theta)) * RENDER_SCALE_KPC;
        positions[idx * 3 + 2] = (cluster.z + offsetR * Math.cos(theta) * Math.sin(phi)) * RENDER_SCALE_KPC;

        // Ionized hydrogen emission (pink/cyan H II glow) + diamond white OB stars
        if (p < Math.round(10 * (particlesPerCluster / 32))) {
          // Soft H II nebular envelope (pink/magenta H-alpha proxy)
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = 0.32;
          colors[idx * 3 + 2] = 0.62;
          sizes[idx] = rng.range(16.0, 32.0);
          opacities[idx] = 0.24;
        } else if (p < Math.round(14 * (particlesPerCluster / 32))) {
          // Ionized oxygen knots (turquoise O III)
          colors[idx * 3] = 0.30;
          colors[idx * 3 + 1] = 0.92;
          colors[idx * 3 + 2] = 0.95;
          sizes[idx] = rng.range(12.0, 24.0);
          opacities[idx] = 0.28;
        } else {
          // Radiant young star cluster cores
          colors[idx * 3] = 0.72;
          colors[idx * 3 + 1] = 0.88;
          colors[idx * 3 + 2] = 1.0;
          sizes[idx] = rng.range(4.5, 9.5);
          opacities[idx] = 0.88;
        }
        idx++;
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: CLUSTER_VERTEX_SHADER,
      fragmentShader: CLUSTER_FRAGMENT_SHADER,
      uniforms: {
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy, densityMultiplier]);

  return <points geometry={geometry} material={material} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galactic Halo (Population II Stellar Halo — Continuous Radial Profile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalacticHaloProps {
  galaxy: Galaxy;
  opacityMultiplier?: number;
}

function GalacticHalo({ galaxy, opacityMultiplier = 0.35 }: GalacticHaloProps) {
  const { geometry, material } = useMemo(() => {
    const rng = new SeededRandom(galaxy.seed + 9999);
    const haloCount = 3600;

    const positions = new Float32Array(haloCount * 3);
    const colors = new Float32Array(haloCount * 3);
    const sizes = new Float32Array(haloCount);
    const opacities = new Float32Array(haloCount);

    const maxHaloR = galaxy.diskStructure?.extendedHaloRadiusKpc ?? galaxy.radius * 1.5;

    for (let i = 0; i < haloCount; i++) {
      // Smooth power-law radial sampling without any hollow shell or ring
      const u = rng.next();
      const r = 2.5 + Math.pow(u, 2.2) * (maxHaloR - 2.5);
      const th = rng.range(0, Math.PI * 2);
      const ph = Math.acos(2 * rng.next() - 1);

      positions[i * 3] = r * Math.sin(ph) * Math.cos(th) * RENDER_SCALE_KPC;
      positions[i * 3 + 1] = r * Math.cos(ph) * 0.68 * RENDER_SCALE_KPC; // Spheroidal flattening
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * RENDER_SCALE_KPC;

      // Ancient Population II stars: faint warm cream / pale amber
      colors[i * 3] = 0.96;
      colors[i * 3 + 1] = 0.88;
      colors[i * 3 + 2] = 0.72;

      // Smooth radial falloff towards halo periphery
      const radialFalloff = 1.0 - (r / maxHaloR) * 0.60;
      sizes[i] = rng.range(1.6, 3.4);
      opacities[i] = rng.range(0.12, 0.30) * radialFalloff;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: HALO_VERTEX_SHADER,
      fragmentShader: HALO_FRAGMENT_SHADER,
      uniforms: {
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        uOpacityMultiplier: { value: opacityMultiplier },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy]);

  useFrame(() => {
    if (material && material.uniforms && material.uniforms.uOpacityMultiplier) {
      material.uniforms.uOpacityMultiplier.value = opacityMultiplier;
    }
  });

  return <points geometry={geometry} material={material} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Diffuse Galactic Body & Spiral Arm Emission
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DiffuseGalacticEmissionProps {
  galaxy: Galaxy;
  layers: GalaxyLayerVisibility;
  cloudCount?: number;
  cloudCoverage?: number;
  cloudOpacity?: number;
}

function DiffuseGalacticEmission({
  galaxy,
  layers,
  cloudCount = 14000,
  cloudCoverage = 1.0,
  cloudOpacity = 1.0,
}: DiffuseGalacticEmissionProps) {
  const { geometry, material } = useMemo(() => {
    const rng = new SeededRandom(galaxy.seed + 5555);
    const count = Math.max(2000, Math.min(40000, cloudCount));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    const galaxyRadius = galaxy.radius;
    const bar = galaxy.bar;
    const armDefs = galaxy.spiralArmDefinitions;
    const armCount = armDefs && armDefs.length > 0 ? armDefs.length : 4;
    const windingFactor = galaxy.spiralArms.windingFactor;

    // Distribution:
    // ~15% dense bulge core
    // ~20% triaxial bar
    // ~52% 4 spiral arms
    // ~13% H II emission complexes
    const bulgeCount = Math.floor(count * 0.15);
    const barCount = bar ? Math.floor(count * 0.20) : 0;
    const armCountPts = Math.floor(count * 0.52);
    const hiiCount = count - bulgeCount - barCount - armCountPts;

    const cosPhi = bar ? Math.cos(bar.angle) : 1;
    const sinPhi = bar ? Math.sin(bar.angle) : 0;

    let idx = 0;

    // 1. Bulge core emission (Warm golden amber)
    const showBulge = layers.bulge;
    const bulgeRadius = galaxyRadius * galaxy.bulge.radiusFraction;
    for (let i = 0; i < bulgeCount; i++) {
      const u = rng.gaussian(0, bulgeRadius * 0.40 * cloudCoverage);
      const v = rng.gaussian(0, bulgeRadius * 0.40 * cloudCoverage);
      const w = rng.gaussian(0, galaxy.thickness * 0.35 * cloudCoverage);

      positions[idx * 3] = u * RENDER_SCALE_KPC;
      positions[idx * 3 + 1] = w * RENDER_SCALE_KPC;
      positions[idx * 3 + 2] = v * RENDER_SCALE_KPC;

      if (showBulge) {
        colors[idx * 3] = 1.0;
        colors[idx * 3 + 1] = 0.78 + rng.next() * 0.10;
        colors[idx * 3 + 2] = 0.45 + rng.next() * 0.15;
        sizes[idx] = rng.range(22.0, 48.0) * Math.sqrt(cloudCoverage);
        opacities[idx] = rng.range(0.12, 0.24);
      } else {
        sizes[idx] = 0;
        opacities[idx] = 0;
      }
      idx++;
    }

    // 2. Triaxial bar emission (Warm amber / golden mature stars)
    const showBar = layers.bar;
    if (bar) {
      const a = bar.length * 0.5;
      const b = bar.width * 0.5;
      for (let i = 0; i < barCount; i++) {
        const u = rng.gaussian(0, a * 0.52 * cloudCoverage);
        const v = rng.gaussian(0, b * 0.40 * cloudCoverage);
        const w = rng.gaussian(0, bar.thickness * 0.28 * cloudCoverage);

        const x = u * cosPhi - v * sinPhi;
        const z = u * sinPhi + v * cosPhi;
        const y = w;

        positions[idx * 3] = x * RENDER_SCALE_KPC;
        positions[idx * 3 + 1] = y * RENDER_SCALE_KPC;
        positions[idx * 3 + 2] = z * RENDER_SCALE_KPC;

        if (showBar) {
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = 0.82 + rng.next() * 0.08;
          colors[idx * 3 + 2] = 0.52 + rng.next() * 0.18;
          sizes[idx] = rng.range(18.0, 38.0) * Math.sqrt(cloudCoverage);
          opacities[idx] = rng.range(0.10, 0.20);
        } else {
          sizes[idx] = 0;
          opacities[idx] = 0;
        }
        idx++;
      }
    }

    // 3. Four Spiral Arm diffuse emission ridges
    const showDisk = layers.disk;
    const barLen = bar ? bar.length : 12;
    for (let i = 0; i < armCountPts; i++) {
      const armIdx = i % armCount;
      const rFraction = Math.pow(rng.next(), 0.68);
      const rMin = bar ? barLen * 0.48 : 2.5;
      const r = rMin + rFraction * (galaxyRadius * 0.92 - rMin);

      let idealAngle = 0;
      let armWidthKpc = 0;
      if (armDefs && armDefs.length > 0) {
        const arm = armDefs[armIdx % armDefs.length];
        idealAngle = arm.startAngle + (1.0 / Math.tan(arm.pitchAngleRad)) * Math.log(Math.max(r, 0.1) / Math.max(arm.startRadius, 0.1));
        armWidthKpc = (arm.startRadius * 0.08 + arm.widthExpansionCoeff * 0.85 * r) * cloudCoverage;
      } else {
        const armPhase = galaxy.spiralArms.armOffset + (armIdx * Math.PI * 2) / armCount;
        idealAngle = windingFactor * Math.log(Math.max(r, 0.1) / 0.5) + armPhase;
        armWidthKpc = galaxy.spiralArms.armWidth * galaxyRadius * 0.75 * cloudCoverage;
      }

      const scatter = rng.gaussian(0, armWidthKpc);
      const rDisp = rng.gaussian(0, armWidthKpc * 0.20);
      const rActual = Math.max(rMin, r + rDisp);
      const theta = idealAngle + scatter / Math.max(rActual, 1.0);

      positions[idx * 3] = rActual * Math.cos(theta) * RENDER_SCALE_KPC;
      positions[idx * 3 + 1] = rng.gaussian(0, 0.18) * RENDER_SCALE_KPC;
      positions[idx * 3 + 2] = rActual * Math.sin(theta) * RENDER_SCALE_KPC;

      if (showDisk) {
        // Natural transition: warm starlight in inner arm -> radiant blue-white in active outer arm
        const radialT = r / galaxyRadius;
        if (radialT < 0.35) {
          // Warm transition
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = 0.88;
          colors[idx * 3 + 2] = 0.70;
        } else {
          // Radiant blue-white OB population and reflection emission
          colors[idx * 3] = 0.65 + (1.0 - radialT) * 0.20;
          colors[idx * 3 + 1] = 0.82 + (1.0 - radialT) * 0.10;
          colors[idx * 3 + 2] = 1.0;
        }
        sizes[idx] = rng.range(20.0, 46.0) * Math.sqrt(cloudCoverage);
        opacities[idx] = rng.range(0.08, 0.18) * (1.0 - radialT * 0.35);
      } else {
        sizes[idx] = 0;
        opacities[idx] = 0;
      }
      idx++;
    }

    // 4. H II Ionized Hydrogen Nurseries along spiral shock fronts
    const showClusters = layers.clusters;
    for (let i = 0; i < hiiCount; i++) {
      const armIdx = i % armCount;
      const rFraction = Math.pow(rng.next(), 0.60);
      const rMin = bar ? barLen * 0.55 : 3.0;
      const r = rMin + rFraction * (galaxyRadius * 0.88 - rMin);

      let idealAngle = 0;
      if (armDefs && armDefs.length > 0) {
        const arm = armDefs[armIdx % armDefs.length];
        idealAngle = arm.startAngle + (1.0 / Math.tan(arm.pitchAngleRad)) * Math.log(Math.max(r, 0.1) / Math.max(arm.startRadius, 0.1));
      } else {
        const armPhase = galaxy.spiralArms.armOffset + (armIdx * Math.PI * 2) / armCount;
        idealAngle = windingFactor * Math.log(Math.max(r, 0.1) / 0.5) + armPhase;
      }

      // Slightly offset on the outer shock ridge
      const armWidthKpc = (galaxy.spiralArms.armWidth * galaxyRadius) * 0.40 * cloudCoverage;
      const rDisp = rng.gaussian(0, armWidthKpc * 0.15);
      const rActual = Math.max(rMin, r + rDisp);
      const theta = idealAngle + rng.gaussian(0, armWidthKpc) / Math.max(rActual, 1.0);

      positions[idx * 3] = rActual * Math.cos(theta) * RENDER_SCALE_KPC;
      positions[idx * 3 + 1] = rng.gaussian(0, 0.14) * RENDER_SCALE_KPC;
      positions[idx * 3 + 2] = rActual * Math.sin(theta) * RENDER_SCALE_KPC;

      if (showClusters && showDisk) {
        // Delicate pink-magenta H-alpha emission (656.3 nm proxy) with occasional cyan O III knots
        const isCyan = rng.next() < 0.18;
        if (isCyan) {
          colors[idx * 3] = 0.35;
          colors[idx * 3 + 1] = 0.90;
          colors[idx * 3 + 2] = 0.95;
        } else {
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = 0.38;
          colors[idx * 3 + 2] = 0.65;
        }
        sizes[idx] = rng.range(16.0, 34.0) * Math.sqrt(cloudCoverage);
        opacities[idx] = rng.range(0.12, 0.24);
      } else {
        sizes[idx] = 0;
        opacities[idx] = 0;
      }
      idx++;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: DIFFUSE_EMISSION_VERTEX_SHADER,
      fragmentShader: DIFFUSE_EMISSION_FRAGMENT_SHADER,
      uniforms: {
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        uOpacityMultiplier: { value: cloudOpacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geom, material: mat };
  }, [galaxy, layers.disk, layers.bar, layers.bulge, layers.clusters, cloudCount, cloudCoverage]);

  useFrame(() => {
    if (material && material.uniforms && material.uniforms.uOpacityMultiplier) {
      material.uniforms.uOpacityMultiplier.value = cloudOpacity;
    }
  });

  return <points geometry={geometry} material={material} />;
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

  const coreGlowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: CORE_GLOW_VERTEX_SHADER,
      fragmentShader: CORE_GLOW_FRAGMENT_SHADER,
      uniforms: {
        uColor: { value: new THREE.Color('#ffe8c0') },
        uOpacity: { value: 0.38 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <group>
      {/* Core glow with continuous, smooth radial falloff */}
      <mesh ref={meshRef} material={coreGlowMaterial}>
        <planeGeometry args={[coreRadius * 4, coreRadius * 4]} />
      </mesh>
      {/* Central nucleus point light */}
      <pointLight
        intensity={1.2}
        distance={coreRadius * 8}
        decay={2}
        color="#ffe4c4"
      />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shaders: Relativistic Accretion Disk
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ACCRETION_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aRadius;
  attribute float aInitialAngle;
  attribute float aVerticalOffset;

  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDoppler;

  void main() {
    // Relativistic differential rotation: omega ~ 6.5 / pow(r, 1.25)
    float omega = 6.5 / pow(max(aRadius, 1.2), 1.25);
    float angle = aInitialAngle + omega * uTime;

    float x = aRadius * cos(angle);
    float z = aRadius * sin(angle);
    float y = aVerticalOffset * exp(-aRadius * 0.22);

    vec3 localPos = vec3(x, y, z);
    vec4 mvPos = modelViewMatrix * vec4(localPos, 1.0);

    // Tangential direction for Doppler beaming: (-sin(angle), 0, cos(angle))
    vec3 tangent = normalize(vec3(-sin(angle), 0.0, cos(angle)));
    vec3 viewDir = normalize(-mvPos.xyz);
    float dopplerFactor = dot(tangent, viewDir); // -1 (receding) to +1 (approaching)

    // Blue-shift and brighten approaching side, red-shift and dim receding side
    vec3 shiftedColor = aColor;
    if (dopplerFactor > 0.0) {
      shiftedColor = mix(aColor, vec3(0.55, 0.85, 1.0), dopplerFactor * 0.65);
    } else {
      shiftedColor = mix(aColor, vec3(0.95, 0.25, 0.08), -dopplerFactor * 0.55);
    }
    vColor = shiftedColor * (1.0 + dopplerFactor * 0.40);
    vDoppler = dopplerFactor;

    float dist = length(mvPos.xyz);
    float pointSize = aSize * uPixelRatio * (680.0 / max(dist, 1.0));
    gl_PointSize = clamp(pointSize, 1.5, 36.0);

    vAlpha = smoothstep(1200.0, 50.0, dist);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ACCRETION_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDoppler;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.48, 0.0, d);
    float halo = exp(-d * 6.2) * 0.65;
    float intensity = core + halo;

    float alpha = intensity * vAlpha * 0.92;
    if (alpha < 0.02) discard;

    gl_FragColor = vec4(vColor * intensity, alpha);
  }
`;

interface AccretionDiskProps {
  time?: number;
}

function AccretionDiskRenderer({ time = 0 }: AccretionDiskProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const particleCount = 4800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const initialAngles = new Float32Array(particleCount);
    const verticalOffsets = new Float32Array(particleCount);

    const rng = new SeededRandom(7777);

    for (let i = 0; i < particleCount; i++) {
      // Power law radius concentrated near the photon sphere (1.8 to 9.5)
      const u = rng.next();
      const r = 1.8 + Math.pow(u, 0.55) * 7.7;
      const angle = rng.range(0, Math.PI * 2);
      const vert = rng.gaussian(0, 0.06 * r);

      positions[i * 3] = r * Math.cos(angle);
      positions[i * 3 + 1] = vert;
      positions[i * 3 + 2] = r * Math.sin(angle);

      radii[i] = r;
      initialAngles[i] = angle;
      verticalOffsets[i] = vert;

      // Color temperature gradient: inner ultra-hot gold/white, transitioning to orange-red
      const rNorm = (r - 1.8) / 7.7; // 0 (inner) to 1 (outer)
      if (rNorm < 0.20) {
        // Inner relativistic boundary: white-hot thermal emission
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.85;
        sizes[i] = rng.range(2.0, 3.8);
      } else if (rNorm < 0.55) {
        // Mid accretion disk: luminous amber/orange
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.62 + rng.range(-0.1, 0.1);
        colors[i * 3 + 2] = 0.18;
        sizes[i] = rng.range(1.6, 3.2);
      } else {
        // Outer cooler disk: deep fiery red/crimson
        colors[i * 3] = 0.92;
        colors[i * 3 + 1] = 0.28 + rng.range(-0.08, 0.08);
        colors[i * 3 + 2] = 0.08;
        sizes[i] = rng.range(1.2, 2.6);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geom.setAttribute('aInitialAngle', new THREE.BufferAttribute(initialAngles, 1));
    geom.setAttribute('aVerticalOffset', new THREE.BufferAttribute(verticalOffsets, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
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

  useFrame(() => {
    if (material && material.uniforms) {
      material.uniforms.uTime.value = time;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Relativistic Radio Jets & Terminal Lobes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const JET_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const JET_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorSheath;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    // Distance along jet: vUv.y from 0 (base) to 1 (terminus)
    float longitudinal = vUv.y;
    // Transverse profile around cone
    float edgeFactor = 1.0 - abs(dot(vNormal, normalize(vViewPosition)));

    // Recollimation shock pulses propagating outward
    float shocks = 0.85 + 0.15 * sin(longitudinal * 22.0 - uTime * 3.2);

    // Collimated core brightness vs diffuse sheath
    float coreGlow = pow(edgeFactor, 1.8) * 1.5;
    float distanceFalloff = pow(1.0 - longitudinal * 0.55, 1.2);

    vec3 col = mix(uColorCore, uColorSheath, pow(longitudinal, 0.7));
    float alpha = (coreGlow + 0.25) * shocks * distanceFalloff * uOpacity;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col * (1.2 + shocks * 0.3), alpha);
  }
`;

interface RelativisticJetsProps {
  galaxy: Galaxy;
  time?: number;
}

function RelativisticJetsRenderer({ galaxy, time = 0 }: RelativisticJetsProps) {
  const nucleus = galaxy.nucleus;
  if (!nucleus) return null;

  const jetLengthKpc = nucleus.jetLengthKpc ?? 52.0;

  // Scene scaling for collimated radio jets: length ~540 scene units
  const jetLengthScene = Math.min(750, Math.max(300, jetLengthKpc * RENDER_SCALE_KPC * 0.35));

  const northMatRef = useRef<THREE.ShaderMaterial>(null);
  const southMatRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    if (northMatRef.current) northMatRef.current.uniforms.uTime.value = time;
    if (southMatRef.current) southMatRef.current.uniforms.uTime.value = time;
  });

  const jetShaderUniforms = useMemo(() => ({
    north: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color('#93c5fd') },
      uColorSheath: { value: new THREE.Color('#a855f7') },
      uOpacity: { value: 0.12 },
    },
    south: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color('#93c5fd') },
      uColorSheath: { value: new THREE.Color('#a855f7') },
      uOpacity: { value: 0.12 },
    },
  }), []);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. North Relativistic Outflow Stream (+Y) */}
      <group position={[0, jetLengthScene * 0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[2.5, 0.4, jetLengthScene, 24, 8, true]} />
          <shaderMaterial
            ref={northMatRef}
            vertexShader={JET_VERTEX_SHADER}
            fragmentShader={JET_FRAGMENT_SHADER}
            uniforms={jetShaderUniforms.north}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 2. South Relativistic Outflow Stream (-Y) */}
      <group position={[0, -jetLengthScene * 0.5, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[2.5, 0.4, jetLengthScene, 24, 8, true]} />
          <shaderMaterial
            ref={southMatRef}
            vertexShader={JET_VERTEX_SHADER}
            fragmentShader={JET_FRAGMENT_SHADER}
            uniforms={jetShaderUniforms.south}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Galactic Nucleus / SMBH ANANTARA A*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GalacticNucleusProps {
  galaxy: Galaxy;
  isSelected?: boolean;
  onClick?: () => void;
  showAccretion?: boolean;
  time?: number;
}

function GalacticNucleusRenderer({
  galaxy,
  isSelected,
  onClick,
  showAccretion = true,
  time = 0,
}: GalacticNucleusProps) {
  const nucleus = galaxy.nucleus;
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const photonRingRef = useRef<THREE.Mesh>(null);
  const reticleRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (photonRingRef.current) {
      photonRingRef.current.rotation.z = t * 0.15;
    }
    if (reticleRef.current && isSelected) {
      const scale = 1.0 + Math.sin(t * 3.5) * 0.12;
      reticleRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!nucleus) return null;

  // In galactic scene units, the central SMBH shadow and relativistic photon ring
  const shadowRadius = 1.4;
  const photonRingInner = 1.6;
  const photonRingOuter = 4.2;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Event Horizon Black Shadow Sphere */}
      <mesh
        ref={shadowMeshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <sphereGeometry args={[shadowRadius, 32, 32]} />
        <meshBasicMaterial color="#000000" depthWrite={true} />
      </mesh>

      {/* 2. Relativistic Photon Ring / Accretion Glow in galactic plane */}
      <mesh ref={photonRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[photonRingInner, photonRingOuter, 64]} />
        <meshBasicMaterial
          color="#ffb84d"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Doppler Beaming / Accretion Haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[photonRingOuter * 0.95, photonRingOuter * 2.2, 64]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Optional Scientifically Motivated Rotating Particle Accretion Disk */}
      {showAccretion && <AccretionDiskRenderer time={time} />}

      {/* 5. Clickable Interaction Hit Area */}
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <sphereGeometry args={[photonRingOuter * 2.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 6. Selected Reticle */}
      {isSelected && (
        <group ref={reticleRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[photonRingOuter * 2.6, photonRingOuter * 2.85, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[photonRingOuter * 2.9, photonRingOuter * 3.4, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
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
// Main Galaxy Renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GalaxyRendererProps {
  galaxy: Galaxy;
  selectedStarIndex: number | null;
  selectedNucleus?: boolean;
  onStarClick: (index: number) => void;
  onNucleusClick?: () => void;
  layers?: GalaxyLayerVisibility;
  settings?: GalaxyObservatorySettings;
  time?: number;
}

export function GalaxyRenderer({
  galaxy,
  selectedStarIndex,
  selectedNucleus = false,
  onStarClick,
  onNucleusClick,
  layers = DEFAULT_LAYER_VISIBILITY,
  settings = DEFAULT_OBSERVATORY_SETTINGS,
  time = 0,
}: GalaxyRendererProps) {
  const selectedStar = selectedStarIndex !== null
    ? galaxy.stars[selectedStarIndex] ?? null
    : null;

  const rootRef = useRef<THREE.Group>(null);
  const visualRotationAngle = useRef(0);

  // Rigid-body visual rotation of the galactic disk structure
  useFrame((_, delta) => {
    if (rootRef.current) {
      if (!settings.isPaused) {
        visualRotationAngle.current += delta * settings.visualRotationSpeed * 0.05;
      }
      rootRef.current.rotation.y = visualRotationAngle.current;
    }
  });

  const renderScale = settings.renderScale;
  const effectiveTime = time * settings.orbitalMotionSpeed;

  return (
    <group ref={rootRef} scale={[renderScale, renderScale, renderScale]}>
      {/* 1. Central Bulge Core Glow */}
      {layers.bulge && <GalacticCoreGlow galaxy={galaxy} />}

      {/* 2. Diffuse Galactic Body & Spiral Arm Emission Continuum */}
      <DiffuseGalacticEmission
        galaxy={galaxy}
        layers={layers}
        cloudCount={settings.cloudCount}
        cloudCoverage={settings.cloudCoverage}
        cloudOpacity={settings.cloudOpacity}
      />

      {/* 3. Optional Scientifically Motivated Relativistic Radio Jets & Terminating Lobes */}
      {layers.jets && (
        <RelativisticJetsRenderer galaxy={galaxy} time={effectiveTime} />
      )}

      {/* 4. Galactic Nucleus (ANANTARA A* SMBH) */}
      {layers.nucleus && (
        <GalacticNucleusRenderer
          galaxy={galaxy}
          isSelected={selectedNucleus}
          onClick={onNucleusClick}
          showAccretion={layers.accretion}
          time={effectiveTime}
        />
      )}

      {/* 5. Galactic Halo (Smooth Population II envelope) */}
      {layers.halo && (
        <GalacticHalo
          galaxy={galaxy}
          opacityMultiplier={settings.haloOpacity}
        />
      )}

      {/* 6. Star Clusters (Nurseries & H II Emission) */}
      {layers.clusters && (
        <ClusterField
          galaxy={galaxy}
          densityMultiplier={settings.clusterDensityMultiplier}
        />
      )}

      {/* 7. Dark Dust Extinction Lanes (Silhouettes against bright diffuse disk & bar) */}
      {layers.dust && (
        <DustField
          galaxy={galaxy}
          dustCount={settings.dustCount}
          dustCoverage={settings.dustCoverage}
          opacityMultiplier={settings.dustOpacity}
        />
      )}

      {/* 8. Stellar Field (Individual stars: Disk, Bar, Bulge Stars) */}
      <GalaxyStarField
        galaxy={galaxy}
        time={effectiveTime}
        layers={layers}
        starSizeMultiplier={settings.starSizeMultiplier}
        onStarClick={onStarClick}
      />

      {/* Star Selection indicator */}
      {selectedStar && <StarSelectionIndicator star={selectedStar} />}

      {/* Ambient lighting */}
      <ambientLight intensity={0.03} />
    </group>
  );
}

