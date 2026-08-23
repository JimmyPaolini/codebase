# 📝 Reporting

**Say what the codebase currently looks like, in markdown someone will read.**

Some questions about this repository are only worth answering as a report: what
the build weighs, how it moved since `main`, what is close to a limit. This is
the NestJS CLI that renders those reports, and splices each one into a document
between its own markers.

```bash
nx run reporting:start           # every report
nx run reporting:start:bundles   # just the bundle sizes report
```

It is the reporting counterpart to
[synchronization](../synchronization/README.md): that tool keeps derived files
derived, this one writes down what is currently true.

## Why it lives here

The reports are about _this_ workspace — the `applications`/`packages`/`tools`
layout, the `main` branch a baseline comes from, the Nx targets that produced
the measurements. Those are facts here rather than settings, so this is a
workspace tool and not a publishable package.

## Reports

| Report | Renders |
| ------ | ------- |
| `bundles` | 🎒 Bundles — what every built bundle weighs, how it moved against a baseline, and how much of its limit it uses |

### 🎒 Bundles

Reads the `codometer-report.json` each project's `codometer` target wrote and
compares it to a baseline snapshot of the same reports. It reads the JSON that
[codometer](../../packages/codometer-cli/README.md) writes — a file format, not
a dependency; nothing here imports it. Every metric denominated in bytes becomes
a row; every other metric a codometer report carries belongs to a different
report than this one.

The section reports every measured metric with its size, baseline size, byte and
percentage change, limit, and share of that limit; a per-project subtotal; a
headline total with a callout for whatever grew most; bundles that were not
rebuilt, at their baseline size, collapsed; and separate counts of bundles that
appeared or disappeared.

A row is marked ❌ when it breached a `fail` limit and ❗ when it breached a
`warn` one, so "close to full" is declared per project in the codometer
configuration rather than assumed by this renderer.

A metric may carry several limits — a `warn` short of a `fail` is the point of
the feature — so precedence is fixed rather than incidental. The **glyph** takes
the worst breach: a breached `fail` outranks a breached `warn`, which outranks
growth. The **`Limit` and `Used` columns** take the enforced limit, meaning
the lowest `fail` limit, or the lowest `warn` limit when nothing fails the
metric at all. So `Used` means the same thing on every row — the share of what
actually stops a change — while the advisory state is carried by the glyph. A
breached `warn` beneath a `fail` that held therefore reads as ❗ with the `fail`
limit still in the column: neither reads as passing, and neither reads as
failing. A target whose globs matched
nothing is marked ⁉️ — the report says an empty match outright, which is what
keeps it distinct from a target that genuinely measured zero bytes.

Comparing against a baseline lives here and not in codometer. Codometer is
stateless and measures only the tree in front of it; a baseline needs branches,
workflow artifacts, and pull request context, which are facts about this
repository rather than settings a measurement tool should carry.

Metrics join to their baseline on the metric's name, which codometer builds from
the target's name and the metric's path within it — both written in the
configuration, so the key is stable across runs. Totals only ever compare
metrics both sides measured. A renamed target is reported as one addition and
one removal rather than a saving, because counting the removal without its
replacement would invent a reduction that never happened.

Byte counts are Node-version dependent: the bundled zlib differs between
releases, so a baseline captured on one runtime and compared against a run on
another shifts every number. Neither the report nor this table records the
runtime — codometer's report deliberately holds nothing that varies between two
runs over the same tree, and this tool renders on the pull request runner rather
than the one that produced the baseline, so any version it stamped would be the
wrong one. CI uses the runtime `.nvmrc` pins on both sides, and the rendered
guidelines say so.

The same drift is why continuous integration never runs codometer's
`--check reports`: a report written on the pinned runtime and checked on any
other reads as stale when nothing changed. Staleness checking is for local use
on the pinned runtime, and project READMEs are written on the default branch
where that runtime is the only one in play.

## Options

| Flag | Does |
| ---- | ---- |
| `--baseline <dir>` | Directory holding a baseline snapshot to compare against |
| `--baseline-url <url>` | Run URL the baseline came from, linked from the headline |
| `--markdown <file>` | Splice the report into this document, between its markers |
| `--output <file>` | Write the report to this file on its own (single reports only) |

