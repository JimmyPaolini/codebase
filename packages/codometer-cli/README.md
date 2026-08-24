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
| `--json [path]` | The report goes here; the console when the path is omitted |
| `-m, --markdown [path]` | The rendered badges go here as a whole document; the console when the path is omitted |
| `--readme <path>` | Markdown file the badge block is spliced into, between its markers |
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

Three sinks, none of which implies another:

| Sink | Flag | What lands there |
| ---- | ---- | ---------------- |
| Report | `--json [path]` | The structured report below |
| Document | `-m, --markdown [path]` | The rendered badges as a whole file |
| Splice | `--readme <path>` | The badge block, between two markers in a file somebody else wrote |

A sink whose path is omitted goes to the console, and so does any sink on a run
that neither writes nor compares — except the report, whose path is refused
outright on such a run rather than quietly diverted. With nothing named anywhere
— no flag, no configured destination — the badges go to the console, which is
what a bare `codometer` does.

**`--json <path>` is refused unless the run writes or compares it.** The path
names a file, and a run doing neither would render the report to the console and
leave that file unwritten — which is not noticed here at all, but downstream, by
whatever reads the report finding nothing and reporting a project that changed
nothing. The command line is refused before anything is measured, naming the
flag to add. A pathless `--json` is untouched: the console is what it asked for.

**A named destination stands for all of them.** `--json` on its own asks for
the report and nothing else, whatever the configuration file also describes.
Adding to the configured set instead would put a second document on the stream
the first one was piped out of.

**Standard output carries the result; every diagnostic goes to standard error.**
`codometer --json > report.json` has to produce a file something can parse, so a
log line never shares that stream — including the exclusion notice below, which
is still on the console and still in front of a human, just not inside the data.

**The splice sink's path is never defaulted.** Splicing rewrites a file
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

## Project Graph

Where this project sits in the Nx project graph: what it depends on, and what depends on it. Regenerated by `nx run synchronization:nx-project-graphs:write`.

<!-- nx-project-graph-start -->

```mermaid
flowchart LR
  codometer_changes["codometer-changes"]
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_customization["codometer-customization"]
  codometer_discovery["codometer-discovery"]
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
  classDef subject stroke-width:3px
  class codometer_cli subject
```

<!-- nx-project-graph-end -->

## Module Graph

The modules this project defines and the imports between them, published by `nx run synchronization:nestjs-module-graphs:write`.

<!-- nestjs-module-graph-start -->

