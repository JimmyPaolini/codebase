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
that neither writes nor compares. With nothing named anywhere — no flag, no
configured destination — the badges go to the console, which is what a bare
`codometer` does.

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
under one `###` heading per language. Spliced, they sit between two markers:

```markdown
<!-- CODE_STATISTICS_START -->
<!-- CODE_STATISTICS_END -->
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
deliberately: the `fail` limit is the ceiling that stops a change, and a
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

Where this project sits in the Nx project graph: what it depends on, and what depends on it. Regenerated by `nx run synchronization:synchronize --configuration=write`.

<!-- nx-project-graph-start -->

```mermaid
flowchart LR
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  logger["logger"]
  codometer_cli --> codometer_configuration
  codometer_cli --> logger
  classDef subject stroke-width:3px
  class codometer_cli subject
```

<!-- nx-project-graph-end -->

## Module Graph

The modules this project defines and the imports between them, regenerated by `nx run synchronization:synchronize --configuration=write`.

<!-- nestjs-module-graph-start -->

```mermaid
flowchart LR
  subgraph group0["codometer-cli"]
    CodometerModule
    CssModule
    CustomStatisticsModule
    FileDiscoveryModule
    HclModule
    JsonModule
    JupyterModule
    LanguagesModule
    LimitsModule
    MainModule
    MarkdownModule
    OutputJsonModule
    OutputMarkdownModule
    PythonModule
    ReportModule
    ShellModule
    SizeAnalysisModule
    SqlModule
    TargetsModule
    TomlModule
    TypescriptModule
    YamlModule
  end
  subgraph group1["codometer-configuration"]
    ConfigurationModule
  end
  subgraph group2["logger"]
    LoggerModule([LoggerModule])
  end
  ConfigModule([ConfigModule])
  DiscoveryModule
  CodometerModule --> ConfigurationModule
  CodometerModule --> CustomStatisticsModule
  CodometerModule --> FileDiscoveryModule
  CodometerModule --> LanguagesModule
  CodometerModule --> LimitsModule
  CodometerModule --> OutputJsonModule
  CodometerModule --> OutputMarkdownModule
  CodometerModule --> ReportModule
  CodometerModule --> SizeAnalysisModule
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
  MainModule --> CodometerModule
  MainModule --> ConfigurationModule
  MainModule --> CustomStatisticsModule
  MainModule --> DiscoveryModule
  MainModule --> FileDiscoveryModule
  MainModule --> LanguagesModule
  MainModule --> OutputJsonModule
  MainModule --> OutputMarkdownModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._

<!-- nestjs-module-graph-end -->

## Packages

| Package | Role |
| ------- | ---- |
| [`@codometer/cli`](README.md) | Measures the repository and writes the reports. Knows nothing about any particular repository |
| [`@codometer/configuration`](../codometer-configuration/README.md) | Reads `codometer.config.ts` and resolves exclusions, output destinations, custom statistics, and the Python interpreter |

Which paths to skip, where the output goes, and how Python is reached are all
configuration. That split is what lets the CLI be a general tool rather than
one repository's script.

## Contributing

```bash
nx run codometer-cli:start -- --directory .   # Run the CLI from source
nx run codometer-cli:vitest                   # Test
nx run codometer-cli:build                    # Compile
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `codometer-cli`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 313 |
| Files | 104 |
| Calls traced | 491 |
| Call stacks | 11 |
| Deepest stack | 13 |
| Stacks through recursion | 1 |
| Unfollowable calls | 11 |

### Call stacks

**1. `CodometerCommand.run`** — depth ≥ 13 · decorated-method

```text
🚀 CodometerCommand.run(_passedParameters: string[], options: CodometerCommandOptions): Promise<void> [packages/codometer-cli/src/modules/codometer/codometer.command.ts:393]
   ↳ Measure the repository and produce every resolved output.
  └─> CodometerService.measure(args: MeasureArguments): MeasurementResult [packages/codometer-cli/src/modules/codometer/codometer.service.ts:332]
     ↳ Measure the codebase and every target declared alongside it.
    └─> CodometerService.measureDeclaredTargets(…): { failures: ReportFailure[]; targets: TargetMeasurement[]; } [packages/codometer-cli/src/modules/codometer/codometer.service.ts:236]
       ↳ Measure every declared target, keeping whatever the failures leave.
      └─> CodometerService.measureTarget(args: MeasureTargetArguments): TargetMeasurement [packages/codometer-cli/src/modules/codometer/codometer.service.ts:272]
         ↳ Measure one declared target with whichever analyses it asked for.
        └─> CodometerService.analyzeLanguage(args: AnalyzeLanguageArguments): CodeStatisticsResult [packages/codometer-cli/src/modules/codometer/codometer.service.ts:62]
           ↳ Run every language analyzer over one target's files.
          └─> LanguagesService.analyze(args: AnalyzeLanguagesArguments): LanguageResults [packages/codometer-cli/src/modules/languages/languages.service.ts:54]
             ↳ Analyze every language present in the discovered files.
            └─> JupyterService.analyze(args: AnalyzeJupyterArguments): JupyterResult [packages/codometer-cli/src/modules/jupyter/jupyter.service.ts:166]
               ↳ Analyze the given notebooks, resolved against the directory.
              └─> JsonService.analyze(input: JsonInput): JsonResult [packages/codometer-cli/src/modules/json/json.service.ts:304]
                 ↳ Analyze JSON files and return structural metrics for their contents.
                └─> JsonService.countArrayNode(node: unknown[], stats: JsonResult, depth: number): void (cycle) [packages/codometer-cli/src/modules/json/json.service.ts:89]
                   ↳ Count array nodes and their child values.
                  └─> JsonService.countNode(node: unknown, stats: JsonResult, depth: number): void (cycle) [packages/codometer-cli/src/modules/json/json.service.ts:105]
                     ↳ Recursively count JSON containers, primitives, and nesting depth.
                    └─> JsonService.countRecordNode(node: Record<string, unknown>, stats: JsonResult, depth: number): void (cycle) [packages/codometer-cli/src/modules/json/json.service.ts:156]
                       ↳ Count object nodes and their child values.
                      └─> JsonService.countPrimitiveNode(node: unknown, stats: JsonResult, depth: number): void [packages/codometer-cli/src/modules/json/json.service.ts:120]
                         ↳ Count scalar values and update primitive stats.
                        └─> JsonService.countPrimitiveValue(node: unknown, stats: JsonResult): void [packages/codometer-cli/src/modules/json/json.service.ts:137]
                           ↳ Increment stats for a scalar JSON value.
