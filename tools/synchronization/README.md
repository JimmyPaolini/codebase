# ↔️ Synchronization

**Keep the derived files derived.**

Some files in this workspace are not really written — they are copies of, or
tables generated from, something else. The generator table in `AGENTS.md` comes
from the conformetry configuration. The cloud devcontainer shares most of its
fields with the local one. The PR template appears verbatim inside a skill.

Every one of those is a place where two files can quietly disagree.
Synchronization is the NestJS CLI that regenerates them, and the CI check that
fails when someone edits the copy instead of the source.

## Usage

Every synchronization command is its own Nx target on this project, run
directly rather than through a shared aggregate — the same way
[`codebase:codometer`](../../packages/codometer-cli/README.md) and
[`codebase:callidescope`](../../packages/callidescope-cli/README.md) are named
by their own callers instead of looping through one process:

```bash
nx run synchronization:conformetry-generators          # check (the default)
nx run synchronization:conformetry-generators:write     # regenerate
```

Every command runs in one of two modes:

| Mode    | Does                                                           |
| ------- | -------------------------------------------------------------- |
| `check` | Compares, writes nothing, exits non-zero on drift. The default |
| `write` | Regenerates the derived file from its source                   |

`start` runs every synchronization command in one process instead of one at a
time — the only target that does. No workflow or `lint-staged` pattern names
it; it exists purely for a human at a terminal who wants to check or write
everything in one command:

```bash
nx run synchronization:start          # check every synchronization
nx run synchronization:start:write    # write every synchronization
```

## Where each synchronization's drift is answered

