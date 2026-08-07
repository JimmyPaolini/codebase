# Conformetry

NestJS command-line application scaffold generated with `conformance:nestjs-command-project`.

`@jimmypaolini/conformetry` is the orchestration facade for conformetry generation and validation workflows.

- CLI commands run from this package.
- Integration APIs expose shared execution entrypoints used by Nx integration (`runConfiguredGenerator`, `runConfiguredValidation`).
- Validation orchestration remains here, while Nx-specific project selector/tag routing remains in `@jimmypaolini/conformetry-nx`.

## Start

```bash
nx run conformetry:start
```

## Test

```bash
nx run conformetry:test
```
