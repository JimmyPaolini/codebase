# {{namePascalCase}}: TypeScript Contracts Package

## Quick Start

**Type**: TypeScript contracts package — declarations only, nothing executable

**Purpose**: <!-- Briefly describe the vocabulary this package declares -->

## Architecture Overview

### Tech Stack

- **Framework**: none. This package is a leaf and depends on nothing.
- **Language**: Strict TypeScript

### What Belongs Here

Domain vocabulary and nothing else: result and finding types, error classes,
shared enums and unions, and the interfaces other packages implement.

A service, a NestJS module, or anything else executable does not belong here.
That is what keeps this package a true leaf: importing one of its types never
drags a runtime dependency behind it.

### Directory Layout

```text
src/
  index.ts                          # The package's whole public surface
  modules/
    <domain>/                       # One folder per vocabulary
      <domain>.types.ts
      <domain>.constants.ts
testing/                            # Shared test utilities
```

## Development

### Adding a Vocabulary

1. **Create `src/modules/<domain>/`** with a `<domain>.types.ts`, plus a
   `<domain>.constants.ts` when the vocabulary needs error classes or shared
   literal sets.
2. **Re-export from `src/index.ts`** — a type nothing exports is a type nobody
   outside this package can reach.

### Testing

Declarations carry no behavior, so a package of them usually carries no test.
Add one only where a constant or a type guard does real work.

```bash
nx run {{nameKebabCase}}:vitest
```

## Conventions

- **No services.** If it needs dependency injection, it belongs in the layer
  above this one.
- **No imports from sibling packages.** A leaf that reaches sideways is not a
  leaf.
- **Explicit exports.** `src/index.ts` names every exported symbol rather than
  re-exporting a whole module, so the public surface is readable in one file.
