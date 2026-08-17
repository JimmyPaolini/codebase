# 👔 Conformetry Generation

The generation runtime for [Conformetry](../conformetry-cli/README.md): it
walks a template tree, renders every path and every file, and writes the
result.

```bash
npm install --save-dev @conformetry/generation
```

## Usage

```ts
import { GenerationService } from "@conformetry/generation";

const result = await generationService.runGenerator({
  definition: {
    name: "nestjs-service-module",
    templateDirectoryPath: "templates/nestjs-service-module",
  },
  inputs: { name: "billing" },
  instancePath: "packages/billing/src/modules",
});
// → { generatedFilePaths: [...], outputDirectoryPath: "..." }
```

The lifecycle is `preGenerate` → render → `postGenerate` → format, and the
returned file paths are sorted.

## Rendering

`RenderingService` is the single owner of template substitution across the
whole toolchain. Generation renders templates to create files; validation
renders the _same_ templates to compare against files that already exist. Both
must substitute identically or validation would flag the files the generator
itself produced — which is why neither reimplements this.

Contents and paths are both rendered with
[mustache](https://mustache.github.io), HTML escaping disabled so substituted
values cannot corrupt source code. `buildNameSubstitutions` derives
`nameCamelCase`, `nameKebabCase`, `namePascalCase`, and `nameSnakeCase` from a
single name; callers merge their own inputs over the result, so an explicit
input of the same key always wins.

> Mustache renders an unknown placeholder as an empty string rather than
> leaving the token visible, so a template referencing a field nobody supplies
> produces a silent hole.

Paths once used a `__field__` syntax of their own, on the assumption that
braces were not portable across filesystems. They are — and the separate syntax
could not tell a placeholder from a Python dunder, so a template shipping
`__init__.py` depended on `init` never being a substitution.

## Adapters

Filesystem and formatter access go through `FileSystemAdapter` and
`FormatterAdapter`, defaulting to disk and a no-op. That is how
[`@conformetry/nx`](../conformetry-nx/README.md) reuses this runtime unchanged
against an Nx generator `Tree`. Rendering deliberately is _not_ an adapter, for
the reason above.

## Exports

`GenerationService`, `RenderingService`, their modules, and the
`FileSystemAdapter`, `FormatterAdapter`, `GeneratorDefinition`, and
`Substitutions` types.

## Test

```bash
nx run conformetry-generation:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).
