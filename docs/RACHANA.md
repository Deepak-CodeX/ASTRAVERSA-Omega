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
Galaxy (ANANTARA α — 500k ly main stellar-body disk, 750k ly halo)
  ↓
  ├── SupermassiveBlackHole (ANANTARA A* at r = 0, configurable mass 4.154M to 40B M☉)
  │     ├── AccretionDisk (4.8k particles, Keplerian rotation shader, Doppler beaming)
  │     └── RelativisticJets (Bipolar collimated cones, standing shocks, synchrotron lobes)
  ├── BarStructure (Triaxial bar, a = 19.93 kpc, b = 6.58 kpc, 28°)
  ├── SpiralArm[] (4 continuous arms: Scutum-Centaurus, Perseus, Norma, Sagittarius)
  ├── DiskStructure (Thin scale 1.5 kpc, Thick scale 4.5 kpc)
  ├── StarCluster[] (deterministic from galaxy)
  └── GalaxyStar[] (lightweight representation)
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
| `constants` | Physical constants (G, AU, kpc, solar mass, Stefan-Boltzmann $\sigma$, etc.) and unit conversions |
| `stellar` | Main-sequence stellar classification and property derivation |
| `stellarEvolution` | Piecewise stellar lifecycles, $\tau_{\text{MS}}$ scaling, Hayashi convective limit, Mestel cooling, and compact remnant endpoints |
| `planetary` | Planetary type classification and orbital mechanics |

**Dependencies:** None (pure data and functions)

---

### Universe (`src/universe/`)

**Purpose:** Procedural generation and world representation.

| Component | Responsibility |
|-----------|---------------|
| `SeededRandom` | Deterministic PRNG with hierarchical seed derivation (`deriveSeed`, `fork`) |
| `CelestialBody` | Core data structure for all celestial objects (with physics state and `StellarEvolutionState`) |
| `SolarSystemGenerator` | Procedural star + planet generation from seed (with isolated sub-PRNG stream for stellar evolution) |
| `Galaxy` | Domain model for galaxies, clusters, lightweight stars, and SMBH with radio jets |
| `GalaxyGenerator` | Procedural SBbc barred spiral galaxy generation from seed (500k ly disk, 750k ly halo, triaxial bar, 4 continuous arms, dual disks, ANANTARA A* SMBH with `recalculateSupermassiveBlackHole`) |
| `Universe` | Top-level container, navigation, view level management, generation entry point, and `setNucleusMass` runtime mass reconfiguration |

**Dependencies:** Physics (Vector3), Astronomy (constants, stellar, stellarEvolution, planetary)

**Key Design:**
- `GalaxyStar` is lightweight (position, color, seed) for rendering thousands
- `CelestialBody` is heavyweight (velocity, acceleration, physics state, stellar evolution) for simulation
- Full `CelestialBody` objects are only created when entering a star system
- Stellar evolution initialization derives from an isolated sub-stream (`rng.deriveSeed(888)`) to maintain 100% byte-for-byte invariance in planetary generation

---

### Engine (`src/engine/`)

**Purpose:** Simulation lifecycle and time management.

| Component | Responsibility |
|-----------|---------------|
| `SimulationClock` | Frame-rate-independent time with multipliers and substeps |
| `SimulationEngine` | Physics integration loop, state orchestration, `advanceStellarAge(deltaYears)`, and `setStarAge(star, ageYears)` |

**Dependencies:** Physics (Vector3, gravity, integrator), Astronomy (constants, stellarEvolution), Universe (CelestialBody)

**Note:** The engine is active when viewing a planetary system. Gravity integrates orbital mechanics while simulation time advances stellar evolution lifecycles.

---

### Rendering (`src/rendering/`)

**Purpose:** Visual representation only.

| Component | Responsibility |
|-----------|---------------|
| `GalaxyScene` | R3F canvas, camera, 9-waypoint interpolation (including 'bar', 'nucleus', and 'jets'), live telemetry, cosmic environment |
| `GalaxyRenderer` | Layered GPU rendering: dual-profile stellar shader, golden bar population, leading bar dust shock lanes, H II nurseries, halo, and 7 layer visibility toggles (`disk`, `dust`, `halo`, `bulge`, `bar`, `accretion`, `jets`) |
| `GalacticNucleusRenderer` | Relativistic nucleus container: event horizon shadow sphere, luminous photon ring, interactive reticle/hit-testing, and child high-energy renderers |
| `AccretionDiskRenderer` | 4,800-particle Keplerian differentially rotating accretion disk with Doppler blue/redshift shader and thermal gradient |
| `RelativisticJetsRenderer` | Collimated bipolar cones along $\pm Y$ with longitudinal standing shocks and extended terminal synchrotron radio lobes |
| `Scene` | R3F canvas, camera, environment for solar system view |
| `StarRenderer` | Star visualization (emissive sphere + glow + light) |
| `PlanetRenderer` | Planet visualization (sphere + selection indicator) |
| `OrbitRenderer` | Orbital path visualization (translucent ring) |
| `CelestialBodyRenderer` | Type-based dispatch to appropriate renderer |

