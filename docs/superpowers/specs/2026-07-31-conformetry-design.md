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
5. Validation is split into dedicated publishable plugins:
   - `@codebase/conformetry-typescript`
   - `@codebase/conformetry-python`
   - `@codebase/conformetry-markdown`
   - `@codebase/conformetry-json`
   - `@codebase/conformetry-text`

## Package Topology

### `@codebase/conformetry-core`

Owns:

- generator definition contracts
- generator execution orchestration
- template rendering and substitution logic
- validation orchestration contracts
- plugin registration and execution
- filesystem/runtime abstraction interfaces

Must not import `@nx/devkit`.

### `@codebase/conformetry-nx`

Owns:

- Nx generator factory exports
- mapping Nx `Tree` and project metadata into core runtime abstractions
- loading repo config (`configuration/conformetry.config.ts`) for workspace usage
- Nx-focused path resolution and project/tag constraints

### Validation plugin packages

- `@codebase/conformetry-typescript`
- `@codebase/conformetry-python`
- `@codebase/conformetry-markdown`
- `@codebase/conformetry-json`
- `@codebase/conformetry-text`

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
- optional hooks (for pre/post behavior where required)

No per-generator command module is required.

### Input + schema

Each generator uses its own schema file (current schema semantics preserved) and is validated before execution.

### Template source

Template roots move from `tools/conformance/src/modules/*/templates` to `configuration/conformetry-templates/*`.

## Validation Model

Core exposes a validator runtime that:

- resolves selected projects/targets
- runs configured validator plugins
- aggregates structured per-project/per-rule results
- emits stable JSON result contracts for CI

Existing validator behavior from current conformance implementation is preserved but redistributed into dedicated plugin packages.

## Runtime Abstractions

Core abstractions:

- `FileSystemAdapter` (read/write/list/exists/path ops)
- `ProjectMetadataAdapter` (project names, root paths, tags, source roots, lookup)
- `TemplateRenderer` abstraction (mustache-based default implementation)
- `FormatterAdapter` for post-generation formatting hooks

Nx adapter implements these using `@nx/devkit` and workspace metadata APIs.
Non-Nx consumers can implement adapters without pulling Nx.

## Nx Integration

Nx will consume package exports directly:

- generator registration points to `@codebase/conformetry-nx`
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
2. Move and normalize shared generator logic into `conformetry-core`.
3. Implement declarative generator registry + loader against `configuration/conformetry.config.ts`.
4. Move templates to `configuration/conformetry-templates/` and update path references.
5. Move existing validator logic into plugin packages and wire plugin composition in core.
6. Implement `conformetry-nx` generator exports and workspace adapter.
7. Rewire workspace Nx configuration to conformetry package exports.
8. Remove/replace old `tools/conformance` project and rename references.
9. Update docs and command examples across AGENTS/documentation.
10. Run targeted validation (tests + typecheck + type-coverage + analyze-code) on all touched projects.

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
3. Core package can be used without Nx dependencies.
4. Validator functionality is distributed across dedicated plugin packages and composed by core.
5. Workspace references, docs, and commands use `conformetry` naming consistently.