```mermaid
flowchart LR
  subgraph group0["codometer-cli"]
    ChangesModule
    CodometerModule
    LimitsModule
    MainModule
    ReportModule
  end
  subgraph group1["codometer-configuration"]
    ConfigurationModule
  end
  subgraph group2["codometer-customization"]
    CustomizationModule
  end
  subgraph group3["codometer-discovery"]
    TargetsModule
  end
  subgraph group4["codometer-languages"]
    CssModule
    HclModule
    JupyterModule
    LanguagesModule
    PythonModule
    ShellModule
    SqlModule
    TomlModule
    TypescriptModule
    YamlModule
  end
  subgraph group5["codometer-output"]
    DocumentsModule
    JsonModule
    MarkdownModule
    RenderModule
  end
  subgraph group6["codometer-size"]
    SizeModule
  end
  subgraph group7["logger"]
    LoggerModule([LoggerModule])
  end
  ConfigModule([ConfigModule])
  DiscoveryModule
  ChangesModule --> ChangesModule
  ChangesModule --> DocumentsModule
  ChangesModule --> RenderModule
  CodometerModule --> ConfigurationModule
  CodometerModule --> CustomizationModule
  CodometerModule --> DiscoveryModule
  CodometerModule --> JsonModule
  CodometerModule --> LanguagesModule
  CodometerModule --> LimitsModule
  CodometerModule --> MarkdownModule
  CodometerModule --> ReportModule
  CodometerModule --> SizeModule
  CodometerModule --> TargetsModule
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
  MainModule --> CodometerModule
  MainModule --> ConfigurationModule
  MainModule --> CustomizationModule
  MainModule --> DiscoveryModule
  MainModule --> DiscoveryModule
  MainModule --> JsonModule
  MainModule --> LanguagesModule
  MainModule --> MarkdownModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._

_Loaded at runtime rather than imported, and so absent from this container: codometer-changes._

<!-- nestjs-module-graph-end -->

## Packages

| Package | Role |
| ------- | ---- |
| [`@codometer/cli`](README.md) | Measures the repository and writes the reports. Knows nothing about any particular repository |
| [`@codometer/configuration`](../codometer-configuration/README.md) | Reads `codometer.config.ts` and resolves exclusions, output destinations, custom statistics, and the Python interpreter |

Which paths to skip, where the output goes, and how Python is reached are all
configuration. That split is what lets the CLI be a general tool rather than
one repository's script.

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

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `codometer-cli`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 105 |
| Files | 31 |
| Calls traced | 128 |
| Call stacks | 8 |
| Deepest stack | 13 |
| Stacks through recursion | 1 |
| Unfollowable calls | 4 |

### Call stacks (depth)

**1. `CodometerCommand.run`** — depth ≥ 13 · decorated-method

```text
🚀 CodometerCommand.run(_passedParameters: string[], options: CodometerCommandOptions): Promise<void> [packages/codometer-cli/src/modules/codometer/codometer.command.ts:452]
   ↳ Measure the repository and produce every resolved output.
  └─> CodometerService.measure(args: MeasureArguments): MeasurementResult [packages/codometer-cli/src/modules/codometer/codometer.service.ts:315]
     ↳ Measure the codebase and every target declared alongside it.
    └─> CodometerService.measureDeclaredTargets(…): { failures: ReportFailure[]; targets: TargetMeasurement[]; } [packages/codometer-cli/src/modules/codometer/codometer.service.ts:219]
       ↳ Measure every declared target, keeping whatever the failures leave.
      └─> CodometerService.measureTarget(args: MeasureTargetArguments): TargetMeasurement [packages/codometer-cli/src/modules/codometer/codometer.service.ts:255]
         ↳ Measure one declared target with whichever analyses it asked for.
        └─> CodometerService.analyzeLanguage(args: AnalyzeLanguageArguments): CodeStatisticsResult [packages/codometer-cli/src/modules/codometer/codometer.service.ts:58]
           ↳ Run every language analyzer over one target's files.
          └─> LanguagesService.analyze(args: AnalyzeLanguagesArguments): LanguageResults [packages/codometer-languages/src/modules/languages/languages.service.ts:54]
             ↳ Analyze every language present in the discovered files.
            └─> JupyterService.analyze(args: AnalyzeJupyterArguments): JupyterResult [packages/codometer-languages/src/modules/jupyter/jupyter.service.ts:166]
               ↳ Analyze the given notebooks, resolved against the directory.
              └─> JsonService.analyze(input: JsonInput): JsonResult [packages/codometer-languages/src/modules/json/json.service.ts:310]
                 ↳ Analyze JSON files and return structural metrics for their contents.
                └─> JsonService.countNode(node: unknown, stats: JsonResult, depth: number): void (cycle) [packages/codometer-languages/src/modules/json/json.service.ts:111]
                   ↳ Recursively count JSON containers, primitives, and nesting depth.
                  └─> JsonService.countArrayNode(node: unknown[], stats: JsonResult, depth: number): void (cycle) [packages/codometer-languages/src/modules/json/json.service.ts:95]
                     ↳ Count array nodes and their child values.
                    └─> JsonService.countRecordNode(node: Record<string, unknown>, stats: JsonResult, depth: number): void (cycle) [packages/codometer-languages/src/modules/json/json.service.ts:162]
                       ↳ Count object nodes and their child values.
                      └─> JsonService.countPrimitiveNode(node: unknown, stats: JsonResult, depth: number): void [packages/codometer-languages/src/modules/json/json.service.ts:126]
                         ↳ Count scalar values and update primitive stats.
                        └─> JsonService.countPrimitiveValue(node: unknown, stats: JsonResult): void [packages/codometer-languages/src/modules/json/json.service.ts:143]
                           ↳ Increment stats for a scalar JSON value.