Which runs check which synchronization is a property of the caller, not a
taxonomy the commands declare about themselves. Six of the seven — every one
except `nestjs-module-graphs` and `pull-request-labels` — are **derivations**:
committed files derived from configuration a pull request can also change, so
`check` runs on a pull request and `write` runs on the default branch's
release. The [🧑‍💻 Lint Codebase](../../.github/workflows/lint-codebase.yml)
workflow and
[`configuration/lint-staged.config.ts`](../../configuration/lint-staged.config.ts)
each name every derivation target directly alongside `lint-codebase` in one
`nx affected` invocation, rather than reaching them through
[`lint-codebase`](../../AGENTS.md#code-quality)'s `dependsOn` — Nx forwards an
explicit configuration down `dependsOn`, so an edge there would let
`lint-codebase --configuration=write` publish from a branch.

`nestjs-module-graphs` is a **report**: its diagram moves whenever any module
gains or loses an import, so gating a pull request on its freshness would fail
branches for being behind `main` rather than for anything they did — the same
trap [codometer](../../packages/codometer-cli/README.md) and
[callidescope](../../packages/callidescope-cli/README.md) publish on `main` to
avoid. Nothing checks it on a pull request; the release workflow runs its
`write` configuration directly.

`pull-request-labels` needs credentials: its destination is GitHub's label set
rather than a file in the tree, so reaching it needs a token that neither a
fork nor a developer's `lint-codebase` run has. It must not run in
`lint-codebase`, and it must not wait for the default branch either — a change
introducing a new scope needs that scope's label to exist before 🧾 Validate
Pull Request Metadata runs on the very same pull request. So the one caller
holding a token, [validate-conventions.yml](../../.github/workflows/validate-conventions.yml),
runs its `write` mode directly through `node` rather than through this Nx
target, on `opened`/`reopened`, and nothing else names it.

## What it synchronizes

| Command                      | Source                                   | Destination                                                                                           |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `conformetry-generators`     | `configuration/conformetry.config.ts`    | The generator table in `AGENTS.md`, between marker comments                                           |
| `conventional-config`        | `configuration/conventional.config.cjs`  | The commit type and scope tables, commitlint, and release configuration                               |
| `devcontainer-configuration` | `.devcontainer/local/devcontainer.json`  | The shared fields of `.devcontainer/cloud/devcontainer.json`                                          |
| `nestjs-module-graphs`       | The NestJS container each project builds | The mermaid module graph in that project's `AGENTS.md` and `README.md`. A report, published on `main` |
| `nx-project-graphs`          | The Nx project graph                     | The mermaid project graph in every project's `README.md`                                              |
| `pull-request-labels`        | `configuration/conventional.config.cjs`  | This repository's `type:`, `scope:`, and `source:` labels on GitHub. Needs credentials                |
| `pull-request-template`      | `.github/PULL_REQUEST_TEMPLATE.md`       | The template embedded in the PR skill files                                                           |
| `skill-exclusions`           | `skills-lock.json`                       | The installed-skill exclusion lists in five ignore files                                              |

### Module graphs

`nestjs-module-graphs` finds every project tagged `framework:nestjs`, explores
the container it builds with
[nestjs-spelunker](https://github.com/jmcdo29/nestjs-spelunker), and writes a
mermaid diagram into that project's `AGENTS.md` and `README.md`.

The container is built in NestJS **preview mode**, which registers every module
and provider without instantiating any of them. That is what makes exploring
safe from a workstation or from CI: `lexico-ingestion` builds its
`TypeOrmModule.forRootAsync` options without a database ever being contacted.
Loading the module files is still a real import, though, so a project that
cannot be imported at all fails this command rather than being skipped.

An application is rooted in its `src/main.module.ts`. A library package has
nothing to bootstrap, so it is rooted in a `SyntheticRootModule` importing
every module it defines — along with a global `ConfigModule`, without which a
package that reads configuration in a `useFactory` cannot be scanned at all.
Both are kept out of the diagram, as are the `ConfigHostModule` and
`TypeOrmCoreModule` that NestJS builds underneath a `forRoot`: they are
implementation details of a dynamic module rather than anything a project
designs. `TypeOrmModule` itself stays.

Two more things are left out, for a reason worth knowing when the diagram looks
sparser than the code reads. `explore` reports the container's view rather than
the decorators', so a `@Global()` module — `LoggerModule`, or a global
`ConfigModule` — is listed as an import of _every_ module in the project. Drawn
literally, one of those contributes an edge per module and buries everything
worth reading, so a module that every other module imports is treated as
ambient: its edges are dropped and it is kept as a node on its own. Nothing a
project actually designs comes close to that threshold.

Modules are grouped by the project that defines them. Ownership is decided by
name, which needs several rules because names collide: the graphed project wins
outright (every application defines a `MainModule`); a name NestJS itself
exports is credited to nobody, because a name cannot distinguish
`@nestjs/core`'s module from a workspace one; otherwise the project's own
source settles it, since two packages here define a `ConfigurationModule` and
the import statement says which one was taken; and a name reached transitively
falls back to its only definition.

None of that consults the Nx project graph. A diagram of imports is derived
from the imports — the source of the project being graphed, and its manifest —
so the two graphs are independent readings of the same workspace rather than
one deriving from the other.

Where a name would otherwise be genuinely ambiguous in a single container —
`conformetry-cli` imports `@nestjs/core`'s `DiscoveryModule` and
`@conformetry/configuration`'s in the same application — the fix is to rename
the module rather than to guess. Spelunker reports modules by name, so two
different modules sharing one would collapse into a single node no rule can
separate.

### When the two graphs disagree

A project dependency can be real and still contribute no module, so the module
graph names those below the diagram rather than leaving a reader to wonder why
the two disagree. It distinguishes the two reasons, because it can tell them
apart from the source: a dependency every import of which is an `import type`
declares no module by nature — `conformetry-json` takes `ConformetryError` from
`@conformetry/core` and nothing else — while one the manifest declares but the
source never imports is reached at runtime, which is how
`conformetry-validation` loads its language packages through
`LazyModuleLoader`.

A module loaded at runtime is inferred rather than left to prose, in the way
Nx infers a runtime dependency between projects: a module named as a string
literal is evidence of a dependency the container cannot show, so
`conformetry-validation`'s `LANGUAGE_PACKAGES` table turns into six dotted
edges to the validator modules it loads. A name is only believed when exactly
one project in the workspace defines it — every application defines a
`MainModule`, and this command's own constants name one, so an ambiguous name
buys nothing.

Type-only dependencies have no equivalent, because there is no module to infer.
`conformetry-json` takes `ConformetryError` from `@conformetry/core` — an
interface, not a module — and nothing is registered in any container as a
result. Importing `ErrorsModule` to draw the edge would create a runtime
dependency the code does not have and enlarge every validator package's
container to make a diagram look tidier. The note is the honest answer; the
edge would be a fiction.

The reverse also happens and is equally correct: the module graph reaches
transitively, so it can show a module from a project the one-hop project graph
does not list.

A target file that exists but has no marker comments counts as drift. Which
files a project must keep is conformetry's rule rather than this command's:
the markers live in the NestJS project templates, so validation fails a project
whose `README.md` or `AGENTS.md` has dropped them.

### Project graphs

`nx-project-graphs` is the level above. It reads the Nx project graph once and
writes each project's own neighborhood into its `README.md`: what it depends
on, and what depends on it. One hop in each direction is deliberate — a
project's README should say what it needs and who would break if it changed,
not redraw the workspace.

A dependency Nx inferred from an import is drawn solid, and one declared in
configuration alone is drawn dotted. A project connected to nothing gets a
sentence saying so rather than a diagram of one box.

This one covers every project, not only the NestJS ones, so its markers live in
all four project templates — `jupyter-notebook-application` as well as the
three NestJS ones. The projects no template governs (`lexico`,
`lexico-components`, `lexico-entities`, and `logger`) still get a graph; there
is simply no template to fail them if they drop the block.

### Pull request labels

`pull-request-labels` is the odd one out: its destination is GitHub rather than
a file. It reads `configuration/conventional.config.cjs` and reconciles the
repository's labels against it — every `type:<name>`, every lowercased
`scope:<name>`, and the three `do-not-merge`, `source:agent`, and
`source:human` labels that no configuration derives. It creates what is missing
and edits whatever color or description drifted.

It never deletes. A label the configuration dropped may still be on open pull
requests, and removing it there loses information no run can put back, so a
stale `type:`, `scope:`, or `source:` label is reported with the
`gh label delete` command that would remove it, for a human to decide on. This
repository has one standing already, which is why "nothing needed creating or
updating" is said explicitly rather than inferred from an empty report — the
report is never fully empty even on a perfectly reconciled run.

It also always succeeds. A missing label is a fact about the repository under
review rather than a defect in the pull request, and a `gh` that is absent,
read-only on a fork, or rate-limited is an environment rather than an answer —
both are warnings, so this can never be why a pull request goes red. Reads and
writes both go through the `gh` client, which already resolves the repository
from the checkout and the token from the environment.

Run it on its own through its own Nx target:

```bash
nx run synchronization:pull-request-labels:write
```

## Why callers name targets directly

Every synchronization command used to be selected through a shared aggregate's
`--kinds` flag, so a caller asked for a set of kinds rather than for the
commands it actually wanted. That flag needed a taxonomy describing which
commands each caller wanted, and the taxonomy kept stretching every time a new
caller's requirements did not fit the existing values.

Each command is its own Nx target instead, run directly the way
[`codebase:codometer`](../../packages/codometer-cli/README.md) and
[`codebase:callidescope`](../../packages/callidescope-cli/README.md) are named
by their own callers. Which commands a caller wants is a property of the
caller — the list of `--target` flags it passes — rather than something the
commands declare about themselves centrally. Each target declares its own
sources as `inputs`, so `nx affected` only reruns it when a file it actually
reads has changed, and each caller decides for itself which targets belong in
which invocation:

- [🧑‍💻 Lint Codebase](../../.github/workflows/lint-codebase.yml) and
  [`configuration/lint-staged.config.ts`](../../configuration/lint-staged.config.ts)
  each name every derivation target directly alongside `lint-codebase` in one
  `nx affected` invocation, so a pull request and a commit both check drift.
- The release workflow runs every derivation's `write` configuration together
  with `nestjs-module-graphs:write` through `nx run-many`, so one command still
  publishes everything.
- [validate-conventions.yml](../../.github/workflows/validate-conventions.yml)
  runs `pull-request-labels write` directly through `node`, bypassing Nx
  entirely, since it is the one caller with a token and needs no project graph.

None of these callers reach for `start`. `SynchronizationCommand` still exists
and still loops over every command in one process — that part of the old
design was never the problem, and Nx's own `run-many` gives no way to run a
plain Node command with no target of its own — but nothing selects a subset
through it, so it needs no taxonomy: `start` always means all of them.

One gap the commit path cannot close. `affected` selects this project from the
staged paths, and no derivation target's `inputs` globs `package.json` — so a
commit staging only a manifest changes the Nx project graph, drifts
`nx-project-graphs`, and never selects it. The pull request catches that,
resolving `affected` against the merge base rather than a staged path list.
Conformetry answers the same problem by running unscoped on every commit; these
targets stay scoped, because removing that scope would put every
synchronization in every commit path.

## Adding a synchronizer

1. Generate a module: `nx g conformetry:nestjs-command-module --name=<domain> --project=synchronization`
2. Implement `SynchronizableCommand` — a `synchronizationLabel` and a
   `synchronize(mode)` returning whether the destination was already current.
3. Add a top-level target for it in `project.json`, with `check`/`write`
   configurations and its own source paths as `inputs`, the same shape as the
   existing eight. That target is the whole declaration of where the command
   runs: name it directly wherever it belongs — `lint-codebase`'s dependents
   for a derivation, the release workflow's `run-many` for a report, or a
   caller with its own credentials for anything needing them.
4. Register the command in `SynchronizationCommand.getCommands()`, and import
   its module in `SynchronizationModule`, so `start` still drives it alongside
   every other synchronization.

## Start

```bash
nx run synchronization:start
```

## Test

```bash
nx run synchronization:vitest
```

## Development

```bash
nx run synchronization:repl
nx run synchronization:lint-codebase --configuration=write
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `synchronization`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 310 |
| Files | 60 |
| Calls traced | 331 |
| Call stacks | 15 |
| Deepest stack | 10 |
| Stacks through recursion | 0 |
| Unfollowable calls | 12 |

### Call stacks (depth)

**1. `SynchronizationCommand.run`** — depth ≥ 10 · decorated-method

```text
🚀 SynchronizationCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/synchronization/synchronization.command.ts:115]
   ↳ Runs every synchronization, exiting once if any reported drift.
  └─> SynchronizationCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/synchronization/synchronization.command.ts:137]
     ↳ Runs every synchronization and reports whether all succeeded.
    └─> ConventionalConfigCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70]
       ↳ Synchronizes conventional-commit config and reports success without exiting.
      └─> ConventionalConfigService.runSynchronization(mode: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240]
         ↳ Runs the workflow in check or write mode, reporting whether it succeeded.
        └─> ConventionalConfigService.handleCheckMode(context: SyncContext): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126]
           ↳ Check mode: validates all configuration files are in sync with conventional.config.cjs, reporting success rather than…
          └─> ConventionalConfigValidatorsService.checkAllSkillsSync(config: ConventionalConfig, skillFiles: string[]): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155]
             ↳ Validates that every configured skill file has synchronized type/scope tables.
            └─> ConventionalConfigValidatorsService.checkSkillSync(config: ConventionalConfig, skillFile: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293]
               ↳ Validates a skill file's type/scope markdown tables against source config.
              └─> ConventionalConfigValidatorsService.checkMarkerSync(…): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41]
                 ↳ Checks that a named marker block in a skill file matches the source config values.
                └─> ConventionalConfigValidatorsService.readMarkerValues(…): { skillValues: string[]; } | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76]
                   ↳ Extracts and returns parsed table values from a named marker block, or undefined if missing.
                  └─> ConventionalConfigIoService.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:127]
                     ↳ Extracts text content between named HTML comment markers.
