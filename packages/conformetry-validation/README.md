# 👔 Conformetry Validation

The validation orchestrator for [Conformetry](../conformetry-cli/README.md):
it matches instances to templates, checks the declared files exist, routes
each document to the validator that claims its extension, and deduplicates
what comes back.

```bash
npm install --save-dev @conformetry/validation
```

## Usage

```ts
import { ValidationService } from "@conformetry/validation";

const result = await validationService.validate({
  instances, // from DiscoveryService.findInstances
  templates, // from DiscoveryService.collectTemplate
  languageNames: ["typescript"], // optional filter
  threshold: 0.9, // optional run-level conformance floor
});
// → { ok, fileResults, checkedPaths, scores, unmatched }
```

Instances arrive from the caller. This package used to scan the workspace for
`project.json` files and infer scope from generator name suffixes, which made a
generic package depend on one repository's layout.

## Order of checks

1. **Files exist.** Every file the matched template declares is checked first,
   whatever its extension. A missing file cannot be compared, and reporting it
   once is clearer than every language reporting it in turn. See
   [`@conformetry/files`](../conformetry-files/README.md).
2. **Documents compare.** Each validator sees only the documents whose
   extensions it claims.

Instances that matched no template are reported alongside the content
differences rather than skipped, so one report covers both "this file is wrong"
and "conformetry cannot tell what this path was generated from".

## Scoring

Each matched instance is scored by how much of its template it honours, and
passes when that reaches the threshold resolved for it — the instance group's,
else the generator's, else the run's, else a perfect `1`.

Scores are taken **before** deduplication. Deduplication decides which template
gets to _print_ a shared file's finding, which is a reporting concern; a score
answers how well one instance honours its own template, so collapsing the
report must not change it.

`ok` is `false` when any instance falls below its threshold, or when any
instance matched no template at all — an unmatched path has no template to be
held to, so no threshold could excuse it.

## Lazy language loading

Which language packages exist is a static table keyed by extension, so a run
can decide whether it needs `@conformetry/python` without importing it first.
Only the packages a run's templates actually call for are loaded.

| Extensions | Package |
| ---------- | ------- |
| `.ts`, `.tsx` | `@conformetry/typescript` |
| `.md` | `@conformetry/markdown` |
| `.py` | `@conformetry/python` |
| `.json`, `.jsonc` | `@conformetry/json` |
| `.ipynb` | `@conformetry/jupyter` |
| everything else | `@conformetry/text` |

`@conformetry/text` is a required dependency rather than an optional one: it is
the floor, so an extension nobody claims is still compared line by line instead
of going unchecked. Pass `loadLanguageModule` to supply your own loader.

## Exports

`ValidationService`, `ValidationLanguagesService`,
`ValidationDeduplicationService`, `ValidationFindingsService`,
`ValidationModule`, `MissingLanguagePackageError`, and the
`RunValidationArguments`, `RunValidationResult`, `InstanceFileResults`, and
`LanguageModuleLoader` types.

## Test

```bash
nx run conformetry-validation:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).