```

**2. `ChangesCommand.run`** — depth ≥ 4 · decorated-method

```text
🚀 ChangesCommand.run(_passedParameters: string[], options: ChangesCommandOptions): Promise<void> [packages/codometer-cli/src/modules/changes/changes.command.ts:107]
   ↳ Diffs every project's report against the baseline, and emits the result.
  └─> ChangesService.collect(args: CollectRowsArguments): MetricCollection [packages/codometer-changes/src/modules/changes/changes.service.ts:289]
     ↳ Joins every current report to the baseline snapshot.
    └─> ChangesService.readReportPaths(args: CollectRowsArguments): string[] [packages/codometer-changes/src/modules/changes/changes.service.ts:264]
       ↳ Lists every report path either side knows about, so a project the baseline measured is still accounted for when this…
      └─> ChangesService.flatMap(…)(this: undefined, pattern: string): string[] [packages/codometer-changes/src/modules/changes/changes.service.ts:266]
```

**3. `ChangesCommand.parseBaseline`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseBaseline(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:62]
   ↳ Parse the baseline directory holding a snapshot of the reports.
  └─> ChangesCommand.readOptionalText(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:55]
     ↳ Narrows an option that carries text, or nothing at all.
```

<details>
<summary>5 more call stacks</summary>

**4. `ChangesCommand.parseBaselineUrl`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseBaselineUrl(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:71]
   ↳ Parse the run URL the baseline came from, linked from the summary.
  └─> ChangesCommand.readOptionalText(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:55]
     ↳ Narrows an option that carries text, or nothing at all.
```

**5. `ChangesCommand.parseDirectory`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseDirectory(value: unknown): string [packages/codometer-cli/src/modules/changes/changes.command.ts:80]
   ↳ Parse the directory to look for codometer reports in.
  └─> ChangesCommand.readOptionalText(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:55]
     ↳ Narrows an option that carries text, or nothing at all.
```

**6. `ChangesCommand.parseMarkdown`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseMarkdown(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:89]
   ↳ Parse the markdown document the report is spliced into.
  └─> ChangesCommand.readOptionalText(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:55]
     ↳ Narrows an option that carries text, or nothing at all.
```

**7. `ChangesCommand.parseOutput`** — depth 2 · decorated-method

```text
🚀 ChangesCommand.parseOutput(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:98]
   ↳ Parse the file the report is written to on its own.
  └─> ChangesCommand.readOptionalText(value: unknown): string | undefined [packages/codometer-cli/src/modules/changes/changes.command.ts:55]
     ↳ Narrows an option that carries text, or nothing at all.
```

**8. `main`** — depth 2 · module-bootstrap

```text
🚀 main(): Promise<void> [packages/codometer-cli/src/main.ts:18]
   ↳ Bootstraps the codometer CLI command application.
  └─> withDefaultCommand(argv: readonly string[]): string[] [packages/codometer-cli/src/main.utilities.ts:13]
     ↳ Inserts the default `codometer` subcommand when the command line names neither it nor `changes`. `codometer`'s…
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `CodometerService.measureTarget` | 17 | `codometer-discovery:modules/discovery`, `codometer-discovery:modules/targets`, `codometer-size:modules/size` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:255` |
| `CodometerService.analyzeLanguage` | 15 | `codometer-customization:modules/customization`, `codometer-languages:modules/languages`, `codometer-size:modules/size` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:58` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CodometerCommand.run` | 11 | `CodometerCommand.resolveWorkingDirectory`, `RunPlanService.selectMode`, `CodometerCommand.readConfiguration`, `RunPlanService.resolveDestinations`, `RunPlanService.listOutputPaths`, `CodometerCommand.announceOutputPaths`, `CodometerService.measure`, `ReportService.build`, `CodometerCommand.deliver`, `RunPlanService.selectScope`, `CodometerCommand.reportFindings` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:452` |
| `CodometerService.measure` | 8 | `CodometerService.discoverCodebase`, `CodometerService.analyzeLanguage`, `DiscoveryService.categorize`, `CodometerService.measureDeclaredTargets`, `MetricIndexService.index`, `LimitsService.evaluate`, `CodometerService.map(…)`, `CodometerService.readLimitFailures` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:315` |
| `CodometerService.analyzeLanguage` | 7 | `LanguagesService.analyze`, `CustomizationService.buildSymbolCounters`, `SizeService.analyze`, `CustomizationService.analyze`, `CodometerService.getFolderCount`, `CodometerService.buildJavascriptStatistics`, `CodometerService.buildTypescriptStatistics` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:58` |

