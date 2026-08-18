# 🛰️ Caelundas

**Turn the sky into a calendar.**

Caelundas computes planetary positions minute by minute over a date range,
detects the astronomical events in them — aspects, phases, eclipses,
retrogrades, ingresses, solstices, twilights — and writes an iCalendar file you
can subscribe to in Google Calendar, Apple Calendar, or anything else that
reads `.ics`.

## Quick Start

```bash
# 1. Download the Swiss Ephemeris data files (one-time, ~90 MB)
nx run caelundas:download-ephemeris

# 2. Configure your observer location and date range
cp applications/caelundas/.env.default applications/caelundas/.env

# 3. Generate the calendar
nx run caelundas:start
```

The result lands in `output/caelundas_<start>_<end>.ics`. Import it, or point a
calendar subscription at it.

## Configuration

All input comes from environment variables, validated on startup.

```bash
LATITUDE="39.949309"          # Observer latitude, -90 to 90
LONGITUDE="-75.17169"         # Observer longitude, -180 to 180
START_DATE="2026-07-01"       # YYYY-MM-DD
END_DATE="2026-07-31"         # YYYY-MM-DD
OUTPUT_DIRECTORY="./output"
```

Every field is optional. Location defaults to Philadelphia, and the date range
to a two-month window centered on today.

The **timezone is derived from your coordinates** rather than configured
separately — a calendar whose location and timezone could disagree is a
calendar with silently wrong sunrise times. Supported dates run from
`1900-01-01` to `2100-12-31`, the span of the ephemeris data.

## Ephemeris

Positions come from the [Swiss Ephemeris](https://www.astro.com/swisseph/)
(`sweph`), computed locally from JPL DE431 data files — no network calls, no
API keys, no rate limits. The data files are not committed; download them once
with `nx run caelundas:download-ephemeris` into `data/ephemeris/`.

## Events

Detection runs in two passes.

**Perfective** — the moment something is exact. Ephemerides are computed
day by day and scanned at minute resolution for the instant an aspect
perfects, a planet stations, or a body crosses a sign boundary.

**Progressive** — the span around it. The same domain services turn those exact
moments into the periods a reader actually wants on a calendar: the days an
aspect is in orb, the weeks a planet is retrograde.

| Category | Events |
| -------- | ------ |
| Aspects | Major and minor aspects, plus triple, quadruple, quintuple, and sextuple configurations and stelliums |
| Phases | New moon, first quarter, full moon, last quarter |
| Eclipses | Solar and lunar |
| Retrogrades | Stations and retrograde periods |
| Ingresses | Bodies entering a zodiac sign |
| Annual solar cycle | Solstices, equinoxes, cross-quarter points |
| Monthly lunar cycle | Apogee and perigee |
| Daily cycles | Sunrise, sunset, moonrise, moonset |
| Twilights | Civil, nautical, and astronomical |

## Structure

```text
src/
├── main.ts                  # CommandFactory bootstrap
├── constants.ts             # Environment schema (Zod)
└── modules/
    ├── caelundas/           # Root command — the pipeline
    ├── input/               # Coordinate and date validation, timezone lookup
    ├── ephemeris/           # Swiss Ephemeris access: positions, horizons, phenomena
    ├── perfective/          # Exact-moment detection across every event service
    ├── progressive/         # Spans derived from those moments
    ├── calendar/            # iCalendar rendering and output
    ├── datetime/, math/     # Time stepping and angular arithmetic
    └── aspects/, phases/, eclipses/, retrogrades/, ingresses/,
        annual-solar-cycle/, monthly-lunar-cycle/, daily-cycles/,
        twilights/, stellium/, …   # One service per event family
```

## Start

Generate a calendar from the configured location and date range:

```bash
nx run caelundas:start
```

## Test

```bash
nx run caelundas:vitest
```

```bash
nx run caelundas:vitest:unit          # Fast tests only
nx run caelundas:vitest:end-to-end    # Full pipeline
```

## Development

```bash
nx run caelundas:repl                 # NestJS REPL against the graph
nx run caelundas:typecheck
nx run caelundas:lint-codebase --configuration=write
```

See [AGENTS.md](AGENTS.md) for the astronomical domain concepts, event
detection algorithms, and testing strategy.

## Etymology

**Caelundas** — a portmanteau of _caelum_ (Latin: sky, heavens) and _calendar_.

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `caelundas`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 838 |
| Files | 156 |
| Calls traced | 1046 |
| Call stacks | 110 |
| Deepest stack | 17 |
| Stacks through recursion | 0 |
| Unfollowable calls | 26 |

### Call stacks

**1. `CaelundasCommand.run`** — depth ≥ 17 · decorated-method

```text
🚀 CaelundasCommand.run(): Promise<void> [applications/caelundas/src/modules/caelundas/caelundas.command.ts:59]
   ↳ Executes the full calendar generation pipeline. Parses environment input, detects all perfective and progressive…
  └─> PerfectiveService.detect(input: Input): Event[] [applications/caelundas/src/modules/perfective/perfective.service.ts:198]
     ↳ Detects all perfective (instantaneous) astronomical events within the given date range. Iterates day-by-day, computes…
    └─> PerfectiveService.detectDayEvents(…): { events: Event[]; previousAspectBodies: AspectBodies[]; } [applications/caelundas/src/modules/perfective/perfective.service.ts:54]
       ↳ Sweeps one day minute-by-minute, aggregating perfective events and rolling aspect state forward.
      └─> PerfectiveService.detectMinuteEvents(…): { aspectBodies: AspectBodies[]; events: Event[]; } [applications/caelundas/src/modules/perfective/perfective.service.ts:92]
         ↳ Detects all minute-level event families and returns both events and updated aspect-body state.
        └─> AspectsService.detect(…): { aspectBodies: AspectBodies[]; events: Event[]; } [applications/caelundas/src/modules/aspects/aspects.service.ts:180]
           ↳ Detects all aspect events at a single minute, including 2-body and multi-body patterns. Runs simple-aspect detection…
          └─> AspectsService.detectSimpleAspects(…): Event[] [applications/caelundas/src/modules/aspects/aspects.service.ts:85]
             ↳ Runs all simple-aspect detectors for a minute and flattens their detected events.
            └─> PhasesService.detect(args: DetectPlanetaryEventsArguments): Event[] ⚠ deprecated [applications/caelundas/src/modules/phases/phases.service.ts:52]
               ↳ Detects all planetary phase events for a given minute. Combines detection from all three planets (Venus, Mercury, Mars).
              └─> PhasesService.getMercurianPhaseEvents(args: MercurianPhaseEventArguments): Event[] [applications/caelundas/src/modules/phases/phases.service.ts:151]
                 ↳ Produces Mercurian morning/evening phase events for one minute.
                └─> MercurianPhaseService.getMercurianPhaseEvents(args: MercurianPhaseEventArguments): Event[] [applications/caelundas/src/modules/phases/mercurian-phase.service.ts:212]
                   ↳ Produces Mercurian morning/evening phase events for one minute.
                  └─> MercurianPhaseService.detectMercurianMorningPhases(parameters: PhaseParameters, minute: Moment): Event[] [applications/caelundas/src/modules/phases/mercurian-phase.service.ts:91]
                     ↳ Detects mercurian morning phases.
                    └─> PhaseCalculationService.isWesternBrightest(args: BrightnessLongitudeArguments): boolean [applications/caelundas/src/modules/phases/phase-calculation.service.ts:469]
                       ↳ Determines whether planet is brightest while western.
                      └─> PhaseCalculationService.isBrightest(args: BrightnessesArguments): boolean [applications/caelundas/src/modules/phases/phase-calculation.service.ts:308]
                         ↳ Determines whether planet is brightest among previous and next margin samples.
                        └─> PhaseCalculationService.getBrightnesses(…): { currentBrightness: number; nextBrightnesses: number[]; previousBrightnesses: number[]; } [applications/caelundas/src/modules/phases/phase-calculation.service.ts:275]
                           ↳ Derives brightnesses from current and margin illumination/distance samples.
                          └─> PhaseCalculationService.getBrightnessesResult(…): { currentBrightness: number; nextBrightnesses: number[]; previousBrightnesses: number[]; } [applications/caelundas/src/modules/phases/phase-calculation.service.ts:59]
                             ↳ Derives brightnesses result.
                            └─> PhaseCalculationService.mapBrightnessArray(distances: number[], illuminations: number[], label: string): number[] [applications/caelundas/src/modules/phases/phase-calculation.service.ts:92]
                               ↳ Handles map brightness array.
                              └─> PhaseCalculationService.map(…)(distance: number, index: number): number [applications/caelundas/src/modules/phases/phase-calculation.service.ts:102]
                                └─> PhaseCalculationService.getBrightness(args: BrightnessArguments): number [applications/caelundas/src/modules/phases/phase-calculation.service.ts:52]
                                   ↳ Derives brightness.
```

**2. `TripleAspectsService.detectProgressive`** — depth 10 · orphan-root

```text
🚀 TripleAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:111]
   ↳ Builds duration events by pairing forming/dissolving events per triple-aspect group key.
  └─> TripleAspectsComposerService.pairProgressiveGroup(groupEvents: Event[]): Event[] [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:433]
     ↳ Pairs sorted forming/dissolving events for one triple-aspect group key.
    └─> TripleAspectsComposerService.pairProgressiveGroupPairs(formingEvents: Event[], dissolvingEvents: Event[]): Event[] [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:166]
       ↳ Pairs progressive group pairs.
      └─> TripleAspectsComposerService.buildProgressiveEvent(…): Event | null [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:281]
         ↳ Builds one triple-aspect duration event from a forming/dissolving pair.
        └─> TripleAspectsComposerService.buildProgressiveBodiesMeta(forming: Event, aspectCapitalized: string): null | ProgressiveBodiesMeta [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:49]
           ↳ Builds progressive bodies meta.
          └─> TripleAspectsComposerService.resolveProgressiveMeta(…): ProgressiveBodiesMeta | null [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:227]
             ↳ Resolves progressive meta.
            └─> LoggerService.warn(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:250]
               ↳ Logs a warning message at the `warn` level.
              └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
                 ↳ Assembles the object pino merges into the line.
                └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
                   ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
                  └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
                     ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**3. `MajorAspectsService.detectAspectForBodyPair`** — depth ≥ 8 · orphan-root

```text
🚀 MajorAspectsService.detectAspectForBodyPair(args: DetectAspectForBodyPairArguments): Event | null [applications/caelundas/src/modules/major-aspects/major-aspects.service.ts:59]
   ↳ Detects aspect for body pair.
  └─> MajorAspectsService.buildMajorAspectEvent(…): Event [applications/caelundas/src/modules/major-aspects/major-aspects.service.ts:124]
     ↳ Resolves the active major aspect for two bodies and assembles a typed event. Throws when no major aspect is within orb…
    └─> MajorAspectEventService.buildMajorAspectEvent(…): Event [applications/caelundas/src/modules/major-aspects/major-aspect-event.service.ts:120]
       ↳ Resolves and builds a typed major-aspect event for two body longitudes.
      └─> MajorAspectEventService.assembleMajorAspectEvent(…): Event [applications/caelundas/src/modules/major-aspects/major-aspect-event.service.ts:54]
         ↳ Assembles one major-aspect event payload.
        └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
           ↳ Logs an informational message at the `info` level.
          └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
             ↳ Assembles the object pino merges into the line.
            └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
               ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
              └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
                 ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

<details>
<summary>107 more call stacks</summary>

**4. `IngressesService.buildDecanIngressEvent`** — depth 7 · orphan-root

```text
🚀 IngressesService.buildDecanIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses.service.ts:86]
   ↳ Delegates decan-ingress event construction to the composer service.
  └─> IngressesComposerService.buildDecanIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:94]
     ↳ Creates a decan ingress calendar event. A decan ingress occurs when a body crosses into one of the three 10°…
    └─> IngressesComposerService.buildDecanIngressEventObject(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:109]
       ↳ Builds the decan ingress payload without logging side effects.
      └─> IngressesComposerService.resolveDecan(longitude: number): Decan [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:411]
         ↳ Converts numeric decan to the validated `Decan` union and throws on invalid values.
        └─> IngressesComposerService.getDecan(longitude: number): number [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:288]
           ↳ Maps longitude to decan number (1-3) relative to the current sign start degree.
          └─> IngressesComposerService.getSign(longitude: number): Sign [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:73]
             ↳ Maps an ecliptic longitude to its containing zodiac sign range.
            └─> IngressesComposerService.find(…)(…): boolean [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:76]
```

**5. `EclipsesService.buildLunarEclipseEvent`** — depth 7 · orphan-root

```text
🚀 EclipsesService.buildLunarEclipseEvent(args: { date: Moment; frame: EclipseFrame; phase: EclipsePhase; }): Event [applications/caelundas/src/modules/eclipses/eclipses.service.ts:44]
   ↳ Creates a lunar eclipse calendar event.
  └─> EclipseEventService.buildLunarEclipseEvent(args: { date: Moment; frame: EclipseFrame; phase: EclipsePhase; }): Event [applications/caelundas/src/modules/eclipses/eclipse-event.service.ts:189]
     ↳ Creates a lunar eclipse calendar event.
    └─> EclipseEventService.buildEclipseEvent(…): Event [applications/caelundas/src/modules/eclipses/eclipse-event.service.ts:37]
       ↳ Builds eclipse event.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**6. `EclipsesService.buildSolarEclipseEvent`** — depth 7 · orphan-root

```text
🚀 EclipsesService.buildSolarEclipseEvent(args: { date: Moment; frame: EclipseFrame; phase: EclipsePhase; }): Event [applications/caelundas/src/modules/eclipses/eclipses.service.ts:55]
   ↳ Creates a solar eclipse calendar event.
  └─> EclipseEventService.buildSolarEclipseEvent(args: { date: Moment; frame: EclipseFrame; phase: EclipsePhase; }): Event [applications/caelundas/src/modules/eclipses/eclipse-event.service.ts:208]
     ↳ Creates a solar eclipse calendar event.
    └─> EclipseEventService.buildEclipseEvent(…): Event [applications/caelundas/src/modules/eclipses/eclipse-event.service.ts:37]
       ↳ Builds eclipse event.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**7. `TwilightsService.buildAstronomicalDawnEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildAstronomicalDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:56]
   ↳ Creates an astronomical dawn calendar event. Marks when the sky begins to lighten (Sun at -18° elevation).
  └─> TwilightsBuilderService.buildAstronomicalDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:60]
     ↳ Builds the instant when Sun crosses -18 degrees upward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**8. `TwilightsService.buildAstronomicalDuskEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildAstronomicalDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:66]
   ↳ Creates an astronomical dusk calendar event. Marks when the sky is dark enough for astronomical observation (Sun at…
  └─> TwilightsBuilderService.buildAstronomicalDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:67]
     ↳ Builds the instant when Sun crosses -18 degrees downward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**9. `TwilightsService.buildCivilDawnEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildCivilDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:76]
   ↳ Creates a civil dawn calendar event. Marks when outdoor activities are possible without artificial light (Sun at −6°…
  └─> TwilightsBuilderService.buildCivilDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:74]
     ↳ Builds the instant when Sun crosses -6 degrees upward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**10. `TwilightsService.buildCivilDuskEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildCivilDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:86]
   ↳ Creates a civil dusk calendar event. Marks when artificial light becomes necessary for outdoor activities (Sun at −6°…
  └─> TwilightsBuilderService.buildCivilDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:81]
     ↳ Builds the instant when Sun crosses -6 degrees downward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**11. `TwilightsService.buildNauticalDawnEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildNauticalDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:96]
   ↳ Creates a nautical dawn calendar event. Marks when the horizon becomes visible at sea (Sun at −12° elevation).
  └─> TwilightsBuilderService.buildNauticalDawnEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:88]
     ↳ Builds the instant when Sun crosses -12 degrees upward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**12. `TwilightsService.buildNauticalDuskEvent`** — depth 7 · orphan-root

```text
🚀 TwilightsService.buildNauticalDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights.service.ts:106]
   ↳ Creates a nautical dusk calendar event. Marks when the sea horizon becomes indistinguishable (Sun at −12° elevation).
  └─> TwilightsBuilderService.buildNauticalDuskEvent(date: Moment): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:95]
     ↳ Builds the instant when Sun crosses -12 degrees downward.
    └─> TwilightsBuilderService.buildTransitionEvent(date: Moment, description: string, emoji: string): Event [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:32]
       ↳ Creates a timestamped twilight transition event and logs the detected boundary.
      └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
         ↳ Logs an informational message at the `info` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
             ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**13. `IngressesService.buildPeakIngressEvent`** — depth 6 · orphan-root

