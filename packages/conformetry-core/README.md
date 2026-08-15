# ConformetryCore

NestJS service package scaffold generated with `conformetry:nestjs-service-project`.

## Start

```bash
nx run conformetry-core:start
```

## Test

```bash
nx run conformetry-core:test
```

## Purpose

The shared contract every other conformetry package builds on. It is a leaf
package by design: it depends on nothing in the conformetry graph, so every
other package can depend on it without introducing a cycle.

It owns three things:

| Module      | Responsibility                                                           |
| ----------- | ------------------------------------------------------------------------ |
| `errors`    | The structured `ConformetryError` shape, plus builders and guards for it |
| `language`  | The language validator contract and the shared execution envelope        |
| `reporting` | Rendering conformance errors as readable, actionable text                |

"Language" here means a validator for one file format — TypeScript, JSON,
Markdown, Python. The word "plugin" is reserved for the Nx plugin in
`conformetry-nx`, and is deliberately not used for these.

### Writing a language validator

A language validator supplies a descriptor and a single-document comparison.
Extension filtering, grouping errors under their file, and assembling the
result are handled once by `LanguageService`, so a language package contains
only its comparison logic:

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

`conformetry-validation` drives the registered language validators; they are
never responsible for discovering files or loading configuration.

### Structured errors

Errors carry the location on both sides — instance and template — along with
the expected value and a concrete `fix`. That last field is the point: reports
are meant to be actionable by whoever, or whatever, has to make the file
conform. Prefer populating `instanceLine`/`templateLine` (or `instancePath` for
document formats) over folding a location into the message.