With no destination a report goes to standard output, which is what makes it
inspectable before it is wired into anything.

## Adding a report

1. Generate a module: `nx generate conformetry:nestjs-command-module --name=<report>`.
2. Have its command implement `ReportableCommand` from
   [`reporting.types.ts`](src/modules/reporting/reporting.types.ts): a label, a
   marker pair no other report claims, and `renderReport(options)` returning the
   body as markdown — heading included, markers excluded.
3. Provide `ReportingService` and `ReportingMarkersService` in the report's own
   module. They are stateless, and providing them there rather than importing
   the reporting module — which imports every report module — keeps the graph
   acyclic.
4. Register the command in `ReportingCommand.getReports()` and add a
   configuration for it to the `report` target.

Wrapping, splicing, destination handling, and option narrowing are all handled
for you. A report only has to gather its data and render markdown.

## Where reports end up

Splicing into a file is the whole of the output contract. Getting that markdown
in front of a reader — a pull request description, an issue, a wiki page — is
the caller's job, which keeps this tool independent of any one forge. 👷 Make
Projects fetches a pull request description, runs the bundles report against it,
and puts it back.

## Project Graph

Where this project sits in the Nx project graph: what it depends on, and what depends on it. Regenerated by `nx run synchronization:nx-project-graphs:write`.

<!-- nx-project-graph-start -->

```mermaid
flowchart LR
  logger["logger"]
  reporting["reporting"]
  reporting --> logger
  classDef subject stroke-width:3px
  class reporting subject
```

<!-- nx-project-graph-end -->

## Module Graph

The modules this project defines and the imports between them, published by `nx run synchronization:nestjs-module-graphs:write`.

<!-- nestjs-module-graph-start -->

```mermaid
flowchart LR
  subgraph group0["reporting"]
    BundleMarkdownModule
    BundlesModule
    MainModule
    ReportingModule
  end
  subgraph group1["logger"]
    LoggerModule([LoggerModule])
  end
  ConfigModule([ConfigModule])
  DiscoveryModule
  BundlesModule --> BundleMarkdownModule
  MainModule --> DiscoveryModule
  MainModule --> ReportingModule
  ReportingModule --> BundlesModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._

<!-- nestjs-module-graph-end -->

## Start

```bash
nx run reporting:start
```

## Test

```bash
nx run reporting:vitest
```

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `reporting`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 114 |
| Files | 22 |
| Calls traced | 145 |
| Call stacks | 17 |
| Deepest stack | 9 |
| Stacks through recursion | 0 |
| Unfollowable calls | 2 |

### Call stacks

**1. `BundlesCommand.run`** — depth 9 · decorated-method

```text
🚀 BundlesCommand.run(_passedParameters: string[], options: BundlesCommandOptions): Promise<void> [tools/reporting/src/modules/bundles/bundles.command.ts:111]
   ↳ Renders this report alone, to wherever the flags point.
  └─> ReportingService.emit(…): Promise<void> [tools/reporting/src/modules/reporting/reporting.service.ts:57]
     ↳ Renders one report and writes it wherever the destination says.
    └─> BundlesCommand.renderReport(options: ReportOptions): string [tools/reporting/src/modules/bundles/bundles.command.ts:92]
       ↳ Renders the report body from whatever the `codometer` target measured.
      └─> BundlesService.collect(args: CollectRowsArguments): MetricCollection [tools/reporting/src/modules/bundles/bundles.service.ts:289]
         ↳ Joins every current report to the baseline snapshot.
        └─> BundlesService.readReportPaths(args: CollectRowsArguments): string[] [tools/reporting/src/modules/bundles/bundles.service.ts:240]
           ↳ Lists every report path either side knows about, so a project the baseline measured is still accounted for when this…
          └─> LoggerService.debug(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:241]
             ↳ Logs a debug message at the `debug` level.
            └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Assembles the object pino merges into the line.
              └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:107]
                 ↳ Fails a malformed message in development, and never in production.
                └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:165]
                   ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

**2. `ReportingCommand.run`** — depth 9 · decorated-method