```text
🚀 IngressesService.buildPeakIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses.service.ts:101]
   ↳ Creates a sign peak ingress calendar event. Marks when a celestial body reaches the 15° midpoint of its current zodiac…
  └─> IngressesComposerService.buildPeakIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:142]
     ↳ Creates a sign peak ingress calendar event. Marks when a celestial body reaches the 15° midpoint of its current zodiac…
    └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
       ↳ Logs an informational message at the `info` level.
      └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
         ↳ Assembles the object pino merges into the line.
        └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
           ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
          └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
             ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**14. `IngressesService.buildSignIngressEvent`** — depth 6 · orphan-root

```text
🚀 IngressesService.buildSignIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses.service.ts:114]
   ↳ Creates a zodiac sign ingress calendar event.
  └─> IngressesComposerService.buildSignIngressEvent(args: { body: Body; date: Moment; longitude: number; }): Event [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:204]
     ↳ Creates a zodiac sign ingress calendar event.
    └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
       ↳ Logs an informational message at the `info` level.
      └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
         ↳ Assembles the object pino merges into the line.
        └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
           ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
          └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
             ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**15. `MinorAspectsService.detectBodyPairAspect`** — depth ≥ 6 · orphan-root

```text
🚀 MinorAspectsService.detectBodyPairAspect(args: DetectBodyPairAspectArguments): Event | null [applications/caelundas/src/modules/minor-aspects/minor-aspects.service.ts:60]
   ↳ Detects a minor-aspect event for one body pair at a specific minute window.
  └─> MinorAspectsService.buildMinorAspectEvent(…): Event [applications/caelundas/src/modules/minor-aspects/minor-aspects.service.ts:126]
     ↳ Creates a calendar event for a specific minor aspect occurrence. Formats the event with appropriate emoji indicators,…
    └─> LoggerService.error(…): void [packages/logger/src/modules/logger/logger.service.ts:206]
       ↳ Logs an error message at the `error` level, optionally including a stack trace. `ConsoleLogger.error` spends a third…
      └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
         ↳ Assembles the object pino merges into the line.
        └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
           ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
          └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
             ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**16. `SextupleAspectsService.checkPatternExists`** — depth 6 · orphan-root

```text
🚀 SextupleAspectsService.checkPatternExists(edges: AspectBodies[]): boolean [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects.service.ts:80]
  └─> SextupleAspectsComposerService.findHexagramPattern(bodies: Body[], edges: AspectBodies[]): Body[] | null [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:269]
     ↳ Checks if 6 bodies form a valid hexagram (Star of David) pattern. A hexagram consists of two interlocking Grand Trines…
    └─> SextupleAspectsComposerService.findValidHexagonArrangement(…): ("lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus")[] | null [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:292]
       ↳ Finds valid hexagon arrangement.
      └─> SextupleAspectsComposerService.tryHexagonArrangement(…): ("lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus")[] | null [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:454]
         ↳ Tries to hexagon arrangement.
        └─> SextupleAspectsComposerService.tryArrangementForPair(…): ("lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus")[] | null [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:420]
           ↳ Tries to arrangement for pair.
          └─> SextupleAspectsComposerService.find(…)(x: number): boolean [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:431]
