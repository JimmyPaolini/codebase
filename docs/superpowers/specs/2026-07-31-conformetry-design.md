# Conformetry Package Migration Design

## Summary

Migrate `tools/conformance` into publishable packages under `packages/`, rename the system to `conformetry`, remove the `tools` wrapper, and re-architect generators and validators into a plugin-first, runtime-agnostic model.

## Approved Decisions

1. Fully switch to conformetry naming now (no `conformance` backward-compat aliases).
2. No thin wrapper in `tools/`; Nx should point directly to package exports.
3. Keep repository-local declarative configuration in:
   - `configuration/conformetry.config.ts`
   - `configuration/conformetry-templates/`
4. Generator architecture is config-driven: adding a generator only requires schema + templates + config metadata.
5. The package scaffolding baseline is a new `nestjs-service-application` generator that is nearly identical to `nestjs-command-application` but uses regular NestJS bootstrapping instead of `nest-commander`.
6. Validation is split into dedicated publishable plugins:
   - `@jimmypaolini/conformetry-typescript`
   - `@jimmypaolini/conformetry-python`
   - `@jimmypaolini/conformetry-markdown`
   - `@jimmypaolini/conformetry-json`
   - `@jimmypaolini/conformetry-text`

## Package Topology

### `@jimmypaolini/conformetry-core`

Owns:

- generator definition contracts
- generator execution orchestration
- template rendering and substitution logic
- validation orchestration contracts
- plugin registration and execution
- filesystem/runtime abstraction interfaces (paths, globs, file IO)

Must not import `@nx/devkit` and must not perform Nx project metadata filtering.

### `@jimmypaolini/conformetry-nx`

Owns:

- Nx generator factory exports
- mapping Nx `Tree` into core runtime abstractions
- Nx project metadata resolution and filtering (tags/types/project selectors)
- loading repo config (`configuration/conformetry.config.ts`) for workspace usage
- Nx-focused path resolution and project constraints

### Validation plugin packages

- `@jimmypaolini/conformetry-typescript`
- `@jimmypaolini/conformetry-python`
- `@jimmypaolini/conformetry-markdown`
- `@jimmypaolini/conformetry-json`
- `@jimmypaolini/conformetry-text`

Each package exposes plugin descriptors consumed by core.

## Generator Model

### Declarative registry

`configuration/conformetry.config.ts` will define a strongly typed generator-definition map keyed by generator name, with:

- `name`
- `aliases`
- `description`
- `schemaPath`
- `templateDirectoryPath`
- `targetPathStrategy`
- `projectSelector` constraints (tags/types/runtime selectors)
- optional hooks for generation lifecycle:
  - `preGenerate`
  - `postGenerate` (for example formatting generated files)

No per-generator command module is required.

### Input + schema

Each generator uses its own schema file (current schema semantics preserved) and is validated before execution.

### Template source

Template roots move from `tools/conformance/src/modules/*/templates` to `configuration/conformetry-templates/*`.

## Validation Model

Core exposes a validator runtime that:

- resolves candidate file paths by glob
- runs configured validator plugins
- aggregates structured result sets
- emits stable JSON result contracts for CI

Nx-specific project selection and metadata filtering happen in `@jimmypaolini/conformetry-nx` before invoking core.

Existing validator behavior from current conformance implementation is preserved but redistributed into dedicated plugin packages.

## Runtime Abstractions

Core abstractions:

- `FileSystemAdapter` (read/write/list/exists/path ops)
- `PathMatcher` (glob matching and candidate-path expansion)
- `TemplateRenderer` abstraction (mustache-based default implementation)
- `FormatterAdapter` for post-generation formatting hooks

Nx adapter implements these using `@nx/devkit` and workspace metadata APIs.
Non-Nx consumers can implement adapters without pulling Nx.

## Nx Integration

Nx will consume package exports directly:

- generator registration points to `@jimmypaolini/conformetry-nx`
- no local `tools/conformance` compatibility layer retained
- target names and references updated from `conformance` to `conformetry`

## Migration Plan (high-level)

1. Create new package projects under `packages/`:
   - `conformetry-core`
   - `conformetry-nx`
   - `conformetry-typescript`
   - `conformetry-python`
   - `conformetry-markdown`
   - `conformetry-json`
   - `conformetry-text`
2. Create a new `nestjs-service-application` generator by cloning the existing command-application generator shape and removing `nest-commander` usage.
3. Scaffold conformetry packages using `nx g conformance:nestjs-service-application --type=packages --name=<package-name>`.
4. Move and normalize shared generator logic into `conformetry-core`.
5. Implement declarative generator registry + loader against `configuration/conformetry.config.ts`, including pre/post generation hooks.
6. Move templates to `configuration/conformetry-templates/` and update path references.
7. Move existing validator logic into plugin packages and wire plugin composition in core.
8. Implement `conformetry-nx` generator exports and workspace adapter.
9. Rewire workspace Nx configuration to conformetry package exports.
10. Remove/replace old `tools/conformance` project and rename references.
11. Update docs and command examples across AGENTS/documentation.
12. Run targeted validation (tests + typecheck + type-coverage + analyze-code) on all touched projects.

## Publishing Configuration

Publishing setup is in scope for this implementation and will be configured for npm under `@jimmypaolini/*`.

Required publishing work:

1. add package metadata for publishability across all conformetry packages (`name`, `version`, `exports`, `files`, `license`, `repository`, `publishConfig`)
2. configure release automation (existing semantic-release workflow or scoped equivalent) to publish `@jimmypaolini/conformetry-*`
3. configure npm auth/provenance-compatible CI publish flow
4. add explicit release targets/checks so package publish steps run only when package changes are present
5. document local dry-run and release verification commands

Acceptance criteria additions:

- every conformetry package has valid npm publish metadata
- CI can perform publish dry-run for changed conformetry packages
- release workflow documents required npm scope ownership/token requirements for `@jimmypaolini`

## Error Handling

- No silent fallback when definitions, paths, templates, or schema fail.
- Typed errors with clear category and actionable message:
  - configuration errors
  - schema validation errors
  - template resolution/rendering errors
  - project resolution errors
  - validator plugin execution errors

All failures must surface through Nx task output and JSON validator results.

## Testing Strategy

### Core

- unit tests for config validation, generator orchestration, substitution, rendering, and plugin composition
- regression tests for generated file outputs relative to current behavior

### Nx adapter

- unit tests for adapter behavior (project/tag resolution, tree interaction, path mapping)
- integration checks for `nx generate conformetry:<name>`

### Validator plugins

- each plugin package has focused unit coverage for rule logic
- cross-plugin orchestration tests in core

### Workspace verification

- run relevant `nx run <project>:typecheck`
- run relevant `nx run <project>:type-coverage`
- run relevant `nx run <project>:test`
- run analyze-code write/check gates for affected projects

## Out of Scope

- preserving `conformance` command names
- maintaining a `tools` compatibility wrapper
- introducing non-essential new generator features unrelated to migration
- changing generated output contracts unless required for correctness

## Acceptance Criteria

1. All existing generators run through conformetry package exports and preserve expected output behavior.
2. Creating a new generator requires only schema + templates + config entry (no new module/class).
3. The new `nestjs-service-application` generator can scaffold conformetry packages without `nest-commander`.
4. Core package can be used without Nx dependencies.
5. Validator functionality is distributed across dedicated plugin packages and composed by core.
6. Workspace references, docs, and commands use `conformetry` naming consistently.
