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

## Galaxy Model (Mission 002)

### Current Implementation: Simplified Spiral Galaxy

The galaxy is a procedural approximation of a barred/unbarred spiral galaxy, loosely inspired by Milky Way proportions but NOT a reconstruction.

### Spiral Arm Geometry

**Mathematical model:** Logarithmic spiral arms.

```
θ(r) = windingFactor × ln(r / scaleRadius) + armPhaseOffset
```

**Where:**

- `r` = galactocentric radius (kpc)
- `windingFactor` ∈ [0.4, 0.8] — controls spiral tightness
- `scaleRadius` = 0.5 kpc — inner reference radius
- `armPhaseOffset` = initial angular offset of each arm

Stars are scattered around the ideal spiral curve with Gaussian noise in the angular direction, creating realistic arm width variation.

**Number of arms:** 2–4 (randomly determined per galaxy seed).

### Radial Density Distribution

**Model:** Exponential disk profile.

```
ρ(r) ∝ exp(-r / scaleLength)
```

**Implementation:** Inverse CDF sampling.

```
r = -scaleLength × ln(1 - u × (1 - exp(-rMax / scaleLength)))
```

where `u ~ Uniform(0,1)`.

This ensures more stars are generated toward the galactic center, reproducing the exponential disk profile observed in real spiral galaxies.

### Star Population Distribution

Stars are distributed across three regions:

| Region | Fraction | Method |
| -------- | ---------- | -------- |
| Central Bulge | ~15% | 3D Gaussian, wider vertical extent |
| Spiral Arms | ~60% | Arm-following with Gaussian scatter |
| Inter-arm / Field | ~25% | Exponential radial, uniform angular |

### Central Bulge

**Model:** 3D Gaussian distribution.

```
x ~ N(0, bulgeRadius × 0.4)
y ~ N(0, bulgeThickness × 0.3)
z ~ N(0, bulgeRadius × 0.4)
```

**Parameters:**

- `bulgeRadiusFraction` ∈ [0.08, 0.15] of galaxy radius
- `bulgeVerticalScale` ∈ [1.5, 3.0] — thicker than the disk
- `bulgeDensityMultiplier` ∈ [3, 6] — higher star density

### Vertical Distribution

**Disk stars:** Thin Gaussian in Y.

```
y ~ N(0, diskThickness × 0.15)  (arm stars)
y ~ N(0, diskThickness × 0.2)   (field stars)
```

**Bulge stars:** Wider Gaussian in Y.

```
y ~ N(0, diskThickness × bulgeVerticalScale × 0.3)
```

This produces a thin disk with a thicker central bulge, consistent with the general morphology of spiral galaxies.

### Galaxy Properties

| Property | Range | Unit |
| ---------- | ------- | ------ |
| Radius | 12 – 18 | kpc |
| Disk thickness | 0.3 – 0.6 | kpc |
| Age | 10 – 13.5 | Gyr |
| Estimated population | 100 – 400 | billion stars |
| Metallicity | 0.3 – 0.8 | dimensionless index |
| Spiral arms | 2 – 4 | count |
| Star clusters | 20 – 40 | count |

### Known Limitations — Galaxy

- Only spiral galaxies are implemented. Elliptical and irregular types are defined but not generated.
- No galactic rotation or dynamics. Stars are static at galaxy scale.
- No bar structure (barred spiral arms).
- No galactic halo or globular cluster population.
- No dark matter model or gravitational potential.
- Star count is a representative sample (thousands), not the true population (billions).
- Spiral arm structure is mathematically imposed, not emergent from dynamics.
- Cluster placement favors spiral arms but does not model physical cluster formation.
- Metallicity gradient is simplified (linear radial decay with noise).

### Future Improvements — Galaxy

- Barred spiral morphology
- Galactic rotation curves
- Multiple galaxy types (elliptical, irregular, dwarf)
- Globular cluster halo
- Dark matter halo potential
- Progressive LOD with distance
- Seamless zoom from galaxy to star system

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

### Galaxy-Scale Rendering

- Stars rendered as `Points` geometry with additive blending and custom shaders.
- Point size scales with luminosity and attenuates with camera distance.
- Colors derived from spectral classification (temperature → color mapping).
- Core glow uses a billboard plane with additive blending.
- Dust field uses scattered large particles with very low opacity, positioned near existing stars.

### Quality Levels

| Level | Star Count | Target Use |
| ------- | ----------- | ----------- |
| LOW | 8,000 | Lower-end hardware |
| MEDIUM | 20,000 | Normal gaming laptop |
| HIGH | 40,000 | Higher-end GPU |

### Known Limitations — Rendering

- No volumetric rendering. Dust is approximated by scattered particles.
- No post-processing bloom (relies on additive blending for glow effect).
- Point sprites have no 3D structure at close range.
- Raycasting on Points geometry may miss stars at extreme distances.
- No seamless zoom transition between galaxy and system views.

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
