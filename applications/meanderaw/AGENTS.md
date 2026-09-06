# Meanderaw: NestJS Command-Line Application

## Quick Start

**Type**: Node.js CLI application (NestJS + `nest-commander`)

**Purpose**: <!-- Briefly describe the specific purpose of this CLI application -->

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run meanderaw:start
```

## 🏛️ Before You Change a Meander

Meander geometry is governed by a charter of seven invariants, five of which are fixed.
They are measured against all 1,632 committed SVGs, not read off the code, so
they are facts about the output rather than intentions in the source. The full charter,
with the measurements behind it, is in [README.md](./README.md), under "Meander Charter".

**The named half of the sweep runs to `FAMILY_MAXIMUM_ROWS`,** the same record
`MeanderGenerationService.generate` validates `rows` against — so every drawing the command
line can be asked for is one this repository commits and the charter gates, 1,183 named
patterns, each family from its own structural minimum through its own ceiling. It stopped
at 8 for every family alike until
[#507](https://github.com/JimmyPaolini/codebase/issues/507), which lived in the four row
counts between, so do not give that half a sweep maximum of its own again.

**Nine of the ten ceilings are the shared `MAXIMUM_VALUE` of 12. `mosaic`'s is 6,** because
it is the family whose space is enumerated exhaustively rather than sampled — 8,551 tiles
across 3 through 6 rows. The cap is on the whole family rather than on the enumeration
alone, so `--type mosaic --rows 7` is refused: a budget that stopped at the sweep would
leave those row counts reachable and uncommitted, which is the shape #507 had. See
`MOSAIC_TILE_MAXIMUM_ROWS`.

**What bounds `mosaic` is one edge budget, not a column cap.** A tile is a `columns` by
`rows - 1` grid of lattice points, each carrying four direction bits, and its edges are its
only degrees of freedom — so a shape holds `2 ** (columns * (2 * rows - 3))` tiles and rows
and columns are not independent knobs. `MOSAIC_TILE_EDGE_BUDGET` caps that edge count at
16, which admits eleven shapes: 3×1 through 3×5, 4×1 through 4×3, 5×1, 5×2, and 6×1. A
shape past it is refused rather than enumerated slowly. Raising it is a one-line change
with a visible effect on counts `mosaic-tiles.service.unit.test.ts` asserts — which is the
point of it being one number. See "Families, Sub-families, and Tiles" in
[README.md](./README.md).

**`mosaic` has no `permutations/` level,** and removing it was deliberate: that level
separated an enumerated half from a named one, and every tile the family draws is now a
member of one space. Its named drawings sit beside the `<columns>-columns/` directories
because they are tiles at column spans the edge budget refuses — `alternated period-3` is
six columns wide at six rows, which is 54 edges against a budget of 16 — rather than a
different kind of thing. Do not put the level back for that family.

**`negative` has a permutation half too,** and it enumerates its one-column source space —
the `ruled` domain — at 208 sources across 3 through 6 rows. Those are the `mosaic` tiles
it can invert rather than all of them: a source point carrying more than
`NEGATIVE_SOURCE_MAXIMUM_DEGREE` bits can wall a cell on every side, and a cell with no
corridor leaves the negative with a lattice point nothing paints — charter invariant 2
broken, measured over the corpus at 599 drawings. Do not widen it without giving this
family a rule for what to draw there. It stops at the same
`MOSAIC_TILE_MAXIMUM_ROWS` the `mosaic` half does, so its deepest row count inverts a
seven-row source that is enumerable but no longer committed: the corridor-identity gate
covers rows 3 through 5 of the half and the charter sweep covers the rest. `negative` as a
named family keeps its ceiling of 12.

Every change to a family's row range or mode set moves most of the published counts —
widening the sweep to the command line's own range, giving every `branch` mode a parameter,
growing `negative` from three sources to ten, capping `mosaic` at 6 rows, and replacing
that family's matching rule with an edge budget over a lattice have each done it in turn. So a figure below that disagrees with a measurement is more likely stale than
wrong.

The three that most often catch a change:

- **Space-filling.** Every interior white channel is exactly one stroke width — which
  equals half a grid unit. `GridGeometryService` derives stroke width and offset from the
  grid unit for this reason; setting either independently breaks the invariant silently,
  because nothing currently fails when it does. The stroke is `unit / 2` in every document
  the project writes, `parallel` at every ply included — a family that draws more strands
  does not draw thinner ones, and `strokeWidth = unit / (2N)` is a discarded proposal
  rather than an unimplemented one. See "The Parallel Family" in [README.md](./README.md).
- **No branching and no crossing.** Ink has zero T-junctions everywhere except `negative`
  and `branch`, the two families added to branch, and `chain`/`snake` under
  `edge`/`edge-flip`, which branch where their zigzag lands mid-border — 5,152 junctions
  across 214 of the 1,183 named patterns, 3,054 of them `negative`'s and 1,738 `branch`'s.
  It has zero X-junctions everywhere except `cross` drawn solid — 12 per document at every
  one of its seven row counts, and none under its `interrupted` modifier, where the break
  takes the junction out of the ink graph — and `negative` under `brick-straight`,
  `brick-upright`, and `grid`, which carry 705 between their thirty documents.
  These two are the charter's negotiable invariants, so a family may break them — but only
  deliberately, and never as a side effect of a geometry fix. Both counts are measured by
  `MeanderTopologyService` and gated by the charter property test, which asserts a declared
  relaxation is _present_ as well as an undeclared one absent. Declare a relaxation in that
  test's `RELAXED_INVARIANTS` rather than editing its assertions — including the two
  exceptions the `negative` entry now carries, since `ruled-closed` is the one mode of a
  branching family that branches nowhere and the three crossing modes are named one by one
  rather than forgiven wholesale.
- **Band, not field.** Canvas height is fixed and `rows` sets density, not size. These
  patterns are meant for borders.

Three things that look like defects and are not:

- **Gaps wider than one stroke where a band terminates** are expected, and owned by
  [#338](https://github.com/JimmyPaolini/codebase/issues/338). Do not chase them.
- **`--type` disagreeing with the glossary's "family"** is a deliberate divergence, not a
  stale name. Renaming the flag is a breaking CLI change.
- **`dot` and `dots`, and `diamond` and `split`,** are pairs of different things rather
  than duplicates. `dot` is a `mosaic` modifier carrying a shape; `dots` is a `mosaic`
  sub-family. `split` is a modifier that constructs a shape; `diamond` is the sub-family
  that recognizes the same shape however it arose. Do not collapse either pair — see
  "Naming a Mosaic Sub-family" in [README.md](./README.md).
- **A `mosaic` name is a rule, not a label.** `mosaic-naming` holds one predicate per
  name, read off a tile's direction bits; a tile matching none keeps its identifier and
  stays unnamed, and one matching two is a defect the unit test catches over the whole
  space. Adding a name to the family means adding a rule there, never a motif service.
  **Unbroken or broken is a question about edges, not points** — `lines` and `dashes`
  differ on it, and so do `bars` and `diamond` — which is what an earlier rule set got
  wrong when it called a solid vertical bar a `diamond`.
- **A `mosaic` tile branching or crossing** is declared, not a regression. Its named modes
  do neither; its enumerated half does both, which the charter test's `RELAXED_INVARIANTS`
  records with a `permutations` flag and then asserts is really present in committed
  output. Editing that declaration is how the permission moves — never the assertions.
- **`parallel` being a family rather than a modifier** is a correction, not an oversight.
  [#340](https://github.com/JimmyPaolini/codebase/issues/340) models it as the one modifier
  compatible with every family; `N` strands cannot trace the path one strand traces, so
  there is no existing repeat unit for a modifier to construct, and it ships as a family
  whose ply is chosen by its own modifiers — `plied`, `aligned`, and `serpentine`, which
  all carry the same `strands` count and differ only in what those strands trace. It is
  also the one family that commits no unmodified drawing: `plied` at two strands _is_ that
  drawing, so it carries it rather than the sweep writing the same bytes twice. Do not
  list `parallel` in `COMPATIBLE_MODIFIERS`. See "The Parallel Family" in
  [README.md](./README.md).
- **`negative` and `branch` both branching** is not one family under two names. Both relax
  invariant 3 and both come off the same survey shortlist; they differ in loops, and now in
  crossing too. `negative` inks a whole corridor graph and carries up to 65 cycles per
  drawing on one to thirteen components, and `branch` inks a loop-free spanning tree and
  carries none. They are no longer the only trees in the corpus: a `serpentine` ply of one
  is a single ribbon covering the whole band, which is a tree by way of being a path rather
  than by forking — in phase or turned over, which is why there are two of them at every
  row count. Those cycle counts and both tree families are asserted in
  `meander-topology.service.integration.test.ts`, not merely stated here. See "The
  Branching Family" in [README.md](./README.md).
- **A `negative` mode that crosses** is deliberate, not a geometry bug. Two corridors
  stacked in one lattice column is an X-junction, so a source whose openings sit side by
  side cannot avoid crossing — `brick-straight` is stack bond, `grid` inverts the `dots`
  sub-family, and `brick-upright` inverts `diamond`. The survey found 3,070 of the 3,179
  `mosaic` tiles it measured have a crossing negative, so these three are the norm of that
  space rather than an escape from the charter. See "The Negative Space Family" in
  [README.md](./README.md).
- **`brick-staggered` and `brick-straight`** are two bonds of one wall, not a rename and a
  stray. Running bond alternates the anchor column by course and branches; stack bond
  anchors every course in the same column and crosses. `brick` on its own is the old name
  of the staggered one and no longer exists.

When adding a family, prefer extending an existing family's unit space over hand-writing a
new motif service — see
"Families, Sub-families, and Tiles" in [README.md](./README.md), and the
candidate backlog in [#340](https://github.com/JimmyPaolini/codebase/issues/340).

## Architecture Overview

### Tech Stack

- **Framework**: NestJS (modules, dependency injection, providers)
- **CLI runner**: `nest-commander` (`CommandRunner` + `@Command()` decorator)
- **Env validation**: `@nestjs/config` + `zod` (`environmentSchema` in `.constants.ts`)
- **Logging**: `@codebase/logger` — a `pino`-backed `LoggerService` (`Scope.TRANSIENT`)
- **Language**: Strict TypeScript

### Execution Flow

```text
src/main.ts
  └─ CommandFactory.run(MainModule)
       └─ domain command modules            ← add under src/modules/
