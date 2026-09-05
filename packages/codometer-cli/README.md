# ⏲️ Codometer

**Measure a repository and report what it found.**

Codometer walks a directory, parses everything it recognizes, and writes
what it counted as a markdown badge block, a JSON report, or both. It counts
languages the way you would expect — files, lines, classes, functions — and it
also counts the conventions a repository holds _itself_ to, which is usually
the more interesting number.

```bash
npm install --save-dev @codometer/cli
```

```bash
codometer
```

<!-- The badge block below this README's own Codometer section is produced by exactly this. -->

```markdown
### TypeScript & JavaScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-989-3178c6?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-247-10b981?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-352-7c3aed?style=flat-square)
```

## Why

"1,034 source files" tells you almost nothing. "159 of them are services and
226 are the unit tests for them" tells you what the repository is actually made
of, and watching that ratio move tells you where it is going.

No language analyzer can produce the second number, because what a
`*.service.ts` means is a property of your repository rather than of
TypeScript. Codometer measures both halves: the built-in language counters, and
the ones you declare.

## Usage

```bash
codometer --directory . --config configuration/codometer.config.ts
```

| Flag | Purpose |
| ---- | ------- |
| `--check <set>` | Fail on a comma-separated set drawn from `reports` and `limits` |
| `--config [path]` | Configuration file to read; searched for when omitted |
| `-d, --directory [path]` | Directory to measure; defaults to the current one |
| `-f, --format <format>` | What to print to standard output, one of `json` and `markdown` |
| `--output-json <path>` | File the report is written to |
| `--output-markdown <path>` | Markdown file the badge block goes into |
| `--write` | Write every resolved destination |

**`--write` and `--check` are independent.** Neither implies the other and no
combination of them is inferred, which is the whole of the surface:

| Invocation | Writes | Fails on staleness | Fails on a breach |
| ---------- | ------ | ------------------ | ----------------- |
| `codometer` | no | no | no |
| `codometer --check limits` | no | no | yes |
| `codometer --check reports` | no | yes | no |
| `codometer --check reports,limits` | no | yes | yes |
| `codometer --write` | yes | no | no |
| `codometer --write --check limits` | yes | no | yes, after writing |

A `--write` run that also gates produces **every** report before it fails, so
the report is on disk even when the gate trips. `--write --check reports` is
refused rather than obeyed: nothing can be stale in the run that just wrote it.
So is a `--check` value the tool does not know, and every complaint about one
command line is reported together rather than one run at a time.

A **breach** and **staleness** are different findings and are never reported as
one. A `warn` breach is printed and leaves the exit code alone; a `fail` breach
exits 1, but only where `--check limits` asked for a gate.

`--check reports` compares a committed report against a fresh measurement, so it
is only as stable as the numbers it re-measures. Compressed sizes are
Node-version dependent — the bundled zlib differs between releases — so a report
written on one runtime and checked on another reads as stale when nothing
changed at all. Check on the runtime the repository pins, or expect false
staleness rather than a real finding.

```yaml
- run: npx codometer --check reports,limits
```

## One folder at a time

Codometer measures **one directory**, and knows nothing about workspaces, task
runners, or project graphs. Run it in a project and that project is what gets
measured — its own sources, and whatever targets the configuration declares for
it:

```bash
cd packages/logger && codometer --check limits
```

With no `--config`, the configuration is found by walking upward from that
folder and taking the **first** file found. The nearest one wins outright:
nothing from a further ancestor is folded into it, because a merged
configuration leaves a limit that never applied looking exactly like one that
did.