```

**17. `SpecialtyAspectsService.detectBodyPairEvent`** — depth ≥ 6 · orphan-root

```text
🚀 SpecialtyAspectsService.detectBodyPairEvent(…): Event | null [applications/caelundas/src/modules/specialty-aspects/specialty-aspects.service.ts:60]
   ↳ Detects a specialty-aspect event for one body pair using three-point longitude sampling.
  └─> SpecialtyAspectsService.buildSpecialtyAspectEvent(…): Event [applications/caelundas/src/modules/specialty-aspects/specialty-aspects.service.ts:148]
     ↳ Creates a calendar event for a specific specialty aspect occurrence. Formats the event with appropriate emoji…
    └─> LoggerService.error(…): void [packages/logger/src/modules/logger/logger.service.ts:206]
       ↳ Logs an error message at the `error` level, optionally including a stack trace. `ConsoleLogger.error` spends a third…
      └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
         ↳ Assembles the object pino merges into the line.
        └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
           ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
          └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
             ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**18. `EclipseCalculationService.isLunarTopocentricActive`** — depth 6 · orphan-root

```text
🚀 EclipseCalculationService.isLunarTopocentricActive(coordinates: EclipseCoordinates, isVisible: boolean): boolean [applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts:336]
   ↳ Checks whether lunar eclipse is active and visible from observer location.
  └─> EclipseTopocentricService.isLunarTopocentricActive(coordinates: EclipseCoordinates, isVisible: boolean): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:239]
     ↳ Checks whether lunar eclipse is active and visible from observer location.
    └─> EclipseTopocentricService.isLunarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:225]
       ↳ Checks whether lunar geometry is currently within eclipse limits.
      └─> EclipseTopocentricService.getCurrentAnglesAndDiameter(…): { currentDiameter: number; currentLatitudeAngle: number; currentLongitudeAngle: number; } [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:41]
         ↳ Derives current longitude/latitude separation angles and eclipse diameter sum.
        └─> MathService.getAngle(longitude1: Longitude, longitude2: Longitude): number [applications/caelundas/src/modules/math/math.service.ts:69]
           ↳ Calculates the shortest angular distance between two ecliptic longitudes. This function computes the minimum arc length…
          └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
             ↳ Normalizes an angle in degrees to the range [0, 360).
```

**19. `EclipseCalculationService.isSolarTopocentricActive`** — depth 6 · orphan-root

```text
🚀 EclipseCalculationService.isSolarTopocentricActive(coordinates: EclipseCoordinates, isVisible: boolean): boolean [applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts:389]
   ↳ Checks whether solar eclipse is active and visible from observer location.
  └─> EclipseTopocentricService.isSolarTopocentricActive(coordinates: EclipseCoordinates, isVisible: boolean): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:262]
     ↳ Checks whether solar eclipse is active and visible from observer location.
    └─> EclipseTopocentricService.isSolarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:249]
       ↳ Checks whether solar geometry is currently within eclipse limits.
      └─> EclipseTopocentricService.getCurrentAnglesAndDiameter(…): { currentDiameter: number; currentLatitudeAngle: number; currentLongitudeAngle: number; } [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:41]
         ↳ Derives current longitude/latitude separation angles and eclipse diameter sum.
        └─> MathService.getAngle(longitude1: Longitude, longitude2: Longitude): number [applications/caelundas/src/modules/math/math.service.ts:69]
           ↳ Calculates the shortest angular distance between two ecliptic longitudes. This function computes the minimum arc length…
          └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
             ↳ Normalizes an angle in degrees to the range [0, 360).
```

**20. `MinorAspectsComposerService.processAspectGroup`** — depth 6 · orphan-root

```text
🚀 MinorAspectsComposerService.processAspectGroup(aspectGroupKey: string, aspectGroupEvents: Event[]): Event[] [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:228]
   ↳ Processes aspect group.
  └─> ProgressiveUtilitiesService.pairProgressiveEvents(beginnings: Event[], endings: Event[], label: string): [Event, Event][] [applications/caelundas/src/modules/progressive/progressive-utilities.service.ts:33]
     ↳ Pairs beginning and ending events into tuples.
    └─> LoggerService.warn(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:250]
       ↳ Logs a warning message at the `warn` level.
      └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
         ↳ Assembles the object pino merges into the line.
        └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
           ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
          └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
             ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**21. `downloadEphemerisFiles`** — depth ≥ 5 · orphan-root

```text
🚀 downloadEphemerisFiles(): Promise<void> [applications/caelundas/scripts/download-ephemeris.ts:25]
   ↳ Downloads required ephemeris data files into the local data directory.
  └─> downloadFile(url: string, destination: string): Promise<void> [applications/caelundas/scripts/download-ephemeris.ts:48]
     ↳ Streams a remote ephemeris file to disk and removes partial files on failure.
    └─> anonymous(…): void [applications/caelundas/scripts/download-ephemeris.ts:49]
      └─> get(…)(response: IncomingMessage): void [applications/caelundas/scripts/download-ephemeris.ts:52]
        └─> on(…)(): void [applications/caelundas/scripts/download-ephemeris.ts:64]
```

**22. `EphemerisService.getAzimuthElevationEphemerisByBody`** — depth 5 · orphan-root

```text
🚀 EphemerisService.getAzimuthElevationEphemerisByBody(…): Record<"lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus", AzimuthElevationEphemeris> [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:173]
   ↳ Computes minute-by-minute horizontal coordinates (azimuth, apparent elevation) for the requested bodies at the…
  └─> EphemerisHorizonService.computeAzimuthElevationForBody(…): AzimuthElevationEphemeris [applications/caelundas/src/modules/ephemeris/ephemeris-horizon.service.ts:42]
     ↳ Computes minute-by-minute horizontal coordinates (azimuth, apparent elevation) for a single body at the observer's…
    └─> EphemerisCoordinateService.getBodyCoordinatesWithDistance(…): { distance: number; latitude: number; longitude: number; } [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:197]
       ↳ Computes body ecliptic coordinates (longitude, latitude, distance). Used internally by horizon and aggregation services.
      └─> EphemerisCoordinateService.computeBodyCoordinates(…): { distance: number; latitude: number; longitude: number; } [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:40]
         ↳ Computes body ecliptic coordinates (longitude, latitude, distance).
        └─> EphemerisConstantsService.getSwissEphemerisConstantForBody(body: Exclude<Body, Node>): number [applications/caelundas/src/modules/ephemeris/ephemeris-constants.service.ts:36]
           ↳ Looks up the Swiss Ephemeris constant for a non-node body (planet or asteroid).
