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
Galaxy (Active Galaxy Mode: MILKY_WAY or ANANTARA)
  ├── ANANTARA α (Procedural — 500k ly main stellar-body disk, 750k ly halo, seed 42)
  │     ├── SupermassiveBlackHole (ANANTARA A* at r = 0, configurable mass 4.154M to 40B M☉)
  │     │     ├── AccretionDisk (4.8k particles, Keplerian rotation shader, Doppler beaming)
  │     │     └── RelativisticJets (Bipolar collimated cones, standing shocks, synchrotron lobes)
  │     ├── BarStructure (Triaxial bar, a = 19.93 kpc, b = 6.58 kpc, 28°)
  │     ├── SpiralArm[] (4 continuous arms: Scutum-Centaurus, Perseus, Norma, Sagittarius)
  │     ├── DiskStructure (Thin scale 1.5 kpc, Thick scale 4.5 kpc)
  │     ├── StarCluster[] (deterministic from galaxy)
  │     └── GalaxyStar[] (procedural lightweight representation)
  │           ↓ (on selection)
  │         SolarSystem (procedural generated from star seed)
  │           ↓
  │         CelestialBody[] (star + planets with physics state)
  │
  └── MILKY WAY (Akashaganga — Real Observed, 100k ly disk, ~30.6 kpc)
        ├── SupermassiveBlackHole (Sagittarius A* at r = 0, 4.154M M☉)
        ├── BarStructure (a = 5.0 kpc, b = 1.5 kpc, 28° orientation) & Oblate Bulge (q = 0.35)
        ├── SpiralArm[] (Scutum-Centaurus, Perseus, Sagittarius, Norma + local Orion Spur)
        ├── DiskStructure (Thin scale 2.6 kpc, Thick scale 4.0 kpc)
        └── GalaxyStar[] (Catalogue stars: Sol, Sirius, Alpha Centauri, Betelgeuse, etc.)
              ↓ (on Sol selection)
            Canonical Solar System (NASA/JPL Horizons ground-truth)
              ↓
            CelestialBody[] (Sun + 8 planets + 3 dwarf planets + 19 natural satellites)
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
| `stellarPlanetaryCoupling` | Radiative-equilibrium temperature, insolation flux, and Kopparapu et al. (2013) habitable zone |
| `planetary` | Planetary type classification and orbital mechanics |
| `planetaryEnvironment` | Surface gravity, escape velocity, atmospheric retention, 1D semi-grey greenhouse surface temperature, Clausius-Clapeyron water boiling curves, and physical thermal regimes (Mission 005A) |

**Dependencies:** None (pure data and functions)

---

### Data Ingestion (`src/data/`)

**Purpose:** Astronomical catalogue parsing, API integration, and offline ephemerides (Mission 002B).

| Component | Responsibility |
|-----------|---------------|
| `jplHorizons` | JPL Horizons REST API client for Solar System body ephemerides with IAU/JPL DE440 fallback constants |
| `nasaPds` | NASA Planetary Data System parser and reference physical constants |
| `nasaExoplanetArchive` | NASA Exoplanet Archive TAP API client for confirmed exoplanet parameters |
| `esaGaia` | ESA Gaia DR3 astrometric catalogue client for stellar distances and kinematics |

**Dependencies:** Astronomy (constants)

---

### Universe (`src/universe/`)

**Purpose:** Procedural generation, observational data integration, and world representation.