```text
🚀 ReportingCommand.run(_passedParameters: string[], options: ReportingCommandOptions): Promise<void> [tools/reporting/src/modules/reporting/reporting.command.ts:83]
   ↳ Render every report into the given destination.
  └─> ReportingService.emit(…): Promise<void> [tools/reporting/src/modules/reporting/reporting.service.ts:57]
     ↳ Renders one report and writes it wherever the destination says.
    └─> BundlesCommand.renderReport(options: ReportOptions): string [tools/reporting/src/modules/bundles/bundles.command.ts:92]
       ↳ Renders the report body from whatever the `codometer` target measured.
      └─> BundlesService.collect(args: CollectRowsArguments): MetricCollection [tools/reporting/src/modules/bundles/bundles.service.ts:289]
         ↳ Joins every current report to the baseline snapshot.
        └─> BundlesService.readReportPaths(args: CollectRowsArguments): string[] [tools/reporting/src/modules/bundles/bundles.service.ts:240]
           ↳ Lists every report path either side knows about, so a project the baseline measured is still accounted for when this…
          └─> LoggerService.debug(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:241]
             ↳ Logs a debug message at the `debug` level.
            └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:140]
               ↳ Assembles the object pino merges into the line.
              └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:107]
                 ↳ Fails a malformed message in development, and never in production.
                └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:165]
                   ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

**3. `BundlesService.collectProjectRows`** — depth 7 · orphan-root

```text
🚀 BundlesService.collectProjectRows(args: CollectProjectRowsArguments): MetricCollection [tools/reporting/src/modules/bundles/bundles.service.ts:110]
   ↳ Joins one project's current report to its baseline.
  └─> BundlesService.readBaseline(args: CollectProjectRowsArguments): Map<string, SizeMetric> [tools/reporting/src/modules/bundles/bundles.service.ts:154]
     ↳ Reads a baseline report into a name-to-metric lookup.
    └─> BundlesService.readReport(workingDirectory: string, reportPath: string): ProjectReport [tools/reporting/src/modules/bundles/bundles.service.ts:216]
       ↳ Parses a codometer report, tolerating an absent or malformed file.
      └─> LoggerService.warn(message: unknown, context?: string, data?: LogData): void [packages/logger/src/modules/logger/logger.service.ts:312]
         ↳ Logs a warning message at the `warn` level.
        └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Assembles the object pino merges into the line.
          └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:107]
             ↳ Fails a malformed message in development, and never in production.
            └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:165]
               ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

<details>
<summary>14 more call stacks</summary>

**4. `BundlesService.readSizeMetrics`** — depth 4 · orphan-root

```text
🚀 BundlesService.readSizeMetrics(target: ReportTarget): SizeMetric[] [tools/reporting/src/modules/bundles/bundles.service.ts:273]
   ↳ Pulls one target's byte-counting metrics out of the report.
  └─> BundlesService.map(…)(…): { breach: MetricSeverity | undefined; empty: boolean; label: string; limit: number | undefined; name: string; size: number; } [tools/reporting/src/modules/bundles/bundles.service.ts:276]
    └─> BundlesService.readBreach(limits: readonly ReportLimit[]): MetricSeverity | undefined [tools/reporting/src/modules/bundles/bundles.service.ts:175]
       ↳ The severity of the worst limit a metric breached, if it breached one.
      └─> BundlesService.filter(…)(…): boolean [tools/reporting/src/modules/bundles/bundles.service.ts:178]
```

**5. `BundleMarkdownService.renderRow`** — depth 3 · orphan-root

```text
🚀 BundleMarkdownService.renderRow(row: MetricRow): string [tools/reporting/src/modules/bundle-markdown/bundle-markdown.service.ts:298]
   ↳ Renders one table row.
  └─> BundleMarkdownService.readStatus(row: MetricRow): string [tools/reporting/src/modules/bundle-markdown/bundle-markdown.service.ts:200]
     ↳ Picks the status icon for one row of the measured table.
    └─> BundleMarkdownService.readGrowthStatus(row: MetricRow): string [tools/reporting/src/modules/bundle-markdown/bundle-markdown.service.ts:175]
       ↳ Picks the icon for a rebuilt bundle, from how far it moved.
```

**6. `BundlesCommand.parseBaseline`** — depth 2 · decorated-method

