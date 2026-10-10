# तत्त्व — TATTVA

## Scientific Principles of ASTRAVERSA Ω

---

## Purpose

This document records the scientific assumptions, mathematical simplifications, simulation principles, and known limitations of ASTRAVERSA Ω's computational models.

Every model in ASTRAVERSA Ω is a simplification of reality. This document ensures that:

1. No model is mistaken for research-grade accuracy.
2. Every simplification is deliberate and documented.
3. Future improvements have a clear starting point.

---

## Galaxy Model — ANANTARA α (Colossal Barred Spiral)

### Galaxy Identity, Classification, and Scale Inspiration

The primary galactic system in ASTRAVERSA Ω is **ANANTARA α** (canonical seed `42`, immutable identifier `galaxy-42`, formerly referenced as Orion Gate in early prototype iterations). It is modeled as a colossal SBbc barred spiral galaxy. Its morphological design draws from Milky Way barred spiral dynamics (Bland-Hawthorn & Gerhard 2016, Reid et al. 2019), while its colossal structural scale is inspired by giant galaxies such as IC 1101.

> [!NOTE]
> **Fictional Simulation Settings Disclaimer:**
> All physical dimensions, stellar counts, black hole mass options, and structural parameters of ANANTARA α are fictional simulation parameters engineered for scientific visualization and cinematic exploration. They are not observational claims regarding any specific real-world celestial object.

---

### Three-Tier Extent Definitions and Spatial Separation

To maintain strict scientific and morphological clarity, ANANTARA α strictly separates luminous stellar bodies, diffuse halo envelopes, and circumgalactic plasma structures:

1. **Main Stellar-Body Extent (500,000 Light-Years / ~153.3 kpc Diameter):**
   - **Galactocentric Radius ($R_{\text{disk}}$):** $\approx 76.65\text{ kpc}$ ($250,000\text{ ly}$).
   - **Physical Definition:** The boundary of the luminous stellar disk containing $>95\%$ of active stellar mass, the dual exponential thin/thick disks, all four continuous spiral arms, the triaxial bar, and cold molecular gas / dust lanes.
2. **Extended Stellar Halo Extent (750,000 Light-Years / ~230.0 kpc Diameter):**
   - **Galactocentric Radius ($R_{\text{halo}}$):** $\approx 115.0\text{ kpc}$ ($375,000\text{ ly}$).
   - **Physical Definition:** The diffuse spheroidal stellar envelope composed of ancient Population II stars, outer globular clusters, and tidal debris extending into the circumgalactic medium.
3. **Relativistic Radio Jets & Synchrotron Lobes (Circumgalactic Plasma):**
   - **Total Tip-to-Tip Extent:** $\approx 339,202\text{ ly}$ ($\approx 104\text{ kpc}$) at baseline $4.154\times 10^6 M_\odot$, dynamically scaling up to $\approx 782,774\text{ ly}$ ($\approx 240\text{ kpc}$) at $40\times 10^9 M_\odot$.
   - **Scientific Separation Rule:** The radio lobes represent magnetized non-thermal relativistic plasma ejected along the rotational axis. **Under no circumstances is the galaxy's stellar body diameter claimed to include radio jets or lobes.**

---

### Central Triaxial Bar Structure

ANANTARA α features a prominent triaxial galactic bar connecting the central bulge to the primary spiral arm origins:

- **Semi-major axis ($a$):** $\approx 19.93\text{ kpc}$ ($65,000\text{ ly}$, $0.26 R_{\text{disk}}$).
- **Semi-minor axis ($b$):** $\approx 6.58\text{ kpc}$ ($21,450\text{ ly}$, axis ratio $\approx 0.33$).
- **Vertical scale height ($h_z$):** $3.5\text{ kpc}$ ($11,415\text{ ly}$).
- **Position angle ($\phi$):** $28^\circ$ ($0.4887\text{ rad}$) relative to the galactocentric major axis.
- **Population:** $\approx 16\%$ of total stellar mass, enriched in mature, metal-rich stars exhibiting golden/amber spectral profiles ($4,000 - 5,500\text{ K}$).
- **Leading Shock Dust Lanes:** Dual offset extinction lanes aligned along the leading edges of the bar potential ($u \in [-a, a], v = \pm 0.45 b$), representing compressed interstellar gas transitioning into the inner Lindblad resonance.