```

**23. `EphemerisService.getCoordinateEphemerisByBody`** — depth 5 · orphan-root

```text
🚀 EphemerisService.getCoordinateEphemerisByBody(…): Record<"lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus", CoordinateEphemeris> [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:218]
   ↳ Computes minute-by-minute ecliptic coordinates for all requested bodies.
  └─> EphemerisCoordinateService.computeNodeBodyMinutes(args: { body: Node; end: Moment; start: Moment; }): CoordinateEphemeris [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:173]
     ↳ Computes minute-by-minute coordinates for a node (lunar/solar nodes and lunar perigee). Returns latitude (always 0 for…
    └─> EphemerisCoordinateService.computeNodeCoordinate(…): { latitude: number; longitude: number; } [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:87]
       ↳ Computes node coordinate (lunar node or perigee). Dispatches to the appropriate computation based on node type.
      └─> EphemerisCoordinateService.computeLunarPerigeeCoordinate(julianDayUniversalTime: number): { latitude: number; longitude: number; } [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:64]
         ↳ Computes lunar perigee (apogee in modern terms) ecliptic coordinates.
        └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
           ↳ Normalizes an angle in degrees to the range [0, 360).
```

**24. `AspectsUtilitiesService.anonymous`** — depth 5 · orphan-root

```text
🚀 AspectsUtilitiesService.anonymous(…): "forming" | "perfective" | "dissolving" | null [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:287]
  └─> AspectsUtilitiesService.getAspectPhase(…): "forming" | "perfective" | "dissolving" | null [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:150]
     ↳ Resolves whether the aspect is entering, exacting, or leaving orb at the current minute.
    └─> AspectsUtilitiesService.getPerfectivePhaseWhenCurrentInOrb(…): "perfective" | null [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:185]
       ↳ Returns perfective when the current angle is in orb and trend indicates exactness.
      └─> AspectsUtilitiesService.isPerfective(…): boolean [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:221]
         ↳ Checks whether the aspect is exact at the current minute based on angular trend.
        └─> AspectsUtilitiesService.isPerfectiveConjunct(…): boolean [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:241]
           ↳ Uses local-angle minima to detect exact conjunctions where wrap-around can occur.
```

**25. `MajorAspectsService.detectProgressive`** — depth ≥ 5 · orphan-root

```text
🚀 MajorAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/major-aspects/major-aspects.service.ts:154]
   ↳ Builds duration events by pairing forming and dissolving events per body-pair/aspect key.
  └─> MajorAspectProgressiveService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/major-aspects/major-aspect-progressive.service.ts:98]
     ↳ Builds progressive major-aspect events from detected minute-level events.
    └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
       ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
      └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
         ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
        └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**26. `MajorAspectsService.getMajorAspect`** — depth 5 · orphan-root

```text
🚀 MajorAspectsService.getMajorAspect(…): "conjunct" | "opposite" | "sextile" | "square" | "trine" | null [applications/caelundas/src/modules/major-aspects/major-aspects.service.ts:161]
   ↳ Returns the first major aspect between two bodies, or `null` if none is within orb.
  └─> MajorAspectEventService.getMajorAspect(args: { longitudeBody1: number; longitudeBody2: number; }): MajorAspect | null [applications/caelundas/src/modules/major-aspects/major-aspect-event.service.ts:157]
     ↳ Returns the first in-orb major aspect for two longitudes.
    └─> AspectsUtilitiesService.isAspect(…): boolean [applications/caelundas/src/modules/aspects/aspects-utilities.service.ts:309]
       ↳ Returns `true` when the angular separation between two bodies falls within the configured orb for the given aspect.
      └─> MathService.getAngle(longitude1: Longitude, longitude2: Longitude): number [applications/caelundas/src/modules/math/math.service.ts:69]
         ↳ Calculates the shortest angular distance between two ecliptic longitudes. This function computes the minimum arc length…
        └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
           ↳ Normalizes an angle in degrees to the range [0, 360).
```

**27. `MinorAspectsEventService.log`** — depth 5 · orphan-root

```text
🚀 MinorAspectsEventService.log(message: string, data: LogData | undefined): void [applications/caelundas/src/modules/minor-aspects/minor-aspects-event.service.ts:61]
  └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
     ↳ Logs an informational message at the `info` level.
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**28. `MinorAspectsService.detectProgressive`** — depth ≥ 5 · orphan-root

```text
🚀 MinorAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/minor-aspects/minor-aspects.service.ts:195]
   ↳ Converts instantaneous minor aspect events into progressive events. Pairs forming and dissolving events for the same…
  └─> MinorAspectsProgressiveService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/minor-aspects/minor-aspects-progressive.service.ts:78]
     ↳ Builds progressive minor-aspect events from detected minute-level events.
    └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
       ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
      └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
         ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
        └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**29. `QuadrupleAspectsBaseService.checkGrandCrossPattern`** — depth ≥ 5 · orphan-root

```text
🚀 QuadrupleAspectsBaseService.checkGrandCrossPattern(…): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:93]
   ↳ Checks grand cross pattern.
  └─> QuadrupleAspectsBaseService.verifyGrandCrossSquares(…): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:403]
     ↳ Verifies grand cross squares.
    └─> QuadrupleAspectsBaseService.haveAspect(…): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:335]
       ↳ Returns `true` when an undirected body pair has the requested aspect in the edge set.
      └─> AspectGraphService.haveAspect(…): boolean [applications/caelundas/src/modules/aspects/aspect-graph.service.ts:54]
         ↳ Returns `true` when an undirected body pair has the requested aspect in the edge set.
        └─> AspectGraphService.some(…)(edge: AspectBodies): boolean [applications/caelundas/src/modules/aspects/aspect-graph.service.ts:62]
```

**30. `QuintupleAspectsService.detectProgressive`** — depth 5 · orphan-root

```text
🚀 QuintupleAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects.service.ts:56]
   ↳ Converts instantaneous quintuple aspect events into progressive events. Pairs forming and dissolving events for the…
  └─> QuintupleAspectsComposerService.groupQuintupleEventsByKey(events: Event[]): Record<string, Event[]> [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:325]
     ↳ Groups quintuple events by key.
    └─> QuintupleAspectsComposerService.groupBy(…)(event: Event): string [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:330]
      └─> QuintupleAspectsComposerService.filter(…)(category: string): boolean [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:331]
        └─> QuintupleAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:332]
```

**31. `SextupleAspectsService.detectProgressive`** — depth 5 · orphan-root

```text
🚀 SextupleAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects.service.ts:130]
   ↳ Converts instantaneous sextuple aspect events into progressive events. Pairs forming and dissolving events for the same…
  └─> SextupleAspectsComposerService.groupSextupleEventsByKey(events: Event[]): Record<string, Event[]> [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:384]
     ↳ Groups sextuple events by key.
    └─> SextupleAspectsComposerService.groupBy(…)(event: Event): string [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:389]
      └─> SextupleAspectsComposerService.filter(…)(category: string): boolean [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:390]
        └─> SextupleAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/sextuple-aspects/sextuple-aspects-composer.service.ts:391]
```

**32. `SpecialtyAspectsEventService.log`** — depth 5 · orphan-root

```text
🚀 SpecialtyAspectsEventService.log(message: string, data: LogData | undefined): void [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-event.service.ts:61]
  └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
     ↳ Logs an informational message at the `info` level.
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**33. `SpecialtyAspectsService.detectProgressive`** — depth ≥ 5 · orphan-root

```text
🚀 SpecialtyAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/specialty-aspects/specialty-aspects.service.ts:213]
   ↳ Converts instantaneous specialty aspect events into progressive events. Pairs forming and dissolving events for the…
  └─> SpecialtyAspectsProgressiveService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-progressive.service.ts:41]
     ↳ Builds progressive specialty-aspect events from detected minute-level events.
    └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
       ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
      └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
         ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
        └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**34. `StelliumService.detectProgressive`** — depth 5 · orphan-root

```text
🚀 StelliumService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/stellium/stellium.service.ts:337]
   ↳ Converts instantaneous stellium events into progressive events. Pairs forming and dissolving events for the same body…
  └─> StelliumService.pairStelliumGroup(group: Event[]): Event[] [applications/caelundas/src/modules/stellium/stellium.service.ts:252]
     ↳ Pairs stellium group.
    └─> StelliumService.buildProgressiveStelliumEvent(forming: Event, dissolving: Event): Event [applications/caelundas/src/modules/stellium/stellium.service.ts:117]
       ↳ Builds progressive stellium event.
      └─> AspectEventFormattingService.buildProgressiveCompoundEvent(…): Event [applications/caelundas/src/modules/aspects/aspect-event-formatting.service.ts:128]
         ↳ Builds one progressive compound event from a forming and dissolving pair.
        └─> AspectEventFormattingService.filter(…)(category: string): boolean [applications/caelundas/src/modules/aspects/aspect-event-formatting.service.ts:140]
```

**35. `EclipseCalculationService.isLunarEclipseActive`** — depth 5 · orphan-root

```text
🚀 EclipseCalculationService.isLunarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts:329]
   ↳ Checks whether lunar geometry is currently within eclipse limits.
  └─> EclipseTopocentricService.isLunarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:225]
     ↳ Checks whether lunar geometry is currently within eclipse limits.
    └─> EclipseTopocentricService.getCurrentAnglesAndDiameter(…): { currentDiameter: number; currentLatitudeAngle: number; currentLongitudeAngle: number; } [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:41]
       ↳ Derives current longitude/latitude separation angles and eclipse diameter sum.
      └─> MathService.getAngle(longitude1: Longitude, longitude2: Longitude): number [applications/caelundas/src/modules/math/math.service.ts:69]
         ↳ Calculates the shortest angular distance between two ecliptic longitudes. This function computes the minimum arc length…
        └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
           ↳ Normalizes an angle in degrees to the range [0, 360).
```

**36. `EclipseCalculationService.isSolarEclipseActive`** — depth 5 · orphan-root