```

**2. `ConventionalConfigCommand.run`** — depth 9 · decorated-method

```text
🚀 ConventionalConfigCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:51]
   ↳ Runs the conventional-config sync command, delegating to helpers and exiting 1 on drift.
  └─> ConventionalConfigCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70]
     ↳ Synchronizes conventional-commit config and reports success without exiting.
    └─> ConventionalConfigService.runSynchronization(mode: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240]
       ↳ Runs the workflow in check or write mode, reporting whether it succeeded.
      └─> ConventionalConfigService.handleCheckMode(context: SyncContext): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126]
         ↳ Check mode: validates all configuration files are in sync with conventional.config.cjs, reporting success rather than…
        └─> ConventionalConfigValidatorsService.checkAllSkillsSync(config: ConventionalConfig, skillFiles: string[]): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155]
           ↳ Validates that every configured skill file has synchronized type/scope tables.
          └─> ConventionalConfigValidatorsService.checkSkillSync(config: ConventionalConfig, skillFile: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293]
             ↳ Validates a skill file's type/scope markdown tables against source config.
            └─> ConventionalConfigValidatorsService.checkMarkerSync(…): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41]
               ↳ Checks that a named marker block in a skill file matches the source config values.
              └─> ConventionalConfigValidatorsService.readMarkerValues(…): { skillValues: string[]; } | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76]
                 ↳ Extracts and returns parsed table values from a named marker block, or undefined if missing.
                └─> ConventionalConfigIoService.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:127]
                   ↳ Extracts text content between named HTML comment markers.
```

**3. `NestjsModuleGraphsCommand.run`** — depth ≥ 8 · decorated-method

```text
🚀 NestjsModuleGraphsCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:173]
   ↳ Runs the nestjs-module-graphs sync command in check or write mode.
  └─> NestjsModuleGraphsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:192]
     ↳ Synchronizes every project's module graph and reports success without exiting.
    └─> NestjsModuleGraphsService.indexModuleOwners(projects: NestjsProject[]): NestjsModuleOwnership [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:253]
       ↳ Maps every module class in the workspace to the project that defines it.
      └─> NestjsModuleGraphsService.map(…)(project: NestjsProject): [string, NestjsProjectImports] [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:281]
        └─> NestjsModuleGraphsImportsService.readProjectImports(…): NestjsProjectImports [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:178]
           ↳ Reads which workspace projects one project reaches, and how.
          └─> NestjsModuleGraphsImportsService.readFileImports(…): void [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:83]
             ↳ Records what one file's static imports say about the workspace.
            └─> NestjsModuleGraphsImportsService.readImportedModuleNames(clause: string): string[] [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:113]
               ↳ Names the modules a named-import clause brings in.
              └─> NestjsModuleGraphsImportsService.filter(…)(name: string | undefined): name is string [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:118]
```

<details>
<summary>12 more call stacks</summary>

**4. `NxProjectGraphsCommand.run`** — depth 7 · decorated-method

```text
🚀 NxProjectGraphsCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:150]
   ↳ Runs the nx-project-graphs sync command in check or write mode.
  └─> NxProjectGraphsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:169]
     ↳ Synchronizes every project's graph and reports success without exiting.
    └─> NxProjectGraphsCommand.synchronizeProject(…): boolean [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:116]
       ↳ Checks or rewrites one project's README graph block.
      └─> NxProjectGraphsCommand.applyMode(…): boolean [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:64]
         ↳ Reports drift in check mode, or rewrites the block in write mode.
        └─> SynchronizationMarkersService.replaceContent(content: string, markerName: string, replacement: string): string [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:65]
           ↳ Replaces the content between the markers, surrounding it with the blank lines markdown needs for the block to be parsed…
          └─> SynchronizationMarkersService.locateMarkers(…): { endIndex: number; startIndex: number; } | undefined [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:24]
             ↳ Returns the index range the markers enclose, or undefined when absent.
            └─> SynchronizationMarkersService.getStartMarker(markerName: string): string [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:57]
               ↳ Renders the opening marker comment for a marker name.