---

### Four-Arm Continuous Spiral Architecture

The disk features four grand-design logarithmic spiral arms with continuous tangential branching from the ends of the bar:

```
r(θ) = r_0 × exp(θ × tan(ψ))
```

1. **Scutum-Centaurus Arm:** Originates at positive bar tip ($\theta_0 \approx 28^\circ$, phase offset $0\text{ rad}$).
2. **Perseus Arm:** Originates at negative bar tip ($\theta_0 \approx 208^\circ$, phase offset $\pi\text{ rad}$).
3. **Norma-Outer Arm:** Inner branch with quadrant symmetry (phase offset $\pi/2\text{ rad}$).
4. **Sagittarius-Carina Arm:** Outer branch with quadrant symmetry (phase offset $3\pi/2\text{ rad}$).

- **Pitch Angle ($\psi$):** $12^\circ$ ($0.21\text{ rad}$).
- **Morphological Features:** Radiant blue-white OB star-forming associations ($>10,000\text{ K}$), pink/magenta H II emission nebulae ($656.3\text{ nm}$ H-alpha proxy), and dark trailing dust extinction lanes.

---

### Dual Exponential Disk Decomposition

The vertical and radial distribution implements a two-component galactic disk:

- **Thin Disk:** Scale length $h_R \approx 19.16\text{ kpc}$, scale height $h_z \approx 1.5\text{ kpc}$ ($4,892\text{ ly}$). Hosts young Population I stars, open clusters, and active molecular clouds.
- **Thick Disk:** Scale length $h_R \approx 22.99\text{ kpc}$, scale height $h_z \approx 4.5\text{ kpc}$ ($14,677\text{ ly}$). Hosts kinematically heated, older intermediate-population stars.

---

### Central Supermassive Black Hole (ANANTARA A*) & High-Energy Phenomena

At the gravitational focus ($r = 0$) sits **ANANTARA A***, featuring dynamic mass configuration and mathematically derived physical parameters:

#### 1. Configurable Mass Presets
- **Baseline (Milky Way Sgr A* Analogue):** $4.154 \times 10^6 M_\odot \approx 8.260 \times 10^{36}\text{ kg}$
- **Intermediate Active Nucleus:** $5.0 \times 10^7 M_\odot \approx 9.942 \times 10^{37}\text{ kg}$
- **Giant Elliptical / M87 Class:** $1.0 \times 10^9 M_\odot \approx 1.988 \times 10^{39}\text{ kg}$
- **Colossal Ultramassive (IC 1101 Central Class):** $4.0 \times 10^{10} M_\odot \approx 7.954 \times 10^{40}\text{ kg}$

#### 2. Astrophysical Derivations
- **Schwarzschild Radius:**
  $$r_s = \frac{2GM}{c^2} \approx 2.953\text{ km} \times \left(\frac{M}{M_\odot}\right)$$
  - Baseline ($4.154\text{M} M_\odot$): $1.227 \times 10^{10}\text{ m} \approx 0.08203\text{ AU}$ ($12.27\text{ million km}$).
  - Colossal ($40\text{B} M_\odot$): $1.181 \times 10^{14}\text{ m} \approx 789.88\text{ AU}$ ($118.14\text{ billion km}$).
- **Photon Sphere:** $r_{\text{ph}} = 1.5 r_s$ (from $0.123\text{ AU}$ up to $2,369.65\text{ AU}$).
- **Eddington Luminosity:**
  $$L_{\text{Edd}} = \frac{4\pi G M m_p c}{\sigma_T} \approx 1.26 \times 10^{31}\text{ W} \times \left(\frac{M}{M_\odot}\right)$$
  - Baseline: $5.23 \times 10^{37}\text{ W}$ ($1.37 \times 10^{11} L_\odot$).
  - Colossal: $5.04 \times 10^{41}\text{ W}$ ($1.32 \times 10^{15} L_\odot$).