```text
🚀 EclipseCalculationService.isSolarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts:382]
   ↳ Checks whether solar geometry is currently within eclipse limits.
  └─> EclipseTopocentricService.isSolarEclipseActive(current: EclipseCoordinates): boolean [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:249]
     ↳ Checks whether solar geometry is currently within eclipse limits.
    └─> EclipseTopocentricService.getCurrentAnglesAndDiameter(…): { currentDiameter: number; currentLatitudeAngle: number; currentLongitudeAngle: number; } [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:41]
       ↳ Derives current longitude/latitude separation angles and eclipse diameter sum.
      └─> MathService.getAngle(longitude1: Longitude, longitude2: Longitude): number [applications/caelundas/src/modules/math/math.service.ts:69]
         ↳ Calculates the shortest angular distance between two ecliptic longitudes. This function computes the minimum arc length…
        └─> MathService.normalizeDegrees(degrees: number): number [applications/caelundas/src/modules/math/math.service.ts:155]
           ↳ Normalizes an angle in degrees to the range [0, 360).
```

**37. `MinorAspectsComposerService.assembleMinorAspectEvent`** — depth 5 · orphan-root

```text
🚀 MinorAspectsComposerService.assembleMinorAspectEvent(args: AssembleMinorAspectEventArguments): Event [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:59]
   ↳ Assembles minor aspect event.
  └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
     ↳ Logs an informational message at the `info` level.
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**38. `SpecialtyAspectsComposerService.buildSpecialtyAspectEventFromParts`** — depth 5 · orphan-root

```text
🚀 SpecialtyAspectsComposerService.buildSpecialtyAspectEventFromParts(…): Event [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:52]
   ↳ Builds and logs one specialty-aspect boundary event from pre-resolved display parts.
  └─> LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:226]
     ↳ Logs an informational message at the `info` level.
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production. A logger that throws in production turns an…
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows. Present progressive means the operation is…
```

**39. `EphemerisService.getDistanceEphemerisByBody`** — depth 4 · orphan-root

```text
🚀 EphemerisService.getDistanceEphemerisByBody(…): Record<"lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus", DistanceEphemeris> [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:320]
   ↳ Computes minute-by-minute geocentric distance for the requested bodies.
  └─> EphemerisCoordinateService.computeDistanceForBody(…): DistanceEphemeris [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:149]
     ↳ * Computes minute-by-minute geocentric distance for a single body. Distance is stored in astronomical units (AU) as…
    └─> EphemerisCoordinateService.computeBodyCoordinates(…): { distance: number; latitude: number; longitude: number; } [applications/caelundas/src/modules/ephemeris/ephemeris-coordinate.service.ts:40]
       ↳ Computes body ecliptic coordinates (longitude, latitude, distance).
      └─> EphemerisConstantsService.getSwissEphemerisConstantForBody(body: Exclude<Body, Node>): number [applications/caelundas/src/modules/ephemeris/ephemeris-constants.service.ts:36]
         ↳ Looks up the Swiss Ephemeris constant for a non-node body (planet or asteroid).
```

**40. `MajorAspectProgressiveService.getMajorAspectProgressiveEvent`** — depth ≥ 4 · orphan-root

```text
🚀 MajorAspectProgressiveService.getMajorAspectProgressiveEvent(beginning: Event, ending: Event): Event [applications/caelundas/src/modules/major-aspects/major-aspect-progressive.service.ts:50]
   ↳ Builds one progressive duration event from a forming/dissolving pair.
  └─> ProgressiveAspectService.createSimpleAspectProgressiveEvent(…): Event [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:154]
     ↳ Create a single progressive event for a simple aspect (major, minor, or specialty).
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**41. `MajorAspectProgressiveService.castAspectPartsToTypes`** — depth ≥ 4 · orphan-root

```text
🚀 MajorAspectProgressiveService.castAspectPartsToTypes(…): { aspect: "conjunct" | "opposite" | "sextile" | "square" | "trine"; body1: "lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | ... 12 more ... | "venus"; body2: "lunar apogee" | ... 18 more ... | "venus"; } [applications/caelundas/src/modules/major-aspects/major-aspect-progressive.service.ts:72]
   ↳ Backward-compatible wrapper retained for existing unit tests.
  └─> ProgressiveAspectService.extractTypedAspectPartsOrThrow(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:271]
     ↳ Typed extraction wrapper with a normalized error message for compatibility call sites.
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**42. `MajorAspectProgressiveService.processAspectGroup`** — depth ≥ 4 · orphan-root

```text
🚀 MajorAspectProgressiveService.processAspectGroup(aspectGroupKey: string, aspectGroupEvents: Event[]): Event[] [applications/caelundas/src/modules/major-aspects/major-aspect-progressive.service.ts:120]
   ↳ Pairs forming and dissolving events for one grouped body-pair/aspect key.
  └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
     ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
    └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
       ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
      └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**43. `MinorAspectsProgressiveService.castAspectComponentsToTypes`** — depth ≥ 4 · orphan-root

```text
🚀 MinorAspectsProgressiveService.castAspectComponentsToTypes(…): { aspect: "quincunx" | "semisextile" | "semisquare" | "sesquiquadrate"; body1: "lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | ... 13 more ... | "venus"; body2: "lunar apogee" | ... 18 more ... | "venus"; } [applications/caelundas/src/modules/minor-aspects/minor-aspects-progressive.service.ts:52]
   ↳ Backward-compatible wrapper retained for existing unit tests.
  └─> ProgressiveAspectService.extractTypedAspectPartsOrThrow(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:271]
     ↳ Typed extraction wrapper with a normalized error message for compatibility call sites.
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**44. `MinorAspectsProgressiveService.getMinorAspectProgressiveEvent`** — depth ≥ 4 · orphan-root

```text
🚀 MinorAspectsProgressiveService.getMinorAspectProgressiveEvent(beginning: Event, ending: Event): Event [applications/caelundas/src/modules/minor-aspects/minor-aspects-progressive.service.ts:100]
   ↳ Creates one minor-aspect duration event from a matched forming/dissolving pair.
  └─> ProgressiveAspectService.createSimpleAspectProgressiveEvent(…): Event [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:154]
     ↳ Create a single progressive event for a simple aspect (major, minor, or specialty).
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**45. `MinorAspectsProgressiveService.processAspectGroup`** — depth ≥ 4 · orphan-root

```text
🚀 MinorAspectsProgressiveService.processAspectGroup(aspectGroupKey: string, aspectGroupEvents: Event[]): Event[] [applications/caelundas/src/modules/minor-aspects/minor-aspects-progressive.service.ts:117]
   ↳ Pairs forming and dissolving events for one grouped body-pair/aspect key.
  └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
     ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
    └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
       ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
      └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**46. `QuadrupleAspectsBaseService.checkKitePattern`** — depth 4 · orphan-root

```text
🚀 QuadrupleAspectsBaseService.checkKitePattern(…): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:129]
   ↳ Checks kite pattern.
  └─> QuadrupleAspectsBaseService.haveAspect(…): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:335]
     ↳ Returns `true` when an undirected body pair has the requested aspect in the edge set.
    └─> AspectGraphService.haveAspect(…): boolean [applications/caelundas/src/modules/aspects/aspect-graph.service.ts:54]
       ↳ Returns `true` when an undirected body pair has the requested aspect in the edge set.
      └─> AspectGraphService.some(…)(edge: AspectBodies): boolean [applications/caelundas/src/modules/aspects/aspect-graph.service.ts:62]
```

**47. `QuadrupleAspectsService.detectProgressive`** — depth 4 · orphan-root

```text
🚀 QuadrupleAspectsService.detectProgressive(events: Event[]): Event[] [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects.service.ts:75]
   ↳ Converts instantaneous quadruple aspect events into progressive events. Pairs forming and dissolving events for the…
  └─> QuadrupleAspectsComposerService.collectProgressiveEventsFromGroup(group: Event[], progressiveEvents: Event[]): void [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-composer.service.ts:110]
     ↳ Collects progressive events from group.
    └─> QuadrupleAspectsBaseService.buildProgressiveEvent(formingEvent: Event, dissolvingEvent: Event): Event [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:58]
       ↳ Collapses forming+dissolving boundary events into one duration event.
      └─> QuadrupleAspectsBaseService.filter(…)(c: string): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:60]
```

**48. `QuintupleAspectsComposerService.checkPatternExists`** — depth 4 · orphan-root

```text
🚀 QuintupleAspectsComposerService.checkPatternExists(edges: AspectBodies[]): boolean [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:367]
  └─> QuintupleAspectsComposerService.findPentagramPattern(bodies: Body[], edges: AspectBodies[]): Body[] | null [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:255]
     ↳ Checks if 5 bodies form a valid pentagram pattern (5-pointed star). A pentagram consists of 5 bodies where each body…
    └─> QuintupleAspectsComposerService.traversePentagramPath(connections: Map<Body, Set<Body>>, bodies: Body[]): Body[] | null [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:388]
       ↳ Traverses pentagram path.
      └─> QuintupleAspectsComposerService.find(…)(…): boolean [applications/caelundas/src/modules/quintuple-aspects/quintuple-aspects-composer.service.ts:399]
