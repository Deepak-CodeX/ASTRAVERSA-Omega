# रचना — RACHANA
## Architecture of ASTRAVERSA Ω

---

## System Overview

ASTRAVERSA Ω follows a strict separation of concerns across six subsystems. The fundamental architectural principle is:

> **Simulation logic must never depend on rendering. Rendering must never contain simulation rules. UI must not contain either.**

```
┌──────────────────────────────────────────────────────────────┐
│                          UI Layer                             │
│   App · TimeControls · GalaxyInfoPanel · UnifiedInfoPanel     │
│   Navigation State · View Level Management                    │
├────────────────┬─────────────────────────────────────────────┤
│                │             Rendering Layer                  │
│                │   GalaxyScene · GalaxyRenderer                │
│                │   Scene · StarRenderer · PlanetRenderer       │
│                │   OrbitRenderer · CelestialBodyRenderer       │
│   React +      ├─────────────────────────────────────────────┤
│   Three.js     │             Engine Layer                     │
│                │   SimulationEngine · SimulationClock           │
│                ├─────────────────────────────────────────────┤
│                │           Universe Layer                     │
│                │   Universe · Galaxy · GalaxyGenerator          │
│                │   StarCluster · GalaxyStar                    │
│                │   SolarSystemGenerator · CelestialBody        │
│                │   SeededRandom                                │
├────────────────┼─────────────────────────────────────────────┤
│                │           Astronomy Layer                    │
│   Pure Logic   │   stellar · planetary · constants             │
│                ├─────────────────────────────────────────────┤
│                │            Physics Layer                     │
│                │   Vector3 · gravity · integrator              │
└────────────────┴─────────────────────────────────────────────┘
```

---

## Hierarchy Model

```
Universe (seed)
  ↓
Galaxy (generated from universe seed)
  ↓
StarCluster[] (deterministic from galaxy)
  ↓
GalaxyStar[] (lightweight representation)
  ↓ (on selection)
SolarSystem (generated from star seed)
  ↓
CelestialBody[] (star + planets with physics state)
```

---

## Module Responsibilities

### Physics (`src/physics/`)

**Purpose:** Core mathematical and physical primitives.

| Component | Responsibility |
|-----------|---------------|
| `Vector3` | 3D vector mathematics for simulation (independent of Three.js) |
| `gravity` | Newtonian gravitational force computation |
| `integrator` | Numerical integration (Velocity Verlet, Euler) |

**Dependencies:** None (pure math)

---

### Astronomy (`src/astronomy/`)

**Purpose:** Scientific models and astronomical constants.

| Component | Responsibility |
|-----------|---------------|
| `constants` | Physical constants (G, AU, kpc, solar mass, etc.) and unit conversions |
| `stellar` | Main-sequence stellar classification and property derivation |
| `planetary` | Planetary type classification and orbital mechanics |

**Dependencies:** None (pure data and functions)

---

### Universe (`src/universe/`)

**Purpose:** Procedural generation and world representation.

| Component | Responsibility |
|-----------|---------------|
| `SeededRandom` | Deterministic PRNG with hierarchical seed derivation |
| `CelestialBody` | Core data structure for all celestial objects (with physics state) |
| `SolarSystemGenerator` | Procedural star + planet generation from seed |
| `Galaxy` | Domain model for galaxies, clusters, and lightweight stars |
| `GalaxyGenerator` | Procedural spiral galaxy generation from seed |
| `Universe` | Top-level container, navigation, and generation entry point |

**Dependencies:** Physics (Vector3), Astronomy (constants, stellar, planetary)

**Key Design:**
- `GalaxyStar` is lightweight (position, color, seed) for rendering thousands
- `CelestialBody` is heavyweight (velocity, acceleration, physics state) for simulation
- Full `CelestialBody` objects are only created when entering a star system

---

### Engine (`src/engine/`)

**Purpose:** Simulation lifecycle and time management.

| Component | Responsibility |
|-----------|---------------|
| `SimulationClock` | Frame-rate-independent time with multipliers and substeps |
| `SimulationEngine` | Physics integration loop, state orchestration |

**Dependencies:** Physics (Vector3, gravity, integrator), Astronomy (constants), Universe (CelestialBody)