```text
🚀 BundlesCommand.parseBaseline(value: unknown): string | undefined [tools/reporting/src/modules/bundles/bundles.command.ts:56]
   ↳ Parse the baseline directory holding a snapshot of the reports.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**7. `BundlesCommand.parseBaselineUrl`** — depth 2 · decorated-method

```text
🚀 BundlesCommand.parseBaselineUrl(value: unknown): string | undefined [tools/reporting/src/modules/bundles/bundles.command.ts:65]
   ↳ Parse the run URL the baseline came from, linked from the headline.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**8. `BundlesCommand.parseMarkdown`** — depth 2 · decorated-method

```text
🚀 BundlesCommand.parseMarkdown(value: unknown): string | undefined [tools/reporting/src/modules/bundles/bundles.command.ts:74]
   ↳ Parse the markdown document the report is spliced into.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**9. `BundlesCommand.parseOutput`** — depth 2 · decorated-method

```text
🚀 BundlesCommand.parseOutput(value: unknown): string | undefined [tools/reporting/src/modules/bundles/bundles.command.ts:83]
   ↳ Parse the file the report is written to on its own.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**10. `ReportingCommand.parseBaseline`** — depth 2 · decorated-method

```text
🚀 ReportingCommand.parseBaseline(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.command.ts:56]
   ↳ Parse the baseline directory holding a snapshot to compare against.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**11. `ReportingCommand.parseBaselineUrl`** — depth 2 · decorated-method

```text
🚀 ReportingCommand.parseBaselineUrl(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.command.ts:65]
   ↳ Parse the run URL the baseline came from.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**12. `ReportingCommand.parseMarkdown`** — depth 2 · decorated-method

```text
🚀 ReportingCommand.parseMarkdown(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.command.ts:74]
   ↳ Parse the markdown document every report is spliced into.
  └─> ReportingService.readOptionalText(value: unknown): string | undefined [tools/reporting/src/modules/reporting/reporting.service.ts:108]
     ↳ Narrows an option that carries text, or nothing at all.
```

**13. `main`** — depth ≥ 2 · module-bootstrap

```text
🚀 main(): Promise<void> [tools/reporting/src/main.ts:9]
   ↳ Bootstraps the bundle sizes CLI application.
  └─> LoggerService.constructor(): LoggerService [packages/logger/src/modules/logger/logger.service.ts:38]
```

**14. `ReportingService.constructor`** — depth 2 · orphan-root

```text
🚀 ReportingService.constructor(…): ReportingService [tools/reporting/src/modules/reporting/reporting.service.ts:27]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:297]
     ↳ Sets the context label included in every subsequent log line.
```

**15. `BundlesService.constructor`** — depth 2 · orphan-root

```text
🚀 BundlesService.constructor(logger: LoggerService): BundlesService [tools/reporting/src/modules/bundles/bundles.service.ts:49]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:297]
     ↳ Sets the context label included in every subsequent log line.
```

**16. `BundlesCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 BundlesCommand.constructor(…): BundlesCommand [tools/reporting/src/modules/bundles/bundles.command.ts:33]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:297]
     ↳ Sets the context label included in every subsequent log line.
```

**17. `ReportingCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 ReportingCommand.constructor(…): ReportingCommand [tools/reporting/src/modules/reporting/reporting.command.ts:33]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:297]
     ↳ Sets the context label included in every subsequent log line.
```

</details>

### Module spread

None.

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3768-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-129.53_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-6-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-34-3178c6?style=flat-square)

### TypeScript & JavaScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-34-3178c6?style=flat-square)
![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-10-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-13-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-10-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-194-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-99-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-258-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-35-059669?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-17-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-221-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-136-0284c7?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-19-db2777?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-48-ea580c?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-101-6366f1?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-164-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-402-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

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

![JSON Files](https://img.shields.io/badge/JSON_Files-3-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-104-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-27-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-8-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-71-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-52-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-6-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-20-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-94-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-6-ea580c?style=flat-square)

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

![Module Files](https://img.shields.io/badge/Module_Files-4-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-4-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-2-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-3-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-3-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-1-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-0-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-9-7c3aed?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-0284c7?style=flat-square)
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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-279-1f6feb?style=flat-square)
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
![Inline Code](https://img.shields.io/badge/Inline_Code-80-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
