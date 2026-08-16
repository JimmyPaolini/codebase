# Caelundas

NestJS command-line application scaffold generated with `conformetry:nestjs-command-project`.

**Astronomical event calendar generator using NASA's JPL Horizons ephemeris data.**

Caelundas computes planetary positions, detects astronomical events (aspects, phases, eclipses, retrogrades), and outputs iCalendar files for integration with Google Calendar, Apple Calendar, or other calendar applications.

## Features

- **Comprehensive Event Detection**: Major/minor aspects, lunar phases, eclipses, retrogrades, ingresses, solstices, equinoxes
- **High Precision**: Minute-level accuracy using NASA JPL Horizons API data
- **Geographic Awareness**: Observer-specific calculations for your location
- **Intelligent Caching**: SQLite-backed ephemeris cache to minimize API calls
- **Flexible Output**: iCalendar (.ics) or JSON format
- **Kubernetes-Ready**: Runs as batch job with PersistentVolumeClaim output

## Quick Start

### Local Usage

```bash
# 1. Install dependencies
cd applications/caelundas
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (dates, location, timezone)

# 3. Run
nx run caelundas:develop

# 4. Import output
# Import generated .ics file into your calendar application
```

## Start

```bash
nx run caelundas:start
```

## Test

```bash
nx run caelundas:test
```

### Configuration

Create `.env` with the following variables:

```bash
START_DATE=2026-01-01          # Calendar start date (YYYY-MM-DD)
END_DATE=2026-12-31            # Calendar end date (YYYY-MM-DD)
LATITUDE=40.7128               # Observer latitude (decimal degrees)
LONGITUDE=-74.0060             # Observer longitude (decimal degrees)
TIMEZONE=America/New_York      # IANA timezone identifier
OUTPUT_PATH=./calendar.ics     # Output file path
OUTPUT_FORMAT=ical             # Output format: ical or json

# Optional: Comma-separated event types
EVENT_TYPES=majorAspects,phases,retrogrades,eclipses
```

#### Available Event Types

- `majorAspects`: Conjunctions, oppositions, squares, trines, sextiles
- `minorAspects`: Semi-sextiles, quincunxes
- `quadrupleAspects`, `quintupleAspects`, `sextupleAspects`: Specialty aspects
- `phases`: New moon, first quarter, full moon, last quarter
- `retrogrades`: Apparent backward motion of planets
- `eclipses`: Solar and lunar eclipses
- `ingresses`: Planets entering zodiac signs
- `annualSolarCycle`: Solstices, equinoxes, perihelion, aphelion
- `monthlyLunarCycle`: Lunar apogee/perigee
- `dailyCycles`: Sunrise, sunset, moonrise, moonset
- `twilights`: Civil, nautical, astronomical twilights

## Kubernetes Deployment

Deploy as a batch job with persistent output storage:

```bash
# 1. Build and push Docker image
nx run caelundas:docker-build
nx run caelundas:docker-push

# 2. Create Kubernetes secret with environment variables
kubectl apply -f applications/caelundas/kubernetes/secret.yaml

# 3. Deploy with Helm (auto-generated release name)
nx run caelundas:helm-upgrade
# Outputs: Release name (e.g., caelundas-20260125-123456)

# 4. Monitor job completion
kubectl get jobs -l app.kubernetes.io/name=caelundas -w

# 5. Retrieve output files
nx run caelundas:kubernetes-copy-files -- --release-name=caelundas-20260125-123456

# 6. Clean up
nx run caelundas:helm-uninstall -- --release-name=caelundas-20260125-123456
```

Output files are copied to `applications/caelundas/output/`.

## Development

### Testing

```bash
# Run all tests
nx run caelundas:vitest

# Run specific test types
nx run caelundas:vitest:unit            # Fast, no I/O
nx run caelundas:vitest:integration     # Database tests
nx run caelundas:vitest:end-to-end      # Full pipeline with NASA API

# Watch mode
nx run caelundas:vitest:watch

# Coverage report
nx run caelundas:test-coverage --configuration=coverage
```

### Lint Codebase

```bash
# Type checking
nx run caelundas:typecheck

# Linting
nx run caelundas:eslint

# Format checking
nx run caelundas:oxfmt

# All checks
nx run caelundas:lint-codebase --configuration=check

# Auto-fix what can be fixed
nx run caelundas:lint-codebase --configuration=write
```

### Debugging

1. Set breakpoints in [src/main.ts](src/main.ts)
2. Use VSCode debugger: Run "Debug caelundas" launch configuration
3. Inspect SQLite database: `sqlite3 caelundas.db` (created after first run)

### Project Structure

```text
src/
├── main.ts                      # Entry point and pipeline orchestration
├── input.schema.ts              # Environment variable validation (Zod)
├── output.utilities.ts          # iCalendar and JSON output formatters
├── database.utilities.ts        # SQLite caching and event storage
├── calendar.utilities.ts        # iCalendar generation
├── fetch.utilities.ts           # HTTP client with retries
├── math.utilities.ts            # Angular calculations
├── ephemeris/                   # NASA API integration and caching
│   ├── ephemeris.service.ts     # JPL Horizons API client
│   ├── ephemeris.aggregates.ts  # Batch ephemeris retrieval
│   └── ephemeris.types.ts       # Celestial body position types
└── events/                      # Event detection modules
    ├── aspects/                 # Planetary aspects
    ├── phases/                  # Lunar phases
    ├── retrogrades/             # Retrograde motion
    ├── eclipses/                # Solar and lunar eclipses
    ├── ingresses/               # Zodiac sign changes
    ├── annualSolarCycle/        # Solstices, equinoxes
    ├── monthlyLunarCycle/       # Lunar apogee/perigee
    ├── dailyCycles/             # Sunrise, sunset, moonrise, moonset
    └── twilights/               # Civil, nautical, astronomical
```

## Performance

Typical execution times (1-year date range, all event types):

- **First run** (empty cache): 8-12 minutes (NASA API calls dominate)
- **Subsequent runs** (warm cache): 1-2 minutes (local computation only)

Ephemeris cache hit rate: ~95% for repeated runs on same date range.

## Architecture

For in-depth architectural documentation, domain concepts, and development workflows, see [AGENTS.md](AGENTS.md).

### Pipeline Overview

```text
Input Validation → Ephemeris Retrieval → Event Detection → Progressive Synthesis → iCal Output
     (Zod)            (NASA + Cache)      (Minute precision)   (Pair events)      (.ics)
```

See [AGENTS.md](AGENTS.md) for:

- NASA JPL Horizons API integration patterns
- SQLite caching strategy
- Event detection algorithms
- Kubernetes deployment architecture
- Testing strategy (unit/integration/e2e)
- Docker multi-stage build
- Astronomical domain concepts

## Etymology

**Caelundas** (Latin-inspired portmanteau):

- _Caelum_ (Latin): Sky, heavens
- _Calendar_ (English): System for organizing dates

Alternative names considered:

- **Caelendars**: Closer to "Calendars"
- **Caelundae**: Latin feminine plural _-ae_ ending
- **Caelunday**: Latin root + "day" suffix

## License

See [LICENSE](../../LICENSE) for licensing information.