- **Stellar Velocity Dispersion ($\sigma$ via $M$-$\sigma$ Relation):**
  $$\sigma \approx 200\text{ km/s} \times \left(\frac{M}{10^8 M_\odot}\right)^{1/4.38}$$
  - Baseline: $\approx 96.6\text{ km/s}$; Colossal: $\approx 782.9\text{ km/s}$.
- **Gravitational Sphere of Influence:**
  $$r_{\text{infl}} = \frac{GM}{\sigma^2}$$
  - Baseline: $\approx 1.91\text{ pc}$ ($6.23\text{ ly}$); Colossal: $\approx 280.9\text{ pc}$ ($916.3\text{ ly}$).

#### 3. Accretion Disk Simulation
- **Particle Population:** 4,800 tracer particles across $0.8 - 4.5$ visual scene units.
- **Keplerian Differential Rotation:** Angular velocity $\Omega(r) \propto r^{-1.25}$.
- **Doppler Relativistic Beaming:** Orbital velocity modulates apparent particle brightness and color temperature, shifting approaching gas toward blue-white and receding gas toward red.
- **Thermal Gradient:** Extreme inner edge emission ($T > 10^6\text{ K}$, white-gold) transitioning to outer cooler boundary ($T \approx 10^4\text{ K}$, deep orange-red).

#### 4. Relativistic Bipolar Jets and Synchrotron Radio Lobes
- **Collimated Beam:** Conical outflows along the $\pm Y$ rotational axis with opening angle $\theta_{\text{jet}} \approx 2.4^\circ$.
- **Shock Nodes:** Periodic standing shocks simulated via high-frequency longitudinal modulation ($1.8 \times 10^3\text{ ly}$ intervals).
- **Terminal Synchrotron Lobes:** Extended spheroidal lobes at the jet termini ($\pm 52\text{ kpc}$ at baseline, scaling to $\pm 120\text{ kpc}$ at $40\text{B} M_\odot$), representing decelerating relativistic electrons interacting with circumgalactic magnetic fields.

#### 5. Scientific Visual Scale Representation
To allow visual inspection within a galaxy-scale camera without misrepresenting physical reality:
- The event horizon shadow sphere is rendered at an inspectable visual marker scale ($r_{\text{visual}} = 1.0\text{ units} \approx 0.76\text{ kpc}$ in normalized galaxy space).
- The inspector explicitly displays a scale separation disclaimer: *Actual physical event horizon ($r_s$) is microscopic compared to the galactic disk ($0.082 - 790\text{ AU}$ vs $153\text{ kpc}$). The visible black sphere is a scaled simulation marker.*

---

### Deterministic Architecture and Backward Compatibility

- **Seed Branching:** All structural components (triaxial bar, 4-arm branches, stellar halo, SMBH, accretion disk, jets) use isolated PRNG streams via `rng.fork()`.
- **Invariance:** Star indices (`gs-42-i`), core galaxy ID (`galaxy-42`), camera navigation states, and procedural solar-system drill-down remain $100\%$ backward-compatible.

---

### Measured Hardware Performance & Telemetry

Empirical measurements on local hardware (Chromium headless/active GPU):
- **Rendering Performance:** 60 – 63 FPS (sustained average 61 FPS across all waypoints, including active accretion disk and radio jets).
- **GPU Canvas Resolution:** $1920 \times 962$ physical pixels ($1536 \times 770$ CSS viewport).
- **Memory Consumption:** JS Heap 83 – 85 MB used out of 123 MB allocated (4,192 MB ceiling).
- **Procedural Generation Time:** $\approx 25\text{ ms}$ for 20,000 stars, 36 starburst clusters, triaxial bar, 4 arms, central nucleus, accretion disk, and jet structures.
- **Automated Test Suite:** 12 test files, 169 tests passing ($100\%$ success rate).

---

## Star Cluster Model

### Current Implementation

Clusters are placed preferentially along spiral arms with Gaussian scatter from the arm center.

| Property | Range | Unit |
| ---------- | ------- | ------ |
| Radius | 0.05 – 0.3 | kpc |
| Population estimate | 100 – 10,000 | stars |
| Count | 20 – 40 | per galaxy |

### Known Limitations — Clusters

