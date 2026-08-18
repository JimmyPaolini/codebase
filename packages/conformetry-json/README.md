# 👔 Conformetry JSON

The JSON and JSONC validator for [Conformetry](../conformetry-cli/README.md).
Claims `.json` and `.jsonc`.

```bash
npm install --save-dev @conformetry/json
```

## What it compares

Every key and value the template declares must be present in the instance. Key
order does not matter, and an instance may add keys the template does not
mention — the template is a lower bound, not an exact specification. That is
what lets one `package.json` template govern projects with different
dependencies.

Findings carry a JSON path rather than a line number, so a difference deep in a
nested object is addressable.

Parsing goes through
[`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser), so a
`tsconfig.json` with comments is read the same way TypeScript reads it.

## Exports

`JsonValidatorService`, `JsonValidatorModule`, `JsonComparisonService`, and the
`JsonValue` type. [`@conformetry/jupyter`](../conformetry-jupyter/README.md)
reuses `JsonComparisonService` for the notebook envelope.

## Test

```bash
nx run conformetry-json:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `conformetry-json`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 16 |
| Files | 8 |
| Calls traced | 21 |
| Call stacks | 1 |
| Deepest stack | 9 |
| Stacks through recursion | 1 |
| Unfollowable calls | 0 |

### Call stacks

**1. `JsonValidatorService.validateDocument`** — depth 9 · orphan-root

```text
🚀 JsonValidatorService.validateDocument(document: PreparedValidationDocument): ConformetryError[] [packages/conformetry-json/src/modules/json-validator/json-validator.service.ts:39]
   ↳ Reports every key or value the template requires and the instance lacks.
  └─> JsonComparisonService.compareArrays(…): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:63]
     ↳ Compares two arrays. Required scalars must appear somewhere in the instance array, order independent. For a required…
    └─> JsonComparisonService.flatMap(…)(this: undefined, templateItem: JsonValue): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:69]
      └─> JsonComparisonService.map(…)(instanceItem: JsonValue, index: number): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:98]
        └─> JsonComparisonService.compare(args: CompareJsonArguments): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:180]
           ↳ Compares a template value against an instance value, returning every way the instance fails to contain what the…
          └─> JsonComparisonService.compareObjects(…): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:111]
             ↳ Compares two objects, requiring every template key to be present.
            └─> JsonComparisonService.flatMap(…)(this: undefined, key: string): ConformetryError[] (cycle) [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:117]
              └─> JsonComparisonService.formatPath(pathSegments: JsonPathSegment[]): string [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:143]
                 ↳ Renders a path as `scripts.build[0]` for error messages.
                └─> JsonComparisonService.reduce(…)(pathValue: string, segment: JsonPathSegment): string [packages/conformetry-json/src/modules/json-validator/json-comparison.service.ts:144]
```

### Module spread

None.

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