```

**49. `SpecialtyAspectsProgressiveService.extractTypedAspectValues`** — depth ≥ 4 · orphan-root

```text
🚀 SpecialtyAspectsProgressiveService.extractTypedAspectValues(…): { aspect: "biquintile" | "decile" | "novile" | "quintile" | "septile" | "tredecile" | "undecile"; body1: "lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | ... 15 more ... | "venus"; body2: "lunar apogee" | ... 18 more ... | "venus"; } [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-progressive.service.ts:63]
   ↳ Backward-compatible wrapper retained for existing unit tests.
  └─> ProgressiveAspectService.extractTypedAspectPartsOrThrow(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:271]
     ↳ Typed extraction wrapper with a normalized error message for compatibility call sites.
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**50. `SpecialtyAspectsProgressiveService.getSpecialtyAspectProgressiveEvent`** — depth ≥ 4 · orphan-root

```text
🚀 SpecialtyAspectsProgressiveService.getSpecialtyAspectProgressiveEvent(beginning: Event, ending: Event): Event [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-progressive.service.ts:89]
   ↳ Creates one specialty-aspect duration event from a forming/dissolving pair.
  └─> ProgressiveAspectService.createSimpleAspectProgressiveEvent(…): Event [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:154]
     ↳ Create a single progressive event for a simple aspect (major, minor, or specialty).
    └─> ProgressiveAspectService.extractTypedAspectParts(…): TypedAspectParts<TAspect, TBody> [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:217]
       ↳ Extract typed body/aspect values from event categories using aspect/body registries.
      └─> ProgressiveAspectService.map(…)(body: TBody): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:230]
```

**51. `SpecialtyAspectsProgressiveService.processAspectGroup`** — depth ≥ 4 · orphan-root

```text
🚀 SpecialtyAspectsProgressiveService.processAspectGroup(aspectGroupKey: string, aspectGroupEvents: Event[]): Event[] [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-progressive.service.ts:106]
   ↳ Pairs forming and dissolving events for one grouped body-pair/aspect key.
  └─> ProgressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:117]
     ↳ Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
    └─> ProgressiveAspectService.buildProgressiveAspectEvents(…): Event[] [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:56]
       ↳ Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
      └─> ProgressiveAspectService.filter(…)(event: Event): boolean [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:75]
```

**52. `MinorAspectsComposerService.getLongitudesWindowForBody`** — depth 4 · orphan-root

```text
🚀 MinorAspectsComposerService.getLongitudesWindowForBody(…): { current: number; next: number; previous: number; } [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:181]
   ↳ Returns previous/current/next longitudes for one body at minute resolution.
  └─> AspectCalculationSupportService.getLongitudesWindowForBody(…): { current: number; next: number; previous: number; } [applications/caelundas/src/modules/aspects/aspect-calculation-support.service.ts:75]
     ↳ Returns previous/current/next longitudes for one body from a body-keyed ephemeris map.
    └─> EphemerisService.getLongitudesWindow(…): { current: number; next: number; previous: number; } [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:440]
       ↳ Extracts the ecliptic longitude for a body at the previous, current, and next minute. Convenience wrapper around {@link…
      └─> EphemerisService.getCoordinateFromEphemeris(…): number [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:261]
         ↳ Safely extracts coordinate data (longitude or latitude) from ephemeris at a timestamp.
```

**53. `MinorAspectsComposerService.getMinorAspectProgressiveEvent`** — depth 4 · orphan-root

```text
🚀 MinorAspectsComposerService.getMinorAspectProgressiveEvent(beginning: Event, ending: Event): Event [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:194]
   ↳ Creates one minor-aspect duration event from a matched forming/dissolving pair.
  └─> MinorAspectsComposerService.extractAspectComponents(categories: string[]): ExtractAspectComponentsResult [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:147]
     ↳ Extracts aspect components.
    └─> MinorAspectsComposerService.filter(…)(c: string): boolean [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:149]
      └─> MinorAspectsComposerService.map(…)(b: string): string [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:150]
```

**54. `SpecialtyAspectsComposerService.getSpecialtyAspectProgressiveEvent`** — depth 4 · orphan-root

```text
🚀 SpecialtyAspectsComposerService.getSpecialtyAspectProgressiveEvent(beginning: Event, ending: Event): Event [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:162]
   ↳ Creates one specialty-aspect duration event from a forming/dissolving pair.
  └─> SpecialtyAspectsComposerService.extractAspectBodiesFromCategories(…): { aspectCapitalized: string; body1Capitalized: string; body2Capitalized: string; } [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:86]
     ↳ Extracts aspect bodies from categories.
    └─> SpecialtyAspectsComposerService.filter(…)(category: string): boolean [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:92]
      └─> SpecialtyAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:93]
```

**55. `EphemerisService.getDiameterEphemerisByBody`** — depth 3 · orphan-root

```text
🚀 EphemerisService.getDiameterEphemerisByBody(…): Record<"lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus", DiameterEphemeris> [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:277]
   ↳ Computes minute-by-minute apparent angular diameter for the requested bodies. pheno_ut() returns apparent diameter in…
  └─> EphemerisPhenomenaService.computeDiameterForBody(…): DiameterEphemeris [applications/caelundas/src/modules/ephemeris/ephemeris-phenomena.service.ts:81]
     ↳ Computes minute-by-minute apparent angular diameter for a single body. Diameter is stored in degrees as returned by…
    └─> EphemerisConstantsService.getSwissEphemerisConstantForBody(body: Exclude<Body, Node>): number [applications/caelundas/src/modules/ephemeris/ephemeris-constants.service.ts:36]
       ↳ Looks up the Swiss Ephemeris constant for a non-node body (planet or asteroid).
```

**56. `EphemerisService.getIlluminationEphemerisByBody`** — depth 3 · orphan-root

```text
🚀 EphemerisService.getIlluminationEphemerisByBody(…): Record<"lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | ... 6 more ... | "venus", IlluminationEphemeris> [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:392]
   ↳ Computes per-body illumination series for the requested range.
  └─> EphemerisPhenomenaService.computeIlluminationForBody(…): IlluminationEphemeris [applications/caelundas/src/modules/ephemeris/ephemeris-phenomena.service.ts:115]
     ↳ Computes minute-by-minute illumination fraction for requested bodies. Illumination is stored as a percentage (0-100).…
    └─> EphemerisConstantsService.getSwissEphemerisConstantForBody(body: Exclude<Body, Node>): number [applications/caelundas/src/modules/ephemeris/ephemeris-constants.service.ts:36]
       ↳ Looks up the Swiss Ephemeris constant for a non-node body (planet or asteroid).
```

**57. `MajorAspectProgressiveService.getAspectGroupKey`** — depth 3 · orphan-root

```text
🚀 MajorAspectProgressiveService.getAspectGroupKey(event: Event): string [applications/caelundas/src/modules/major-aspects/major-aspect-progressive.service.ts:39]
   ↳ Builds a stable grouping key from sorted bodies plus major-aspect label.
  └─> ProgressiveAspectService.buildAspectGroupKeyFromCategories(…): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:27]
     ↳ Create a stable group key from sorted body labels and aspect label.
    └─> ProgressiveAspectService.map(…)(body: string): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:36]
```

**58. `MinorAspectsProgressiveService.buildGroupKey`** — depth 3 · orphan-root

```text
🚀 MinorAspectsProgressiveService.buildGroupKey(event: Event): string [applications/caelundas/src/modules/minor-aspects/minor-aspects-progressive.service.ts:41]
   ↳ Builds a stable grouping key from sorted bodies plus aspect name for pairing.
  └─> ProgressiveAspectService.buildAspectGroupKeyFromCategories(…): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:27]
     ↳ Create a stable group key from sorted body labels and aspect label.
    └─> ProgressiveAspectService.map(…)(body: string): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:36]
```

**59. `QuadrupleAspectsBaseService.makeProgressiveGroupKey`** — depth 3 · orphan-root

```text
🚀 QuadrupleAspectsBaseService.makeProgressiveGroupKey(event: Event): string [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:347]
   ↳ Makes progressive group key.
  └─> QuadrupleAspectsBaseService.filter(…)(category: string): boolean [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:349]
    └─> QuadrupleAspectsBaseService.map(…)(…): string [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:351]
```

**60. `SpecialtyAspectsProgressiveService.specialtyAspectGroupKey`** — depth 3 · orphan-root

```text
🚀 SpecialtyAspectsProgressiveService.specialtyAspectGroupKey(event: Event): string [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-progressive.service.ts:132]
   ↳ Builds a stable grouping key from sorted bodies plus specialty-aspect label.
  └─> ProgressiveAspectService.buildAspectGroupKeyFromCategories(…): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:27]
     ↳ Create a stable group key from sorted body labels and aspect label.
    └─> ProgressiveAspectService.map(…)(body: string): string [applications/caelundas/src/modules/progressive/progressive-aspect.service.ts:36]
```

**61. `StelliumService.stelliumGroupKey`** — depth 3 · orphan-root

```text
🚀 StelliumService.stelliumGroupKey(event: Event): string [applications/caelundas/src/modules/stellium/stellium.service.ts:286]
   ↳ Handles stellium group key.
  └─> StelliumService.filter(…)(category: string): boolean [applications/caelundas/src/modules/stellium/stellium.service.ts:288]
    └─> StelliumService.map(…)(…): string [applications/caelundas/src/modules/stellium/stellium.service.ts:289]
```

**62. `DailyCyclesService.buildLunarNadirEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildLunarNadirEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:77]
   ↳ Creates a lunar nadir calendar event.
  └─> DailyCyclesBuilderService.buildLunarNadirEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:66]
     ↳ Creates a lunar nadir calendar event. Lunar nadir is the moment when the Moon reaches its lowest point below the…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**63. `DailyCyclesService.buildLunarZenithEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildLunarZenithEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:84]
   ↳ Creates a lunar zenith (culmination) calendar event.
  └─> DailyCyclesBuilderService.buildLunarZenithEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:97]
     ↳ Creates a lunar zenith (culmination) calendar event. Lunar zenith is the moment when the Moon reaches its highest…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**64. `DailyCyclesService.buildMoonriseEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildMoonriseEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:91]
   ↳ Creates a moonrise calendar event.
  └─> DailyCyclesBuilderService.buildMoonriseEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:128]
     ↳ Creates a moonrise calendar event. Moonrise occurs when the Moon crosses the horizon from below, becoming visible. The…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**65. `DailyCyclesService.buildMoonsetEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildMoonsetEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:98]
   ↳ Creates a moonset calendar event.
  └─> DailyCyclesBuilderService.buildMoonsetEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:159]
     ↳ Creates a moonset calendar event. Moonset occurs when the Moon crosses the horizon from above, disappearing from view.…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**66. `DailyCyclesService.buildSolarNadirEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildSolarNadirEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:105]
   ↳ Creates a formatted calendar event for solar nadir (solar midnight).
  └─> DailyCyclesBuilderService.buildSolarNadirEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:202]
     ↳ Creates a formatted calendar event for solar nadir (solar midnight). Generates a calendar event marking the moment when…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**67. `DailyCyclesService.buildSolarZenithEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildSolarZenithEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:112]
   ↳ Creates a formatted calendar event for solar zenith (solar noon).
  └─> DailyCyclesBuilderService.buildSolarZenithEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:244]
     ↳ Creates a formatted calendar event for solar zenith (solar noon). Generates a calendar event marking the moment when…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**68. `DailyCyclesService.buildSunriseEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildSunriseEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:119]
   ↳ Creates a formatted calendar event for sunrise.
  └─> DailyCyclesBuilderService.buildSunriseEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:284]
     ↳ Creates a formatted calendar event for sunrise. Generates a calendar event marking the moment when Sun's center crosses…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**69. `DailyCyclesService.buildSunsetEvent`** — depth ≥ 3 · orphan-root

```text
🚀 DailyCyclesService.buildSunsetEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles.service.ts:126]
   ↳ Creates a formatted calendar event for sunset.
  └─> DailyCyclesBuilderService.buildSunsetEvent(date: Moment): Event [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:325]
     ↳ Creates a formatted calendar event for sunset. Generates a calendar event marking the moment when Sun's center crosses…
    └─> CalendarService.buildInstantEvent(args: BuildInstantEventArguments): Event [applications/caelundas/src/modules/calendar/calendar.service.ts:184]
       ↳ Builds a one-minute-point event where start and end are the same timestamp.