- Clusters are placed randomly near arms, not from physical fragmentation.
- No distinction between open clusters, globular clusters, and associations.
- Cluster population is estimated, not individually generated.
- Stars assigned to clusters via simple proximity check, not membership criteria.

---

## Star Population Sampling

### Current Implementation

Representative stars are sampled with a weighted mass distribution approximating the initial mass function (IMF):

| Spectral Class | Mass Range (M☉) | Sampling Probability |
| ---------------- | ----------------- | --------------------- |
| M | 0.08 – 0.45 | 30% |
| K | 0.45 – 0.8 | 25% |
| G | 0.8 – 1.04 | 25% (boosted for visibility) |
| F | 1.04 – 1.4 | 10% |
| A | 1.4 – 2.1 | 6% |
| B | 2.1 – 10 | 3% |
| O | 10 – 30 | 1% |

This distribution is intentionally biased toward visible/interesting star types compared to the true IMF (which would produce ~76% M-dwarfs).

### Known Limitations — Sampling

- True IMF would produce far more M-dwarfs than visually interesting.
- Binary/multiple star systems not modeled.
- No pre-main-sequence or post-main-sequence stars.
- Metallicity affects appearance but not mass distribution.

---

## Rendering Approximations (Mission 002)

### Galaxy-Scale Rendering & Observatory Model

- **Dual-Profile Stellar Shader**: Dual optical component combining a cubic-falloff diffraction core with an exponential Airy-disk atmospheric halo, dynamic white-hot saturation for high luminosity stars, and seed-driven organic twinkling.
- **Interstellar Extinction Lanes**: Procedural dark dust clouds concentrating on the inner compression ridges of logarithmic spiral arms using normal blending to silhouette stars behind them.
- **Stellar Nurseries & H II Nebulae**: Clusters rendered with ionized hydrogen emission (H-alpha pink/cyan) envelopes surrounding radiant young OB stellar cores.
- **Galactic Halo**: Ancient Population II low-metallicity stars distributed in a flattened spheroidal halo ($c/a \approx 0.65$).
- **Galactic Core Glow**: Continuous radial quadratic falloff shader centered on the galactic nucleus.
- **Kinematic Rotation Curve**: Live telemetry orbital speed calculated via flat dark-matter rotation profile:
  $$v(r) \approx v_0 \sqrt{\frac{r}{r + r_c}}$$
  where $v_0 = 220\text{ km/s}$ and $r_c = 1.2\text{ kpc}$, yielding asymptotic flat rotation across the disk.

### Quality Levels

| Level | Star Count | Target Use |
| ------- | ----------- | ----------- |
| LOW | 8,000 | Lower-end hardware |
| MEDIUM | 20,000 | Normal gaming laptop |
| HIGH | 40,000 | Higher-end GPU |

### Known Limitations — Rendering

- Dust uses particle-based normal-blended extinction rather than full volumetric radiative transfer.
- No post-processing bloom pass (optical profiles are synthesized analytically in the point shaders).
- Point sprites attenuate optically but have no resolved stellar surface at sub-parsec distances.
- Seamless multi-scale continuous camera zooming across orders of magnitude is planned for future milestones.

---

## Gravitational Model

### Current Implementation: Simplified Newtonian Gravity

**Formula:**

```
F = G × m₁ × m₂ / (r² + ε²) × r̂
```

**Where:**

- `G` = 6.6743 × 10⁻¹¹ m³ kg⁻¹ s⁻² (gravitational constant)
- `m₁, m₂` = masses of the two bodies (kg)
- `r` = distance between bodies (m)
- `r̂` = unit vector from body 1 toward body 2
- `ε²` = softening parameter (10⁻¹⁰) to prevent singularity

### Scope

- **Active in:** Solar system view (planet-scale orbital mechanics)
- **Not active at:** Galaxy scale (stars are static positions)

### Assumptions

- Point-mass approximation
- No relativistic corrections
- No tidal forces
- No radiation pressure
- Softening parameter prevents infinite forces at zero distance

### Known Limitations

- Orbits may drift over very long simulation periods
- No frame-dragging or gravitational lensing
- No gravitational wave emission

---

## Numerical Integration

### Current Implementation: Velocity Verlet (Störmer-Verlet)

