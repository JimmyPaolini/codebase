# 👔 Conformetry Core

The shared contract every other [Conformetry](../conformetry-cli/README.md)
package builds on. It is a leaf by design — it depends on nothing else in the
conformetry graph, so every other package can depend on it without a cycle.

```bash
npm install --save-dev @conformetry/core
```

## What it owns

| Module | Responsibility |
| ------ | -------------- |
| `errors` | The structured `ConformetryError` shape, plus builders and guards for it |
| `language` | The language validator contract and the shared execution envelope |
| `reporting` | Rendering conformance errors as readable, actionable text |

"Language" here means a validator for one file format — TypeScript, JSON,
markdown, Python. The word "plugin" is reserved for the Nx plugin in
[`@conformetry/nx`](../conformetry-nx/README.md), and is deliberately not used
for these.

## Writing a language validator

A validator supplies a descriptor and a single-document comparison. Extension
filtering, grouping errors under their file, and assembling the result are
handled once by `LanguageService`, so a language package contains only its
comparison logic:

```ts
@Injectable()
export class ExampleValidatorService implements ConformetryLanguageValidator {
  public readonly descriptor = EXAMPLE_VALIDATOR_DESCRIPTOR;

  public validateDocument(
    document: PreparedValidationDocument,
  ): ConformetryError[] {
    // compare document.renderedTemplate against document.instance
  }
}
```

[`@conformetry/validation`](../conformetry-validation/README.md) drives the
registered validators; they are never responsible for discovering files or
loading configuration.

## Structured errors

Errors carry the location on both sides — instance and template — along with
the expected value and a concrete `fix`. That last field is the point: reports
are meant to be actionable by whoever, or whatever, has to make the file
conform. Prefer populating `instanceLine`/`templateLine` (or `instancePath` for
document formats) over folding a location into the message.

## Exports

`ErrorsService`, `LanguageService`, `ReportingService` and their modules, plus
the `ConformetryError`, `ConformetryLanguageValidator`,
`LanguageValidatorDescriptor`, `PreparedValidationDocument`, and
`ValidationFileResult` types.

## Test

```bash
nx run conformetry-core:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `conformetry-core`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 21 |
| Files | 15 |
| Calls traced | 13 |
| Call stacks | 0 |
| Deepest stack | 0 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Call stacks

None.

### Module spread

None.

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