```

**70. `MinorAspectsComposerService.buildGroupKey`** — depth 3 · orphan-root

```text
🚀 MinorAspectsComposerService.buildGroupKey(event: Event): string [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:95]
   ↳ Builds a stable grouping key from sorted bodies plus aspect name for pairing.
  └─> MinorAspectsComposerService.filter(…)(category: string): boolean [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:97]
    └─> MinorAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:99]
```

**71. `SpecialtyAspectsComposerService.getBodyLongitudesWindow`** — depth 3 · orphan-root

```text
🚀 SpecialtyAspectsComposerService.getBodyLongitudesWindow(…): { current: number; next: number; previous: number; } [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:144]
   ↳ Returns previous/current/next longitudes for one body at minute resolution.
  └─> EphemerisService.getLongitudesWindow(…): { current: number; next: number; previous: number; } [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:440]
     ↳ Extracts the ecliptic longitude for a body at the previous, current, and next minute. Convenience wrapper around {@link…
    └─> EphemerisService.getCoordinateFromEphemeris(…): number [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:261]
       ↳ Safely extracts coordinate data (longitude or latitude) from ephemeris at a timestamp.
```

**72. `SpecialtyAspectsComposerService.specialtyAspectGroupKey`** — depth 3 · orphan-root

```text
🚀 SpecialtyAspectsComposerService.specialtyAspectGroupKey(event: Event): string [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:232]
   ↳ Builds a stable grouping key from sorted bodies plus specialty-aspect label.
  └─> SpecialtyAspectsComposerService.filter(…)(category: string): boolean [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:234]
    └─> SpecialtyAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:235]
```

**73. `main`** — depth ≥ 2 · module-bootstrap

```text
🚀 main(): Promise<void> [applications/caelundas/src/main.ts:9]
   ↳ Bootstraps the NestJS CLI application via `nest-commander`, wiring up pino logging before the module initializes.
  └─> LoggerService.constructor(): LoggerService [packages/logger/src/modules/logger/logger.service.ts:36]