So a project needs no configuration file of its own. One file at the top of a
workspace can describe every project beneath it by [exporting a
function](../codometer-configuration/README.md#a-configuration-that-answers-for-every-folder)
that reads the folder it was pointed at, and a project whose targets do not
follow that convention writes a configuration file that replaces it.

## What gets measured

Discovery walks the directory itself and reads every `.gitignore` it passes,
so **`.gitignore` is already in force** — a build directory or a virtual
environment is pruned where its ignore file names it, and no exclusion has to
name it again. Git is never invoked, so a directory that is not a repository
at all is measured the same way as one that is.

What is measured is the working tree rather than the index: a file that exists
and is not ignored counts, whether or not it has been committed yet.

| Group | Counts |
| ----- | ------ |
| Repository | Lines of code, repository size, folders, source files |
| TypeScript & JavaScript | Files, tests, classes, functions, methods, interfaces, generics, enums, constants, imports, decorators, exported symbols, doc comments, TODOs |
| Python | Files, lines, classes, functions, protocols, constants, imports, decorators, docstrings |
| Jupyter | Notebooks, cells by kind, executions, outputs, plus the code and prose inside them |
| JSON | Files, objects, arrays, properties, scalars by type, node count, max depth |
| YAML | Documents, mappings, sequences, keys, scalars, anchors, aliases, max depth |
| Markdown | Headings by level, paragraphs, lists, tables, links, images, code blocks, block quotes |
| SQL | Statements by kind — selects, inserts, updates, deletes, creates, joins, CTEs |
| Shell | Functions, variables, exports, conditionals, loops, pipelines, shebangs |
| TOML | Tables, array tables, keys, arrays |
| HCL | Blocks, resources, variables, outputs, attributes, interpolations |
| CSS | Rules, selectors, declarations, at-rules, media queries, custom properties |
| Conventions | Whatever you declare — see below |

Notebooks are measured by composition rather than by a fourth parser: the
document is handed to the JSON analyzer, its code cells to the Python analyzer,
and its markdown cells to the markdown analyzer, leaving only cells, outputs,
and executions for the notebook analyzer itself.

Python analysis runs through an interpreter, `python3` by default. Point it
elsewhere with `python: { command: "uv run python" }` when Python lives in a
virtual environment.

## Targets

The codebase is measured as a **target** — a named set of files — and `targets`
declares the others. A target names its files by glob, which is what lets one
measure compiled output: a directory every `.gitignore` claims, and therefore
the one place ignore rules must not reach.

```ts
targets: [
  {
    analyses: ["size"],
    compression: "gzip",
    exclude: ["dist/vendor/**"],
    include: ["dist/**/*.js", "!dist/**/*.map.js"],
    name: "compiled",
  },
],
```

| Field | Required | Default | Meaning |
| ----- | -------- | ------- | ------- |
| `name` | yes | — | What the target is called. Two targets may not share one |
| `include` | yes | — | Globs that add files. At least one must add rather than remove |
| `exclude` | no | none | Globs that remove files |
| `analyses` | yes | — | `language`, `size`, or both. At least one |
| `compression` | no | `gzip` | `gzip`, `brotli`, or `none` for the bytes on disk |
| `directory` | no | `.` | Where the target's globs start, relative to the measured directory |

`language` runs the analyzers above over the target's files. `size` compresses
each matched file on its own and sums the results — never all of them together
— at gzip level 9 or brotli quality 11, both stated rather than defaulted.

A `!` prefix in `include` removes files. Negations form one set applied to the
whole target rather than being read in order, so rearranging the array cannot
change what the target holds. Dot files are excluded unless a glob spells one
out, directories never match, and a file that was matched but cannot be read
fails the run rather than counting as zero bytes.

## Limits

A **limit** is how high one measured metric may go. Any metric can carry one — a
compressed size, a line count, a counter for one of the conventions below — and
a metric nothing limits is measured and reported exactly as before, gated by
nothing.

```ts
defaultTarget: "codebase",
limits: [
  { metric: "Compiled JavaScript.size", value: "8 KB" },
  { label: "Interfaces", metric: "typescript.interfaces", value: 500 },
  { metric: "linesOfCode", severity: "warn", value: 100_000 },
],
```

| Field | Required | Default | Meaning |
| ----- | -------- | ------- | ------- |
| `metric` | yes | — | Dotted path of the metric this limits |
| `value` | yes | — | How high the metric may go, as a number or a string with a unit |
| `severity` | no | `fail` | `fail` stops the run on a breach; `warn` reports it |
| `label` | no | the path | What to call the limit in a report |

A metric is addressed by the target's name followed by its path within that
target — `codebase.typescript.interfaces`, `codebase.markdown.files`,
`Compiled JavaScript.size`. Every target carries `files`, a target running size
analysis carries `size`, and one running language analysis carries every
counter the tables above list, with configured counters under `custom.<label>`.
Set `defaultTarget` and a path naming no target is read as that target's.

Where a `defaultTarget` is set, a path is read as that target's whenever no
target name prefixes it — so with `defaultTarget: "codebase"` and a target
called `typescript`, `typescript.interfaces` is the codebase's, because the
`typescript` target has no `interfaces` metric of its own to compete with it.
Write the target name in full wherever a target and a metric group share one.

**Ambiguity is refused, never resolved.** A path that could name two metrics —
a target called `markdown` beside the codebase's own `markdown.files` — fails
the run naming both readings, as does a path naming none, or one naming a
metric from an analysis the target never ran. A limit that quietly bound to the
wrong metric would look exactly like one that works.

A value written as a string carries a **decimal** unit whose trailing `b` is
required: `"8 KB"` is 8000 bytes and `"1 MB"` is 1000000, while `"8 K"` is not
a size and is refused rather than read as anything. A value nothing can read
fails the run instead of being taken as zero.

A target that matched **no files** fails the run if and only if a limit is
written against it. Declaring a limit asserts the files are there, so an empty
match is a glob that stopped matching or a build that never ran — while a
target nobody limited simply measured zero, which is unremarkable.

### Reading every limit at once

A repository that declares its limits one per project has no single file left
to read them from. `codometer configuration` is that reading:

```bash
codometer configuration --limits
```

```text
| Directory        | Metric                    | Label | Severity | Value   | Declared in                          |
| ---              | ---                       | ---   | ---      | ---     | ---                                  |
| packages/logger  | `Compiled JavaScript.size`| —     | fail     | 12.00 kB | `packages/logger/codometer.config.ts`|
```

It walks for every configuration file beneath the directory it is given — in
any of the formats codometer accepts — and resolves each one **for its own
folder**, so what it reports is what a per-project run actually sees. The walk
honors the exclusions the root configuration declares, so a configuration
inside a dependency or a generator template is never listed as something the
repository configures.

Drop `--limits` to list everything each configuration resolved to: its targets,
custom statistics, documentation settings, exclusions, and Python command. Add
`--format json` for a machine-readable listing.

It reports configuration and never measurement. No build is required and no
limit is evaluated, so it runs in milliseconds and cannot fail for a reason
unrelated to configuration — which is what makes it usable while something
else is broken. A file that cannot be loaded is reported as unreadable rather
than taking the listing down with it.

## Documentation

A **documentation limit** is how long one documented declaration's JSDoc
comment may run. Opt-in, like every other check: a configuration naming no
`documentation` block measures and reports nothing extra, exactly as it did
before this existed. Once configured, every declaration carrying a `/**`
comment is measured and reported — a class, an interface, a function, a
method, a property — whether or not it breaches anything, and `kinds` earns
some of them more room than others without forcing one repository-wide number
to be either loose enough to permit a property essay or tight enough to forbid
a class overview that should exist.

```ts
documentation: {
  default: 6,
  kinds: { class: 24, interface: 16, function: 12, method: 12, property: 4 },
  unit: "lines",
},
```

| Field | Required | Default | Meaning |
| ----- | -------- | ------- | ------- |
| `default` | no | `6` | The limit a declaration's kind falls back to when `kinds` names none for it |
| `kinds` | no | none | A limit per declaration kind — `class`, `interface`, `function`, `method`, `property`, and the rest `## What gets measured` lists |
| `severity` | no | `fail` | `fail` stops the run on a breach; `warn` reports it |
| `unit` | no | `"lines"` | `"lines"`, `"characters"`, or `"words"` — the unit a comment's length is measured in |

A documentation breach is gated by the same `--check limits` flag every other
limit is — there is no separate flag for it. It never needs its own `metric`
path: every documented declaration is measured automatically, not addressed by
hand the way a limit on a count is.

## Custom statistics

A repository that names files by convention has a vocabulary no analyzer knows
about. Declare it:

```ts
statistics: [
  { label: "Service Files", patterns: ["**/*.service.ts"] },
  { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
  { color: "16a34a", label: "Migrations", patterns: ["**/migrations/*.sql"] },
];
```

Counters can also match _declarations_ rather than files, by shape:

```ts
statistics: [
  {
    group: "typescript",
    label: "Static Methods",
    symbols: { kinds: ["method"], modifiers: ["static"] },
  },
];
```

Each entry becomes one badge, in the order configured, rendered into the group
it names — `conventions` by default. Symbol counting happens during the walk
the TypeScript analyzer already makes, so any number of these costs one pass
over the sources.

The full reference — kinds, modifiers, colors, groups, and how `patterns`
narrows a symbol counter rather than being what it counts — is in
[**@codometer/configuration**](../codometer-configuration/README.md#custom-statistics).

## Output

What a run prints and what it writes are asked for separately, and neither
implies the other:

| Sink | Flag | What lands there |
| ---- | ---- | ---------------- |
| Console | `-f, --format <format>` | The report as `json`, or the rendered badges as `markdown` |
| Report | `--output-json <path>` | The structured report below |
| Markdown | `--output-markdown <path>` | The badge block, in a markdown file |

**One markdown sink, not two.** `--output-markdown` splices the badge block
between its markers when the file already carries them, appends it with them
when it does not, and creates the file when it is not there. A README somebody
else wrote the rest of and a file holding nothing but badges are the same case,
so neither needs a flag of its own.

**A path always means a file.** Asking for the report on the console is
`--format json`, never a path left off. The optional-value flags this replaced
meant one thing with a value and another without, which is how a run meaning to
write a file ended up printing one instead.

**`--format` defaults to the badges on a run that touches no file**, which is
what makes a bare `codometer` worth running. A run that writes or compares
prints nothing unless asked, since its output is the file.

**An `--output-*` path is refused unless the run writes or compares it.** The
path names a file, and a run doing neither would leave it exactly as it found
it — which is not noticed here at all, but downstream, by whatever reads the
report finding nothing and reporting a project that changed nothing. The
command line is refused before anything is measured, naming the flag to add.

**A named destination stands for all of them.** `--output-json` on its own asks
for the report and nothing else, whatever the configuration file also describes.
Adding to the configured set instead would write a file the command line never
asked for.

**Standard output carries the result; every diagnostic goes to standard error.**
`codometer --format json > report.json` has to produce a file something can
parse, so a log line never shares that stream — including the exclusion notice
below, which is still on the console and still in front of a human, just not
inside the data. Only `--format` ever writes to that stream: a file sink that
could also print is how one run put two documents on it.

**The markdown sink's path is never defaulted.** Writing there rewrites a file
somebody else wrote the rest of, so a run that guessed the filename would edit
a document nobody pointed it at.

The rendered badges are a description paragraph followed by shields.io badges
under one `###` heading per language. A run scoped to one project puts its own
`##` section heading above all of it, inside the markers, because that block
lands in a document somebody else wrote the rest of and `###` groups with
nothing above them would read as a continuation of whatever section came
before. A run measuring a whole repository renders none: that README titles the
section above the markers itself. Beyond the language groups there is also —
for a run that measured a declared target — a `Measured Targets` group carrying
each target's size under the
compression it was measured with. That group is how a project's README reports
the size of what it ships; a run that declared no target renders no such group,
which is why the whole-repository report carries only its own `Repository Size`.

Spliced, the badges sit between two markers,
named `CODE_STATISTICS_START` and `CODE_STATISTICS_END` unless a configuration
renames them — as this example does, so that documenting the markers does not
make this document splice its own badges into the example:

```markdown
<!-- STATISTICS_START -->
<!-- STATISTICS_END -->
```

The block is appended when the markers are absent, and the file is created when
it does not exist. Both halves of that behavior are replaceable on their own —
`render` decides what markdown gets produced, `write` decides which file it
lands in and how — and supplying one keeps the built-in other. See
[markdown output](../codometer-configuration/README.md#markdown-output).

### What codometer writes, it does not measure

Every file a run would write is left out of what it measures, and the run says
so on the console. No configuration, and no ignore-file entry: codometer knows
its own destinations.

A badge is an image inside a link, so a spliced block moves `markdown.images`,
`markdown.links`, and `markdown.lines`, which moves the badges, which moves the
counts. Left in, a written report would be stale the moment it landed. The
exclusion is applied identically whatever the flags say, so a `--write` run and
a `--check reports` run always measure the same tree.

### The report

Codometer's own shape rather than any other tool's. Every metric carries its
value, and where something limits it, that limit's value, severity, and whether
it was breached — a limit that held is written out exactly like one that did
not, so a consumer can render the headroom rather than only the failures.

```json
{
  "documentation": [
    {
      "breached": true,
      "declaration": "CodometerService",
      "file": "src/modules/codometer/codometer.service.ts",
      "kind": "class",
      "limit": 6,
      "line": 32,
      "measured": 9,
      "severity": "fail",
      "target": "codebase",
      "unit": "lines"
    }
  ],
  "failures": [
    {
      "kind": "limit",
      "reason": "Cannot bind the limit written against \"nowhere.at.all\": nothing measured answers to it.",
      "subject": "nowhere.at.all"
    }
  ],
  "targets": [
    {
      "empty": false,
      "files": 1,
      "metrics": [
        {
          "limits": [],
          "name": "compiled.files",
          "path": "files",
          "unit": null,
          "value": 1
        },
        {
          "limits": [
            { "breached": true, "label": null, "severity": "warn", "value": 900 },
            { "breached": true, "label": "Bundle", "severity": "fail", "value": 1000 }
          ],
          "name": "compiled.size",
          "path": "size",
          "unit": "bytes",
          "value": 5195
        }
      ],
      "name": "compiled"
    }
  ]
}
```

| Field | Meaning |
| ----- | ------- |
| `name` | The metric's name across runs — its target, then its path. The join key a later run is compared on |
| `path` | The metric's path within its target, with no target name on the front |
| `unit` | `"bytes"` where the value counts bytes, `null` for a plain count |
| `limits` | Every limit declared on the metric, in the order written. Empty where nothing limits it — never an absent key |
| `empty` | Said outright when a target's globs matched nothing |
| `failures` | Whatever the run could not do: a target that would not measure, a limit that bound to nothing |
| `documentation` | Every documented declaration across every target, flattened, in measurement order — breached or not |

**`documentation` reports every measured declaration, not only breaches.** Each
entry names the `file` and 1-indexed `line` the declaration starts on, its
`kind`, the `target` it was found in, the configured `limit` and `unit`, the
`measured` length, and whether it `breached`. A declaration carrying no `/**`
comment at all is not measured and never appears here.

**A metric may carry more than one limit.** The configuration accepts a `warn`
short of a `fail` on a single metric on purpose — that is how a repository sees
a number coming before it stops a change — and the gate enforces all of them, so
the report lists all of them. A consumer deciding what to show picks
deliberately: the `fail` limit is what stops a change, and a
breached `warn` beneath it is advice, not a failure.

**Byte values are raw and decimal.** A renderer showing kilobytes divides by
1000, the same units a limit written `"8 KB"` is read in.

**Nothing is signalled by a missing field.** A target that matched nothing says
`"empty": true` and any limit written against it joins `failures`, rather than
leaving a consumer to infer an empty match from an absent limit beside a
passing verdict.

A failure is neither a breach nor staleness: it is the run not having finished.
Every one of them is collected and reported together, so a configuration with
three broken limits is one run to diagnose rather than three. A failure fails
any run that writes or gates; a bare run reports it and exits clean, exactly as
the flag table promises.

## Packages

| Package | Role |
| ------- | ---- |
| [`@codometer/cli`](README.md) | Measures the repository and writes the reports. Knows nothing about any particular repository |
| [`@codometer/configuration`](../codometer-configuration/README.md) | Reads `codometer.config.ts` and resolves exclusions, output destinations, custom statistics, and the Python interpreter |
| [`@codometer/examples`](../codometer-examples/README.md) | A sample corpus with known contents and one runnable example per behavior above, each asserted by a test |

Which paths to skip, where the output goes, and how Python is reached are all
configuration. That split is what lets the CLI be a general tool rather than
one repository's script.

Everything above has a runnable example in
[`@codometer/examples`](../codometer-examples/README.md), measured against a
sample corpus whose counts are stated and checked — including a reproduction of
each refusal, which is where a reader is most likely to be stuck. An agent that
has already been handed a refusal and needs the fix should start from that
package's [AGENTS.md](../codometer-examples/AGENTS.md), which maps each message
codometer prints to the example that reproduces it.

## Start

```bash
nx run codometer-cli:start
```

Pass the flags from [Usage](#usage) after `--`, so
`nx run codometer-cli:start -- --directory .` measures the current directory
from source.

## Test

```bash
nx run codometer-cli:vitest
```

## Contributing

```bash
nx run codometer-cli:build   # Compile
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/codometer-cli`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 147 |
| Files | 41 |
| Calls traced | 176 |
| Call stacks | 12 |
| Deepest stack | 16 |
| Stacks through recursion | 1 |
| Unfollowable calls | 7 |

### Call stacks (depth)

**1. `MeasureCommand.run`** — depth ≥ 16 · decorated-method

```text
🚀 MeasureCommand.run(_passedParameters: string[], options: MeasureCommandOptions): Promise<void> [packages/codometer-cli/src/modules/measure/measure.command.ts:327]
   ↳ Measure the repository and produce every resolved output.
  └─> MeasureService.measure(args: MeasureArguments): MeasurementResult [packages/codometer-cli/src/modules/measure/measure.service.ts:355]
     ↳ Measure the codebase and every target declared alongside it.
    └─> MeasureService.measureDeclaredTargets(…): { failures: ReportFailure[]; targets: TargetMeasurement[]; } [packages/codometer-cli/src/modules/measure/measure.service.ts:254]
       ↳ Measure every declared target, keeping whatever the failures leave.
      └─> MeasureService.measureTarget(args: MeasureTargetArguments): TargetMeasurement [packages/codometer-cli/src/modules/measure/measure.service.ts:290]
         ↳ Measure one declared target with whichever analyses it asked for.
        └─> MeasureService.analyzeFiles(…): { documentation: TypescriptDocumentationMeasurement[]; statistics: CodeStatisticsResult; } [packages/codometer-cli/src/modules/measure/measure.service.ts:77]
           ↳ Run every analyzer over one set of files and shape the result.
          └─> LanguagesService.analyze(args: AnalyzeLanguagesArguments): LanguageResults [packages/codometer-languages/src/modules/languages/languages.service.ts:54]
             ↳ Analyze every language present in the discovered files.
            └─> TypescriptService.analyze(input: TypescriptInput): TypescriptResult [packages/codometer-languages/src/modules/typescript/typescript.service.ts:456]
               ↳ Analyzes TypeScript and JavaScript source files and returns aggregated AST metrics.
              └─> TypescriptService.analyzeFile(args: AnalyzeTypescriptFileArguments): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:94]
                 ↳ Read one source file, count its lines and comments, and walk its AST.
                └─> TypescriptService.walkNode(node: tsCompiler.Node, context: TypescriptWalkContext): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:430]
                   ↳ Recursively visits each AST node and dispatches to the appropriate handler.
                  └─> TypescriptService.forEachChild(…)(child: tsCompiler.Node): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:443]
                    └─> TypescriptService.forEachChild(…)(child: tsCompiler.Node): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:450]
                      └─> TypescriptService.collectDocumentation(node: tsCompiler.Node, context: TypescriptWalkContext): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:122]
                         ↳ Measure a documentable declaration's leading JSDoc comment, if it has one.
                        └─> DocumentationMeasurementService.measure(…): TypescriptDocumentationMeasurement | undefined [packages/codometer-languages/src/modules/typescript/documentation-measurement.service.ts:125]
                           ↳ Measures one declaration's leading JSDoc comment, if it has one. `undefined` when the node's kind is not one a…
                          └─> DocumentationMeasurementService.measureLength(text: string, unit: CodometerDocumentationUnit): number [packages/codometer-languages/src/modules/typescript/documentation-measurement.service.ts:100]
                             ↳ Measures a comment's raw text in the configured unit.
                            └─> DocumentationMeasurementService.countWords(text: string): number [packages/codometer-languages/src/modules/typescript/documentation-measurement.service.ts:59]
                               ↳ Counts the words in the comment's prose.
                              └─> DocumentationMeasurementService.map(…)(line: string): string [packages/codometer-languages/src/modules/typescript/documentation-measurement.service.ts:64]
```

**2. `ChangesCommand.run`** — depth ≥ 11 · decorated-method

```text
🚀 ChangesCommand.run(_passedParameters: string[], options: ChangesCommandOptions): Promise<void> [packages/codometer-cli/src/modules/changes/changes.command.ts:97]
   ↳ Diffs every project's report against the baseline, and emits the result.
  └─> ChangesService.collect(args: CollectRowsArguments): MetricCollection [packages/codometer-changes/src/modules/changes/changes.service.ts:289]
     ↳ Joins every current report to the baseline snapshot.
    └─> ChangesService.map(…)(reportPath: string): MetricCollection [packages/codometer-changes/src/modules/changes/changes.service.ts:290]
      └─> ChangesService.collectProjectRows(args: CollectProjectRowsArguments): MetricCollection [packages/codometer-changes/src/modules/changes/changes.service.ts:110]
         ↳ Joins one project's current report to its baseline.
        └─> ChangesService.readBaseline(args: CollectProjectRowsArguments): Map<string, ReportMetric> [packages/codometer-changes/src/modules/changes/changes.service.ts:154]
           ↳ Reads a baseline report into a name-to-metric lookup.
          └─> ChangesService.readReport(workingDirectory: string, reportPath: string): ProjectReport [packages/codometer-changes/src/modules/changes/changes.service.ts:240]
             ↳ Parses a codometer report, tolerating an absent or malformed file.
            └─> ChangesService.flatMap(…)(…): ReportMetric[] [packages/codometer-changes/src/modules/changes/changes.service.ts:256]
              └─> ChangesService.readMetrics(target: ReportTarget): ReportMetric[] [packages/codometer-changes/src/modules/changes/changes.service.ts:222]
                 ↳ Pulls every metric a target produced out of the report.
                └─> ChangesService.map(…)(…): { breach: MetricSeverity | undefined; empty: boolean; label: string; limit: number | undefined; name: string; unit: "bytes" | null; value: number; } [packages/codometer-changes/src/modules/changes/changes.service.ts:223]
                  └─> ChangesService.readBreach(limits: readonly ReportLimit[]): MetricSeverity | undefined [packages/codometer-changes/src/modules/changes/changes.service.ts:175]
                     ↳ The severity of the worst limit a metric breached, if it breached one.
                    └─> ChangesService.filter(…)(…): boolean [packages/codometer-changes/src/modules/changes/changes.service.ts:178]
```

**3. `ConfigurationCommand.run`** — depth ≥ 10 · decorated-method

```text
🚀 ConfigurationCommand.run(…): Promise<void> [packages/codometer-cli/src/modules/configuration/configuration.command.ts:90]
   ↳ Lists what the tree beneath the given directory configures.
  └─> ConfigurationService.describeConfigurations(workingDirectory: string): Promise<ConfiguredDirectory[]> [packages/codometer-cli/src/modules/configuration/configuration.service.ts:108]
     ↳ Resolves the configuration each file in a tree answers with.
    └─> ConfigurationService.findConfigurationFiles(workingDirectory: string): Promise<string[]> [packages/codometer-cli/src/modules/configuration/configuration.service.ts:133]
       ↳ Finds every configuration file beneath a directory.
      └─> ConfigurationService.loadConfigurationFile(args?: LoadConfigurationArguments): Promise<LoadedConfiguration> [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:285]
         ↳ Loads a configuration and says which file answered.
        └─> ConfigurationService.resolveConfiguration(configuration: CodometerConfiguration): ResolvedCodometerConfiguration [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:308]
           ↳ Fills in every field a configuration file may leave out.
          └─> ConfigurationService.resolveLimits(limits: CodometerLimit[] | undefined): ResolvedCodometerLimit[] [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:190]
             ↳ Gives every limit its severity and a value read as a number.
            └─> ConfigurationService.map(…)(…): { label: string | undefined; metric: string; severity: CodometerSeverity; value: number; } [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:193]
              └─> ConfigurationService.parseLimitValue(limit: CodometerLimit): number [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:74]
                 ↳ Reads a limit's value, in decimal units when it was written as a string.
                └─> ConfigurationService.parseLimitValueText(metric: string, text: string): number [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:94]
                   ↳ Reads a limit written as a string, unit and all.
                  └─> InvalidLimitValueError.constructor(metric: string, value: string): InvalidLimitValueError [packages/codometer-configuration/src/modules/configuration/configuration.constants.ts:467]
```

<details>
<summary>9 more call stacks</summary>

**4. `ChangesCommand.parseDirectory`** — depth 4 · decorated-method

```text
🚀 ChangesCommand.parseDirectory(value: unknown): string [packages/codometer-cli/src/modules/changes/changes.command.ts:70]
   ↳ Parse the directory to look for codometer reports in.
  └─> InputService.parseDirectoryOption(value: unknown): string [packages/codometer-configuration/src/modules/input/input.service.ts:52]
     ↳ Reads a directory option, falling back to the working directory.
    └─> InputService.parseDefaultedOption(value: unknown, fallback: string): string [packages/codometer-configuration/src/modules/input/input.service.ts:41]
       ↳ Reads an option that carries a default when it was left off.
      └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
         ↳ Reads an option that carries text, or nothing at all.
```

**5. `ConfigurationCommand.parseDirectory`** — depth 4 · decorated-method

```text
🚀 ConfigurationCommand.parseDirectory(value: unknown): string [packages/codometer-cli/src/modules/configuration/configuration.command.ts:54]
   ↳ Parse the directory to look for configuration files beneath.
  └─> InputService.parseDirectoryOption(value: unknown): string [packages/codometer-configuration/src/modules/input/input.service.ts:52]
     ↳ Reads a directory option, falling back to the working directory.
    └─> InputService.parseDefaultedOption(value: unknown, fallback: string): string [packages/codometer-configuration/src/modules/input/input.service.ts:41]
       ↳ Reads an option that carries a default when it was left off.
      └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
         ↳ Reads an option that carries text, or nothing at all.
```

**6. `MeasureCommand.parseDirectory`** — depth 4 · decorated-method

```text
🚀 MeasureCommand.parseDirectory(value: unknown): string [packages/codometer-cli/src/modules/measure/measure.command.ts:250]
   ↳ Parse the directory option from command-line input.
  └─> InputService.parseDirectoryOption(value: unknown): string [packages/codometer-configuration/src/modules/input/input.service.ts:52]
     ↳ Reads a directory option, falling back to the working directory.
    └─> InputService.parseDefaultedOption(value: unknown, fallback: string): string [packages/codometer-configuration/src/modules/input/input.service.ts:41]
       ↳ Reads an option that carries a default when it was left off.
      └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
         ↳ Reads an option that carries text, or nothing at all.
```

**7. `ConfigurationCommand.parseFormat`** — depth 3 · decorated-method

```text
🚀 ConfigurationCommand.parseFormat(value: unknown): string [packages/codometer-cli/src/modules/configuration/configuration.command.ts:63]
   ↳ Parse the output format the listing is rendered in.
  └─> InputService.parseDefaultedOption(value: unknown, fallback: string): string [packages/codometer-configuration/src/modules/input/input.service.ts:41]
     ↳ Reads an option that carries a default when it was left off.
    └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
       ↳ Reads an option that carries text, or nothing at all.
```

**8. `ChangesCommand.parseBaseline`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseBaseline(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:52]
   ↳ Parse the baseline directory holding a snapshot of the reports.
  └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
     ↳ Reads an option that carries text, or nothing at all.
```

**9. `ChangesCommand.parseBaselineUrl`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseBaselineUrl(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:61]
   ↳ Parse the run URL the baseline came from, linked from the summary.
  └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
     ↳ Reads an option that carries text, or nothing at all.
```

**10. `ChangesCommand.parseMarkdown`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseMarkdown(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:79]
   ↳ Parse the markdown document the report is spliced into.
  └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
     ↳ Reads an option that carries text, or nothing at all.
```

**11. `ChangesCommand.parseOutput`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseOutput(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:88]
   ↳ Parse the file the report is written to on its own.
  └─> InputService.parseOptionalOption(value: unknown): string | undefined [packages/codometer-configuration/src/modules/input/input.service.ts:68]
     ↳ Reads an option that carries text, or nothing at all.
```

**12. `main`** — depth 2 · module-bootstrap

```text
🚀 main(): Promise<void> [packages/codometer-cli/src/main.ts:26]
   ↳ Bootstraps the codometer CLI command application.
  └─> withDefaultCommand(argv: readonly string[]): string[] [packages/codometer-cli/src/main.utilities.ts:14]
     ↳ Inserts the default `measure` subcommand when the command line names no registered command.
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `MeasureService.measureTarget` | 17 | `packages/codometer-discovery:modules/discovery`, `packages/codometer-discovery:modules/targets`, `packages/codometer-size:modules/size` | `packages/codometer-cli/src/modules/measure/measure.service.ts:290` |
| `MeasureService.analyzeFiles` | 15 | `packages/codometer-customization:modules/customization`, `packages/codometer-languages:modules/languages`, `packages/codometer-size:modules/size` | `packages/codometer-cli/src/modules/measure/measure.service.ts:77` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MeasureCommand.run` | 11 | `MeasureCommand.resolveWorkingDirectory`, `RunPlanService.selectMode`, `MeasureCommand.readConfiguration`, `RunPlanService.resolveDestinations`, `RunPlanService.listOutputPaths`, `MeasureCommand.announceOutputPaths`, `MeasureService.measure`, `ReportService.build`, `DeliveryService.deliver`, `RunPlanService.selectScope`, `MeasureCommand.reportFindings` | `packages/codometer-cli/src/modules/measure/measure.command.ts:327` |
| `MeasureService.measure` | 10 | `MeasureService.discoverCodebase`, `MeasureService.analyzeFiles`, `DiscoveryService.categorize`, `MeasureService.measureDeclaredTargets`, `MeasureService.attachTargetName`, `MetricIndexService.index`, `LimitsService.evaluate`, `MeasureService.flatMap(…)`, `MeasureService.map(…)`, `MeasureService.readLimitFailures` | `packages/codometer-cli/src/modules/measure/measure.service.ts:355` |
| `MeasureService.analyzeFiles` | 7 | `LanguagesService.analyze`, `CustomizationService.buildSymbolCounters`, `SizeService.analyze`, `CustomizationService.analyze`, `MeasureService.getFolderCount`, `MeasureService.buildJavascriptStatistics`, `MeasureService.buildTypescriptStatistics` | `packages/codometer-cli/src/modules/measure/measure.service.ts:77` |

<details>
<summary>67 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MeasureService.measureTarget` | 7 | `MeasureService.excludeOutputPaths`, `TargetsService.matchFiles`, `MeasureService.runsAnalysis`, `MeasureService.analyzeFiles`, `DiscoveryService.categorize`, `MeasureService.attachTargetName`, `SizeService.analyze` | `packages/codometer-cli/src/modules/measure/measure.service.ts:290` |
| `ChangesCommand.run` | 5 | `InputService.parseOptionalOption`, `InputService.parseDirectoryOption`, `ChangesService.collect`, `RenderService.renderSection`, `DocumentsService.emit` | `packages/codometer-cli/src/modules/changes/changes.command.ts:97` |
| `LimitsService.resolve` | 5 | `LimitsService.findCandidates`, `UnboundMetricError.constructor`, `LimitsService.describeTargets`, `LimitsService.map(…)`, `EmptyTargetError.constructor` | `packages/codometer-cli/src/modules/limits/limits.service.ts:156` |
| `MeasureCommand.reportFindings` | 5 | `MeasureCommand.reportFailures`, `MeasureCommand.reportStaleness`, `MeasureCommand.reportBreaches`, `MeasureCommand.reportDocumentationBreaches`, `MeasureCommand.filter(…)` | `packages/codometer-cli/src/modules/measure/measure.command.ts:172` |
| `ConfigurationService.findConfigurationFiles` | 4 | `ConfigurationService.loadConfigurationFile`, `DiscoveryService.discoverFiles`, `ConfigurationService.toSorted(…)`, `ConfigurationService.filter(…)` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:133` |
| `ConfigurationCommand.run` | 4 | `ConfigurationService.describeConfigurations`, `ConfigurationCommand.filter(…)`, `RenderConfigurationService.render`, `ConfigurationService.toLimitRows` | `packages/codometer-cli/src/modules/configuration/configuration.command.ts:90` |
| `DeliveryService.deliverConsole` | 4 | `JsonService.render`, `MarkdownService.renderBlock`, `DeliveryService.readTargetSizes`, `DeliveryService.appendDocumentationSection` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:106` |
| `DeliveryService.deliverMarkdown` | 4 | `DeliveryService.touchesFiles`, `DeliveryService.readTargetSizes`, `MarkdownService.sync`, `DeliveryService.augmentWithDocumentation` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:170` |
| `RunPlanService.readCheckNames` | 4 | `RunPlanService.describeAcceptedCheckNames`, `RunPlanService.filter(…)`, `RunPlanService.map(…)`, `RunPlanService.validateCheckNames` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:81` |
| `RenderConfigurationService.renderDirectory` | 3 | `RenderConfigurationService.renderNames`, `RenderConfigurationService.map(…)`, `RenderConfigurationService.map(…)` | `packages/codometer-cli/src/modules/configuration/render-configuration.service.ts:36` |
| `RenderConfigurationService.renderLimitsTable` | 3 | `RenderConfigurationService.renderRow`, `RenderConfigurationService.map(…)`, `RenderConfigurationService.map(…)` | `packages/codometer-cli/src/modules/configuration/render-configuration.service.ts:65` |
| `DeliveryService.deliver` | 3 | `DeliveryService.deliverConsole`, `DeliveryService.deliverJson`, `DeliveryService.deliverMarkdown` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:238` |
| `LimitsService.findDefaultCandidate` | 3 | `UnboundMetricError.constructor`, `LimitsService.describeTargets`, `LimitsService.bind` | `packages/codometer-cli/src/modules/limits/limits.service.ts:124` |
| `ReportService.buildMetrics` | 3 | `ReportService.buildMetricName`, `ReportService.map(…)`, `ReportService.readUnit` | `packages/codometer-cli/src/modules/report/report.service.ts:52` |
| `RunPlanService.readFormat` | 3 | `RunPlanService.touchesFiles`, `RunPlanService.find(…)`, `RunPlanService.map(…)` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:125` |
| `RunPlanService.resolveDestinations` | 3 | `RunPlanService.namesDestination`, `RunPlanService.resolveJson`, `RunPlanService.resolveMarkdown` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:323` |
| `RunPlanService.selectMode` | 3 | `RunPlanService.readCheckNames`, `RunPlanService.readFormat`, `RunPlanService.requireWrittenOutput` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:345` |
| `MeasureCommand.reportBreaches` | 3 | `MeasureCommand.filter(…)`, `MeasureCommand.filter(…)`, `MeasureCommand.filter(…)` | `packages/codometer-cli/src/modules/measure/measure.command.ts:102` |
| `MeasureCommand.reportDocumentationBreaches` | 3 | `MeasureCommand.filter(…)`, `MeasureCommand.filter(…)`, `MeasureCommand.filter(…)` | `packages/codometer-cli/src/modules/measure/measure.command.ts:126` |
| `ConfigurationService.formatLimitValue` | 2 | `formatBytes`, `formatCount` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:91` |
| `ConfigurationService.describeConfigurations` | 2 | `ConfigurationService.findConfigurationFiles`, `ConfigurationService.describeConfiguration` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:108` |
| `RenderConfigurationService.render` | 2 | `RenderConfigurationService.renderLimitsTable`, `RenderConfigurationService.map(…)` | `packages/codometer-cli/src/modules/configuration/render-configuration.service.ts:99` |
| `DeliveryService.appendDocumentationSection` | 2 | `MarkdownService.renderDocumentationSection`, `DeliveryService.filter(…)` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:57` |
| `DeliveryService.augmentWithDocumentation` | 2 | `MarkdownService.renderDocumentationSection`, `DeliveryService.filter(…)` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:80` |
| `DeliveryService.deliverJson` | 2 | `DeliveryService.touchesFiles`, `JsonService.sync` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:135` |
| `LimitsService.findCandidates` | 2 | `LimitsService.bind`, `LimitsService.findDefaultCandidate` | `packages/codometer-cli/src/modules/limits/limits.service.ts:86` |
| `LimitsService.evaluate` | 2 | `LimitsService.resolve`, `LimitsService.describeFailure` | `packages/codometer-cli/src/modules/limits/limits.service.ts:200` |
| `MetricIndexService.buildTargetIndex` | 2 | `MetricIndexService.addMetric`, `MetricIndexService.indexLanguage` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:66` |
| `MetricIndexService.indexCounters` | 2 | `MetricIndexService.addMetric`, `MetricIndexService.isCounterGroup` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:101` |
| `MetricIndexService.indexLanguage` | 2 | `MetricIndexService.indexCounters`, `MetricIndexService.addMetric` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:125` |
| `MetricIndexService.index` | 2 | `MetricIndexService.describeDuplicate`, `MetricIndexService.buildTargetIndex` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:157` |
| `ReportService.build` | 2 | `ReportService.indexLimits`, `ReportService.buildMetrics` | `packages/codometer-cli/src/modules/report/report.service.ts:120` |
| `RunPlanService.listOutputPaths` | 2 | `RunPlanService.map(…)`, `RunPlanService.filter(…)` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:299` |
| `MeasureService.discoverCodebase` | 2 | `DiscoveryService.discoverFiles`, `MeasureService.excludeOutputPaths` | `packages/codometer-cli/src/modules/measure/measure.service.ts:198` |
| `MeasureService.measureDeclaredTargets` | 2 | `MeasureService.measureTarget`, `MeasureService.describeFailure` | `packages/codometer-cli/src/modules/measure/measure.service.ts:254` |
| `ChangesCommand.parseBaseline` | 1 | `InputService.parseOptionalOption` | `packages/codometer-cli/src/modules/changes/changes.command.ts:52` |
| `ChangesCommand.parseBaselineUrl` | 1 | `InputService.parseOptionalOption` | `packages/codometer-cli/src/modules/changes/changes.command.ts:61` |
| `ChangesCommand.parseDirectory` | 1 | `InputService.parseDirectoryOption` | `packages/codometer-cli/src/modules/changes/changes.command.ts:70` |
| `ChangesCommand.parseMarkdown` | 1 | `InputService.parseOptionalOption` | `packages/codometer-cli/src/modules/changes/changes.command.ts:79` |
| `ChangesCommand.parseOutput` | 1 | `InputService.parseOptionalOption` | `packages/codometer-cli/src/modules/changes/changes.command.ts:88` |
| `ConfigurationService.describeConfiguration` | 1 | `ConfigurationService.loadConfigurationFile` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:56` |
| `ConfigurationService.toLimitRows` | 1 | `ConfigurationService.flatMap(…)` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:157` |
| `ConfigurationService.flatMap(…)` | 1 | `ConfigurationService.map(…)` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:160` |
| `ConfigurationService.map(…)` | 1 | `ConfigurationService.formatLimitValue` | `packages/codometer-cli/src/modules/configuration/configuration.service.ts:161` |
| `RenderConfigurationService.map(…)` | 1 | `RenderConfigurationService.renderRow` | `packages/codometer-cli/src/modules/configuration/render-configuration.service.ts:73` |
| `RenderConfigurationService.map(…)` | 1 | `RenderConfigurationService.renderDirectory` | `packages/codometer-cli/src/modules/configuration/render-configuration.service.ts:121` |
| `ConfigurationCommand.parseDirectory` | 1 | `InputService.parseDirectoryOption` | `packages/codometer-cli/src/modules/configuration/configuration.command.ts:54` |
| `ConfigurationCommand.parseFormat` | 1 | `InputService.parseDefaultedOption` | `packages/codometer-cli/src/modules/configuration/configuration.command.ts:63` |
| `DeliveryService.readTargetSizes` | 1 | `DeliveryService.flatMap(…)` | `packages/codometer-cli/src/modules/delivery/delivery.service.ts:211` |
| `LimitsService.bind` | 1 | `UnboundMetricError.constructor` | `packages/codometer-cli/src/modules/limits/limits.service.ts:41` |
| `LimitsService.describeTargets` | 1 | `LimitsService.map(…)` | `packages/codometer-cli/src/modules/limits/limits.service.ts:72` |
| `LimitsService.map(…)` | 1 | `LimitsService.describeBinding` | `packages/codometer-cli/src/modules/limits/limits.service.ts:169` |
| `ReportService.map(…)` | 1 | `ReportService.buildLimit` | `packages/codometer-cli/src/modules/report/report.service.ts:63` |
| `ReportService.indexLimits` | 1 | `ReportService.buildMetricName` | `packages/codometer-cli/src/modules/report/report.service.ts:87` |
| `RunPlanService.describeAcceptedCheckNames` | 1 | `RunPlanService.map(…)` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:56` |
| `RunPlanService.requireWrittenOutput` | 1 | `RunPlanService.filter(…)` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:158` |
| `RunPlanService.resolveJson` | 1 | `RunPlanService.resolvePath` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:184` |
| `RunPlanService.resolveMarkdown` | 1 | `RunPlanService.resolvePath` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:224` |
| `RunPlanService.validateCheckNames` | 1 | `RunPlanService.describeAcceptedCheckNames` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:274` |
| `RunPlanService.selectScope` | 1 | `RunPlanService.some(…)` | `packages/codometer-cli/src/modules/run-plan/run-plan.service.ts:375` |
| `MeasureService.attachTargetName` | 1 | `MeasureService.map(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:140` |
| `MeasureService.excludeOutputPaths` | 1 | `MeasureService.filter(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:216` |
| `MeasureService.readLimitFailures` | 1 | `MeasureService.map(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:326` |
| `MeasureCommand.readConfiguration` | 1 | `ConfigurationService.loadConfiguration` | `packages/codometer-cli/src/modules/measure/measure.command.ts:77` |
| `MeasureCommand.resolveWorkingDirectory` | 1 | `MeasureCommand.parseDirectory` | `packages/codometer-cli/src/modules/measure/measure.command.ts:205` |
| `MeasureCommand.parseDirectory` | 1 | `InputService.parseDirectoryOption` | `packages/codometer-cli/src/modules/measure/measure.command.ts:250` |
| `main` | 1 | `withDefaultCommand` | `packages/codometer-cli/src/main.ts:26` |

</details>

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/JimmyPaolini/codebase/tree/main/packages/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx" -->
```mermaid
graph LR
  codometer_changes["codometer-changes"]
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_customization["codometer-customization"]
  codometer_discovery["codometer-discovery"]
  codometer_examples["codometer-examples"]
  codometer_languages["codometer-languages"]
  codometer_output["codometer-output"]
  codometer_size["codometer-size"]
  logger["logger"]
  codometer_cli --> codometer_changes
  codometer_cli --> codometer_configuration
  codometer_cli --> codometer_customization
  codometer_cli --> codometer_discovery
  codometer_cli --> codometer_languages
  codometer_cli --> codometer_output
  codometer_cli --> codometer_size
  codometer_cli --> logger
  codometer_examples --> codometer_cli
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_cli subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  ChangesModule
  ConfigModule([ConfigModule])
  ConfigurationModule
  CssModule
  CustomizationModule
  DeliveryModule
  DiscoveryModule
  DocumentsModule
  HclModule
  InputModule
  JsonModule
  JupyterModule
  LanguagesModule
  LimitsModule
  LoggerModule([LoggerModule])
  MainModule
  MarkdownModule
  MeasureModule
  PythonModule
  RenderModule
  ReportModule
  RunPlanModule
  ShellModule
  SizeModule
  SqlModule
  TargetsModule
  TomlModule
  TypescriptModule
  YamlModule
  ChangesModule --> ChangesModule
  ChangesModule --> DocumentsModule
  ChangesModule --> InputModule
  ChangesModule --> RenderModule
  ConfigurationModule --> ConfigurationModule
  ConfigurationModule --> DiscoveryModule
  ConfigurationModule --> InputModule
  DeliveryModule --> JsonModule
  DeliveryModule --> MarkdownModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> CssModule
  LanguagesModule --> HclModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> ShellModule
  LanguagesModule --> SqlModule
  LanguagesModule --> TomlModule
  LanguagesModule --> TypescriptModule
  LanguagesModule --> YamlModule
  MainModule --> ChangesModule
  MainModule --> ConfigurationModule
  MainModule --> ConfigurationModule
  MainModule --> CustomizationModule
  MainModule --> DiscoveryModule
  MainModule --> DiscoveryModule
  MainModule --> InputModule
  MainModule --> JsonModule
  MainModule --> LanguagesModule
  MainModule --> MarkdownModule
  MainModule --> MeasureModule
  MeasureModule --> ConfigurationModule
  MeasureModule --> CustomizationModule
  MeasureModule --> DeliveryModule
  MeasureModule --> DiscoveryModule
  MeasureModule --> InputModule
  MeasureModule --> LanguagesModule
  MeasureModule --> LimitsModule
  MeasureModule --> ReportModule
  MeasureModule --> RunPlanModule
  MeasureModule --> SizeModule
  MeasureModule --> TargetsModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_constants_ts["src/constants.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_main_end_to_end_test_ts["src/main.end-to-end.test.ts"]
  file_src_main_module_ts["src/main.module.ts"]
  file_src_main_ts["src/main.ts"]
  file_src_main_utilities_ts["src/main.utilities.ts"]
  file_src_main_utilities_unit_test_ts["src/main.utilities.unit.test.ts"]
  file_src_modules_changes_changes_command_ts["src/modules/changes/changes.command.ts"]
  file_src_modules_changes_changes_command_unit_test_ts["src/modules/changes/changes.command.unit.test.ts"]
  file_src_modules_changes_changes_constants_ts["src/modules/changes/changes.constants.ts"]
  file_src_modules_changes_changes_module_ts["src/modules/changes/changes.module.ts"]
  file_src_modules_changes_changes_types_ts["src/modules/changes/changes.types.ts"]
  file_src_modules_configuration_configuration_command_ts["src/modules/configuration/configuration.command.ts"]
  file_src_modules_configuration_configuration_command_unit_test_ts["src/modules/configuration/configuration.command.unit.test.ts"]
  file_src_modules_configuration_configuration_constants_ts["src/modules/configuration/configuration.constants.ts"]
  file_src_modules_configuration_configuration_module_ts["src/modules/configuration/configuration.module.ts"]
  file_src_modules_configuration_configuration_service_ts["src/modules/configuration/configuration.service.ts"]
  file_src_modules_configuration_configuration_service_unit_test_ts["src/modules/configuration/configuration.service.unit.test.ts"]
  file_src_modules_configuration_configuration_types_ts["src/modules/configuration/configuration.types.ts"]
  file_src_modules_configuration_render_configuration_service_ts["src/modules/configuration/render-configuration.service.ts"]
  file_src_modules_configuration_render_configuration_service_unit_test_ts["src/modules/configuration/render-configuration.service.unit.test.ts"]
  file_src_modules_delivery_delivery_constants_ts["src/modules/delivery/delivery.constants.ts"]
  file_src_modules_delivery_delivery_module_ts["src/modules/delivery/delivery.module.ts"]
  file_src_modules_delivery_delivery_service_ts["src/modules/delivery/delivery.service.ts"]
  file_src_modules_delivery_delivery_service_unit_test_ts["src/modules/delivery/delivery.service.unit.test.ts"]
  file_src_modules_delivery_delivery_types_ts["src/modules/delivery/delivery.types.ts"]
  file_src_modules_limits_limits_constants_ts["src/modules/limits/limits.constants.ts"]
  file_src_modules_limits_limits_module_ts["src/modules/limits/limits.module.ts"]
  file_src_modules_limits_limits_service_integration_test_ts["src/modules/limits/limits.service.integration.test.ts"]
  file_src_modules_limits_limits_service_ts["src/modules/limits/limits.service.ts"]
  file_src_modules_limits_limits_service_unit_test_ts["src/modules/limits/limits.service.unit.test.ts"]
  file_src_modules_limits_limits_types_ts["src/modules/limits/limits.types.ts"]
  file_src_modules_limits_metric_index_service_ts["src/modules/limits/metric-index.service.ts"]
  file_src_modules_limits_metric_index_service_unit_test_ts["src/modules/limits/metric-index.service.unit.test.ts"]
  file_src_modules_measure_measure_command_integration_test_ts["src/modules/measure/measure.command.integration.test.ts"]
  file_src_modules_measure_measure_command_ts["src/modules/measure/measure.command.ts"]
  file_src_modules_measure_measure_command_unit_test_ts["src/modules/measure/measure.command.unit.test.ts"]
  file_src_modules_measure_measure_constants_ts["src/modules/measure/measure.constants.ts"]
  file_src_modules_measure_measure_module_ts["src/modules/measure/measure.module.ts"]
  file_src_modules_measure_measure_service_ts["src/modules/measure/measure.service.ts"]
  file_src_modules_measure_measure_service_unit_test_ts["src/modules/measure/measure.service.unit.test.ts"]
  file_src_modules_measure_measure_types_ts["src/modules/measure/measure.types.ts"]
  file_src_modules_report_report_constants_ts["src/modules/report/report.constants.ts"]
  file_src_modules_report_report_module_ts["src/modules/report/report.module.ts"]
  file_src_modules_report_report_service_ts["src/modules/report/report.service.ts"]
  file_src_modules_report_report_service_unit_test_ts["src/modules/report/report.service.unit.test.ts"]
  file_src_modules_report_report_types_ts["src/modules/report/report.types.ts"]
  file_src_modules_run_plan_run_plan_constants_ts["src/modules/run-plan/run-plan.constants.ts"]
  file_src_modules_run_plan_run_plan_module_ts["src/modules/run-plan/run-plan.module.ts"]
  file_src_modules_run_plan_run_plan_service_ts["src/modules/run-plan/run-plan.service.ts"]
  file_src_modules_run_plan_run_plan_service_unit_test_ts["src/modules/run-plan/run-plan.service.unit.test.ts"]
  file_src_modules_run_plan_run_plan_types_ts["src/modules/run-plan/run-plan.types.ts"]
  file_src_repl_ts["src/repl.ts"]
  file_src_repl_unit_test_ts["src/repl.unit.test.ts"]
  file_testing_fixture_tree_ts["testing/fixture-tree.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_testing_target_tree_ts["testing/target-tree.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_main_end_to_end_test_ts --> file_src_constants_ts
  file_src_main_end_to_end_test_ts --> file_src_modules_report_report_types_ts
  file_src_main_end_to_end_test_ts --> file_testing_fixture_tree_ts
  file_src_main_module_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_modules_changes_changes_module_ts
  file_src_main_module_ts --> file_src_modules_configuration_configuration_module_ts
  file_src_main_module_ts --> file_src_modules_measure_measure_module_ts
  file_src_main_ts --> file_src_main_module_ts
  file_src_main_ts --> file_src_main_utilities_ts
  file_src_main_utilities_unit_test_ts --> file_src_main_utilities_ts
  file_src_modules_changes_changes_command_ts --> file_src_modules_changes_changes_types_ts
  file_src_modules_changes_changes_command_unit_test_ts --> file_src_modules_changes_changes_command_ts
  file_src_modules_changes_changes_module_ts --> file_src_modules_changes_changes_command_ts
  file_src_modules_configuration_configuration_command_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_command_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_command_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_command_ts --> file_src_modules_configuration_render_configuration_service_ts
  file_src_modules_configuration_configuration_command_unit_test_ts --> file_src_modules_configuration_configuration_command_ts
  file_src_modules_configuration_configuration_command_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_command_unit_test_ts --> file_src_modules_configuration_render_configuration_service_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_configuration_command_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_render_configuration_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_render_configuration_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_render_configuration_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_render_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_render_configuration_service_unit_test_ts --> file_src_modules_configuration_render_configuration_service_ts
  file_src_modules_delivery_delivery_module_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_delivery_delivery_constants_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_delivery_delivery_types_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_delivery_delivery_service_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_delivery_delivery_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_delivery_delivery_types_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_delivery_delivery_types_ts --> file_src_modules_report_report_types_ts
  file_src_modules_delivery_delivery_types_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_limits_limits_module_ts --> file_src_modules_limits_limits_service_ts
  file_src_modules_limits_limits_module_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_limits_limits_service_integration_test_ts --> file_src_modules_limits_limits_service_ts
  file_src_modules_limits_limits_service_integration_test_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_limits_limits_service_integration_test_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_limits_limits_service_integration_test_ts --> file_testing_fixture_tree_ts
  file_src_modules_limits_limits_service_integration_test_ts --> file_testing_mocks_ts
  file_src_modules_limits_limits_service_ts --> file_src_modules_limits_limits_constants_ts
  file_src_modules_limits_limits_service_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_limits_limits_service_unit_test_ts --> file_src_modules_limits_limits_service_ts
  file_src_modules_limits_limits_service_unit_test_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_limits_limits_service_unit_test_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_limits_limits_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_limits_metric_index_service_ts --> file_src_modules_limits_limits_constants_ts
  file_src_modules_limits_metric_index_service_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_limits_metric_index_service_unit_test_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_limits_metric_index_service_unit_test_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_limits_metric_index_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_measure_measure_command_integration_test_ts --> file_src_main_module_ts
  file_src_modules_measure_measure_command_integration_test_ts --> file_src_modules_measure_measure_command_ts
  file_src_modules_measure_measure_command_integration_test_ts --> file_src_modules_report_report_types_ts
  file_src_modules_measure_measure_command_integration_test_ts --> file_testing_fixture_tree_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_measure_measure_service_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_report_report_service_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_run_plan_run_plan_constants_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_measure_measure_command_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_delivery_delivery_service_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_measure_measure_command_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_measure_measure_service_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_measure_measure_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_delivery_delivery_module_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_limits_limits_module_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_measure_measure_command_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_measure_measure_service_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_report_report_module_ts
  file_src_modules_measure_measure_module_ts --> file_src_modules_run_plan_run_plan_module_ts
  file_src_modules_measure_measure_service_ts --> file_src_modules_limits_limits_service_ts
  file_src_modules_measure_measure_service_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_measure_measure_service_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_measure_measure_service_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_measure_measure_service_unit_test_ts --> file_src_modules_limits_limits_service_ts
  file_src_modules_measure_measure_service_unit_test_ts --> file_src_modules_limits_metric_index_service_ts
  file_src_modules_measure_measure_service_unit_test_ts --> file_src_modules_measure_measure_service_ts
  file_src_modules_measure_measure_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_measure_measure_types_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_report_types_ts --> file_src_modules_limits_limits_types_ts
  file_src_modules_report_report_types_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_run_plan_run_plan_module_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_run_plan_run_plan_constants_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_run_plan_run_plan_service_unit_test_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_run_plan_run_plan_service_unit_test_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_run_plan_run_plan_service_unit_test_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_run_plan_run_plan_types_ts --> file_src_modules_measure_measure_types_ts
  file_src_modules_run_plan_run_plan_types_ts --> file_src_modules_run_plan_run_plan_constants_ts
  file_src_repl_ts --> file_src_main_module_ts
  file_testing_mocks_ts --> file_src_modules_report_report_types_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-8510-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-276.70_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-10-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-61-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-35.48_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-61-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-37-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-37-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-228-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-16-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-21-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-21-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-339-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-131-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-385-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-85-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-290-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-303-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-93-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-441-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-972-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-172-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-36-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-114-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-94-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-9-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-153-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-8-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-8-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-3-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-7-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-7-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-1-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-13-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-2-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-1-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-247-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-14-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-49-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-28-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-13-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-78-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
