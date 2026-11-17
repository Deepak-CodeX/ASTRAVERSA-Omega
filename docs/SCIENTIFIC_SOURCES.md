# ASTRAVERSA Ω — OFFICIAL SCIENTIFIC SOURCE INTEGRATION DIRECTIVE
## NASA • ESA • JPL • STScI • PDS • MAST • GAIA • NED

**Document Version:** 1.0.0  
**Effective Date:** 2026-11-17  
**Authority:** ASTRAVERSA Ω Scientific & Software Engineering Architecture  
**Status:** BINDING DIRECTIVE

This directive establishes the official external scientific reference sources, data-acquisition standards, classification schemas, and validation criteria for ASTRAVERSA Ω.

### Project Objective

Build a scientifically grounded, interactive computational universe laboratory using authentic astronomical observations, validated scientific datasets, documented physical models, and reproducible computational methods.

This is **NOT** an instruction to download entire archives, collect arbitrary visual images, or create an aesthetically pleasing but scientifically misleading simulation.

---

# SECTION 1 — OFFICIAL REFERENCE SOURCES

### Planetary Science and Geology
- **NASA Planetary Data System (PDS):** [https://pds.nasa.gov/](https://pds.nasa.gov/)
- **NASA Planetary Data Discovery:** [https://planetary.data.nasa.gov/](https://planetary.data.nasa.gov/)
- **NASA Solar System Treks:** [https://science.nasa.gov/planetary-science/resources/](https://science.nasa.gov/planetary-science/resources/) (Portal: [https://trek.nasa.gov/](https://trek.nasa.gov/))
- **NASA 3D Resources:** [https://science.nasa.gov/3d-resources/](https://science.nasa.gov/3d-resources/)
- **NASA Planetary Photojournal:** [https://photojournal.jpl.nasa.gov/](https://photojournal.jpl.nasa.gov/)
- **NASA Planetary Science:** [https://science.nasa.gov/planetary-science/](https://science.nasa.gov/planetary-science/)
- **NASA NSSDCA (National Space Science Data Center):** [https://nssdc.gsfc.nasa.gov/](https://nssdc.gsfc.nasa.gov/)

### Solar System and Orbital Data
- **JPL Horizons System:** [https://ssd.jpl.nasa.gov/horizons/](https://ssd.jpl.nasa.gov/horizons/)
- **JPL Horizons API:** [https://ssd-api.jpl.nasa.gov/doc/horizons.html](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- **NASA Eyes on the Solar System:** [https://eyes.nasa.gov/apps/solar-system/](https://eyes.nasa.gov/apps/solar-system/)
- **NASA Exoplanet Archive:** [https://exoplanetarchive.ipac.caltech.edu/](https://exoplanetarchive.ipac.caltech.edu/)
- **NASA Exoplanet Archive API (TAP):** [https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html](https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html)

### Stars and the Milky Way Galaxy
- **ESA Gaia Archive:** [https://gea.esac.esa.int/archive/](https://gea.esac.esa.int/archive/)
- **ESA Gaia DR3 Documentation:** [https://gea.esac.esa.int/archive/documentation/GDR3/](https://gea.esac.esa.int/archive/documentation/GDR3/)

### Galaxies and Deep Space
- **NASA/IPAC Extragalactic Database (NED):** [https://ned.ipac.caltech.edu/](https://ned.ipac.caltech.edu/)
- **NED Programmatic Interface:** [https://ned.ipac.caltech.edu/Documents/Guides/Interface](https://ned.ipac.caltech.edu/Documents/Guides/Interface)
- **MAST Astronomical Archive (STScI):** [https://archive.stsci.edu/](https://archive.stsci.edu/)
- **JWST / MAST API Access:** [https://jwst-docs.stsci.edu/accessing-jwst-data/mast-api-access](https://jwst-docs.stsci.edu/accessing-jwst-data/mast-api-access)
- **NASA Image and Video Library:** [https://images.nasa.gov/](https://images.nasa.gov/)
- **NASA Images API Documentation:** [https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)

### Cosmology and Astrophysics
- **NASA LAMBDA (Microwave Background Data):** [https://lambda.gsfc.nasa.gov/](https://lambda.gsfc.nasa.gov/)
- **NASA Universe Research:** [https://science.nasa.gov/universe/](https://science.nasa.gov/universe/)
- **NASA HEASARC (High Energy Astrophysics):** [https://heasarc.gsfc.nasa.gov/](https://heasarc.gsfc.nasa.gov/)
- **NASA Astrophysics Data System (ADS Literature):** [https://ui.adsabs.harvard.edu/](https://ui.adsabs.harvard.edu/)
- **NASA Open APIs:** [https://api.nasa.gov/](https://api.nasa.gov/)

---

# SECTION 2 — DATA ACQUISITION RULES

Before integrating any external scientific data into ASTRAVERSA Ω, engineers and automated subagents must strictly adhere to the following seven protocols:

1. **Official Documentation First:** Thoroughly inspect the official scientific user guides and interface specifications before formulating requests.
2. **Identify Concrete Products:** Pinpoint the exact target downloadable products, file formats (e.g. FITS, GeoTIFF, ASCII, JSON), and programmatic API endpoints.
3. **Ascertain Scientific Processing Level:** Determine unambiguously whether the source data is raw telemetry (Level 0/1), calibrated sensor data (Level 2), derived physical maps (Level 3), theoretical simulation output, or uncalibrated artistic/educational illustration.
4. **Metadata & Reference Verification:** Inspect the associated metadata, physical units (enforce SI/IAU compliance), coordinate reference systems (CRS), observation epochs, and uncertainty estimates.
5. **Access & Redistribution Governance:** Verify rate limits, authentication credentials, network latency, citation requirements, and redistribution licenses.
6. **Minimal Useful Dataset:** Formulate the smallest feasible query or dataset necessary to fulfill the targeted computational requirement. Bulk downloads are prohibited.
7. **Empirical Sample Validation:** Download and validate a single representative sample record or spatial tile before proceeding to operational integration.

> [!CAUTION]
> **Prohibited Practices:**
> - Web scraping unformatted HTML pages or recursively dumping public FTP/HTTP directories is forbidden.
> - A visual photograph or artistic rendering is **never** accepted as equivalent to a calibrated topographic elevation model.
> - All production integrations must employ selective querying, parameter filtering, structured caching, and offline fallback dictionaries.

---

# SECTION 3 — SCIENTIFIC DATA CLASSIFICATION

Every physical object, celestial body, spatial tile, coordinate vector, and parameter in ASTRAVERSA Ω must carry an explicit, immutable scientific classification:

| Class Identifier | Scientific Classification | Definition & Criteria | Concrete Examples |
| :--- | :--- | :--- | :--- |
| **`OBSERVED`** | Observational Data | Direct empirical measurements captured by scientific instruments, space probes, or astronomical sky surveys. | JPL Horizons DE440 ephemerides, Gaia DR3 astrometric parallax/proper motion, MOLA Mars elevation points. |
| **`DERIVED`** | Derived Data | Quantities computed deterministically from observed primary measurements using established, peer-reviewed astrophysical equations. | Planetary surface gravity ($g = GM/R^2$), escape velocity ($v_{\text{esc}}$), orbital period via Kepler's 3rd Law. |
| **`MODEL`** | Model-Based Data | Theoretical structures and physical properties produced by validated computational or empirical models. | Kopparapu et al. (2013) habitable zone limits, 1D semi-grey greenhouse optical depths ($\tau_{\text{IR}}$), stellar evolution tracks. |
| **`PROCEDURAL`** | Procedural Data | Synthesized deterministically using pseudo-random algorithms (`SeededRandom`) when empirical observations do not exist. | ANANTARA α stars, procedural craters, unmapped exoplanet surfaces, synthetic star clusters. |
| **`HYPOTHETICAL`** | Hypothetical Data | Explicitly speculative, unverified, or counterfactual configurations constructed for scientific exploration. | Supermassive black hole mass scrubbing up to $40\times 10^9 M_\odot$, speculative exomoon atmospheres. |

### Mandatory Provenance & UI Labelling Rules

1. **Non-Conflation Mandate:** Procedural or hypothetical objects must **never** be visually or textually presented as observed astronomical bodies.
2. **Universal Inspector Badges:** All UI inspectors (`UnifiedInfoPanel`, `SystemEditor`, `Scene` HUD) must render an unambiguous classification badge indicating the data category.
3. **No Synthetic Masquerading:** If an astronomical parameter is not available from observational archives, it must remain explicitly tagged as `null` / `UNKNOWN` or classified as `MODEL`/`PROCEDURAL`. It must never be quietly backfilled with realistic-looking fictional constants under an `OBSERVED` tag.

---

# SECTION 4 — SOURCE-SPECIFIC ACQUISITION STANDARDS

### 1. Planetary Science & Geodesy

#### A. NASA Planetary Data System (PDS) & Planetary Data Discovery
- **Portal & Search API:** [https://pds.nasa.gov/](https://pds.nasa.gov/) | `https://pds.nasa.gov/api/search/1/`
- **Scope:** Archived data from NASA planetary missions (Apollo, Viking, MGS, MRO, LRO, Cassini, New Horizons, Messenger, InSight).
- **Primary Data Products:**
  - LOLA (Lunar Orbiter Laser Altimeter) GDR elevation maps (`LDEM_*`).
  - MOLA (Mars Orbiter Laser Altimeter) MEGDR topographic grids.
  - MESSENGER MLA mercury elevation models.
  - PDS4 XML/label metadata bundles.
- **Access Protocol:** PDS Search API (REST/JSON) to resolve product identifiers; direct HTTPS downloads from PDS storage nodes (Geosciences, Cartography & Imaging, Atmospheres).
- **Coordinate Frames & Units:** IAU planetocentric/planetographic coordinate systems (latitude $\pm 90^\circ$, positive East longitude $0^\circ - 360^\circ$); planetary radius in meters relative to reference ellipsoid/sphere.
- **Attribution & Terms:** US Public Domain. Mandatory citation of Principal Investigator (PI), instrument team, and PDS archive DOI.
- **Rate Constraints:** Respectful polling ($\le 5\text{ requests/sec}$). Bulk binary rasters must be pre-processed into lightweight multi-resolution terrain tiles.

#### B. NASA Solar System Treks (Trek API)
- **Portal & Documentation:** [https://trek.nasa.gov/](https://trek.nasa.gov/) | [https://science.nasa.gov/planetary-science/resources/](https://science.nasa.gov/planetary-science/resources/)
- **Scope:** Global GIS mosaics, digital elevation models (DEMs), slope maps, and thermal inertia maps for the Moon, Mars, Mercury, Vesta, Ceres, Titan, Europa, and Phobos.
- **Access Protocol:** OGC WMTS (Web Map Tile Service) REST endpoints: `https://trek.nasa.gov/tiles/{Body}/EQ/{Product}/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.png`.
- **Licensing & Usage:** Open NASA access. Attribution to NASA Solar System Treks Project.

#### C. NASA 3D Resources
- **Portal:** [https://science.nasa.gov/3d-resources/](https://science.nasa.gov/3d-resources/)
- **Scope:** 3D irregular shape models of asteroids and small moons (e.g. Bennu, Ryugu, Itokawa, Eros, Phobos, Deimos) in OBJ/glTF/USDZ formats.
- **Validation Rule:** Must verify whether a model is derived from radar/stereophotoclinometry (SPC) telemetry or is a low-fidelity artistic mesh. Only calibrated SPC shape models may be used for physics or terrain.

#### D. NASA Planetary Photojournal
- **Portal:** [https://photojournal.jpl.nasa.gov/](https://photojournal.jpl.nasa.gov/)
- **Scope:** High-resolution mission photographs and processed press-release mosaics.
- **Access Protocol:** Static URL querying via unique PIA identifier (`https://photojournal.jpl.nasa.gov/catalog/PIAXXXXX`).
- **Strict Limitation:** Photographic imagery from Photojournal must be classified strictly as illustrative or visual albedo references. Under no circumstances should uncalibrated optical photos be interpreted directly as surface heightmaps without photogrammetric calibration.

#### E. NASA NSSDCA Planetary Fact Sheets
- **Portal:** [https://nssdc.gsfc.nasa.gov/planetary/factsheet/](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Scope:** Curated physical constants (mass, equatorial/polar radius, volumetric mean radius, mean density, surface gravity, escape velocity, rotation period, obliquity to orbit).
- **Maintained By:** Dr. David R. Williams (NASA Goddard Space Flight Center).
- **Access Protocol:** Static reference calibration table parsed into versioned JSON dictionaries in `src/universe/data/`.

---

### 2. Solar System Ephemerides & Astrodynamics

#### A. JPL Horizons System (SSD/CPO)
- **Portal & API Documentation:** [https://ssd.jpl.nasa.gov/horizons/](https://ssd.jpl.nasa.gov/horizons/) | [https://ssd-api.jpl.nasa.gov/doc/horizons.html](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- **Scope:** High-precision numerical integration ephemerides (Development Ephemeris DE440/DE441) spanning planets, natural satellites, asteroids, and comets from -9999 to +9999.
- **Access Protocol:** REST API: `https://ssd-api.jpl.nasa.gov/horizons.api?format=json&COMMAND='{ID}'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='ELEMENTS'&CENTER='@sun'&START_TIME='2000-01-01'&STOP_TIME='2000-01-02'&STEP_SIZE='1d'`.
- **Coordinate Reference Frame:** ICRF / J2000.0 (ecliptic and mean equinox of epoch J2000.0 / JD 2451545.0 TDB).
- **Units:** AU, km, days, degrees, seconds. Gravitational parameter $GM$ in $\text{km}^3/\text{s}^2$.
- **Rate Limits & Offline Mandate:** API rate limit is 20 queries/minute. Production environments must bundle offline fallback tables for all 32 Canonical Solar System bodies.

#### B. NASA Exoplanet Archive (IPAC / Caltech)
- **Portal & Programmatic Access:** [https://exoplanetarchive.ipac.caltech.edu/](https://exoplanetarchive.ipac.caltech.edu/) | [https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html](https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html)
- **Scope:** Confirmed exoplanets, Kepler/K2/TESS planetary candidates, microlensing events, radial velocity, and transit timing variations.
- **Access Protocol:** Table Access Protocol (TAP) using Astronomical Data Query Language (ADQL): `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,pl_masse,pl_rade,pl_orbper,pl_orbsmax,pl_orbeccen,pl_eqt,st_teff,st_rad,st_mass+from+ps+where+default_flag=1&format=json`.
- **Attribution:** Cite NASA Exoplanet Archive (operated by Caltech under contract with NASA).

---

### 3. Stellar & Galactic Catalogues

#### A. ESA Gaia Archive (Gaia DR3 / Gaia FPR)
- **Portal & Documentation:** [https://gea.esac.esa.int/archive/](https://gea.esac.esa.int/archive/) | [https://gea.esac.esa.int/archive/documentation/GDR3/](https://gea.esac.esa.int/archive/documentation/GDR3/)
- **Scope:** 1.8 billion astronomical sources with astrometric, photometric, and radial velocity measurements.
- **Primary Parameters:**
  - 5-parameter astrometry: Right Ascension $\alpha$, Declination $\delta$, Parallax $\varpi$ (mas), Proper Motions $\mu_\alpha^*, \mu_\delta$ (mas/yr).
  - Radial velocity $v_r$ (km/s) for $>33$ million stars.
  - Astrophysical parameters: Effective temperature $T_{\text{eff}}$, surface gravity $\log g$, metallicity $[\text{M}/\text{H}]$, radius $R_\star$, luminosity $L_\star$.
- **Access Protocol:** TAP server (`https://gea.esac.esa.int/tap-server/tap`) using synchronous or asynchronous ADQL queries.
- **Coordinate Frame & Epoch:** ICRS; epoch J2016.0 (for DR3). Inversion to distance ($d \approx 1/\varpi$) requires Bailer-Jones et al. geometric/photogeometric distance priors when $\sigma_\varpi / \varpi > 0.1$.
- **Attribution:** Mandatory ESA Gaia attribution acknowledging the mission and Data Processing and Analysis Consortium (DPAC).

---

### 4. Extragalactic Databases & Deep Space

#### A. NASA/IPAC Extragalactic Database (NED)
- **Portal & Interface:** [https://ned.ipac.caltech.edu/](https://ned.ipac.caltech.edu/) | [https://ned.ipac.caltech.edu/Documents/Guides/Interface](https://ned.ipac.caltech.edu/Documents/Guides/Interface)
- **Scope:** Multiwavelength data for over 1.3 billion extragalactic objects: redshifts, distances, morphologic types, velocity dispersions, fluxes.
- **Access Protocol:** RESTful XML/JSON query services: `https://ned.ipac.caltech.edu/srs/ObjectLookup?name={GalaxyName}&format=json`.
- **Units:** Redshift $z$ (dimensionless), Hubble expansion $H_0 \approx 67.8\text{ km/s/Mpc}$ (Planck 2018), distances in Mpc.

#### B. Mikulski Archive for Space Telescopes (MAST) & JWST API
- **Portal & Docs:** [https://archive.stsci.edu/](https://archive.stsci.edu/) | [https://jwst-docs.stsci.edu/accessing-jwst-data/mast-api-access](https://jwst-docs.stsci.edu/accessing-jwst-data/mast-api-access)
- **Scope:** Primary archive for Hubble, JWST, Kepler, TESS, Galex, Swift, and FUSE mission observations and High-Level Science Products (HLSP).
- **Access Protocol:** MAST Mashup API (`https://mast.stsci.edu/api/v0/invoke`) and CAOM TAP server.

#### C. NASA Image and Video Library
- **Portal & API:** [https://images.nasa.gov/](https://images.nasa.gov/) | [https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
- **Access Protocol:** REST API: `https://images-api.nasa.gov/search?q={query}&media_type=image`.
- **Scope:** Public relations and documentary visual archives. Strictly intended for contextual image overlays, mission previews, and UI educational sidebars.

---

### 5. Cosmology & Astrophysics Literature

#### A. NASA LAMBDA (CMB & High-Z Cosmology)
- **Portal:** [https://lambda.gsfc.nasa.gov/](https://lambda.gsfc.nasa.gov/)
- **Scope:** Cosmic Microwave Background maps (COBE, WMAP, Planck) and standard $\Lambda\text{CDM}$ cosmological parameters.

#### B. NASA Astrophysics Data System (ADS)
- **Portal & API:** [https://ui.adsabs.harvard.edu/](https://ui.adsabs.harvard.edu/)
- **Scope:** Authoritative peer-reviewed bibliographic discovery across astronomy and physics. Used to cross-reference mission literature and verify scientific parameter consensus.

---

# SECTION 5 — DATA PROVENANCE SCHEMA

Every scientific entity ingested into ASTRAVERSA Ω must serialize into or conform to the following TypeScript/JSON metadata schema:

```typescript
/**
 * Canonical Data Provenance Schema (ASTRAVERSA Ω Standard)
 */
export interface ProvenanceRecord {
  /** Source institution / archival agency */
  institution:
    | 'NASA/JPL'
    | 'NASA/PDS'
    | 'NASA/IPAC'
    | 'ESA/GAIA'
    | 'STScI/MAST'
    | 'ASTRAVERSA_COMPUTATIONAL';

  /** Official catalogue or dataset identifier */
  datasetId: string; // e.g., 'JPL_HORIZONS_DE440', 'GAIA_DR3', 'PDS_MOLA_MEGDR'

  /** Original resource URL */
  sourceUrl: string;

  /** Timestamp of retrieval or pre-compilation (ISO 8601 UTC) */
  retrievalTimestamp: string;

  /** Specific scientific instrument or observing mission */
  instrumentOrMission?: string | null; // e.g., 'MGS MOLA', 'LRO LOLA', 'Gaia Astrometric'

  /** Measurement epoch and fundamental time standard */
  measurementEpoch?: string | null; // e.g., 'J2000.0', '2024-01-01T00:00:00.000 TDB'
  timeStandard?: 'TDB' | 'TT' | 'UTC' | 'TAI' | null;

  /** Coordinate reference frame */
  coordinateFrame?: 'ICRF' | 'J2000_ECLIPTIC' | 'IAU_PLANETOCENTRIC' | 'GALACTIC_L_B' | null;

  /** Base physical units of recorded metrics */
  units: Record<string, string>; // e.g., { semiMajorAxis: 'm', mass: 'kg', radius: 'm' }

  /** Scientific processing tier */
  processingLevel: 'RAW_TELEMETRY' | 'CALIBRATED_SENSOR' | 'DERIVED_PRODUCT' | 'COMPUTATIONAL_MODEL';

  /** Explicit sequence of mathematical/computational transformations */
  transformationHistory: string[];

  /** Quantitative uncertainties, standard deviations, or quality flags */
  uncertainty?: Record<string, number | string> | null;

  /** License, attribution, and terms of use */
  license: string;
  attribution: string;

  /** Universal 5-class scientific category */
  dataClass: 'OBSERVED' | 'DERIVED' | 'MODEL' | 'PROCEDURAL' | 'HYPOTHETICAL';
}
```

### The Explicit Unknown Mandate
If any metadata field (such as measurement uncertainty, exact instrument calibration date, or time standard) cannot be verified from official archive documentation, it **must remain explicitly set to `null` or `undefined`**. Inventing, fabricating, or guessing metadata values to create an impression of completeness is strictly forbidden.

---

# SECTION 6 — DATA VALIDATION AND SCIENTIFIC INTEGRITY

To safeguard against numerical drift, unphysical outputs, and coordinate errors, all ingested data must undergo automated validation pipelines:

### 1. Physical Units & Dimensional Homogeneity
- All internal simulation state vectors and physics engines run in base SI units: **meters ($\text{m}$)**, **kilograms ($\text{kg}$)**, **seconds ($\text{s}$)**, **Kelvin ($\text{K}$)**, **Watts ($\text{W}$)**.
- Ingestion adapters are responsible for converting astronomical units ($\text{AU}$, $\text{kpc}$, $\text{light-years}$, $\text{km/s}$, $M_\odot$, $M_\oplus$, $\text{bar}$) to exact SI base values using constants defined in `src/astronomy/constants.ts`.

### 2. Coordinate Transformations & Handedness
- Simulation space is standard right-handed Cartesian:
  - $+Y$: Oriented toward the celestial north pole / angular momentum vector $\mathbf{L}$.
  - $+X, +Z$: Spanning the fundamental invariant orbital/galactic midplane.
- Euler transformations from classical Keplerian orbital elements $(a, e, i, \Omega, \omega, \nu)$ to Cartesian vectors must preserve symplectic phase-space invariants:
  $$\mathbf{r} = R_y(-\Omega) R_x(-i) R_y(-\omega) \mathbf{r}_{\text{orbital}}$$

### 3. Time Systems & Epoch Reconciliation
- Orbital elements vary over secular timescales. Ephemerides must explicitly reconcile Barycentric Dynamical Time ($\text{TDB}$), Terrestrial Time ($\text{TT}$), and Coordinated Universal Time ($\text{UTC}$).
- Mean elements defined at epoch J2000.0 ($\text{JD } 2451545.0\text{ TDB}$) must not be directly equated with instantaneous osculating state vectors without applying correct secular drift rates ($\dot{a}, \dot{e}, \dot{i}, \dot{\Omega}, \dot{\varpi}$).

### 4. Physical Boundary Constraints & Sanity Gates
Every numerical ingestion must pass hard mathematical boundary tests:
- Eccentricity: $0 \le e < 1.0$ (bound Keplerian orbits); $e \ge 1.0$ (hyperbolic escape).
- Mass and Radius: $M > 0$, $R > 0$. Non-positive or non-finite values are rejected immediately.
- Velocities: $\|\mathbf{v}\| < c$.
- Thermodynamic temperatures: $T \ge 0\text{ K}$.

### 5. Conflicting Scientific Observations
When multiple research archives or peer-reviewed literature sources report divergent values (e.g. exoplanetary radii derived via transit photometery vs. radial velocity masses), the system must:
- Select the most recent peer-reviewed consensus catalogue entry as default.
- Record the observational variance or alternative measurements in the provenance record.
- Avoid synthesizing an arbitrary unweighted average without scientific justification.

---

# SECTION 7 — STORAGE, CACHING, AND PERFORMANCE

To prevent memory bloat, high client network consumption, and visual stutter:

### 1. Selective Retrieval & Spatial Tiling
- Rather than downloading entire planetary DEM rasters or star catalogs, ingestion pipelines must slice datasets into multi-resolution spatial tiles (e.g. QuadTree or Octree hierarchies).
- Star fields are streamed via magnitude and distance bounding volumes; planetary surface meshes are tessellated via Level-of-Detail (LOD) chunking.

### 2. Configurable Cache Budgets
- Client local cache (IndexedDB / LocalStorage) is subject to an enforceable quota: **max 50 MB** for cached ephemerides, orbital tables, and low-res DEM tiles.
- Transient network payloads must be cached using LRU (Least Recently Used) eviction policies.

### 3. Checksums & Integrity Verification
- Pre-compiled binary assets, digital elevation rasters, and offline fallback tables must store SHA-256 cryptographic hashes in `manifest.json`.
- Ingestion scripts must compute and compare runtime SHA-256 checksums before parsing downloads.

### 4. Deterministic Offline Fallbacks
- Essential simulation modules (such as the Canonical Solar System, Milky Way stellar density profiles, and planetary physical constants) must be bundled with zero-dependency offline fallback dictionaries.
- If network requests fail, timeout, or encounter browser CORS restrictions, the system must transparently fall back to bundled ground-truth dictionaries without crashing.

---

# SECTION 8 — VISUAL ASSET AND SCIENTIFIC MEASUREMENT SEPARATION

To eliminate the common flaw where simulations present aesthetic visual art as scientific data, ASTRAVERSA Ω mandates six strictly separated asset pipelines:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ASSET SEPARATION PIPELINE                       │
├────────────────────────┬───────────────────────────────────────────────┤
│ 1. Mission Photography │ Uncalibrated spacecraft optical images (JPL   │
│    & Public PR Imagery │ Photojournal, Images API) -> Displayed in UI  │
│                        │ galleries only; NEVER used as elevation.      │
├────────────────────────┼───────────────────────────────────────────────┤
│ 2. Controlled Albedo   │ Radiometrically calibrated surface reflectance│
│    Mosaics             │ maps (USGS Astrogeology mosaics) -> Mapped as │
│                        │ planetary base diffuse color maps.            │
├────────────────────────┼───────────────────────────────────────────────┤
│ 3. Digital Elevation   │ Laser altimetry (LOLA, MOLA) and stereo DEMs  │
│    Models (DEM)        │ -> Displacement heightmaps and collision      │
│                        │ geometry; stores elevation in real meters.    │
├────────────────────────┼───────────────────────────────────────────────┤
│ 4. Planetary Maps      │ Equirectangular, orthographic, or polar       │
│    & Projections       │ stereographic cartographic projections with   │
│                        │ documented central meridian and datum.        │
├────────────────────────┼───────────────────────────────────────────────┤
│ 5. Stellar Surveys     │ Astrometric point vectors (Gaia DR3) ->       │
│                        │ Instanced buffer attributes with true fluxes. │
├────────────────────────┼───────────────────────────────────────────────┤
│ 6. Procedural Assets   │ Noise algorithms (Simplex, Worley, Fractal)   │
│                        │ -> Explicitly labelled as PROCEDURAL.         │
└────────────────────────┴───────────────────────────────────────────────┘
```

> [!IMPORTANT]
> Under no circumstances may an optical photograph (e.g. an Earth Apollo photo or a Mars Perseverance JPEG) be converted into a displacement terrain heightmap simply by mapping RGB luminance to elevation. Topography must be sourced exclusively from calibrated laser altimetry, radar sounding, or stereophotogrammetric digital elevation models.

---

# SECTION 9 — INTEGRATION AND ACCEPTANCE CRITERIA

Every future scientific integration (beginning with Mission 005B: Planetary Surfaces & Geology) must meet all seven gates before being merged into the primary branch:

1. **Authoritative Lineage:** Data originates from one of the registered official sources in Section 1.
2. **Metadata & Provenance Preservation:** Every entity includes a complete `ProvenanceRecord` conforming to Section 5.
3. **Automated Verification Coverage:** Integration includes Vitest unit tests verifying physical dimensions, SI units, non-negativity, coordinate orientation, and absence of `NaN`/`Infinity`.
4. **Reproducible Pipeline:** Acquisition steps are automated via checked-in, deterministic scripts or pre-computed data modules in `src/data/` or `src/universe/data/`.
5. **Fault-Tolerant Network Fallback:** Network failures, rate-limiting, and browser CORS blocks fail gracefully to bundled offline reference tables.
6. **Transparent UI Disclosure:** The UI inspector honestly identifies whether the object is `OBSERVED`, `DERIVED`, `MODEL`, `PROCEDURAL`, or `HYPOTHETICAL`.
7. **Measurable Scientific Value:** The integration improves physical accuracy, provides tangible educational insight, or refines computational astrodynamics rather than serving purely ornamental purposes.

---

*This directive is binding upon all engineering tasks across ASTRAVERSA Ω. Scientific fidelity and architectural transparency remain non-negotiable.*