```

**2. `OutputMarkdownService.renderBadges`** — depth 6 · orphan-root

```text
🚀 OutputMarkdownService.renderBadges(args: RenderBadgesArguments): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:217]
   ↳ Render the badge block for a destination, description and all.
  └─> OutputMarkdownService.renderDocument(args: RenderDocumentArguments): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:243]
     ↳ Render the badges as a document of their own.
    └─> OutputMarkdownService.buildBadgeGroups(statistics: CodeStatisticsResult): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:86]
       ↳ Assemble the badge groups, in the order they are rendered.
      └─> buildRepositoryGroup(statistics: CodeStatisticsResult): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.utilities.ts:204]
         ↳ Renders the Repository badge group.
        └─> buildBadge(label: string, value: number | string, color: string): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.utilities.ts:11]
           ↳ Build a single shields.io badge markdown image.
          └─> encodeValue(input: number | string): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.utilities.ts:322]
             ↳ Encode a value so it can safely appear in a badge URL.
```

**3. `TypescriptService.handleEnum`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleEnum(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:250]
   ↳ Increments enum and exported counts for an enum declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:346]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:352]
```

<details>
<summary>8 more call stacks</summary>

**4. `TypescriptService.handleFunction`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleFunction(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:256]
   ↳ Increments function, method, async, sync, exported, and generic counts for a function node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:346]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:352]
```

**5. `TypescriptService.handleInterface`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleInterface(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:290]
   ↳ Increments interface, exported, and generic counts for an interface declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:346]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:352]
```

**6. `TypescriptService.handleMethodOrAccessor`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleMethodOrAccessor(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:300]
   ↳ Increments method and async or sync counts for a method or accessor node.
  └─> TypescriptService.hasAsyncKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:334]
     ↳ Returns true when the node has an async modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.AsyncKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:340]
```

**7. `TypescriptService.handleTypeAlias`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleTypeAlias(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:313]
   ↳ Increments exported and generic counts for a type alias declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:346]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:352]
```

**8. `TypescriptService.handleVariable`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleVariable(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-cli/src/modules/typescript/typescript.service.ts:322]
   ↳ Increments constant and exported counts for a const variable statement.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-cli/src/modules/typescript/typescript.service.ts:346]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-cli/src/modules/typescript/typescript.service.ts:352]
```

**9. `OutputMarkdownService.syncAnchoredBlock`** — depth ≥ 3 · orphan-root

```text
🚀 OutputMarkdownService.syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:163]
   ↳ Splice the anchored block into a file, or report whether it is current.
  └─> OutputMarkdownService.buildBlockRegex(args: { endMarker: string; startMarker: string; }): RegExp [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:109]
     ↳ Build the matcher for a block delimited by the configured markers.
    └─> OutputMarkdownService.escapeRegex(input: string): string [packages/codometer-cli/src/modules/output-markdown/output-markdown.service.ts:121]
       ↳ Escape a configured marker so it can be searched for literally.
```

**10. `main`** — depth ≥ 2 · module-bootstrap

```text
🚀 main(): Promise<void> [packages/codometer-cli/src/main.ts:17]
   ↳ Bootstraps the codometer CLI command application.
  └─> LoggerService.logToStandardError(): void [packages/logger/src/modules/logger/logger.service.ts:202]
     ↳ Sends every subsequent line to standard error instead of standard output.
```

**11. `CodometerCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 CodometerCommand.constructor(…): CodometerCommand [packages/codometer-cli/src/modules/codometer/codometer.command.ts:38]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:285]
     ↳ Sets the context label included in every subsequent log line.
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `CodometerService.measureTarget` | 17 | `codometer-cli:modules/file-discovery`, `codometer-cli:modules/size-analysis`, `codometer-cli:modules/targets` | `packages/codometer-cli/src/modules/codometer/codometer.service.ts:272` |
| `LanguagesService.analyze` | 12 | `codometer-cli:modules/css`, `codometer-cli:modules/hcl`, `codometer-cli:modules/json`, `codometer-cli:modules/jupyter`, `codometer-cli:modules/markdown`, `codometer-cli:modules/python`, `codometer-cli:modules/shell`, `codometer-cli:modules/sql`, `codometer-cli:modules/toml`, `codometer-cli:modules/typescript`, `codometer-cli:modules/yaml` | `packages/codometer-cli/src/modules/languages/languages.service.ts:54` |

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