```

### Directory Layout

```text
src/
  main.ts                           # Bootstrap — do not modify
  main.module.ts                    # Root NestJS module (imports ConfigModule, LoggerModule)
  constants.ts                      # Zod environmentSchema for env validation
  modules/
    <domain>/                       # Add feature modules here
      <domain>.module.ts
      <domain>.command.ts
      <domain>.service.ts
      <domain>.types.ts
      <domain>.constants.ts
      <domain>.<tier>.test.ts
testing/                            # Shared test utilities
```

### Module Graph

The modules this project defines and the imports between them are exported by
[codependix](https://github.com/JimmyPaolini/codebase/tree/main/packages/codependix-cli)
into the `## 🕸️ Codependix` section of [README.md](README.md), alongside this
project's Nx neighborhood and its file-level import graph. Regenerate all three
with:

```bash
nx run codebase:codependix:write
```

## Development

### Adding Business Logic

1. **Add domain command modules** — create `src/modules/<domain>/` with a NestJS module, command, service, types, and constants.
2. **Register in root module** — import the new module in `main.module.ts`.
3. **Validate env vars** — extend `environmentSchema` in `constants.ts` with all required environment variables.

### Logging

`LoggerService` and `LoggerModule` come from `@codebase/logger` — this project does not define its own logger. Add `"@codebase/logger": "workspace:*"` to `dependencies`, then import `LoggerModule` once in the root module; it is `@Global()`, so feature modules inject `LoggerService` without importing it.