**Note:** The engine is only active when viewing a planetary system. Galaxy-scale physics are not simulated.

---

### Rendering (`src/rendering/`)

**Purpose:** Visual representation only.

| Component | Responsibility |
|-----------|---------------|
| `GalaxyScene` | R3F canvas, camera, environment for galaxy-scale view |
| `GalaxyRenderer` | Stars (Points + custom shaders), core glow, dust field |
| `Scene` | R3F canvas, camera, environment for solar system view |
| `StarRenderer` | Star visualization (emissive sphere + glow + light) |
| `PlanetRenderer` | Planet visualization (sphere + selection indicator) |
| `OrbitRenderer` | Orbital path visualization (translucent ring) |
| `CelestialBodyRenderer` | Type-based dispatch to appropriate renderer |

**Dependencies:** Universe (Galaxy, GalaxyStar, CelestialBody), Astronomy (constants)

**Critical Rule:** Rendering components read simulation state but NEVER modify it.

**Rendering Strategy:**
- Galaxy: `Points` geometry with custom `ShaderMaterial` (single draw call for 20K+ stars)
- Solar System: Individual `<mesh>` elements per body (acceptable for <15 objects)

---

### UI (`src/ui/`)

**Purpose:** User interaction and information display.

| Component | Responsibility |
|-----------|---------------|
| `App` | Application shell, navigation state, view routing |
| `TimeControls` | Speed/pause controls, time display (system view only) |
| `GalaxyInfoPanel` | Unified info panel for galaxy/cluster/star/body selection |

**Dependencies:** Engine, Universe, Rendering

---

## Data Flow

### Initialization
```
App starts
  → Universe created with seed
  → Galaxy generated (stars, clusters, parameters)
  → GalaxyScene renders galaxy view
  → User sees spiral galaxy
```

### Galaxy → Star System Transition
```
User clicks star
  → Selected star index stored
  → User clicks "Enter System"
  → Universe.enterStarSystem(index) generates SolarSystem from star.seed
  → SimulationEngine initialized with CelestialBody[]
  → Engine starts (1× speed)
  → Scene renders solar system view
```

### Solar System → Galaxy Transition
```
User clicks "Back to Galaxy"
  → Universe.exitStarSystem() clears system
  → Engine paused
  → View switches back to GalaxyScene
  → Previously selected star remains highlighted
```

### Simulation Loop (per frame, system view only)
```
requestAnimationFrame fires
  → useFrame callback receives wall-clock delta
  → SimulationEngine.update(deltaMs)
    → SimulationClock.tick(deltaMs) → substep array
    → For each substep:
      → Compute gravitational forces between all bodies
      → Velocity Verlet integration updates positions/velocities
  → React re-renders body positions in scene
```

---

## Unit System

| Quantity | Internal Unit | Display Unit |
|----------|--------------|-------------|
| Distance | meters (m) | AU, km (system), kpc (galaxy) |
| Mass | kilograms (kg) | M☉, M⊕ |
| Time | seconds (s) | years, days, hours |
| Velocity | m/s | km/s |
| Temperature | Kelvin (K) | K |
| Luminosity | Watts (W) | L☉ |
| Galactic Distance | kiloparsecs (kpc) | kpc |

**Rendering Scales:**
- Solar System: 1 AU = 10 scene units
- Galaxy: 1 kpc = 30 scene units

---

## Deterministic Seed Hierarchy

```
Universe Seed (42)
  → Galaxy Seed (= Universe Seed)
    → Cluster Seed (derived via fork(1000).fork(clusterIndex))
    → Star Seed (derived via fork(2000).fork(region).fork(starIndex))
      → Solar System Seed (= Star Seed, passed to generateSolarSystem)
        → Planet Seed (derived via fork(planetIndex))
```

---

## Future Extensibility

1. **Multi-galaxy** → Universe manages multiple Galaxy instances
2. **WebWorker physics** → Engine and Physics layers have zero rendering dependencies
3. **WebGPU rendering** → Rendering layer is isolated and replaceable
4. **Save/Load** → Galaxy and CelestialBody are serializable
5. **Level of Detail** → GalaxyStar can load progressively more detail
6. **Seamless zoom** → Camera system can be enhanced without restructuring

---

*Architecture serves the simulation. The simulation serves discovery.*
