# ConformetryNx

NestJS service package scaffold generated with `conformetry:nestjs-service-project`.

`@jimmypaolini/conformetry-nx` is the thin Nx integration layer for the conformetry toolchain.

- It preserves Nx plugin and generator registration (`generators.json` + `src/index.ts`).
- It keeps Nx-specific concerns in-package (`Tree` input normalization, target path resolution, and project selector/tag routing).
- It delegates configured generator execution to the conformetry integration facade (`@jimmypaolini/conformetry`), which owns runtime generation orchestration.

The package uses a NestJS-backed `nx-adapter` module/service layer for Nx plugin and generator orchestration glue code. Files in `src/modules/nx-adapter/` use the package naming convention required by the repository:

- `*.module.ts`
- `*.service.ts`
- `*.types.ts`
- `*.constants.ts`
- `*.utilities.ts` for top-level helper functions

## Bootstrap

Which generators a workspace has is a property of its conformetry
configuration, so the Nx plugin exposing them is emitted rather than written.
`conformetry-nx-bootstrap` derives that plugin from
`configuration/conformetry.config.ts`, writes it to `.conformetry/nx-generators`
(gitignore this directory — it is a build artifact), and links it into the root
`node_modules` so `nx g conformetry:<generator>` resolves. The link is what
makes the plugin addressable, since Nx resolves a generator's package prefix by
requiring it by name rather than by matching an Nx project.

Consumers wire it into their root manifest so the plugin is rebuilt whenever
dependencies are installed:

```json
{ "scripts": { "postinstall": "conformetry-nx-bootstrap" } }
```

It warns rather than exiting non-zero when the configuration cannot be read, so
a configuration mid-edit never blocks an unrelated `pnpm install`. Drift is
caught where it matters instead: every conformetry command compares the emitted
plugin against the configuration and refuses to run against a stale one.

## Start

```bash
nx run conformetry-nx:start
```

## Build

```bash
nx run conformetry-nx:build
```

## Test

```bash
nx run conformetry-nx:test
```
