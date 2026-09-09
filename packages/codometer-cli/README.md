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

Measuring the repository is codometer's default command, so `codometer` on its
own is `codometer measure`:

```bash
codometer --config configuration/codometer.config.ts --check limits
```

| Flag | Purpose |
| ---- | ------- |
| `--check [set]` | Fail on a comma-separated set drawn from `reports` and `limits` |
| `--config [path]` | Configuration file to read; searched for when omitted |
| `-f, --format <format>` | What to print to standard output, one of `json` and `markdown` |
| `--inputs [globs...]` | Glob array measured in place of every configured input, with no configured input — not even the built-in `codebase` one — active |
| `--output-json [path]` | Write the JSON report, at the given path or the configured one |
| `--output-markdown [path]` | Write the markdown badge block, at the given path or the configured one |

There is no `--directory`: a run always measures the process's working
directory, with no per-invocation override. `cd` into what you want measured,
or narrow it with `--inputs`.

**Every flag is independent.** `--output-json`/`--output-markdown` each write
their own destination, `--check limits` fails on a breached limit, `--check
reports` fails on a stale one, `--format` prints, and none of them turns
another on:

| Invocation | Writes | Fails on staleness | Fails on a breach |
| ---------- | ------ | ------------------ | ----------------- |
| `codometer` | no | no | no |
| `codometer --check limits` | no | no | yes |
| `codometer --check reports` | no | yes | no |
| `codometer --check limits,reports` | no | yes | yes |
| `codometer --output-json --output-markdown` | yes, both | no | no |
| `codometer --output-json --check limits` | yes | no | yes, after writing |

`--output-json`/`--output-markdown` passed **bare** write to whatever the
resolved configuration's own `json`/`markdown` output declares, and are
refused before anything is measured when the configuration names no such
output — there is then nowhere to write it. Passed **with a path**, that path
is used for this run alone, whether or not the configuration declares an
output of that kind.

A run that both writes and gates produces **every** output before it fails, so
the report is on disk even when the gate trips. Combining an `--output-*` flag
with `--check reports` is refused rather than obeyed: nothing can be stale in
the run that just wrote it. So is a `--check` value the tool does not know, or
one passed with no value at all — a valueless `--check` used to mean "check
everything", and a set with nothing in it looks exactly like the flag having
been left off. Every complaint about one command line is reported together
rather than one run at a time.

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
measured — its own sources, and whatever inputs the configuration declares for
it:

```bash
cd packages/logger && codometer --check limits
```

With no `--config`, the configuration is found by walking upward from that
folder and taking the **first** file found. The nearest one wins outright:
nothing from a further ancestor is folded into it, because a merged
configuration leaves a limit that never applied looking exactly like one that
did.

A configuration file is always read as a plain object — one exported as a
function is not recognized, and falls back to an empty configuration, the
same way a file exporting `42` does. So a project answering for itself writes
its own `codometer.config.ts`, typically by importing and spreading a shared
object a workspace root exports, the way this repository's own projects each
spread [`configuration/codometer.config.ts`](../../configuration/codometer.config.ts).

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

## Inputs

An **input** is a named set of files, declared by include and exclude globs
together with the analyses run over it. `inputs` is an array, and one entry is
always there whether or not a configuration declares any: the built-in
`codebase` scan, which measures everything the ignore files leave behind and
runs `language` analysis over it. Declaring an input named `codebase`
replaces that built-in entry outright rather than adding beside it.

An input names its files by glob, which is what lets one measure compiled
output: a directory every `.gitignore` claims, and therefore the one place
ignore rules must not reach — ignore files are never consulted for a declared
input.