```

**5. `PullRequestLabelsCommand.run`** — depth 7 · decorated-method

```text
🚀 PullRequestLabelsCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:281]
   ↳ Runs the pull-request-labels reconciliation in check or write mode.
  └─> PullRequestLabelsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:300]
     ↳ Reconciles the label vocabulary and always reports success.
    └─> PullRequestLabelsCommand.reconcile(mode: SynchronizationMode, reportLines: string[]): void [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:175]
       ↳ Reconciles the vocabulary, appending everything it did to the report.
      └─> PullRequestLabelsService.planReconciliation(…): LabelReconciliationPlan [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:66]
         ↳ Works out what reconciling would create, update, and leave behind.
        └─> PullRequestLabelsService.filter(…)(label: ConventionalLabel): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:82]
          └─> PullRequestLabelsService.isTrackedLabel(labelName: string): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:45]
             ↳ Whether this reconciliation owns the label with this name.
            └─> PullRequestLabelsService.some(…)(prefix: string): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:46]
```

**6. `ConformetryGeneratorsCommand.run`** — depth ≥ 6 · decorated-method

```text
🚀 ConformetryGeneratorsCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:176]
   ↳ Runs the conformetry-generators sync command in check or write mode.
  └─> ConformetryGeneratorsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:194]
     ↳ Synchronizes the generators table and reports success without exiting.
    └─> ConformetryGeneratorsCommand.readGenerators(): Promise<ConformetryGeneratorMetadata[]> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:136]
       ↳ Reads configuration/conformetry.config.ts and returns the list of generator metadata.
      └─> ConfigurationService.loadConformetryConfiguration(configurationPath: string): Promise<ConformetryConfiguration> [packages/conformetry-configuration/src/modules/configuration/configuration.service.ts:172]
         ↳ Loads, validates, and normalizes a conformetry configuration file.
        └─> ConfigurationService.resolveConfigurationPath(configurationPath: string): Promise<string> [packages/conformetry-configuration/src/modules/configuration/configuration.service.ts:138]
           ↳ Resolves a config path against the cwd, falling back to the workspace root.
          └─> ConfigurationService.findWorkspaceRoot(): Promise<string | undefined> [packages/conformetry-configuration/src/modules/configuration/configuration.service.ts:77]
             ↳ Walks upward from the process cwd looking for the workspace manifest.
```

**7. `PullRequestTemplateCommand.run`** — depth 6 · decorated-method

```text
🚀 PullRequestTemplateCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:202]
   ↳ Runs the pull-request-template sync command in check or write mode.
  └─> PullRequestTemplateCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:221]
     ↳ Synchronizes the PR template and reports success without exiting.
    └─> PullRequestTemplateCommand.handleWriteMode(templateContent: string, targetFiles: string[]): void [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:129]
       ↳ Writes the current PR template into any target files that are out of sync.
      └─> PullRequestTemplateCommand.filter(…)(targetFile: string): boolean [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:134]
        └─> PullRequestTemplateCommand.checkTargetSync(templateContent: string, targetFile: string): boolean [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:55]
           ↳ Checks whether the target file's marker block matches the current PR template.
          └─> PullRequestTemplateCommand.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:90]
             ↳ Extracts the content between start and end marker comments from a file.
```

**8. `SkillExclusionsCommand.run`** — depth 6 · decorated-method

```text
🚀 SkillExclusionsCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:165]
   ↳ Runs the skill-exclusions sync command in check or write mode.
  └─> SkillExclusionsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:180]
     ↳ Synchronizes the exclusion lists and reports success without exiting.
    └─> SkillExclusionsCommand.findStaleFiles(skillNames: string[]): string[] [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:71]
       ↳ Every file whose generated block differs from what the lockfile implies.
      └─> SkillExclusionsCommand.filter(…)(file: SkillExclusionFile): boolean [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:72]
        └─> SkillExclusionsCommand.readExclusionFile(…): { afterMarker: string; beforeMarker: string; generatedContent: string; } [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:82]
           ↳ Splits one exclusion file around its generated block.
          └─> SkillExclusionsCommand.renderStartMarker(file: SkillExclusionFile): string [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:139]
             ↳ The comment opening this file's generated block, in its own syntax.
```

**9. `IssueLabelsCommand.run`** — depth 5 · decorated-method

```text
🚀 IssueLabelsCommand.run(): Promise<void> [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:158]
   ↳ Adds whichever type and scope labels the issue's body implies.
  └─> IssueLabelsCommand.resolvePlan(): undefined | { issueNumber: string; missingLabels: string[]; } [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:130]
     ↳ What this run needs to do, or `undefined` when there is nothing to add.
    └─> IssueLabelsCommand.readExistingLabelNames(): string[] [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:94]
       ↳ Reads the labels already on the issue, from `ISSUE_LABELS`.
      └─> IssueLabelsCommand.readLabelNames(entries: unknown[]): string[] [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:118]
         ↳ Every label name in this array, with the nameless entries dropped.
        └─> IssueLabelsCommand.filter(…)(name: string): boolean [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:121]
```

**10. `DevcontainerConfigurationCommand.run`** — depth 5 · decorated-method

```text
🚀 DevcontainerConfigurationCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:266]
   ↳ Runs the devcontainer-configuration sync command in check or write mode.
  └─> DevcontainerConfigurationCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:285]
     ↳ Synchronizes the cloud devcontainer config and reports success without exiting.
    └─> DevcontainerConfigurationCommand.applySync(…): DevcontainerConfiguration [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:59]
       ↳ Merges local devcontainer fields into a copy of the cloud config, preserving cloud-only keys.
      └─> DevcontainerConfigurationCommand.syncFeatures(…): void [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:180]
         ↳ Merges features from local and cloud configs, keeping Docker features from cloud.
        └─> DevcontainerConfigurationCommand.isDockerFeatureKey(key: string): boolean [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:127]
           ↳ Returns true if the feature key refers to a Docker-in-Docker or Docker-outside-of-Docker feature.
```

**11. `IssueLabelsCommand.nameOf`** — depth 2 · orphan-root

```text
🚀 IssueLabelsCommand.nameOf(entry: unknown): string [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:82]
   ↳ Reads one label entry's name, whichever shape it arrived in.
  └─> IssueLabelsCommand.isRecord(value: unknown): value is Record<string, unknown> [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:77]
     ↳ Whether this value can be read by property name at all.
```

**12. `NestjsModuleGraphsGraphService.compareGroups`** — depth 2 · orphan-root

```text
🚀 NestjsModuleGraphsGraphService.compareGroups(…): number [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:79]
   ↳ Orders the graphed project first, other projects next, ungrouped last.
  └─> NestjsModuleGraphsGraphService.rankGroup(group: NestjsModuleGraphGroup, projectName: string): number [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:210]
     ↳ Ranks a group into the graphed project, another project, or ungrouped.
