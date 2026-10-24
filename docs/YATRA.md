# यात्रा — YATRA
## Development Roadmap of ASTRAVERSA Ω

---

## Mission Structure

ASTRAVERSA Ω is developed through a series of **Missions** — focused milestones that build upon each other. Each mission adds capability while preserving architectural integrity.

---

## ✅ Mission 001 — PROJECT GENESIS
### "Birth of a Solar System"

**Status:** ✅ Complete

**Objective:** Establish the technical foundation and deliver a working vertical slice.

**Deliverables:**
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Physics primitives (Vector3, gravity, integrator)
- [x] Simulation engine with centralized clock
- [x] Deterministic procedural generation (SeededRandom)
- [x] Solar system generation (star + planets)
- [x] Astronomical models (stellar classification, planetary types)
- [x] 3D rendering (R3F scene, star, planets, orbits)
- [x] UI overlay (time controls, info panel, selection)
- [x] Test suite (6 test files, 47 test cases)
- [x] Documentation (DRISHTI, RACHANA, YATRA, TATTVA)

---

## ✅ Mission 002 — PRARAMBHA (प्रारम्भ)
### "Beginning / Origin — From Solar System to Galaxy"

**Status:** ✅ Complete

**Objective:** Transform the solar-system foundation into the first true galactic-scale ASTRAVERSA experience.

**Deliverables:**
- [x] Galaxy domain model (Galaxy, GalaxyStar, StarCluster, SpiralArmParams, BulgeParams)
- [x] Procedural spiral galaxy generator with logarithmic spiral arms
- [x] Central bulge with enhanced vertical extent
- [x] Exponential radial density distribution
- [x] Star cluster generation along spiral arms
- [x] Deterministic hierarchical seeding (Galaxy → Cluster → Star → System)
- [x] Lightweight GalaxyStar representation for performance
- [x] GPU-efficient star rendering (Points geometry + custom ShaderMaterial)
- [x] Temperature-based star coloring via spectral classification
- [x] Galactic core glow effect
- [x] Dust/nebula approximation (additive particle field)
- [x] Cinematic galaxy camera with auto-rotation
- [x] Star selection via raycasting
- [x] Galaxy → Star → Solar System drill-down navigation
- [x] Unified info panel (Galaxy / Cluster / Star / Body)
- [x] Quality levels (LOW / MEDIUM / HIGH star counts)
- [x] View hierarchy indicators (GALAXY ↔ SYSTEM)
- [x] Mission 001 solar system fully preserved
- [x] Test suite expanded (7 test files, 84 test cases)
- [x] Documentation updated (all 4 docs + README)
- [x] Scientific assumptions documented in TATTVA.md
- [x] TypeScript type-check clean
- [x] Production build successful

**Success Criteria:**
- Galaxy renders as a recognizable spiral structure
- Stars vary by spectral type (color, brightness)
- Central bulge is visually distinct and dense
- Camera can orbit and zoom the galaxy
- Individual stars can be selected
- Selected star → solar system transition works
- Solar system simulation runs correctly
- Back navigation to galaxy works
- All 84 tests pass
- TypeScript compiles cleanly
- Production build succeeds

---

## ✅ Mission 003 — GATI (गति): CELESTIAL MECHANICS & OBSERVATORY
### "Orbits Refined & Cinematic Observatory"

**Status:** ✅ Complete

**Objective:** Advanced Keplerian orbital mechanics, numerical stability, collision detection, and cinematic galaxy observatory.

**Deliverables:**
- [x] Keplerian orbital elements conversion (`orbitalElements.ts`)
- [x] Universal Kepler solver and state vector propagation
- [x] Polar, retrograde, and high-eccentricity orbit dynamics
- [x] Orbital resonance identification and period ratio analysis (`orbitalResonance.ts`)
- [x] Collision detection and elastic/inelastic impulse kinematics (`collisionDetection.ts`)
- [x] Conservation diagnostics (energy, linear momentum, angular momentum)
- [x] Mission 003A: Galaxy Observatory control audit (star counts, cloud densities, spiral morphology, rigid rotation separation)
- [x] Test suite expanded (+28 orbital tests, +14 resonance tests, +15 collision tests, +13 conservation tests, +17 observatory tests, +8 parameter audit tests)