```ts
inputs: [
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
| `name` | yes | — | What the input is called. Two inputs may not share one |
| `include` | yes | — | Globs that add files. At least one must add rather than remove |
| `exclude` | no | none | Globs that remove files |
| `analyses` | yes | — | `language`, `size`, or both. At least one |
| `compression` | no | `gzip` | `gzip`, `brotli`, or `none` for the bytes on disk |
| `directory` | no | `.` | Where the input's globs start, relative to the process's working directory |

`language` runs the analyzers above over the input's files. `size` compresses
each matched file on its own and sums the results — never all of them together
— at gzip level 9 or brotli quality 11, both stated rather than defaulted.

A `!` prefix in `include` removes files. Negations form one set applied to the
whole input rather than being read in order, so rearranging the array cannot
change what the input holds. Dot files are excluded unless a glob spells one
out, directories never match, and a file that was matched but cannot be read
fails the run rather than counting as zero bytes.

`--inputs [globs...]` on the command line replaces every configured input for
that one run, running only `language` analysis over exactly the globs given —
with no other input, not even the built-in `codebase` one, active.

## Limits

A **limit** is how high one measured metric may go. Any metric can carry one — a
compressed size, a line count, a counter for one of the conventions below — and
a metric nothing limits is measured and reported exactly as before, gated by
nothing.

```ts
defaultInput: "codebase",
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

A metric is addressed by the input's name followed by its path within that
input — `codebase.typescript.interfaces`, `codebase.markdown.files`,
`Compiled JavaScript.size`. Every input carries `files`, an input running size
analysis carries `size`, and one running language analysis carries every
counter the tables above list, with configured counters under `custom.<label>`.
Set `defaultInput` and a path naming no input is read as that input's.

Where a `defaultInput` is set, a path is read as that input's whenever no
input name prefixes it — so with `defaultInput: "codebase"` and an input
called `typescript`, `typescript.interfaces` is the codebase's, because the
`typescript` input has no `interfaces` metric of its own to compete with it.
Write the input name in full wherever an input and a metric group share one.

**Ambiguity is refused, never resolved.** A path that could name two metrics —
an input called `markdown` beside the codebase's own `markdown.files` — fails
the run naming both readings, as does a path naming none, or one naming a
metric from an analysis the input never ran. A limit that quietly bound to the
wrong metric would look exactly like one that works.

A value written as a string carries a **decimal** unit whose trailing `b` is
required: `"8 KB"` is 8000 bytes and `"1 MB"` is 1000000, while `"8 K"` is not
a size and is refused rather than read as anything. A value nothing can read
fails the run instead of being taken as zero.

An input that matched **no files** fails the run if and only if a limit is
written against it. Declaring a limit asserts the files are there, so an empty
match is a glob that stopped matching or a build that never ran — while an
input nobody limited simply measured zero, which is unremarkable.

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
honors the exclusions of whatever configuration answers for the directory being
listed, so a configuration inside a dependency or a generator template is never
listed as something the repository configures.

**Name that configuration with `--config` where the directory has none of its
own.** A workspace often states its shared configuration in a file every
project spreads rather than at its own root, and the upward search then finds
nothing:

```bash
codometer configuration --limits --config configuration/codometer.config.ts
```

Drop `--limits` to list everything each configuration resolved to: its inputs,
outputs and their custom statistics, exclusions, and Python command. Add
`--format json` for a machine-readable listing.

It reports configuration and never measurement. No build is required and no
limit is evaluated, so it runs in milliseconds — and no single unreadable file
takes it down. A configuration file that cannot be loaded is listed as
unreadable, and a walk root nothing answers for falls back to the built-in
exclusions, says so at the top of the listing, and still reports every limit
the tree declares. That last case exits 1 rather than 0: the listing is real,
but the exclusions the repository declares were never consulted, and a clean
exit would claim otherwise.

## Custom statistics

A repository that names files by convention has a vocabulary no analyzer knows
about. Each output destination carries its own `custom` list to count them —
there is no longer one shared `statistics` array, so a JSON report and a
markdown report may count entirely different things:

```ts
outputs: [
  {
    custom: [
      { label: "Service Files", patterns: ["**/*.service.ts"] },
      { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
      { color: "16a34a", label: "Migrations", patterns: ["**/migrations/*.sql"] },
    ],
    path: "codometer-report.json",
    type: "json",
  },
],
```

Counters can also match _declarations_ rather than files, by shape:

```ts
custom: [
  {
    group: "typescript",
    label: "Static Methods",
    symbols: { kinds: ["method"], modifiers: ["static"] },
  },
];
```

Or select a **comment budget** — how much prose one comment block may hold —
rather than counting files or declarations at all:

```ts
custom: [
  { comment: { language: "yaml", maximumWords: 128 }, label: "YAML Comment Budget" },
  { comment: { kind: "class", maximumLines: 24 }, label: "Class Comment Budget" },
];
```

A `comment` entry's `value` is how many blocks breached the selector's own
`maximumCharacters`/`maximumLines`/`maximumWords`, and its `instances` name
each one's file and line — the same shape any other custom counter reports, so
a comment-budget breach gates through an ordinary `limits[]` entry addressing
its `custom.<label>` metric path exactly the way a file or symbol counter's
limit does. There is no separate flag for it, and no inheritance between
`comment` selectors: a selector naming no `language` covers every language
codometer measures comments in, so expressing "every language at one budget,
except one language at another" means writing the general budget once per
covered language rather than once for all of them, leaving the exception for
its own, narrower selector. See
[`configuration/codometer.config.ts`](../../configuration/codometer.config.ts)
for how this repository derives one selector per language from its own list of
comment-bearing languages.

Each entry becomes one badge, in the order configured, rendered into the group
it names — `conventions` by default. Symbol counting happens during the walk
the TypeScript analyzer already makes, so any number of these costs one pass
over the sources.

