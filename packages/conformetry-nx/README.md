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