```

**13. `NestjsModuleGraphsService.loadModuleClasses`** — depth ≥ 2 · orphan-root

```text
🚀 NestjsModuleGraphsService.loadModuleClasses(file: string): Promise<Type<unknown>[]> [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:96]
   ↳ Imports a module file and returns every module class it exports.
  └─> NestjsModuleGraphsService.map(…)(…): Type<unknown> [tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:107]
```

**14. `NxProjectGraphsService.renderEdge`** — depth 2 · orphan-root

```text
🚀 NxProjectGraphsService.renderEdge(edge: NxProjectGraphEdge): string [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:50]
   ↳ Renders one edge, dotted when Nx inferred it from configuration.
  └─> NxProjectGraphsService.toNodeIdentifier(projectName: string): string [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:62]
     ↳ Turns a project name into an identifier mermaid accepts.
```

**15. `NxProjectGraphsService.renderNode`** — depth 2 · orphan-root

```text
🚀 NxProjectGraphsService.renderNode(projectName: string): string [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:57]
   ↳ Declares one node, labelled with the project name it stands for.
  └─> NxProjectGraphsService.toNodeIdentifier(projectName: string): string [tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:62]
     ↳ Turns a project name into an identifier mermaid accepts.
```

</details>

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `SynchronizationCommand.synchronize` | 11 | `SynchronizationCommand.getCommands`, `ConformetryGeneratorsCommand.synchronize`, `ConventionalConfigCommand.synchronize`, `DevcontainerConfigurationCommand.synchronize`, `NestjsModuleGraphsCommand.synchronize`, `NxProjectGraphsCommand.synchronize`, `PullRequestLabelsCommand.synchronize`, `PullRequestTemplateCommand.synchronize`, `SkillExclusionsCommand.synchronize`, `SynchronizationCommand.reportResults`, `SynchronizationCommand.every(…)` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:137` |
| `NestjsModuleGraphsGraphService.buildGraph` | 10 | `NestjsModuleGraphsGraphService.findAmbientModuleNames`, `NestjsModuleGraphsGraphService.collectEdges`, `NestjsModuleGraphsGraphService.findRuntimeEdges`, `NestjsModuleGraphsGraphService.sortNames`, `NestjsModuleGraphsGraphService.groupModuleNames`, `NestjsModuleGraphsGraphService.findAbsentDependencyNames`, `NestjsModuleGraphsGraphService.toSorted(…)`, `NestjsModuleGraphsGraphService.filter(…)`, `NestjsModuleGraphsGraphService.filter(…)`, `NestjsModuleGraphsGraphService.filter(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:265` |
| `PullRequestLabelsCommand.reconcile` | 9 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure`, `PullRequestLabelsService.planReconciliation`, `PullRequestLabelsService.parseRepositoryLabels`, `PullRequestLabelsService.readExpectedLabels`, `PullRequestLabelsCommand.describeError`, `PullRequestLabelsCommand.reportPlan`, `PullRequestLabelsCommand.reportStaleLabels` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:175` |

