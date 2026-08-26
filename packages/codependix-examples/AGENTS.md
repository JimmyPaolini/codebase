# CodependixExamples: NestJS Command-Line Application

## Quick Start

**Type**: Node.js CLI application (NestJS + `nest-commander`)

**Purpose**: <!-- Briefly describe the specific purpose of this CLI application -->

Sixteen worked examples of what codependix builds, each one rendered by the real
graph builders from fixtures in this package. Reach for it when codependix says
something you need to act on.

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run codependix-examples:start
```

## Codependix said X — open this example

Every row is a real rendered file, not prose. If codependix refused something, the
reproduction that produces that exact message is in example 14.

| What you were told | Open |
| ------------------ | ---- |
| `Found stale codependix exports`, with a list of projects | [13](output/13-check-and-write.md), then [16](output/16-workspace-drift.md) — an export moves with the workspace, so a branch that changed any project graph fails `--check` for projects it never touched. This repository gates no pull request on it |
| `AnchorNotFoundError: Anchor "…" not found in …/README.md` | [12](output/12-auto-created-sections.md) — the file itself does not exist. A missing _anchor_ is auto-created on `--write`; a missing _file_ is not |
| A project reported stale that has never had codependix output | [12](output/12-auto-created-sections.md) — expected. `--check` reports it as needing a write rather than raising |
| `A "both" export target needs a json destination.` | [14](output/14-refusals.md) |
| `A "markdown" export target needs a markdown destination.` | [14](output/14-refusals.md) |
| `A markdown destination needs an anchor, a path, or both` | [14](output/14-refusals.md), and [11](output/11-markdown-modes.md) for the four shapes a destination can take |
| `ConfigurationFileNotFoundError` | [14](output/14-refusals.md) — an explicitly named `--config` must exist; an unnamed one may be absent |
| `UnknownConfigurationFileTypeError` | [14](output/14-refusals.md) — the seven readable extensions are listed there |
| `TypescriptProjectConfigurationError` | [6](output/06-typescript-resolution.md) — the compiler's own diagnostics, and why a parse failure is fatal rather than skipped |
| `💥 Failed running codependix`, naming one project | [5](output/05-container-rooting.md) — one project's failure is isolated; every other project still completed |
| `Either --check or --write is required` | [13](output/13-check-and-write.md) |
| `Only one of --check or --write may be given` | [13](output/13-check-and-write.md) |
| A graph came out emptier than the code looks | [3](output/03-ambient-modules.md) for a rounded module with no edges; [6](output/06-typescript-resolution.md) and [7](output/07-python-scanner.md) for the statements deliberately not walked |
| A project produced no graph at all | [8](output/08-configuration-resolution.md) — check `include`/`exclude` and whether a per-project override replaced the default |
| A NestJS module you expected is missing | [5](output/05-container-rooting.md) — a rooted project is explored from `MainModule` outward, so a module nothing imports is absent |

## Before changing a graph builder

`nx run codependix-examples:examples:check` is the regression gate for every
documented behavior, and it is stricter than the unit tests: it compares the
committed Markdown byte for byte. Two rules follow from that.

- **A deliberate behavior change means regenerating**, with
  `nx run codependix-examples:examples:write`, and reading the diff. If a
  diagram moved, the guides moved with it.
- **An accidental behavior change shows up here first.** Every case in
  examples 6 and 7 that exists to _not_ be walked — a re-export, a dynamic
  `import()`, a `require`, an import indented inside a function — is a claim a
  resolver or scanner change could silently reverse. A failing `examples:check`
  on one of those is a bug report, not a stale snapshot.

Never hand-edit anything under `output/`.

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

Two directories the template does not describe carry this package's whole point:

```text
fixtures/                           # Input to be graphed — never this package's own code
  atlas/                            # One fixture workspace, graphed at all four levels
  nestjs/                           # Seven containers, one per rule the module graph applies
  typescript/                       # Module resolution, and the four statements that draw nothing
  python/                           # Every case the statement scanner handles, and every non-case
  configuration/                    # File precedence, upward search, unknown fields, refusals
output/                             # The rendered examples — generated, never hand-edited
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

### Rendering the examples

```bash
nx run codependix-examples:examples:write   # Re-render every example into output/
nx run codependix-examples:examples:check   # Fail if any committed example has drifted
```

### Key Commands

Always prefer running tasks through Nx rather than calling the underlying tools directly.

```bash
nx run codependix-examples:start           # Run the command-line application
nx run codependix-examples:lint-codebase   # Every static check, in one graph
nx run codependix-examples:typecheck       # tsc --noEmit
nx run codependix-examples:oxfmt           # Formatting
```

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run codependix-examples:vitest:unit          # Fast (<100ms) — pure logic, mocked DI
nx run codependix-examples:vitest:integration   # Moderate (1-2s) — real database/API I/O
nx run codependix-examples:vitest:end-to-end    # Slow (30-60s) — full CLI execution
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
- [src/constants.ts](src/constants.ts): also `PROJECT_ROOT_DIRECTORY` and `resolveFixture`, which resolve a fixture path from `import.meta.url` rather than from the working directory
- [README.md](README.md): the human guide, and the reasoning behind the fixture shape
- `@codebase/logger` (`packages/logger`): shared pino-backed `LoggerService` and `LoggerModule`
- [project.json](project.json): Nx targets (`develop`, `build`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template