| Component | Responsibility |
|-----------|---------------|
| `SeededRandom` | Deterministic PRNG with hierarchical seed derivation (`deriveSeed`, `fork`) |
| `AstronomicalProvenance` | Data provenance classification (`OBSERVED`, `DERIVED`, `PROCEDURAL`), citation strings, epochs (J2000.0 / TDB) |
| `CelestialBody` | Core data structure for all celestial objects (with physics state, provenance, and `StellarEvolutionState`) |
| `SolarSystemGenerator` | Procedural star + planet generation from seed (with isolated sub-PRNG stream for stellar evolution) |
| `canonicalSolarSystem` | Observational model of the Solar System (Sun, 8 planets, 3 dwarf planets, 19 natural satellites) based on NASA/JPL data |
| `Galaxy` | Domain model for galaxies, clusters, lightweight stars, and SMBH with radio jets |
| `GalaxyGenerator` | Procedural SBbc barred spiral galaxy generation from seed (500k ly disk, 750k ly halo, triaxial bar, ANANTARA A* SMBH) |
| `MilkyWayGenerator` | Real Milky Way generator (100k ly disk, 4 continuous arms + Orion Spur, oblate bulge $q = 0.35$, solar location $R_0 = 8.15\text{ kpc}$) |
| `Universe` | Top-level container, galaxy switching (`MILKY_WAY` vs `ANANTARA`), navigation, view level management, and system entry |

**Dependencies:** Physics (Vector3), Astronomy (constants, stellar, stellarEvolution, planetary), Data (jplHorizons)

**Key Design:**
- `GalaxyStar` is lightweight (position, color, seed) for rendering thousands
- `CelestialBody` is heavyweight (velocity, acceleration, physics state, stellar evolution, provenance) for simulation
- Full `CelestialBody` objects are only created or loaded when entering a star system
- Stellar evolution initialization derives from an isolated sub-stream (`rng.deriveSeed(888)`) to maintain 100% byte-for-byte invariance in planetary generation

---

### Engine (`src/engine/`)

**Purpose:** Simulation lifecycle, time management, and authoritative state ownership (Missions P0 & P1-B).

| Component | Responsibility |
|-----------|---------------|
| `SimulationClock` | Frame-rate-independent time with multipliers (up to $100,000\times$), substeps, and pause/resume |
| `SimulationEngine` | Single authoritative owner of live celestial bodies in system view. Implements `PropagationMode` (`ANALYTICAL_KEPLER` vs `NUMERICAL_N_BODY`), 4-step Velocity-Verlet integration, direct gravitational acceleration field evaluation ($m_1 = 1.0$), osculating element synchronization (`syncOsculatingElements`), `advanceStellarAge`, and `setStarAge` |

**Dependencies:** Physics (Vector3, gravity, integrator, orbitalElements), Astronomy (constants, stellarEvolution, stellarPlanetaryCoupling), Universe (CelestialBody)

**Note:** The engine is the authoritative owner of mutable celestial-body state during system view. Rendering and UI inspectors consume `engine.bodies` directly.

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
User clicks star (or uses Astronomical Search / Quick Action)
  → Selected star index stored
  → User clicks "Enter System" (or triggers direct jump)
  → Universe.enterStarSystem(index):
      → If star is Sol ('star-sun-sol'): loads createCanonicalSolarSystem() (NASA/JPL)
      → Otherwise: generates SolarSystem procedurally from star.seed
  → SimulationEngine initialized with system.bodies
  → Engine starts (10,000× speed default)
  → Scene renders system view using authoritative engine.bodies
```

### Solar System → Galaxy Transition
```
User clicks "Back to Galaxy" (or GALAXY view button)
  → Universe.exitStarSystem() clears system reference
  → Engine paused
  → View switches back to GalaxyScene
  → Previously selected star remains highlighted
```

### Simulation Loop (per frame, system view only)
```
requestAnimationFrame fires
  → useFrame callback receives wall-clock delta (wallDeltaMs)
  → SimulationEngine.update(wallDeltaMs)
    → SimulationClock.tick(wallDeltaMs) → substep array & totalDt
    → Branch by active PropagationMode:
        ├── ANALYTICAL_KEPLER (default):
        │     → propagateKeplerianBodies(totalDt) on exact conics (topological parent-child order)
        │     → integrateNonKeplerianBodies(substeps) via 4-step Velocity-Verlet for free bodies
        │     → Skips redundant O(N²) mutual force calculation each frame
        │
        └── NUMERICAL_N_BODY:
              → For each substep dt:
                  → integrateStep(dt) via 4-step Velocity-Verlet driven by mutual gravity
              → syncOsculatingElements() updates Keplerian elements from (r, v) state vectors
    → advanceStellarAge(deltaYears) advances stellar evolution lifecycles & coupling
  → 3D Scene / PlanetRenderer / CelestialBodyRenderer consume authoritative engine.bodies
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