**Algorithm:**

```
x(t+dt) = x(t) + v(t)·dt + 0.5·a(t)·dt²
a(t+dt) = F(x(t+dt)) / m
v(t+dt) = v(t) + 0.5·(a(t) + a(t+dt))·dt
```

### Known Limitations

- Fixed timestep (no adaptive step size)
- Energy drift over millions of orbits
- Not suitable for highly eccentric orbits

---

## Time System

| Parameter | Value |
| ----------- | ------- |
| Internal unit | Seconds (SI) |
| Clock independence | Frame-rate independent |
| Substep max | 3,600 s (1 hour) |
| Max substeps/frame | 100 |
| Multipliers | 0 (paused), 1×, 10×, 100×, 1000×, 1,000,000× |
| Active scope | Solar system view only |

---

## Procedural Generation

### Current Implementation: Mulberry32 PRNG

**Properties:**

- Period: ~2³²
- Deterministic: same seed → same sequence
- Fast: single multiplication per step
- Hierarchical: `fork()` / `deriveSeed()` for child generators

### Hierarchical Seeding

```
Universe Seed
  → Galaxy Seed (= universe seed)
    → Cluster Seeds (fork(1000).fork(clusterIndex))
    → Star Seeds (fork(2000).fork(region).fork(starIndex))
      → Planet Seeds (fork(planetIndex))
```

### Known Limitations

- Period of 2³² may be insufficient for extremely large universes
- Simple hash function for seed derivation; collision probability increases with hierarchy depth

---

## Stellar Model

### Current Implementation: Simplified Main-Sequence Relations

**Mass-Luminosity:** `L = L☉ × (M/M☉)^3.5`
**Mass-Radius:** `R = R☉ × (M/M☉)^0.8`
**Temperature:** `T ≈ T☉ × (M/M☉)^0.6`

### Spectral Classification

| Class | Mass Range (M☉) | Temp Range (K) | Color |
| ------- | ----------------- | ---------------- | ------- |
| O | 16 – 150 | 30,000 – 50,000 | Blue-white |
| B | 2.1 – 16 | 10,000 – 30,000 | Blue-white |
| A | 1.4 – 2.1 | 7,500 – 10,000 | White |
| F | 1.04 – 1.4 | 6,000 – 7,500 | Yellow-white |
| G | 0.8 – 1.04 | 5,200 – 6,000 | Yellow |
| K | 0.45 – 0.8 | 3,700 – 5,200 | Orange |
| M | 0.08 – 0.45 | 2,400 – 3,700 | Red |

---

## Planetary Model

### Current Implementation

**Orbital Placement:** Titius-Bode-like geometric progression.
**Planet Types:** Rocky (<2 AU), Gas Giant (2–10 AU), Ice Giant (>10 AU).
**Orbital Velocity:** Circular orbit: `v = √(G × M_star / r)`

---

## Scale Hierarchy

| Scale | Represented Objects | Physics | Rendering |
| ------- | ------------------- | --------- | ----------- |
| Galaxy | Galaxy, clusters, stars (×20K) | None (static structure) | Points geometry |
| Star System | Star, planets (×3–8) | Newtonian gravity, Verlet | Individual meshes |
| Planet | Future: surface, atmosphere | Future | Future |

This hierarchy is essential for scalability. At each level, only the appropriate simulation detail is active.

---

## Constants Reference

| Constant | Value | Unit |
| ---------- | ------- | ------ |
| G | 6.6743 × 10⁻¹¹ | m³ kg⁻¹ s⁻² |
| c | 2.998 × 10⁸ | m/s |
| M☉ | 1.989 × 10³⁰ | kg |
| R☉ | 6.957 × 10⁸ | m |
| L☉ | 3.828 × 10²⁶ | W |
| T☉ | 5,778 | K |
| M⊕ | 5.972 × 10²⁴ | kg |
| R⊕ | 6.371 × 10⁶ | m |
| AU | 1.496 × 10¹¹ | m |
| kpc | 3.086 × 10¹⁹ | m |
| σ | 5.670 × 10⁻⁸ | W m⁻² K⁻⁴ |

---

*Every number is a simplification. Every simplification is a door to future refinement.*