```

**74. `CalendarService.constructor`** — depth 2 · orphan-root

```text
🚀 CalendarService.constructor(…): CalendarService [applications/caelundas/src/modules/calendar/calendar.service.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**75. `CalendarService.buildEventContent`** — depth 2 · orphan-root

```text
🚀 CalendarService.buildEventContent(event: Event, timezone?: string): string [applications/caelundas/src/modules/calendar/calendar.service.ts:114]
   ↳ Converts a single Event to VEVENT format for iCalendar inclusion. Generates an RFC 5545-compliant VEVENT component.…
  └─> CalendarService.generateUid(event: Event): string [applications/caelundas/src/modules/calendar/calendar.service.ts:98]
     ↳ Generates a deterministic event identity string used as the VEVENT UID source.
```

**76. `EphemerisService.constructor`** — depth 2 · orphan-root

```text
🚀 EphemerisService.constructor(…): EphemerisService [applications/caelundas/src/modules/ephemeris/ephemeris.service.ts:46]
  └─> initializeSwissEphemeris(): void [applications/caelundas/src/modules/ephemeris/ephemeris.constants.ts:62]
     ↳ Configures the Swiss Ephemeris data path before any calculations are performed. Must be called once at application…
```

**77. `IngressesComposerService.constructor`** — depth 2 · orphan-root

```text
🚀 IngressesComposerService.constructor(…): IngressesComposerService [applications/caelundas/src/modules/ingresses/ingresses-composer.service.ts:34]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**78. `IngressesService.getSign`** — depth 2 · orphan-root

```text
🚀 IngressesService.getSign(longitude: number): Sign [applications/caelundas/src/modules/ingresses/ingresses.service.ts:67]
   ↳ Determines which zodiac sign corresponds to an ecliptic longitude.
  └─> IngressesService.find(…)(…): boolean [applications/caelundas/src/modules/ingresses/ingresses.service.ts:70]
```

**79. `MajorAspectEventService.constructor`** — depth 2 · orphan-root

```text
🚀 MajorAspectEventService.constructor(…): MajorAspectEventService [applications/caelundas/src/modules/major-aspects/major-aspect-event.service.ts:29]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**80. `ProgressiveUtilitiesService.constructor`** — depth 2 · orphan-root

```text
🚀 ProgressiveUtilitiesService.constructor(logger: LoggerService): ProgressiveUtilitiesService [applications/caelundas/src/modules/progressive/progressive-utilities.service.ts:18]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**81. `MajorAspectsService.constructor`** — depth 2 · orphan-root

```text
🚀 MajorAspectsService.constructor(…): MajorAspectsService [applications/caelundas/src/modules/major-aspects/major-aspects.service.ts:33]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**82. `AnnualSolarCycleEventsService.constructor`** — depth 2 · orphan-root

```text
🚀 AnnualSolarCycleEventsService.constructor(logger: LoggerService): AnnualSolarCycleEventsService [applications/caelundas/src/modules/annual-solar-cycle/annual-solar-cycle-events.service.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**83. `AnnualSolarCycleService.constructor`** — depth 2 · orphan-root

```text
🚀 AnnualSolarCycleService.constructor(…): AnnualSolarCycleService [applications/caelundas/src/modules/annual-solar-cycle/annual-solar-cycle.service.ts:43]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**84. `MinorAspectsEventService.constructor`** — depth 2 · orphan-root

```text
🚀 MinorAspectsEventService.constructor(…): MinorAspectsEventService [applications/caelundas/src/modules/minor-aspects/minor-aspects-event.service.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**85. `MinorAspectsService.constructor`** — depth 2 · orphan-root

```text
🚀 MinorAspectsService.constructor(…): MinorAspectsService [applications/caelundas/src/modules/minor-aspects/minor-aspects.service.ts:37]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**86. `QuadrupleAspectsService.getOtherBody`** — depth 2 · orphan-root

```text
🚀 QuadrupleAspectsService.getOtherBody(edge: AspectBodies, body: Body): Body | null [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects.service.ts:100]
   ↳ Returns the other body in an aspect edge relative to the given body.
  └─> QuadrupleAspectsBaseService.getOtherBody(edge: AspectBodies, body: Body): Body | null [applications/caelundas/src/modules/quadruple-aspects/quadruple-aspects-base.service.ts:256]
     ↳ Returns the other body in an aspect edge relative to the given body.
```

**87. `SpecialtyAspectsEventService.constructor`** — depth 2 · orphan-root

```text
🚀 SpecialtyAspectsEventService.constructor(…): SpecialtyAspectsEventService [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-event.service.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**88. `SpecialtyAspectsService.constructor`** — depth 2 · orphan-root

```text
🚀 SpecialtyAspectsService.constructor(…): SpecialtyAspectsService [applications/caelundas/src/modules/specialty-aspects/specialty-aspects.service.ts:37]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**89. `TripleAspectsComposerService.constructor`** — depth 2 · orphan-root

```text
🚀 TripleAspectsComposerService.constructor(…): TripleAspectsComposerService [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:32]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**90. `TripleAspectsComposerService.getProgressiveGroupKey`** — depth 2 · orphan-root

```text
🚀 TripleAspectsComposerService.getProgressiveGroupKey(event: Event): string [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:399]
   ↳ Builds a stable progressive grouping key from sorted bodies plus aspect label.
  └─> TripleAspectsComposerService.map(…)(…): string [applications/caelundas/src/modules/triple-aspects/triple-aspects-composer.service.ts:401]
```

**91. `TripleAspectsService.findBodiesWithAspectTo`** — depth 2 · orphan-root

```text
🚀 TripleAspectsService.findBodiesWithAspectTo(body: Body, aspectType: Aspect, edges: AspectBodies[]): Body[] [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:36]
   ↳ Backward-compatible static utility retained for existing unit tests.
  └─> TripleAspectsService.map(…)(…): "lunar apogee" | "lunar perigee" | "north lunar node" | "south lunar node" | "ceres" | "chiron" | "juno" | "lilith" | "pallas" | "vesta" | "jupiter" | "mars" | "mercury" | "moon" | ... 5 more ... | "venus" [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:47]
```

**92. `TripleAspectsService.groupAspectsByType`** — depth ≥ 2 · orphan-root

```text
🚀 TripleAspectsService.groupAspectsByType<T extends AspectBodies>(edges: T[]): Map<Aspect, T[]> [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:55]
   ↳ Backward-compatible static utility retained for existing unit tests.
  └─> TripleAspectsService.groupByToMap(…)(…): "biquintile" | "decile" | "novile" | "quintile" | "septile" | "tredecile" | "undecile" | "quincunx" | "semisextile" | "semisquare" | "sesquiquadrate" | "conjunct" | "opposite" | "sextile" | "square" | "trine" [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:58]
```

**93. `TripleAspectsService.haveAspect`** — depth 2 · orphan-root

```text
🚀 TripleAspectsService.haveAspect(…): boolean [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:64]
   ↳ Backward-compatible static utility retained for existing unit tests.
  └─> TripleAspectsService.some(…)(edge: AspectBodies): boolean [applications/caelundas/src/modules/triple-aspects/triple-aspects.service.ts:72]
```

**94. `DailyCyclesBuilderService.constructor`** — depth 2 · orphan-root

```text
🚀 DailyCyclesBuilderService.constructor(…): DailyCyclesBuilderService [applications/caelundas/src/modules/daily-cycles/daily-cycles-builder.service.ts:18]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**95. `EclipseEventService.constructor`** — depth 2 · orphan-root

```text
🚀 EclipseEventService.constructor(…): EclipseEventService [applications/caelundas/src/modules/eclipses/eclipse-event.service.ts:19]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**96. `EclipseGeometryService.constructor`** — depth 2 · orphan-root

```text
🚀 EclipseGeometryService.constructor(…): EclipseGeometryService [applications/caelundas/src/modules/eclipses/eclipse-geometry.service.ts:23]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**97. `EclipseTopocentricService.constructor`** — depth 2 · orphan-root

```text
🚀 EclipseTopocentricService.constructor(…): EclipseTopocentricService [applications/caelundas/src/modules/eclipses/eclipse-topocentric.service.ts:23]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**98. `EclipseCalculationService.constructor`** — depth 2 · orphan-root

```text
🚀 EclipseCalculationService.constructor(…): EclipseCalculationService [applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts:28]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**99. `EclipsesService.constructor`** — depth 2 · orphan-root

```text
🚀 EclipsesService.constructor(…): EclipsesService [applications/caelundas/src/modules/eclipses/eclipses.service.ts:25]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**100. `MonthlyLunarCycleService.constructor`** — depth 2 · orphan-root

```text
🚀 MonthlyLunarCycleService.constructor(…): MonthlyLunarCycleService [applications/caelundas/src/modules/monthly-lunar-cycle/monthly-lunar-cycle.service.ts:28]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**101. `TwilightsBuilderService.constructor`** — depth 2 · orphan-root

```text
🚀 TwilightsBuilderService.constructor(logger: LoggerService): TwilightsBuilderService [applications/caelundas/src/modules/twilights/twilights-builder.service.ts:15]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**102. `PhaseCalculationService.constructor`** — depth 2 · orphan-root

```text
🚀 PhaseCalculationService.constructor(…): PhaseCalculationService [applications/caelundas/src/modules/phases/phase-calculation.service.ts:33]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**103. `MartianPhaseService.constructor`** — depth 2 · orphan-root

```text
🚀 MartianPhaseService.constructor(…): MartianPhaseService [applications/caelundas/src/modules/phases/martian-phase.service.ts:42]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**104. `MercurianPhaseService.constructor`** — depth 2 · orphan-root

```text
🚀 MercurianPhaseService.constructor(…): MercurianPhaseService [applications/caelundas/src/modules/phases/mercurian-phase.service.ts:42]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**105. `VenusianPhaseService.constructor`** — depth 2 · orphan-root

```text
🚀 VenusianPhaseService.constructor(…): VenusianPhaseService [applications/caelundas/src/modules/phases/venusian-phase.service.ts:42]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**106. `PhasesService.constructor`** — depth 2 · orphan-root

```text
🚀 PhasesService.constructor(…): PhasesService [applications/caelundas/src/modules/phases/phases.service.ts:30]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**107. `RetrogradesService.constructor`** — depth 2 · orphan-root

```text
🚀 RetrogradesService.constructor(…): RetrogradesService [applications/caelundas/src/modules/retrogrades/retrogrades.service.ts:36]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**108. `CaelundasCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 CaelundasCommand.constructor(…): CaelundasCommand [applications/caelundas/src/modules/caelundas/caelundas.command.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**109. `MinorAspectsComposerService.constructor`** — depth 2 · orphan-root

```text
🚀 MinorAspectsComposerService.constructor(…): MinorAspectsComposerService [applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts:40]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**110. `SpecialtyAspectsComposerService.constructor`** — depth 2 · orphan-root

```text
🚀 SpecialtyAspectsComposerService.constructor(…): SpecialtyAspectsComposerService [applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts:34]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `AspectsService.detectSimpleAspects` | 11 | `caelundas:modules/ingresses`, `caelundas:modules/major-aspects`, `caelundas:modules/minor-aspects`, `caelundas:modules/phases`, `caelundas:modules/retrogrades`, `caelundas:modules/specialty-aspects` | `applications/caelundas/src/modules/aspects/aspects.service.ts:85` |
| `PerfectiveService.detectOrbitalEvents` | 11 | `caelundas:modules/annual-solar-cycle`, `caelundas:modules/ingresses`, `caelundas:modules/monthly-lunar-cycle`, `caelundas:modules/phases`, `caelundas:modules/retrogrades` | `applications/caelundas/src/modules/perfective/perfective.service.ts:144` |
| `ProgressiveService.detect` | 11 | `caelundas:modules/annual-solar-cycle`, `caelundas:modules/aspects`, `caelundas:modules/eclipses`, `caelundas:modules/ingresses`, `caelundas:modules/monthly-lunar-cycle`, `caelundas:modules/phases`, `caelundas:modules/retrogrades`, `caelundas:modules/twilights` | `applications/caelundas/src/modules/progressive/progressive.service.ts:47` |
| `AspectsService.detectCompositeAspects` | 9 | `caelundas:modules/quadruple-aspects`, `caelundas:modules/quintuple-aspects`, `caelundas:modules/sextuple-aspects`, `caelundas:modules/stellium`, `caelundas:modules/triple-aspects` | `applications/caelundas/src/modules/aspects/aspects.service.ts:67` |
| `PerfectiveService.detectObservationalEvents` | 8 | `caelundas:modules/daily-cycles`, `caelundas:modules/eclipses`, `caelundas:modules/twilights` | `applications/caelundas/src/modules/perfective/perfective.service.ts:112` |

### Possibly misplaced

| Callable | Declared in | Called from | Callers |
| --- | --- | --- | --- |
| `CalendarService.buildInstantEvent` | `caelundas:modules/calendar` | `caelundas:modules/daily-cycles` | 8/9 |
| `typedFromEntries` | `caelundas:modules/caelundas` | `caelundas:modules/ephemeris` | 6/6 |
| `MathService.normalizeForComparison` | `caelundas:modules/math` | `caelundas:modules/retrogrades` | 4/4 |
| `objectEntries` | `caelundas:modules/caelundas` | `caelundas:modules/ingresses` | 2/2 |
<!-- CALL_STACKS_END -->