**Dependencies:** Universe (Galaxy, GalaxyStar, CelestialBody), Astronomy (constants)

**Critical Rule:** Rendering components read simulation state but NEVER modify it.

**Rendering Strategy:**
- Galaxy: Layered `Points` geometries with custom `ShaderMaterial`s (dual-profile diffraction core + airy halo, leading shock dust absorption, H II emission nebulae, Population II halo)
- Galactic Nucleus: Central black shadow sphere ($r = 1.0$), photon orbit boundary ring ($r = 1.5$), Doppler-beamed gradient accretion disk, and selectable raycasting reticle
- Accretion Disk: Custom shader with $\Omega(r) \propto r^{-1.25}$, orbital phase angle rotation, and Doppler color enhancement
- Relativistic Jets & Radio Lobes: Collimated cone geometry with standing shock pulses and diffuse outer lobes
- Solar System: Individual `<mesh>` elements per body (acceptable for <15 objects)
- Observatory: Cinematic camera waypoint ease-out transitions, 7-layer visibility toggles, and real-time telemetry (distance, rotation speed, FPS)

---

### UI (`src/ui/`)

**Purpose:** User interaction and information display.

| Component | Responsibility |
|-----------|---------------|
| `App` | Application shell, navigation state, view routing, nucleus mass reconfiguration handler, and stellar evolution timeline orchestration |
| `TimeControls` | Speed/pause controls, time display (system view only) |
| `GalaxyInfoPanel` / `UnifiedInfoPanel` | Unified info panel with 9 waypoint jumps, 7 layer toggles, SMBH mass presets, full physical metadata readouts, and interactive Stellar Evolution Timeline controls (`+500 MYR`, `+1.0 GYR`, `+2.5 GYR`, `↺ RESET ZAMS`) |

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
          → Planetary Albedo Seed (isolated via deriveSeed(777))
    → Extended Halo Seed (isolated via fork(1500))
    → Spiral Arm Geometry Seed (isolated via fork(1600))
    → Dust Shock Lanes Seed (isolated via fork(1700))
    → H II Starburst Seed (isolated via fork(1800))
    → Nucleus & SMBH Seed (isolated via fork(1900))
```

---

## Stellar–Planetary Coupling Architecture (Mission 004B)

### Coupling Pipeline & Data Flow

```
Stellar Evolution Model (L_star, T_eff)
  │
  ├──> computeHabitableZone(L_star, T_eff)
  │      └──> starProperties.habitableZone (Conservative & Optimistic AU/m)
  │
  └──> For each orbiting planet (d, A):
         ├──> computeEquilibriumTemperature(L_star, d, A)
         │      └──> planetProperties.equilibriumTemperature (K)
         ├──> computeInsolationFlux(L_star, d)
         │      └──> planetProperties.insolationFlux (W/m²)
         │      └──> planetProperties.insolationRelative (S / S_0)
         └──> classifyHabitability(d, starProperties.habitableZone)
                └──> planetProperties.habitabilityStatus
```

### Dynamic Coupling Synchronization

1. **System Generation:** `SolarSystemGenerator` derives initial circumstellar habitable zones and planet radiative equilibrium values using isolated PRNG child streams to guarantee deterministic reproduction of planetary positions and orbital parameters.
2. **Simulation Lifecycle:** `SimulationEngine.updatePlanetaryCoupling(star)` synchronizes all orbiting bodies whenever:
   - The engine is initialized with celestial bodies (`initialize`).
   - Stellar age advances during simulation time (`advanceStellarAge`).
   - The user interactively steps the stellar age timeline (+500 Myr, +1.0 Gyr, +2.5 Gyr, or reset to ZAMS) via `setStarAge`.
3. **Decoupled Inspector Presentation:** UI inspectors (`UnifiedInfoPanel`, `SystemPlanetInfo`, `SystemStarInfo`, and `InfoPanel`) display values directly from authoritative body properties without duplicating state or recomputing physics.

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