`LoggerService` is `Scope.TRANSIENT` — each injecting class gets its own instance. Always call `setContext` in the constructor:

```ts
constructor(private readonly logger: LoggerService) {
  super();
  this.logger.setContext(MyService.name);
}
```

Outputs structured JSON in production (`NODE_ENV=production`) and pretty-printed logs in development.

### Key Commands

Always prefer running tasks through Nx rather than calling the underlying tools directly.

```bash
nx run meanderaw:start           # Run the command-line application
nx run meanderaw:lint-codebase   # Every static check, in one graph
nx run meanderaw:typecheck       # tsc --noEmit
nx run meanderaw:oxfmt           # Formatting
```

This application has **one command, `draw`**, and it is the default — so `start` runs it.
With no arguments it writes every drawing under `output/<family>/<rows>-rows/`, nests the
enumerated `mosaic` tiles a `<columns>-columns/` deeper, and writes one
`output/index.html` listing them all. With `--type` and `--rows` it draws that
one into the same tree:

```bash
nx run meanderaw:start --args="--type chain --rows 7 --modifier edge-flip"
```

There is deliberately no second command — see "One Command" and "Output Layout" in
[README.md](./README.md).

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run meanderaw:vitest:unit          # Fast (<100ms) — pure logic, mocked DI
nx run meanderaw:vitest:integration   # Moderate (1-2s) — real database/API I/O
nx run meanderaw:vitest:end-to-end    # Slow (30-60s) — full CLI execution
```

| Tier | File pattern | What to test |
| ---- | ------------ | ------------ |
| Unit | `*.unit.test.ts` | Pure functions, service methods with mocked deps |
| Integration | `*.integration.test.ts` | Database queries, external API clients |
| End-to-end | `*.end-to-end.test.ts` | Full `CommandFactory.run()` execution |

See the [testing-strategy skill](../../.agents/skills/testing-strategy/SKILL.md) and [testing-mocks skill](../../.agents/skills/testing-mocks/SKILL.md) for patterns and mock conventions.

## Writing Modules

Use the generator to scaffold new domain modules, then implement the service:

```bash
nx g conformetry:nestjs-service-module --name=<domain>
```

This creates five files in `src/modules/<domain>/`:

| File | Purpose |
| ---- | ------- |
| `<domain>.module.ts` | Declares providers, imports, and exports |
| `<domain>.service.ts` | Business logic — the only place you write domain code |
| `<domain>.constants.ts` | Regex, enums, static config — never inline magic values |
| `<domain>.types.ts` | TypeScript types scoped to this module |
| `<domain>.service.unit.test.ts` | Unit tests bootstrapped with `Test.createTestingModule` |

### Module file

Register the service in both `providers` and `exports` so consumers can inject it:

```ts
@Module({
  controllers: [],
  exports: [MyDomainService],
  imports: [TypeOrmModule.forFeature([MyEntity]), LoggerModule],
  providers: [MyDomainService],
})
export class MyDomainModule {}
```

Add a JSDoc comment on the module class describing what domain it owns.

### Service file

Follow the section-comment layout from the template — it keeps large services scannable:

```ts
@Injectable()
export class MyDomainService {
  // 🏗 Dependency Injection
  constructor(
    @InjectRepository(MyEntity)
    private readonly repo: Repository<MyEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MyDomainService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods
}
```

Key rules:

- **Call `setContext` in every constructor** — always use `MyClass.name`, never a string literal.
- **Inject `LoggerService` as the last constructor parameter** (after repository/domain deps).
- **Private first** — keep internal helpers in the `🔏 Private Methods` section, expose only what callers need under `🌎 Public Methods`.
- **`readonly` everything in the constructor** — all injected deps must be `private readonly`.
- **One service per module** — if a service grows too large, extract a sub-domain into its own module.

### Constants file

Move all inline values to `.constants.ts` to keep services readable:

```ts
// ♟️ Constants
export const MY_SKIP_REGEX = /(alternative)|(archaic)|(synonym)/i;
export const DEFAULT_PAGE_SIZE = 100;
```

### Types file

Put all module-local TypeScript types and interfaces in `.types.ts`:

```ts
// 🏷️ Types
export interface ParsedEntry {
  word: string;
  partOfSpeech: string;
}
```

Do not re-export types from `index.ts` unless they are part of the public API consumed by other modules.

### Registering in the root module

After generating a module, import it in `main.module.ts`:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    LoggerModule,
    MyDomainModule,   // ← add here
  ],
  providers: [],
})
export class MainModule {}
```

### Conformetry validation

Conformetry validation measures generated and existing module structures against the templates they came from. It runs for one project, or for every project at once.

```bash
pnpm nx run-many --targets=conformetry-validate
```

## Best Practices

- **Never** put business logic in `main.ts` — it bootstraps `CommandFactory` only.
- **One command per class** — split sub-commands into separate `CommandRunner` subclasses.
- **Validate at the boundary** — all env vars must be declared in `environmentSchema`; access via `ConfigService`, not `process.env`.
- **Type imports** — use `import { type Foo }` for type-only imports (enforced by ESLint).
- **No `any` types** — use `unknown` or proper typing; strict mode is enabled.

See the [write-typescript skill](../../.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

## Troubleshooting

- **Command not found at runtime** — ensure the command class is listed in `providers` of its module and the module is imported by the root module.
- **Dependency injection failure** — verify the service is `@Injectable()`, exported from its module, and that module is imported by the consuming module.
- **Unrecognized CLI flag** — check that `@Option()` decorators in the command class exactly match the flag names passed.
- **Env var validation error on startup** — add the missing variable to `environmentSchema` in `src/constants.ts` and to `.env.default`.

See the [triage-submission skill](../../.agents/skills/triage-submission/SKILL.md) for lint and git hook failures.

## Key Files

- [src/main.ts](src/main.ts): Application bootstrap
- [src/main.module.ts](src/main.module.ts): Root NestJS module
- [src/constants.ts](src/constants.ts): `environmentSchema` (Zod)
- `@codebase/logger` (`packages/logger`): shared pino-backed `LoggerService` and `LoggerModule`
- [project.json](project.json): Nx targets (`develop`, `build`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template
