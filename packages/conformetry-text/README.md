# 👔 Conformetry Text

The fallback validator for [Conformetry](../conformetry-cli/README.md), and the
floor beneath every other one.

```bash
npm install --save-dev @conformetry/text
```

## What it compares

Lines. A template line must appear in the instance, and matching is
**duplicate-aware**: a line the template contains twice must appear twice.
Order is not enforced, so a file may add lines anywhere — the template is a
lower bound, not an exact specification.

## Why it is required rather than optional

Every other language package is loaded only when a run's templates call for its
extension. This one is a hard dependency of
[`@conformetry/validation`](../conformetry-validation/README.md), because it is
what an extension nobody claims falls back to. Without it a `.env.default`, a
`Dockerfile`, or a `.gitignore` would be checked for existence and then never
compared at all.

Its descriptor claims `.txt`, but routing sends it everything unclaimed.

## Exports

`TextValidatorService` and `TextValidatorModule`.

## Test

```bash
nx run conformetry-text:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `conformetry-text`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 5 |
| Files | 7 |
| Calls traced | 3 |
| Call stacks | 1 |
| Deepest stack | 3 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Call stacks

**1. `TextValidatorService.validateDocument`** — depth 3 · orphan-root

```text
🚀 TextValidatorService.validateDocument(document: PreparedValidationDocument): ConformetryError[] [packages/conformetry-text/src/modules/text-validator/text-validator.service.ts:69]
   ↳ Reports every template line missing from the instance.
  └─> TextValidatorService.findMissingLines(document: PreparedValidationDocument): MissingLine[] [packages/conformetry-text/src/modules/text-validator/text-validator.service.ts:45]
     ↳ Finds template lines the instance does not supply often enough.
    └─> TextValidatorService.countLines(text: string): Map<string, number> [packages/conformetry-text/src/modules/text-validator/text-validator.service.ts:34]
       ↳ Counts how many times each line occurs, for duplicate-aware matching.
```

### Module spread

None.

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
