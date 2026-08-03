# ConformetryNx

NestJS service package scaffold generated with `conformetry:nestjs-service-package`.

The package now uses a NestJS-backed `nx-adapter` module/service layer for the Nx plugin and generator orchestration code. Files in `src/modules/nx-adapter/` use the package naming convention required by the repository:

- `*.module.ts`
- `*.service.ts`
- `*.types.ts`
- `*.constants.ts`
- `*.utilities.ts` for top-level helper functions

## Start

```bash
nx run conformetry-nx:build
```

## Test

```bash
nx run conformetry-nx:test
```