## Planetary Environments Architecture (Mission 005A)

### Environmental Pipeline & Data Flow

```
Planetary Physical State (M, R) + Stellar Insolation (L_star, d, A)
  │
  ├──> computeSurfaceGravity(M, R) -> g (m/s²), g_rel (Earth = 1.0)
  ├──> computeEscapeVelocity(M, R) -> v_esc (km/s)
  ├──> isAtmosphereRetainedByGravity(v_esc) [Jeans escape threshold: v_esc >= 3.0 km/s]
  │
  ├──> Atmospheric Pressure (P_surf)
  │      └──> Airless (0 bar) if v_esc < 3.0 km/s
  │      └──> Parameterized volatile envelope for terrestrial / giant planets
  │
  ├──> 1D Semi-Grey Greenhouse Model:
  │      ├──> computeInfraredOpticalDepth(P_surf) -> τ_IR = τ_0 * (P/P_0)^0.5
  │      └──> computeSurfaceTemperature(T_eq, P_surf) -> T_surf = T_eq * (1 + 0.75 * τ_IR)^0.25
  │      └──> greenhouseWarmingK = T_surf - T_eq
  │
  ├──> Thermodynamic Water Phase State:
  │      ├──> computeWaterBoilingPoint(P_surf) via Clausius-Clapeyron relation
  │      └──> evaluateWaterPhaseState(T_surf, P_surf) -> Sublimating / Ice / Liquid / Steam
  │
  └──> Physical Thermal & Environmental Regime:
         └──> classifyThermalRegime(type, P_surf, T_surf, waterPhase)
                -> Airless Cryoworld | Airless Desolation | Glaciated Terrestrial
                   | Temperate Model Regime | Hyperthermic Runaway | Jovian Giant
```

---

## Astronomical Provenance & Data Ingestion Architecture (Mission 002B)

### Provenance Classification Framework

