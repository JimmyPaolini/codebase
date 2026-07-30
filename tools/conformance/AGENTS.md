# Conformance: NestJS Command-Line Application

## Quick Start

**Type**: Node.js CLI application (NestJS + `nest-commander`)

**Purpose**: <!-- Briefly describe the specific purpose of this CLI application -->

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run conformance:develop
```

## Architecture Overview

### Tech Stack

- **Framework**: NestJS (modules, dependency injection, providers)
- **CLI runner**: `nest-commander` (`CommandRunner` + `@Command()` decorator)
- **Env validation**: `@nestjs/config` + `zod` (`environmentSchema` in `.constants.ts`)
- **Logging**: `pino`-backed `LoggerService` (`Scope.TRANSIENT`)
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
    logger/
      logger.service.ts             # Transient pino LoggerService
      logger.module.ts              # LoggerModule (exports LoggerService)
    <domain>/                       # Add feature modules here
      <domain>.module.ts
      <domain>.command.ts
      <domain>.service.ts
      <domain>.types.ts
      <domain>.constants.ts
      <domain>.<tier>.test.ts
testing/                            # Shared test utilities
```

## Development

### Adding Business Logic

1. **Add domain command modules** — create `src/modules/<domain>/` with a NestJS module, command, service, types, and constants.
2. **Register in root module** — import the new module in `main.module.ts`.
3. **Validate env vars** — extend `environmentSchema` in `constants.ts` with all required environment variables.

### Logging

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
nx run conformance:develop        # Run CLI (tsx, watch mode)
nx run conformance:lint           # ESLint
nx run conformance:typecheck      # tsc --noEmit
nx run conformance:format         # oxfmt formatting
nx run conformance:build          # Compile for production
```

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run conformance:test:unit          # Fast (<100ms) — pure logic, mocked DI
nx run conformance:test:integration   # Moderate (1-2s) — real DB/API I/O
nx run conformance:test:end-to-end    # Slow (30-60s) — full CLI execution
```

| Tier | File pattern | What to test |
| ---- | ------------ | ------------ |
| Unit | `*.unit.test.ts` | Pure functions, service methods with mocked deps |
| Integration | `*.integration.test.ts` | Database queries, external API clients |
| End-to-end | `*.end-to-end.test.ts` | Full `CommandFactory.run()` execution |

See [Testing Strategy](../../documentation/code-quality/testing-strategy.md) for patterns and mock conventions.

## Writing Modules

Use the generator to scaffold new domain modules, then implement the service:

```bash
nx g conformance:nestjs-service-module --name=<domain>
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

### Generator Export Signature Pattern

When exposing reusable generator functions from command modules, keep dual invocation support with explicit overloads:

- `generateX({ tree, options })` for tests and argument-object call sites
- `generateX(tree, options?)` for tree-first call sites

Use this structure consistently:

```ts
export async function generateX(argumentsOrTree: XArguments): Promise<void>;
export async function generateX(tree: Tree, options?: XOptions): Promise<void>;
export async function generateX(
  argumentsOrTree: Tree | XArguments,
  options?: XOptions,
): Promise<void> {
  const resolved = isGeneratorInvocationArguments<XOptions>(argumentsOrTree)
    ? normalizeGeneratorInvocationFromArguments<XOptions>(argumentsOrTree)
    : normalizeGeneratorInvocationFromTree<XOptions>({
        ...(options !== undefined && { options }),
        tree: argumentsOrTree,
      });

  // implement generator logic using resolved.tree + resolved.options
}
```

> ✅ **Best practice:** Declare both overload signatures explicitly before the implementation signature so tree-first tests and callers type-check without `Expected 1 argument, got 2` regressions.
> ⚠️ **Warning:** Do not rely on only the implementation union signature; TypeScript call-site checking still uses declared overloads and will reject valid two-argument call patterns if the tree-first overload is missing.

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

After generating a module, import it in main.module.ts:

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

### Conformance check

Conformance checks are run centrally from `tools/conformance/src/conformance.test.ts`, which validates generated and existing module structures against templates across the workspace (including generated command applications).

```bash
nx run conformance:test
```

## Best Practices

- **Never** put business logic in `main.ts` — it bootstraps `CommandFactory` only.
- **One command per class** — split sub-commands into separate `CommandRunner` subclasses.
- **Validate at the boundary** — all env vars must be declared in `environmentSchema`; access via `ConfigService`, not `process.env`.
- **Type imports** — use `import { type Foo }` for type-only imports (enforced by ESLint).
- **No `any` types** — use `unknown` or proper typing; strict mode is enabled.

### Strict Type Safety in Tests

- Prefer **typed guard helpers** in tests over cast-based narrowing. If a mock call argument is `unknown`, add a local type predicate (for example `isValidateInstanceFileArgument`) and branch on that instead of using `as` assertions.
- When mocking Node directory entries for `fs.readdirSync(..., { withFileTypes: true })`, return a **complete `Dirent` shape** (all `is*` methods, `name`, `parentPath`) with the correct generic (`Dirent<NonSharedBuffer>` when the call path expects buffers).
- Avoid private-field mutation assertions in unit tests. Validate behavior through public APIs and emitted results to preserve type coverage and reduce brittle test maintenance.

### Required Validation Gate

- For validator and command module changes, run both checks explicitly before considering work complete:

```bash
nx run conformance:typecheck
nx run conformance:type-coverage
```

- Treat `type-coverage` as a hard gate alongside `typecheck` for this project; passing compile checks alone is not sufficient.

See [TypeScript Conventions](../../documentation/conventions/typescript.md) for strict mode patterns.

## Troubleshooting

- **Command not found at runtime** — ensure the command class is listed in `providers` of its module and the module is imported by the root module.
- **Dependency injection failure** — verify the service is `@Injectable()`, exported from its module, and that module is imported by the consuming module.
- **Unrecognized CLI flag** — check that `@Option()` decorators in the command class exactly match the flag names passed.
- **Env var validation error on startup** — add the missing variable to environmentSchema in src/constants.ts and to .env.default.

See [Common Gotchas](../../documentation/troubleshooting/gotchas.md) for workspace-wide issues.

## Key Files

- [src/main.ts](src/main.ts): Application bootstrap
- [src/main.module.ts](src/main.module.ts): Root NestJS module
- [src/constants.ts](src/constants.ts): environmentSchema (Zod)
- [src/modules/conformance/conformance.command.ts](src/modules/conformance/conformance.command.ts): Root CLI command
- [src/modules/logger/logger.service.ts](src/modules/logger/logger.service.ts): pino-backed logger
- [project.json](project.json): Nx targets (`develop`, `build`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template