---

## ✅ Mission 004 — STELLAR EVOLUTION (Vertical Slice)
### "Life and Death of Stars"

**Status:** ✅ Complete (Vertical Slice)

**Objective:** Scientifically grounded, deterministic stellar lifecycle evolution driven by simulation time and physical parameters.

**Deliverables:**
- [x] Analytic piecewise stellar evolution model (`src/astronomy/stellarEvolution.ts`)
- [x] Zero-Age Main Sequence (ZAMS) mass-luminosity and mass-radius scaling
- [x] Stefan-Boltzmann thermodynamic consistency ($L = 4\pi R^2 \sigma T_{\text{eff}}^4$ in SI units)
- [x] Main-sequence lifetime calculation ($\tau_{\text{MS}} \approx 10^{10} (M/M_\odot)^{-2.5}\text{ yr}$) with convective and radiative asymptotic limits
- [x] Evolutionary phases: Main Sequence (V), Subgiant (IV), Red Giant Branch (III), Core Helium Burning / Horizontal Branch, Asymptotic Giant Branch, and White Dwarf cooling (VII)
- [x] Hayashi convective boundary limit for realistic red giant expansion ($R \sim 50 - 150 R_\odot$)
- [x] Degenerate White Dwarf cooling track (Mestel's cooling law) and core-collapse endpoints
- [x] Deterministic PRNG isolation (`rng.deriveSeed(888)`) in solar system generation preserving 100% byte-for-byte planetary invariance
- [x] Simulation engine integration (`advanceStellarAge` and `setStarAge`) linking physical updates to clock progression
- [x] Interactive UI timeline controls (`+500 MYR`, `+1.0 GYR`, `+2.5 GYR`, `↺ RESET ZAMS`)
- [x] Deterministic test suite (23 tests in `tests/stellarEvolution.test.ts`, 214 total test suite passing)
- [x] Clean typecheck (`tsc -b`) and production build

---

## ✅ Mission 004B — STELLAR–PLANETARY COUPLING
### "Radiative Equilibrium & Habitable Zones"

**Status:** ✅ Complete

**Deliverables:**
- [x] Planetary radiative-equilibrium temperature ($T_{\mathrm{eq}} = ((L_\star (1 - A)) / (16\pi\sigma d^2))^{1/4}$) based on authoritative stellar luminosity, orbital distance, and Bond albedo.
- [x] Circumstellar habitable zone model based on Kopparapu et al. (2013, 2014) 1D climate model parameterization (Recent Venus, Runaway Greenhouse, Maximum Greenhouse, Early Mars).
- [x] Temperature validity clamping ($[2600, 7200]\text{ K}$) preventing 4th-order polynomial divergence for evolved blue stars or cool compact remnants.
- [x] Dynamic coupling updating star habitable zone boundaries and planetary equilibrium temperatures/habitability statuses as simulation time flows or timeline is scrubbed.
- [x] Deterministic PRNG isolation (`planetRng.deriveSeed(777)`) preserving 100% byte-for-byte planetary orbital and physical determinism.
- [x] Sleek UI inspector integration (`SystemPlanetInfo`, `SystemStarInfo`, `InfoPanel`) with clear SI units, Celsius conversions, habitability status badges, and explicit scientific assumption/limitation disclaimers.
- [x] Deterministic test suite (28 tests in `tests/stellarPlanetaryCoupling.test.ts`).
- [x] Clean typecheck (`tsc -b`) and production build.

---

## 🚀 Mission 005A — PLANETARY ENVIRONMENTS & THERMAL REGIMES
### "Energy Balance, Atmospheric Retention & Thermal Regimes (First Vertical Slice)"

**Status:** Completed (Ready for Acceptance)

**Delivered:**
- [x] Pure scientific module `src/astronomy/planetaryEnvironment.ts` with focused test suite `tests/planetaryEnvironment.test.ts` (31 tests).
- [x] Surface gravitational acceleration ($g = G M / R^2$) and escape velocity ($v_{\mathrm{esc}} = \sqrt{2GM/R}$) primitives with strict unit tests.
- [x] Thermal Jeans escape criterion ($v_{\mathrm{esc}} \ge 3.0\text{ km/s}$) for atmospheric volatile retention.
- [x] Surface atmospheric pressure parameterization ($P_{\mathrm{surf}}$ in bar and Pa) with airless body distinction ($P = 0$).
- [x] 1D semi-grey plane-parallel radiative equilibrium surface temperature ($T_{\mathrm{surf}} = T_{\mathrm{eq}} (1 + \frac{3}{4}\tau_{\mathrm{IR}})^{1/4}$), clearly distinguished from bare-rock $T_{\mathrm{eq}}$.
- [x] Pressure-broadened infrared optical depth scaling ($\tau_{\mathrm{IR}} \propto P^{0.5}$), reproducing Earth's natural greenhouse warming ($\Delta T \approx +33.2\text{ K}$) and Venus/Mars analogues.
- [x] Clausius-Clapeyron water boiling curve and triple-point sublimation threshold ($6.12\text{ mbar}$).
- [x] Physical thermal regimes taxonomy (`AIRLESS_CRYOWORLD`, `AIRLESS_DESOLATION`, `GLACIATED_TERRESTRIAL`, `TEMPERATE_MODEL_REGIME`, `HYPERTHERMIC_RUNAWAY`, `JOVIAN_GAS_GIANT`, `JOVIAN_ICE_GIANT`).
- [x] Deterministic PRNG isolation (`planetRng.deriveSeed(999)`) in `SolarSystemGenerator.ts` preserving 100% byte-for-byte planetary orbital determinism.
- [x] Dynamic simulation engine synchronization in `SimulationEngine.ts` updating surface temperatures and thermal regimes as stellar luminosity evolves.
- [x] UI inspector integration in `InfoPanel.tsx` and `GalaxyInfoPanel.tsx` with formatted parameters, thermal regime badges, and explicit scientific limitations disclaimers.
- [x] Full test suite expanded to 16 test files, 275 tests passing (100% pass rate).
- [x] Clean typecheck (`tsc -b`) and production build (`npm run build`).

---

## 🔮 Mission 005B — PLANETARY SURFACES & GEOLOGY
### "Terrain, Crustal Dynamics & Surface Visualization"

**Status:** Planned

**Objective:** Planetary detail beyond orbiting spheres.

**Key Features:**
- Procedural terrain generation
- Atmospheric composition and appearance
- Temperature modeling (distance, atmosphere, albedo)
- Day/night cycles
- Surface zoom view

**Dependencies:** Mission 004 complete

---

## 🔮 Mission 006 — LIVING WORLDS
### "Oceans, Weather, and Life"

**Status:** Planned

**Objective:** Dynamic planetary environments.

**Key Features:**
- Ocean modeling
- Simplified climate simulation
- Weather patterns
- Habitability zones
- Basic biosphere indicators

**Dependencies:** Mission 005 complete

---

## 🔮 Future Missions (Outline)

| Mission | Title | Focus |
|---------|-------|-------|
| 007 | Genesis of Life | Abiogenesis, simple organisms |
| 008 | Tree of Life | Genetics, evolution, speciation |
| 009 | Ecosystems | Food webs, population dynamics |
| 010 | Awakening | Intelligence, tool use |
| 011 | Civilization | Society, technology, culture |
| 012 | Starfarers | Space colonization, interstellar travel |
| 013 | The Laboratory | Scientific experimentation tools |
| 014 | The Oracle | AI-assisted universe analysis |
| 015 | Multiverse | Branching timelines, universe comparison |

---

## Development Principles

1. **Each mission must leave the codebase better than it found it.**
2. **No mission should break functionality from previous missions.**
3. **Architecture decisions made early must support features planned later.**
4. **Simple models first, refined models later.**
5. **Tests are not optional — they are the foundation of trust.**

---

*The journey is the destination. Each mission brings the universe closer to life.*