<details>
<summary>124 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ConventionalConfigService.handleCheckMode` | 8 | `ConventionalConfigValidatorsService.checkSettingsSync`, `ConventionalConfigValidatorsService.checkAllSkillsSync`, `ConventionalConfigValidatorsService.checkAllTemplatesSync`, `ConventionalConfigService.loadReleaseConfig`, `ConventionalConfigValidatorsService.checkReleaseRulesSync`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigValidatorsService.checkPresetConfigSync`, `ConventionalConfigIoService.getPresetConfigTypes` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126` |
| `NxProjectGraphsService.buildNeighborhoods` | 8 | `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.collectEdges`, `NxProjectGraphsService.sortNames`, `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.filter(…)`, `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.filter(…)`, `NxProjectGraphsService.toSorted(…)` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:74` |
| `ConventionalConfigService.handleWriteMode` | 7 | `ConventionalConfigValidatorsService.checkSettingsSync`, `ConventionalConfigService.filter(…)`, `ConventionalConfigService.filter(…)`, `ConventionalConfigIoService.writeSettingsSync`, `ConventionalConfigIoService.writeSkillSync`, `ConventionalConfigIoService.writeIssueTemplateSync`, `ConventionalConfigService.syncReleaseConfigIfNeeded` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:182` |
| `ConventionalConfigIoService.writeReleaseConfigSync` | 6 | `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.filter(…)`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigIoService.getPresetConfigTypes`, `ConventionalConfigIoService.appendToReleaseRules`, `ConventionalConfigIoService.appendToPresetTypes` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:290` |
| `ConventionalConfigService.runSynchronization` | 6 | `ConventionalConfigService.loadConventionalConfig`, `ConventionalConfigService.map(…)`, `ConventionalConfigIoService.parseSettingsScopes`, `ConventionalConfigService.map(…)`, `ConventionalConfigService.handleCheckMode`, `ConventionalConfigService.handleWriteMode` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240` |
| `PullRequestLabelsService.planReconciliation` | 6 | `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.filter(…)`, `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.filter(…)`, `PullRequestLabelsService.filter(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:66` |
| `ConventionalConfigService.syncReleaseConfigIfNeeded` | 5 | `ConventionalConfigService.loadReleaseConfig`, `ConventionalConfigService.filter(…)`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigIoService.getPresetConfigTypes`, `ConventionalConfigIoService.writeReleaseConfigSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:93` |
| `NestjsModuleGraphsImportsService.readProjectImports` | 5 | `NestjsModuleGraphsImportsService.findSourceFiles`, `NestjsModuleGraphsImportsService.readRuntimeModuleEdges`, `NestjsModuleGraphsImportsService.readFileImports`, `NestjsModuleGraphsImportsService.readDeclaredProjects`, `NestjsModuleGraphsImportsService.filter(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:178` |
| `NestjsModuleGraphsService.indexModuleOwners` | 5 | `NestjsModuleGraphsService.findModuleFiles`, `NestjsModuleGraphsService.readModuleClassNames`, `NestjsModuleGraphsImportsService.readProjectNamesByPackage`, `NestjsModuleGraphsService.readFrameworkModuleNames`, `NestjsModuleGraphsService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:253` |
| `NxProjectGraphsService.renderMermaid` | 5 | `NxProjectGraphsService.sortNames`, `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.toNodeIdentifier`, `NxProjectGraphsService.some(…)` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:153` |
| `NxProjectGraphsCommand.synchronize` | 5 | `NxProjectGraphsService.readProjectGraph`, `NxProjectGraphsService.readProjects`, `NxProjectGraphsService.buildNeighborhoods`, `NxProjectGraphsCommand.synchronizeProject`, `NxProjectGraphsCommand.reportResults` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:169` |
| `SynchronizationCommand.reportResults` | 5 | `SynchronizationCommand.filter(…)`, `SynchronizationCommand.map(…)`, `SynchronizationCommand.filter(…)`, `SynchronizationCommand.map(…)`, `SynchronizationCommand.filter(…)` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:84` |
| `IssueLabelsCommand.resolvePlan` | 4 | `IssueLabelsCommand.readIssueNumber`, `IssueLabelsService.parseFormAnswers`, `IssueLabelsCommand.readExistingLabelNames`, `IssueLabelsService.missingLabels` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:130` |
| `ConventionalConfigIoService.writeSkillSync` | 4 | `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.generateMarkdownTable`, `ConventionalConfigIoService.replaceMarkerContent` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:353` |
| `NestjsModuleGraphsImportsService.readRuntimeModuleEdges` | 4 | `NestjsModuleGraphsImportsService.filter(…)`, `NestjsModuleGraphsImportsService.map(…)`, `NestjsModuleGraphsImportsService.readOwningModuleName`, `NestjsModuleGraphsImportsService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:153` |
| `NestjsModuleGraphsCommand.synchronizeProject` | 4 | `NestjsModuleGraphsService.exploreProject`, `NestjsModuleGraphsGraphService.renderMermaid`, `NestjsModuleGraphsCommand.map(…)`, `NestjsModuleGraphsCommand.filter(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:141` |
| `NestjsModuleGraphsCommand.synchronize` | 4 | `NestjsModuleGraphsService.discoverProjects`, `NestjsModuleGraphsService.indexModuleOwners`, `NestjsModuleGraphsCommand.synchronizeProject`, `NestjsModuleGraphsCommand.reportResults` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:192` |
| `NxProjectGraphsCommand.synchronizeProject` | 4 | `NxProjectGraphsService.renderMermaid`, `SynchronizationMarkersService.extractContent`, `SynchronizationMarkersService.getStartMarker`, `NxProjectGraphsCommand.applyMode` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:116` |
| `PullRequestLabelsCommand.reportPlan` | 4 | `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsCommand.describePlan`, `PullRequestLabelsCommand.createLabels`, `PullRequestLabelsCommand.updateLabels` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:215` |
| `PullRequestLabelsCommand.synchronize` | 4 | `PullRequestLabelsCommand.reconcile`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsCommand.describeError`, `PullRequestLabelsCommand.mirrorToStepSummary` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:300` |
| `PullRequestTemplateCommand.synchronize` | 4 | `PullRequestTemplateCommand.map(…)`, `PullRequestTemplateCommand.loadTemplate`, `PullRequestTemplateCommand.handleCheckMode`, `PullRequestTemplateCommand.handleWriteMode` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:221` |
| `IssueLabelsCommand.run` | 3 | `IssueLabelsCommand.resolvePlan`, `IssueLabelsGithubService.isAvailable`, `IssueLabelsCommand.addLabel` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:158` |
| `ConformetryGeneratorsCommand.synchronize` | 3 | `ConformetryGeneratorsCommand.readGenerators`, `ConformetryGeneratorsCommand.checkSync`, `ConformetryGeneratorsCommand.writeSync` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:194` |
| `ConventionalConfigIoService.writeIssueTemplateSync` | 3 | `ConventionalConfigIoService.writeIssueTemplateDropdown`, `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:258` |
| `ConventionalConfigValidatorsService.checkMarkerSync` | 3 | `ConventionalConfigValidatorsService.readMarkerValues`, `ConventionalConfigValidatorsService.getSourceValuesForMarker`, `ConventionalConfigValidatorsService.validateMarkerValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41` |
| `ConventionalConfigValidatorsService.checkIssueTemplateSync` | 3 | `ConventionalConfigValidatorsService.getSourceValuesForMarker`, `ConventionalConfigIoService.parseIssueTemplateDropdown`, `ConventionalConfigValidatorsService.validateMarkerValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:185` |
| `DevcontainerConfigurationCommand.applySync` | 3 | `DevcontainerConfigurationCommand.syncVerbatimFields`, `DevcontainerConfigurationCommand.preserveRemoteEnvironment`, `DevcontainerConfigurationCommand.syncFeatures` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:59` |
| `DevcontainerConfigurationCommand.synchronize` | 3 | `DevcontainerConfigurationCommand.applySync`, `DevcontainerConfigurationCommand.check`, `DevcontainerConfigurationCommand.writeWhenDrifted` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:285` |
| `NestjsModuleGraphsGraphService.findAbsentDependencyNames` | 3 | `NestjsModuleGraphsGraphService.map(…)`, `NestjsModuleGraphsGraphService.sortNames`, `NestjsModuleGraphsGraphService.filter(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:109` |
| `NestjsModuleGraphsGraphService.groupModuleNames` | 3 | `NestjsModuleGraphsGraphService.resolveOwner`, `NestjsModuleGraphsGraphService.toSorted(…)`, `NestjsModuleGraphsGraphService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:186` |
| `NestjsModuleGraphsGraphService.renderGroup` | 3 | `NestjsModuleGraphsGraphService.map(…)`, `NestjsModuleGraphsGraphService.map(…)`, `NestjsModuleGraphsGraphService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:323` |
| `NestjsModuleGraphsGraphService.renderMermaid` | 3 | `NestjsModuleGraphsGraphService.renderGroup`, `NestjsModuleGraphsGraphService.some(…)`, `NestjsModuleGraphsGraphService.renderNameList` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:344` |
| `NestjsModuleGraphsImportsService.readImportedModuleNames` | 3 | `NestjsModuleGraphsImportsService.filter(…)`, `NestjsModuleGraphsImportsService.map(…)`, `NestjsModuleGraphsImportsService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:113` |
| `NestjsModuleGraphsService.buildSyntheticRootModule` | 3 | `NestjsModuleGraphsService.findModuleFiles`, `NestjsModuleGraphsService.map(…)`, `SyntheticRootModule.forModules` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:63` |
| `NestjsModuleGraphsService.discoverProjects` | 3 | `NestjsModuleGraphsService.isNestjsProject`, `NestjsModuleGraphsService.describeProject`, `NestjsModuleGraphsService.toSorted(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:186` |
| `NestjsModuleGraphsService.exploreProject` | 3 | `NestjsModuleGraphsService.buildSyntheticRootModule`, `NestjsModuleGraphsService.loadRootModule`, `NestjsModuleGraphsGraphService.buildGraph` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:210` |
| `NestjsModuleGraphsCommand.synchronizeFile` | 3 | `SynchronizationMarkersService.extractContent`, `SynchronizationMarkersService.getStartMarker`, `SynchronizationMarkersService.replaceContent` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:95` |
| `NxProjectGraphsService.readProjects` | 3 | `NxProjectGraphsService.toSorted(…)`, `NxProjectGraphsService.map(…)`, `NxProjectGraphsService.filter(…)` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:142` |
| `PullRequestLabelsCommand.createLabels` | 3 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:85` |
| `PullRequestLabelsCommand.updateLabels` | 3 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:251` |
| `SkillExclusionsCommand.writeSync` | 3 | `SkillExclusionsCommand.readExclusionFile`, `SkillExclusionsCommand.renderBlock`, `SkillExclusionsCommand.map(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:144` |
| `SkillExclusionsCommand.synchronize` | 3 | `SkillExclusionsCommand.readSkillNames`, `SkillExclusionsCommand.writeSync`, `SkillExclusionsCommand.findStaleFiles` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:180` |
| `IssueLabelsService.missingLabels` | 2 | `IssueLabelsService.filter(…)`, `IssueLabelsService.labelsFromAnswers` | `tools/synchronization/src/modules/issue-labels/issue-labels.service.ts:77` |
| `IssueLabelsCommand.addLabel` | 2 | `IssueLabelsGithubService.run`, `IssueLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:57` |
| `IssueLabelsCommand.readLabelNames` | 2 | `IssueLabelsCommand.filter(…)`, `IssueLabelsCommand.map(…)` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:118` |
| `SynchronizationService.resolveSynchronizationModeOrExit` | 2 | `SynchronizationService.resolveModeValue`, `SynchronizationService.exitInvalidMode` | `tools/synchronization/src/modules/synchronization/synchronization.service.ts:59` |
| `ConformetryGeneratorsCommand.checkSync` | 2 | `ConformetryGeneratorsCommand.generateGeneratorsTable`, `ConformetryGeneratorsCommand.readAgentsFile` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:54` |
| `ConformetryGeneratorsCommand.readGenerators` | 2 | `ConfigurationService.loadConformetryConfiguration`, `ConformetryGeneratorsCommand.map(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:136` |
| `ConformetryGeneratorsCommand.writeSync` | 2 | `ConformetryGeneratorsCommand.generateGeneratorsTable`, `ConformetryGeneratorsCommand.readAgentsFile` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:157` |
| `ConformetryGeneratorsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `ConformetryGeneratorsCommand.synchronize` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:176` |
| `ConventionalConfigIoService.map(…)` | 2 | `ConventionalConfigIoService.find(…)`, `ConventionalConfigIoService.capitalize` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:93` |
| `ConventionalConfigIoService.getReleaseRulesTypes` | 2 | `ConventionalConfigIoService.filter(…)`, `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:184` |
| `ConventionalConfigValidatorsService.getSourceValuesForMarker` | 2 | `ConventionalConfigValidatorsService.map(…)`, `ConventionalConfigValidatorsService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:64` |
| `ConventionalConfigValidatorsService.readMarkerValues` | 2 | `ConventionalConfigIoService.extractMarkerContent`, `ConventionalConfigIoService.parseMarkdownTableValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76` |
| `ConventionalConfigCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `ConventionalConfigCommand.synchronize` | `tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:51` |
| `DevcontainerConfigurationCommand.check` | 2 | `DevcontainerConfigurationCommand.isCurrent`, `DevcontainerConfigurationCommand.reportDifferences` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:80` |
| `DevcontainerConfigurationCommand.writeWhenDrifted` | 2 | `DevcontainerConfigurationCommand.isCurrent`, `DevcontainerConfigurationCommand.write` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:242` |
| `DevcontainerConfigurationCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `DevcontainerConfigurationCommand.synchronize` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:266` |
| `SynchronizationMarkersService.locateMarkers` | 2 | `SynchronizationMarkersService.getStartMarker`, `SynchronizationMarkersService.getEndMarker` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:24` |
| `NestjsModuleGraphsImportsService.readDeclaredProjects` | 2 | `NestjsModuleGraphsImportsService.filter(…)`, `NestjsModuleGraphsImportsService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:64` |
| `NestjsModuleGraphsService.loadModuleClasses` | 2 | `NestjsModuleGraphsService.map(…)`, `NestjsModuleGraphsService.filter(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:96` |
| `NestjsModuleGraphsService.readModuleClassNames` | 2 | `NestjsModuleGraphsService.filter(…)`, `NestjsModuleGraphsService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:147` |
| `NestjsModuleGraphsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `NestjsModuleGraphsCommand.synchronize` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:173` |
| `NxProjectGraphsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `NxProjectGraphsCommand.synchronize` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:150` |
| `PullRequestLabelsService.readExpectedLabels` | 2 | `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.map(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:106` |
| `PullRequestLabelsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `PullRequestLabelsCommand.synchronize` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:281` |
| `PullRequestTemplateCommand.checkTargetSync` | 2 | `PullRequestTemplateCommand.extractMarkerContent`, `PullRequestTemplateCommand.wrapInCodeBlock` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:55` |
| `PullRequestTemplateCommand.handleWriteMode` | 2 | `PullRequestTemplateCommand.filter(…)`, `PullRequestTemplateCommand.writeTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:129` |
| `PullRequestTemplateCommand.writeTargetSync` | 2 | `PullRequestTemplateCommand.wrapInCodeBlock`, `PullRequestTemplateCommand.replaceMarkerContent` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:176` |
| `PullRequestTemplateCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `PullRequestTemplateCommand.synchronize` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:202` |
| `SkillExclusionsCommand.findStaleFiles` | 2 | `SkillExclusionsCommand.map(…)`, `SkillExclusionsCommand.filter(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:71` |
| `SkillExclusionsCommand.filter(…)` | 2 | `SkillExclusionsCommand.readExclusionFile`, `SkillExclusionsCommand.renderBlock` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:72` |
| `SkillExclusionsCommand.readExclusionFile` | 2 | `SkillExclusionsCommand.renderStartMarker`, `SkillExclusionsCommand.renderEndMarker` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:82` |
| `SkillExclusionsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `SkillExclusionsCommand.synchronize` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:165` |
| `SynchronizationCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `SynchronizationCommand.synchronize` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:115` |
| `IssueLabelsGithubService.describeFailure` | 1 | `IssueLabelsGithubService.filter(…)` | `tools/synchronization/src/modules/issue-labels/issue-labels-github.service.ts:43` |
| `IssueLabelsGithubService.isAvailable` | 1 | `IssueLabelsGithubService.run` | `tools/synchronization/src/modules/issue-labels/issue-labels-github.service.ts:52` |
| `IssueLabelsService.parseFormAnswers` | 1 | `IssueLabelsService.extractFormField` | `tools/synchronization/src/modules/issue-labels/issue-labels.service.ts:90` |
| `IssueLabelsCommand.nameOf` | 1 | `IssueLabelsCommand.isRecord` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:82` |
| `IssueLabelsCommand.readExistingLabelNames` | 1 | `IssueLabelsCommand.readLabelNames` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:94` |
| `SynchronizationService.resolveModeValue` | 1 | `SynchronizationService.isSynchronizationMode` | `tools/synchronization/src/modules/synchronization/synchronization.service.ts:40` |
| `ConformetryGeneratorsCommand.generateGeneratorsTable` | 1 | `ConformetryGeneratorsCommand.map(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:86` |
| `ConformetryGeneratorsCommand.map(…)` | 1 | `ConformetryGeneratorsCommand.map(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:91` |
| `ConventionalConfigIoService.writeIssueTemplateDropdown` | 1 | `ConventionalConfigIoService.generateYamlDropdownOptions` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:62` |
| `ConventionalConfigIoService.appendToPresetTypes` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:86` |
| `ConventionalConfigIoService.appendToReleaseRules` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:110` |
| `ConventionalConfigIoService.formatScopesForSettings` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:141` |
| `ConventionalConfigIoService.generateYamlDropdownOptions` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:170` |
| `ConventionalConfigIoService.getPresetConfigTypes` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:177` |
| `ConventionalConfigIoService.writeSettingsSync` | 1 | `ConventionalConfigIoService.formatScopesForSettings` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:327` |
| `ConventionalConfigValidatorsService.validateMarkerValues` | 1 | `ConventionalConfigValidatorsService.showDifference` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:123` |
| `ConventionalConfigValidatorsService.checkAllSkillsSync` | 1 | `ConventionalConfigValidatorsService.checkSkillSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155` |
| `ConventionalConfigValidatorsService.checkAllTemplatesSync` | 1 | `ConventionalConfigValidatorsService.checkIssueTemplateSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:169` |
| `ConventionalConfigValidatorsService.checkReleaseRulesSync` | 1 | `ConventionalConfigValidatorsService.filter(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:244` |
| `ConventionalConfigValidatorsService.checkSettingsSync` | 1 | `ConventionalConfigValidatorsService.showDifference` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:269` |
| `ConventionalConfigValidatorsService.checkSkillSync` | 1 | `ConventionalConfigValidatorsService.checkMarkerSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293` |
| `ConventionalConfigService.filter(…)` | 1 | `ConventionalConfigValidatorsService.checkSkillSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:190` |
| `ConventionalConfigService.filter(…)` | 1 | `ConventionalConfigValidatorsService.checkIssueTemplateSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:197` |
| `ConventionalConfigCommand.synchronize` | 1 | `ConventionalConfigService.runSynchronization` | `tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70` |
| `DevcontainerConfigurationCommand.syncFeatures` | 1 | `DevcontainerConfigurationCommand.isDockerFeatureKey` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:180` |
| `SynchronizationMarkersService.extractContent` | 1 | `SynchronizationMarkersService.locateMarkers` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:44` |
| `SynchronizationMarkersService.replaceContent` | 1 | `SynchronizationMarkersService.locateMarkers` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:65` |
| `NestjsModuleGraphsGraphService.collectEdges` | 1 | `NestjsModuleGraphsGraphService.map(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:42` |
| `NestjsModuleGraphsGraphService.compareGroups` | 1 | `NestjsModuleGraphsGraphService.rankGroup` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:79` |
| `NestjsModuleGraphsGraphService.findAmbientModuleNames` | 1 | `NestjsModuleGraphsGraphService.countInboundEdges` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:133` |
| `NestjsModuleGraphsGraphService.sortNames` | 1 | `NestjsModuleGraphsGraphService.toSorted(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-graph.service.ts:260` |
| `NestjsModuleGraphsImportsService.readFileImports` | 1 | `NestjsModuleGraphsImportsService.readImportedModuleNames` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs-imports.service.ts:83` |
| `NestjsModuleGraphsService.findModuleFiles` | 1 | `NestjsModuleGraphsService.toSorted(…)` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:77` |
| `NestjsModuleGraphsService.map(…)` | 1 | `NestjsModuleGraphsImportsService.readProjectImports` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:281` |
| `NestjsModuleGraphsService.isNestjsProject` | 1 | `NestjsModuleGraphsService.readProjectTags` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.service.ts:294` |
| `NestjsModuleGraphsCommand.filter(…)` | 1 | `NestjsModuleGraphsCommand.synchronizeFile` | `tools/synchronization/src/modules/nestjs-module-graphs/nestjs-module-graphs.command.ts:163` |
| `NxProjectGraphsService.renderEdge` | 1 | `NxProjectGraphsService.toNodeIdentifier` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:50` |
| `NxProjectGraphsService.renderNode` | 1 | `NxProjectGraphsService.toNodeIdentifier` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:57` |
| `NxProjectGraphsService.sortNames` | 1 | `NxProjectGraphsService.toSorted(…)` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.service.ts:181` |
| `NxProjectGraphsCommand.applyMode` | 1 | `SynchronizationMarkersService.replaceContent` | `tools/synchronization/src/modules/nx-project-graphs/nx-project-graphs.command.ts:64` |
| `PullRequestLabelsGithubService.describeFailure` | 1 | `PullRequestLabelsGithubService.filter(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels-github.service.ts:42` |
| `PullRequestLabelsService.isTrackedLabel` | 1 | `PullRequestLabelsService.some(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:45` |
| `PullRequestLabelsService.filter(…)` | 1 | `PullRequestLabelsService.isTrackedLabel` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:82` |
| `PullRequestLabelsCommand.describePlan` | 1 | `PullRequestLabelsCommand.appendToReport` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:118` |
| `PullRequestLabelsCommand.reportStaleLabels` | 1 | `PullRequestLabelsCommand.appendToReport` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:238` |
| `PullRequestTemplateCommand.handleCheckMode` | 1 | `PullRequestTemplateCommand.checkTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:106` |
| `PullRequestTemplateCommand.filter(…)` | 1 | `PullRequestTemplateCommand.checkTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:134` |
| `SkillExclusionsCommand.readSkillNames` | 1 | `SkillExclusionsCommand.toSorted(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:115` |
| `SkillExclusionsCommand.renderBlock` | 1 | `SkillExclusionsCommand.map(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:127` |

</details>

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-12999-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-429.87_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-13-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-90-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-90-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-30-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-45-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-302-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-1-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-28-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-20-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-36-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-614-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-281-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-695-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-200-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-694-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-487-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-124-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-471-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-954-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-3-ca8a04?style=flat-square)

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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-315-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-70-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-15-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-187-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-156-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-13-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-65-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-255-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-12-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-13-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-10-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-10-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-10-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-0-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-27-7c3aed?style=flat-square)
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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-360-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-15-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-61-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-36-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-12-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-17-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-90-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