The full reference — kinds, modifiers, colors, groups, the comment-selector
fields, and how `patterns` narrows a symbol counter rather than being what it
counts — is in
[**@codometer/configuration**](../codometer-configuration/README.md#custom-statistics).

## Output

What a run prints and what it writes are asked for separately, and neither
implies the other:

| Sink | Flag | What lands there |
| ---- | ---- | ---------------- |
| Console | `-f, --format <format>` | The report as `json`, or the rendered badges as `markdown` |
| Report | `--output-json [path]` | The structured report below |
| Markdown | `--output-markdown [path]` | The badge block, in a markdown file |

**One markdown sink, not two.** `--output-markdown` splices the badge block
between its markers when the file already carries them, appends it with them
when it does not, and creates the file when it is not there. A README somebody
else wrote the rest of and a file holding nothing but badges are the same case,
so neither needs a flag of its own.

**Each `--output-*` flag's value is optional, and the two meanings differ.**
Passed bare, the flag writes wherever the resolved configuration's own output
of that kind declares — refused before anything is measured when the
configuration names no such output, since there is then nowhere to write it.
Passed with a path, that path is used for this run alone, whether or not the
configuration declares an output of that kind:

```bash
codometer --output-json                    # writes the configured json output's path
codometer --output-json report.json        # writes report.json instead, even with no json output configured
```

**`--format` falls back to the resolved configuration's own `format` field**
when the flag is left off — never inferred from which other flags are present,
so omitting it prints the same thing whether or not the run also writes a
file. `format` is required in every configuration, so this fallback is never
undefined.

**A named destination stands for all of them.** `--output-json` on its own asks
for the report and nothing else, whatever the configuration file also describes;
`--output-markdown` on its own writes only the badge block. Each flag governs
its own destination and never turns another on.

**Standard output carries the result; every diagnostic goes to standard error.**
`codometer --format json > report.json` has to produce a file something can
parse, so a log line never shares that stream — including the exclusion notice
below, which is still on the console and still in front of a human, just not
inside the data. Only `--format` ever writes to that stream: a file sink that
could also print is how one run put two documents on it.

The rendered badges are a description paragraph followed by shields.io badges
under one `###` heading per language. A run scoped to one project puts its own
`##` section heading above all of it, inside the markers, because that block
lands in a document somebody else wrote the rest of and `###` groups with
nothing above them would read as a continuation of whatever section came
before. A run measuring a whole repository renders none: that README titles the
section above the markers itself. Beyond the language groups there is also —
for a run that measured a declared input's size — a `Measured Targets` group
carrying each input's size under the compression it was measured with. That
group is how a project's README reports the size of what it ships; a run that
declared no such input renders no such group, which is why the whole-repository
report carries only its own `Repository Size`.

Spliced, the badges sit between two markers,
named `CODE_STATISTICS_START` and `CODE_STATISTICS_END` unless a configuration
renames them — as this example does, so that documenting the markers does not
make this document splice its own badges into the example:

```markdown
<!-- STATISTICS_START -->
<!-- STATISTICS_END -->
```

The block is appended when the markers are absent, and the file is created when
it does not exist. A markdown output's `write` function is the whole of that
customizable behavior — it both decides what the report says and where it
lands, in place of what used to be two separate `render` and `write`
callbacks — and leaving it unset keeps the built-in rendering and writing. See
[writing markdown](../codometer-configuration/README.md#writing-markdown).

### What codometer writes, it does not measure

Every file a run would write is left out of what it measures, and the run says
so on the console. No configuration, and no ignore-file entry: codometer knows
its own destinations.

A badge is an image inside a link, so a spliced block moves `markdown.images`,
`markdown.links`, and `markdown.lines`, which moves the badges, which moves the
counts. Left in, a written report would be stale the moment it landed. The
exclusion is applied identically whatever the flags say, so a run that writes
and a `--check reports` run always measure the same tree.

### The report

Codometer's own shape rather than any other tool's. Every metric carries its
value, and where something limits it, that limit's value, severity, and whether
it was breached — a limit that held is written out exactly like one that did
not, so a consumer can render the headroom rather than only the failures.

```json
{
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
          "instances": null,
          "limits": [],
          "name": "compiled.files",
          "path": "files",
          "unit": null,
          "value": 1
        },
        {
          "instances": null,
          "limits": [
            { "breached": true, "label": null, "severity": "warn", "value": 900 },
            { "breached": true, "label": "Bundle", "severity": "fail", "value": 1000 }
          ],
          "name": "compiled.size",
          "path": "size",
          "unit": "bytes",
          "value": 5195
        },
        {
          "instances": [
            { "file": "src/modules/codometer/codometer.service.ts", "line": 32, "measured": 9 }
          ],
          "limits": [
            { "breached": true, "label": null, "severity": "fail", "value": 0 }
          ],
          "name": "compiled.custom.Class Comment Budget",
          "path": "custom.Class Comment Budget",
          "unit": null,
          "value": 1
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
| `instances` | Where each instance a per-instance selector produced was found — a `comment` selector's breaches today. `null` for a metric that only counts, never an empty array standing in for it |
| `empty` | Said outright when a target's globs matched nothing |
| `failures` | Whatever the run could not do: a target that would not measure, a limit that bound to nothing |

**A `comment` selector's metric reports every breaching block, not the whole
selector's activity.** `value` is the count of blocks that broke the
selector's own `maximumCharacters`/`maximumLines`/`maximumWords`, and
`instances` names each one's `file` and 1-indexed `line` plus how much it
`measured`. A block that stayed within budget contributes to neither.

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
`nx run codometer-cli:start -- --check limits` gates the current directory
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
| Files | 42 |
| Calls traced | 176 |
| Call stacks | 12 |
| Deepest stack | 16 |
| Stacks through recursion | 1 |
| Unfollowable calls | 7 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 16 | declared |
| `maximumBreadth` | 11 | declared |

### Call stacks (depth)

**1. `MeasureCommand.run`** — depth ≥ 16 · decorated-method

```text
🚀 MeasureCommand.run(_passedParameters: string[], options: MeasureCommandOptions): Promise<void> [packages/codometer-cli/src/modules/measure/measure.command.ts:327]
   ↳ Measure the repository and produce every resolved output.
  └─> MeasureService.measure(args: MeasureArguments): MeasurementResult [packages/codometer-cli/src/modules/measure/measure.service.ts:367]
     ↳ Measure the codebase and every target declared alongside it.
    └─> MeasureService.measureDeclaredTargets(…): { failures: ReportFailure[]; targets: TargetMeasurement[]; } [packages/codometer-cli/src/modules/measure/measure.service.ts:266]
       ↳ Measure every declared target, keeping whatever the failures leave.
      └─> MeasureService.measureTarget(args: MeasureTargetArguments): TargetMeasurement [packages/codometer-cli/src/modules/measure/measure.service.ts:302]
         ↳ Measure one declared target with whichever analyses it asked for.
        └─> MeasureService.analyzeFiles(…): { documentation: CodometerCommentMeasurement[]; statistics: CodeStatisticsResult; } [packages/codometer-cli/src/modules/measure/measure.service.ts:75]
           ↳ Run every analyzer over one set of files and shape the result.
          └─> LanguagesService.analyze(args: AnalyzeLanguagesArguments): LanguageResults [packages/codometer-languages/src/modules/languages/languages.service.ts:56]
             ↳ Analyze every language present in the discovered files.
            └─> TypescriptService.analyze(input: TypescriptInput): TypescriptResult [packages/codometer-languages/src/modules/typescript/typescript.service.ts:451]
               ↳ Analyzes TypeScript and JavaScript source files and returns aggregated AST metrics.
              └─> TypescriptService.analyzeFile(args: AnalyzeTypescriptFileArguments): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:94]
                 ↳ Read one source file, count its lines and comments, and walk its AST.
                └─> TypescriptService.walkNode(node: tsCompiler.Node, context: TypescriptWalkContext): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:425]
                   ↳ Recursively visits each AST node and dispatches to the appropriate handler.
                  └─> TypescriptService.forEachChild(…)(child: tsCompiler.Node): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:438]
                    └─> TypescriptService.forEachChild(…)(child: tsCompiler.Node): void (cycle) [packages/codometer-languages/src/modules/typescript/typescript.service.ts:445]
                      └─> TypescriptService.collectDocumentation(node: tsCompiler.Node, context: TypescriptWalkContext): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:122]
                         ↳ Measure a documentable declaration's leading JSDoc comment, if it has one.
                        └─> DocumentationMeasurementService.measure(node: tsCompiler.Node, context: TypescriptWalkContext): CommentMeasurement[] [packages/codometer-languages/src/modules/typescript/documentation-measurement.service.ts:86]
                           ↳ Measures one declaration's leading JSDoc comment, if it has one.
                          └─> CommentsService.measureText(args: MeasureCommentTextArguments): CommentMeasurement[] [packages/codometer-languages/src/modules/comments/comments.service.ts:206]
                             ↳ Measures one comment's text against every maximum declared for it.
                            └─> CommentsService.declaredLimits(…): { limit: number; measured: number; unit: CodometerDocumentationUnit; }[] [packages/codometer-languages/src/modules/comments/comments.service.ts:58]
                               ↳ Every declared maximum, paired with what this comment measured.
                              └─> CommentsService.flatMap(…)(…): { limit: number; measured: number; unit: CodometerDocumentationUnit; }[] [packages/codometer-languages/src/modules/comments/comments.service.ts:84]
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
      └─> ConfigurationService.loadConfigurationFile(args?: LoadConfigurationArguments): Promise<LoadedConfiguration> [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:365]
         ↳ Loads a configuration and says which file answered.
        └─> ConfigurationService.resolveConfiguration(configuration: CodometerConfiguration): ResolvedCodometerConfiguration [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:388]
           ↳ Fills in every field a configuration file may leave out.
          └─> ConfigurationService.resolveLimits(limits: CodometerLimit[] | undefined): ResolvedCodometerLimit[] [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:270]
             ↳ Gives every limit its severity and a value read as a number.
            └─> ConfigurationService.map(…)(…): { label: string | undefined; metric: string; severity: CodometerSeverity; value: number; } [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:273]
              └─> ConfigurationService.parseLimitValue(limit: CodometerLimit): number [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:80]
                 ↳ Reads a limit's value, in decimal units when it was written as a string.
                └─> ConfigurationService.parseLimitValueText(metric: string, text: string): number [packages/codometer-configuration/src/modules/configuration/configuration.service.ts:100]
                   ↳ Reads a limit written as a string, unit and all.
                  └─> InvalidLimitValueError.constructor(metric: string, value: string): InvalidLimitValueError [packages/codometer-configuration/src/modules/configuration/configuration.constants.ts:496]
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
| `MeasureService.measureTarget` | 18 | `packages/codometer-discovery:modules/discovery`, `packages/codometer-discovery:modules/targets`, `packages/codometer-size:modules/size` | `packages/codometer-cli/src/modules/measure/measure.service.ts:302` |
| `MeasureService.analyzeFiles` | 16 | `packages/codometer-customization:modules/customization`, `packages/codometer-languages:modules/languages`, `packages/codometer-size:modules/size` | `packages/codometer-cli/src/modules/measure/measure.service.ts:75` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MeasureCommand.run` | 11 | `MeasureCommand.resolveWorkingDirectory`, `RunPlanService.selectMode`, `MeasureCommand.readConfiguration`, `RunPlanService.resolveDestinations`, `RunPlanService.listOutputPaths`, `MeasureCommand.announceOutputPaths`, `MeasureService.measure`, `ReportService.build`, `DeliveryService.deliver`, `RunPlanService.selectScope`, `MeasureCommand.reportFindings` | `packages/codometer-cli/src/modules/measure/measure.command.ts:327` |
| `MeasureService.measure` | 10 | `MeasureService.discoverCodebase`, `MeasureService.analyzeFiles`, `DiscoveryService.categorize`, `MeasureService.measureDeclaredTargets`, `MeasureService.attachTargetName`, `MetricIndexService.index`, `LimitsService.evaluate`, `MeasureService.flatMap(…)`, `MeasureService.map(…)`, `MeasureService.readLimitFailures` | `packages/codometer-cli/src/modules/measure/measure.service.ts:367` |
| `MeasureService.analyzeFiles` | 7 | `LanguagesService.analyze`, `CustomizationService.buildSymbolCounters`, `SizeService.analyze`, `CustomizationService.analyze`, `MeasureService.getFolderCount`, `MeasureService.buildJavascriptStatistics`, `MeasureService.buildTypescriptStatistics` | `packages/codometer-cli/src/modules/measure/measure.service.ts:75` |

<details>
<summary>67 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MeasureService.measureTarget` | 7 | `MeasureService.excludeOutputPaths`, `TargetsService.matchFiles`, `MeasureService.runsAnalysis`, `MeasureService.analyzeFiles`, `DiscoveryService.categorize`, `MeasureService.attachTargetName`, `SizeService.analyze` | `packages/codometer-cli/src/modules/measure/measure.service.ts:302` |
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
| `MeasureService.discoverCodebase` | 2 | `DiscoveryService.discoverFiles`, `MeasureService.excludeOutputPaths` | `packages/codometer-cli/src/modules/measure/measure.service.ts:210` |
| `MeasureService.measureDeclaredTargets` | 2 | `MeasureService.measureTarget`, `MeasureService.describeFailure` | `packages/codometer-cli/src/modules/measure/measure.service.ts:266` |
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
| `MeasureService.attachTargetName` | 1 | `MeasureService.map(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:144` |
| `MeasureService.excludeOutputPaths` | 1 | `MeasureService.filter(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:228` |
| `MeasureService.readLimitFailures` | 1 | `MeasureService.map(…)` | `packages/codometer-cli/src/modules/measure/measure.service.ts:338` |
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
  CommentsModule
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
  LanguagesModule --> CommentsModule
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
  TypescriptModule --> CommentsModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
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

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-8672-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-281.84_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-10-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-62-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-35.73_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-62-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-37-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-37-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-230-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-16-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-21-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-21-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-341-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-131-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-387-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-85-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-291-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-302-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-93-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-447-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-1004-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-173-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-36-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-114-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-95-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-9-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-36-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-154-dc2626?style=flat-square)
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
