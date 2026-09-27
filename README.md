# ASTRAVERSA Ω

> *Create. Simulate. Evolve. Discover.*

An interactive computational universe laboratory.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npx vitest run

# Type checking
npx tsc -b

# Production build
npm run build
```

---

## What You'll See

**Galaxy View:** A procedurally generated spiral galaxy with 20,000+ stars, visible spiral arms, a luminous central bulge, and dust-like nebular structure. Stars are colored by their spectral classification — from cool red M-dwarfs to rare hot blue O-type stars.

**Star System View:** Select any star and enter its solar system. Planets orbit under Newtonian gravity, simulated with the Velocity Verlet integrator. Time can be accelerated from 1× to 1,000,000×.

---

## Architecture

ASTRAVERSA Ω is built as six isolated subsystems:

| Module | Purpose |
|--------|---------|
| `src/physics/` | Vectors, gravity, numerical integration |
| `src/astronomy/` | Stellar/planetary models, constants |
| `src/universe/` | Procedural generation (galaxy + solar system), world state |
| `src/engine/` | Simulation clock, physics orchestration |
| `src/rendering/` | 3D visualization (React Three Fiber) |
| `src/ui/` | Controls, panels, navigation, application shell |

**Key principle:** Simulation logic never depends on rendering. Rendering never contains simulation rules.

---

## Hierarchy

```
Universe (seed)
  → Galaxy (spiral arms, bulge, clusters)
    → Star Clusters (20–40 per galaxy)
    → Stars (8K–40K representative, lightweight)
      → Solar System (generated on demand from star seed)
        → Star + Planets (full physics simulation)
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [DRISHTI.md](docs/DRISHTI.md) | Vision and design philosophy |
| [RACHANA.md](docs/RACHANA.md) | System architecture |
| [YATRA.md](docs/YATRA.md) | Development roadmap |
| [TATTVA.md](docs/TATTVA.md) | Scientific assumptions and limitations |

---

## Technology Stack

- **Frontend:** React 19 + TypeScript 6
- **3D:** Three.js + React Three Fiber + Drei
- **Build:** Vite 8
- **Testing:** Vitest

---

## Missions

| Mission | Name | Status |
|---------|------|--------|
| 001 | **Project Genesis** — Birth of a Solar System | ✅ Complete |
| 002 | **Prarambha** — From Solar System to Galaxy | ✅ Complete |
| 003 | Celestial Mechanics — Orbits Refined | 🔮 Planned |
| 004 | Stellar Evolution — Life and Death of Stars | 🔮 Planned |

---

## License

This project is private and not yet licensed for distribution.