ASTRAVERSA Ω strictly demarcates empirical observations from synthetic generations via [`src/universe/AstronomicalProvenance.ts`](file:///d:/My%20Projects/ASTRAVERSA-%CE%A9/src/universe/AstronomicalProvenance.ts):

| Provenance Category | Meaning | Examples in System |
|---------------------|---------|---------------------|
| `OBSERVED` | Direct measurements from scientific missions and astrometric catalogues | JPL Horizons orbital elements, IAU planetary radii/masses, Gaia DR3 stellar coordinates |
| `DERIVED` | Quantities calculated deterministically from primary observational data via physical laws | Radiative equilibrium temperature, surface gravity, insolation flux, escape velocity |
| `PROCEDURAL` | Synthesized via pseudo-random number generator algorithms from a deterministic seed | ANANTARA α stars, procedural planetary atmospheres, synthetic star clusters |

Every canonical body carries an explicit `ProvenanceRecord` detailing data source (`DATA_SOURCE.NASA_JPL_HORIZONS`, `DATA_SOURCE.ESA_GAIA`, etc.), catalogue identifiers, measurement epochs (J2000.0 / TDB), and formal bibliographic citations.

### Data Ingestion Pipeline & Offline Resiliency

```
Astronomical APIs (JPL Horizons, NASA PDS, Exoplanet Archive, ESA Gaia)
  │
  ├──> Client Data Adapters (`src/data/`)
  │      ├──> Network Request (with browser CORS awareness)
  │      └──> Verified Fallback Ephemeris Dictionary (IAU/JPL DE440 ground-truth)
  │
  └──> Canonical Solar System Model (`canonicalSolarSystem.ts`)
         ├──> Sun, 8 Major Planets, 3 Dwarf Planets (Pluto, Ceres, Eris)
         ├──> 19 Major Natural Satellites with parent linkage
         └──> Rigorous Provenance & Physical Parameter Attribution
```

---

## Orbital Propagation & Authoritative State Architecture (Mission P0)

### Single Authoritative Simulation State

To eliminate parallel state desynchronization, `SimulationEngine` is established as the sole authoritative owner of live celestial bodies in system view:

```
Galaxy Navigation (Universe.ts)
  │  (on enterStarSystem)
  └──> engine.initialize(system.bodies)
         │
         ├──> Authoritative Simulation State (`engine.bodies`)
         │      ├── Vector3 position (meters, simulation frame)
         │      ├── Vector3 velocity (m/s)
         │      ├── Vector3 acceleration (m/s²)
         │      └── Live Orbital & Environmental Properties
         │
         ├──> Viewport Rendering (`Scene.tsx`) consumes `engine.bodies`
         ├──> UI Selection & Inspectors (`selectedBody`) consume `engine.getBody()`
         └──> System Editor (`SystemEditor.tsx`) consumes `engine.bodies`
```

Manual cross-array position/velocity synchronization loops have been eliminated. Edits to physical or orbital properties in `SystemEditor` apply directly to the authoritative body via `engine.updateBodyProperties()` and `engine.updateBodyOrbit()`.

### Propagation Modes (`PropagationMode`)

```ts
export const PropagationMode = {
  ANALYTICAL_KEPLER: 'ANALYTICAL_KEPLER', // Exact 2-body Keplerian conic rails (default)
  NUMERICAL_N_BODY: 'NUMERICAL_N_BODY',   // 4-step Velocity-Verlet driven by mutual gravity
} as const;
```

1. **`ANALYTICAL_KEPLER` Mode (Default):**
   - Bound planets and natural satellites advance along exact conic orbits via universal Kepler solver (`propagateKeplerOrbit`).
   - Propagates in hierarchical topological order (parents before satellites) so that moon positions rigorously incorporate their moving parent planet ($r_{\text{world}} = r_{\text{parent}} + r_{\text{moon}}$).
   - Skips redundant $O(N^2)$ mutual force calculations during normal frame ticks, guaranteeing zero CPU throttling and zero numerical drift over simulated millenia.
   - Non-Keplerian free bodies (probes, rogue objects) are stepped via 4-step Velocity-Verlet.

2. **`NUMERICAL_N_BODY` Mode:**
   - All bodies are stepped using the canonical 4-step Velocity-Verlet integration algorithm:
     $$\mathbf{r}(t + \Delta t) = \mathbf{r}(t) + \mathbf{v}(t)\Delta t + \frac{1}{2}\mathbf{a}(t)\Delta t^2$$
     $$\mathbf{a}(t + \Delta t) = \sum_{j \ne i} \frac{G M_j}{(\|\mathbf{r}_{ij}\|^2 + \epsilon^2)^{3/2}} \mathbf{r}_{ij}$$
     $$\mathbf{v}(t + \Delta t) = \mathbf{v}(t) + \frac{1}{2}\big(\mathbf{a}(t) + \mathbf{a}(t + \Delta t)\big)\Delta t$$
     $$\mathbf{a}(t) \leftarrow \mathbf{a}(t + \Delta t)$$
   - Evaluates the gravitational acceleration field directly by passing $m_1 = 1.0$ into `computeGravitationalForce()`, avoiding division by target mass and eliminating `0/0 = NaN` or `Infinity` instabilities for massless particles ($m = 0$) or lightweight probes.
   - Continuously computes and synchronizes instantaneous osculating orbital elements via `syncOsculatingElements()` and `cartesianToOrbital()`, ensuring UI telemetry and orbit paths reflect current dynamical perturbations.

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
