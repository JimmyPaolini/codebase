# @codometer/examples

A sample corpus with known contents, and one runnable example per thing
codometer does. Read [README.md](README.md) for the guided tour; this file is
the lookup table for when codometer has already said something and you need to
know what to do about it.

## What lives here

- `examples/corpus/` — twenty-seven samples across twelve languages, plus the
  `.gitignore` that hides its stand-in build directory. This is the thing being
  measured. Its counts are stated in the README and asserted by the tests.
- `examples/compiled/` — two stand-ins for build output, sitting beside the corpus
  rather than inside it, which is where build output really lives. The target
  examples reach them with a `directory` hop.
- `examples/<name>/*.config.ts` — one configuration per behavior. Every one is
  runnable against the corpus and carries its own explanation in a doc comment
  above the configuration object.
- `codometer.config.ts` — this package's own configuration, and itself the
  configuration-discovery example: a factory that answers differently for the
  package than for the folders beneath it, replacing the workspace root's
  outright.
- `testing/` — the harness that drives the real command line, and the two
  end-to-end tests that assert every number the guides quote. They are
  end-to-end rather than integration because each one spawns the real command
  line, which bootstraps Nest and reaches a Python interpreter.

There is no `src/`. Every line of TypeScript here is either a configuration the
tool reads or a test that runs it, which is why the package declares no
`dependency-cruiser`, `oxlint`, or `build` target.

## Codometer said this — open this

| It said | It means | Open |
| ------- | -------- | ---- |
| `Cannot bind the limit written against "X": nothing measured answers to it` | The path has no target name on the front, and no `defaultTarget` is set. Even one target is not enough — write `codebase.X`. | [`limits/unprefixed.config.ts`](examples/limits/unprefixed.config.ts) |
| `it could be the "X" target's "files" metric, or the "codebase" target's "X.files" metric` | A target shares a name with a metric group, and a `defaultTarget` makes both readings valid. Write the target name in full. Removing the `defaultTarget` also removes the ambiguity. | [`limits/ambiguous.config.ts`](examples/limits/ambiguous.config.ts) |
| `Cannot bind the limit written against "T.python.files"` on a target that exists | The target does not run the analysis that produces the counter. Add `"language"` to its `analyses`, or limit something it measures. | [`limits/unbound.config.ts`](examples/limits/unbound.config.ts) |
| `Target "T" matched no files, and a limit is written against its "size" metric` | The glob stopped matching, or the build never ran. Do not "fix" it by removing the limit — the limit is what caught it. | [`limits/empty-target-limited.config.ts`](examples/limits/empty-target-limited.config.ts) |
| `Cannot read the limit on "T.size" from "8 K"` | The trailing `b` is required. `"8 KB"` is 8000 bytes, decimal, not 8192. | [`limits/unreadable-unit.config.ts`](examples/limits/unreadable-unit.config.ts) |
| `--write cannot be combined with --check reports` | Nothing can be stale in the run that just wrote it. Run them separately. | [`write-check/codometer.config.ts`](examples/write-check/codometer.config.ts) |
| `--check does not accept "X"` | The set is drawn from `limits` and `reports`, comma-separated. | [`write-check/codometer.config.ts`](examples/write-check/codometer.config.ts) |
| `--output-json <path> needs --write or --check reports` | A run that neither writes nor compares would leave the file exactly as it found it. Add `--write`, or ask for `--format json`. | [`output/codometer.config.ts`](examples/output/codometer.config.ts) |
| `Found stale reports` right after a green run elsewhere | Compressed sizes depend on the runtime's zlib. Check on the Node version the repository pins before believing it. | [`staleness/codometer.config.ts`](examples/staleness/codometer.config.ts) |
| `Breached a warning limit` and the run still exits 0 | `severity: "warn"` is advice. Only a `fail` limit under `--check limits` gates. | [`limits/warn.config.ts`](examples/limits/warn.config.ts) |
| `Skipped Python analysis … command not found`, and the run still exits 0 | The interpreter is unreachable. Every `python.*` counter reads 0, and so do `jupyter.classes`/`jupyter.functions`. Name it with `python: { command: … }`. | [`python/unreachable-interpreter.config.ts`](examples/python/unreachable-interpreter.config.ts) |
| Nothing at all — a counter reports zero | For Python, the interpreter. For a symbol counter, the wrong `kinds`/`modifiers`. For a target, the globs. | [`python/uv.config.ts`](examples/python/uv.config.ts), [`statistics/codometer.config.ts`](examples/statistics/codometer.config.ts) |
| A configuration you edited had no effect | A nearer configuration file won. The search takes the **first** file walking upward and merges nothing. | [`discovery/nested/codometer.config.ts`](examples/discovery/nested/codometer.config.ts) |

## Three things that reliably confuse

- **`patterns` on a symbol counter narrows the search, it is not what is
  counted.** A counter with `symbols` counts declarations; adding `patterns`
  says which files to look in. The corpus is built so the two disagree: four
  static methods exist, three of them in `*.service.ts`.
- **A static class field holding an arrow function is a property, not a
  method,** and carries none of the field's modifiers. `CatalogService.blank`
  exists to be the thing a static-method counter fails to find.
- **A TypeScript class is counted under `javascript.classes`.** The group is
  "TypeScript & JavaScript". `typescript.*` carries only what is
  TypeScript-specific: `files`, `interfaces`, `enums`, `decorators`,
  `docComments`, `genericDeclarations`.

## Changing the corpus

The corpus is a fixture with published numbers, so a change to it is a change to
the guides:

1. Edit the sample.
2. `nx run codometer-examples:vitest` — the tests name every count that moved.
3. Update the tables in [README.md](README.md) to match, and the doc comment on
   any example configuration that quotes the old number.
4. `nx run codometer-examples:codometer:check` — the corpus is gated on staying
   under 12 KB gzipped.

Never update a guide's number by hand without re-running. The numbers are the
only reason this package exists.

`examples/corpus/generated/` is empty in the repository and must stay that way. Nothing
ignored may be committed here: a file that is both tracked and ignored makes
`git add` fail, and lint-staged re-stages every file it touches, so one such
file breaks the pre-commit hook on every later commit — not only the one that
introduced it. The two compiled samples live in `examples/compiled/`, beside the corpus
and tracked normally, and the ignore demonstration copies them in at run time.

## Adding an example

- One folder under `examples/`, named for the behavior rather than numbered.
- One configuration file per variant, named for what it varies
  (`brotli.config.ts`, `reordered.config.ts`).
- The explanation goes in a doc comment above the configuration object,
  including the exact command that runs it. The README links to the file; the
  file explains itself.
- Add the assertion to `testing/examples.end-to-end.test.ts` in the same
  change. An example with no test is a claim, not an example.
- If the example writes anything, run it through `withCorpusCopy` — the
  committed corpus must never be written to, or every other test's counts move.