<details>
<summary>44 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CodometerService.measureTarget` | 6 | `CodometerService.excludeOutputPaths`, `TargetsService.matchFiles`, `CodometerService.runsAnalysis`, `CodometerService.analyzeLanguage`, `DiscoveryService.categorize`, `SizeService.analyze` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:255` |
| `LimitsService.resolve` | 5 | `LimitsService.findCandidates`, `UnboundMetricError.constructor`, `LimitsService.describeTargets`, `LimitsService.map(…)`, `EmptyTargetError.constructor` | `packages/codometer-cli/src/modules/limits/limits.service.ts:154` |
| `ChangesCommand.run` | 4 | `ChangesCommand.readOptionalText`, `ChangesService.collect`, `RenderService.renderSection`, `DocumentsService.emit` | `packages/codometer-cli/src/modules/changes/changes.command.ts:107` |
| `RunPlanService.readCheckNames` | 4 | `RunPlanService.describeAcceptedCheckNames`, `RunPlanService.filter(…)`, `RunPlanService.map(…)`, `RunPlanService.validateCheckNames` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:80` |
| `RunPlanService.resolveDestinations` | 4 | `RunPlanService.namesDestination`, `RunPlanService.resolveJson`, `RunPlanService.resolveMarkdown`, `RunPlanService.resolveReadme` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:308` |
| `CodometerCommand.deliverMarkdown` | 4 | `MarkdownService.renderDocument`, `CodometerCommand.readTargetSizes`, `CodometerCommand.touchesFiles`, `MarkdownService.syncDocument` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:125` |
| `CodometerCommand.deliverReadme` | 4 | `CodometerCommand.readTargetSizes`, `CodometerCommand.touchesFiles`, `MarkdownService.renderBlock`, `MarkdownService.sync` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:157` |
| `CodometerCommand.reportFindings` | 4 | `CodometerCommand.reportFailures`, `CodometerCommand.reportStaleness`, `CodometerCommand.reportBreaches`, `CodometerCommand.filter(…)` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:293` |
| `LimitsService.findDefaultCandidate` | 3 | `UnboundMetricError.constructor`, `LimitsService.describeTargets`, `LimitsService.bind` | `packages/codometer-cli/src/modules/limits/limits.service.ts:122` |
| `ReportService.buildMetrics` | 3 | `ReportService.buildMetricName`, `ReportService.map(…)`, `ReportService.readUnit` | `packages/codometer-cli/src/modules/report/report.service.ts:52` |
| `CodometerCommand.deliver` | 3 | `CodometerCommand.deliverJson`, `CodometerCommand.deliverMarkdown`, `CodometerCommand.deliverReadme` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:85` |
| `CodometerCommand.deliverJson` | 3 | `CodometerCommand.touchesFiles`, `JsonService.render`, `JsonService.sync` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:96` |
| `CodometerCommand.reportBreaches` | 3 | `CodometerCommand.filter(…)`, `CodometerCommand.filter(…)`, `CodometerCommand.filter(…)` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:249` |
| `LimitsService.findCandidates` | 2 | `LimitsService.bind`, `LimitsService.findDefaultCandidate` | `packages/codometer-cli/src/modules/limits/limits.service.ts:84` |
| `LimitsService.evaluate` | 2 | `LimitsService.resolve`, `LimitsService.describeFailure` | `packages/codometer-cli/src/modules/limits/limits.service.ts:198` |
| `MetricIndexService.buildTargetIndex` | 2 | `MetricIndexService.addMetric`, `MetricIndexService.indexLanguage` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:66` |
| `MetricIndexService.indexCounters` | 2 | `MetricIndexService.addMetric`, `MetricIndexService.isCounterGroup` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:101` |
| `MetricIndexService.indexLanguage` | 2 | `MetricIndexService.indexCounters`, `MetricIndexService.addMetric` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:125` |
| `MetricIndexService.index` | 2 | `MetricIndexService.describeDuplicate`, `MetricIndexService.buildTargetIndex` | `packages/codometer-cli/src/modules/limits/metric-index.service.ts:157` |
| `ReportService.build` | 2 | `ReportService.indexLimits`, `ReportService.buildMetrics` | `packages/codometer-cli/src/modules/report/report.service.ts:120` |
| `CodometerService.discoverCodebase` | 2 | `DiscoveryService.discoverFiles`, `CodometerService.excludeOutputPaths` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:163` |
| `CodometerService.measureDeclaredTargets` | 2 | `CodometerService.measureTarget`, `CodometerService.describeFailure` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:219` |
| `RunPlanService.resolveJson` | 2 | `RunPlanService.resolvePath`, `RunPlanService.readPathFlag` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:161` |
| `RunPlanService.listOutputPaths` | 2 | `RunPlanService.map(…)`, `RunPlanService.filter(…)` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:284` |
| `RunPlanService.selectMode` | 2 | `RunPlanService.readCheckNames`, `RunPlanService.requireWrittenReport` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:338` |
| `ChangesCommand.parseBaseline` | 1 | `ChangesCommand.readOptionalText` | `packages/codometer-cli/src/modules/changes/changes.command.ts:62` |
| `ChangesCommand.parseBaselineUrl` | 1 | `ChangesCommand.readOptionalText` | `packages/codometer-cli/src/modules/changes/changes.command.ts:71` |
| `ChangesCommand.parseDirectory` | 1 | `ChangesCommand.readOptionalText` | `packages/codometer-cli/src/modules/changes/changes.command.ts:80` |
| `ChangesCommand.parseMarkdown` | 1 | `ChangesCommand.readOptionalText` | `packages/codometer-cli/src/modules/changes/changes.command.ts:89` |
| `ChangesCommand.parseOutput` | 1 | `ChangesCommand.readOptionalText` | `packages/codometer-cli/src/modules/changes/changes.command.ts:98` |
| `LimitsService.bind` | 1 | `UnboundMetricError.constructor` | `packages/codometer-cli/src/modules/limits/limits.service.ts:39` |
| `LimitsService.describeTargets` | 1 | `LimitsService.map(…)` | `packages/codometer-cli/src/modules/limits/limits.service.ts:70` |
| `ReportService.indexLimits` | 1 | `ReportService.buildMetricName` | `packages/codometer-cli/src/modules/report/report.service.ts:87` |
| `CodometerService.excludeOutputPaths` | 1 | `CodometerService.filter(…)` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:181` |
| `CodometerService.readLimitFailures` | 1 | `CodometerService.map(…)` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:286` |
| `RunPlanService.describeAcceptedCheckNames` | 1 | `RunPlanService.map(…)` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:53` |
| `RunPlanService.resolveMarkdown` | 1 | `RunPlanService.resolvePath` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:191` |
| `RunPlanService.resolveReadme` | 1 | `RunPlanService.resolvePath` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:230` |
| `RunPlanService.validateCheckNames` | 1 | `RunPlanService.describeAcceptedCheckNames` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:259` |
| `RunPlanService.selectScope` | 1 | `RunPlanService.some(…)` | `packages/codometer-cli/src/modules/codometer/run-plan.service.ts:367` |
| `CodometerCommand.readConfiguration` | 1 | `ConfigurationService.loadConfiguration` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:197` |
| `CodometerCommand.readTargetSizes` | 1 | `CodometerCommand.flatMap(…)` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:234` |
| `CodometerCommand.resolveWorkingDirectory` | 1 | `CodometerCommand.parseDirectory` | `packages/codometer-cli/src/modules/codometer/codometer.command.ts:325` |
| `main` | 1 | `withDefaultCommand` | `packages/codometer-cli/src/main.ts:18` |

</details>

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-17366-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-540.64_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-25-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-150-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-81.56_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-148-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-85-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-63-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-445-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-1-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-35-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-28-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-54-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-664-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-276-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-846-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-94-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-776-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-668-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-245-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-920-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-1678-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-4-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-79-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-2-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-6-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-1-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-6-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-1-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-1-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-167-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-36-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-113-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-92-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-32-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-149-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-23-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-24-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-2-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-23-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-24-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-5-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-29-7c3aed?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-5-0284c7?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-1-16a34a?style=flat-square)

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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-336-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-15-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-52-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-28-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-14-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-79-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
