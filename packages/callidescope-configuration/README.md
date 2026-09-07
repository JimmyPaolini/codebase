# 🔭 Callidescope Configuration

**Reads `callidescope.config.ts` and resolves the limits callidescope enforces.**

This package is the configuration reader for
[`@callidescope/cli`](../callidescope-cli/README.md). It finds a configuration
file, validates it, and fills in every field the file left out, so that no
analyzer has to know which options are optional.

It knows nothing about call graphs. What a threshold means, which decorator
marks a stack root, how a module identifier is derived — all of that lives in
the CLI. This package only answers "what did the repository ask for".

```bash
npm install --save-dev @callidescope/configuration
```

## Configuration File

Any of `callidescope.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}`, searched for
upward from the working directory. TypeScript is tried first, because that is
the form that gets type checking. A repository with no configuration file is
traced with the defaults rather than told to write one.

```ts
import { type CallidescopeConfiguration } from "@callidescope/configuration";

const callidescopeConfiguration: CallidescopeConfiguration = {
  excludeFrom: ["configuration/.callidescopeignore"],
  limits: { maximumDepth: 6, spreadThreshold: 4 },
};

export default callidescopeConfiguration;
```

That file is the **workspace** configuration, and every section below describes
it. A project may also configure itself, from a much smaller surface —
see [Project Configuration](#project-configuration).

## Limits

Every threshold but one has a default, so a configuration file names only what
it wants to change.

| Limit | Default | Meaning |
| ----- | ------- | ------- |
| `maximumDepth` | `6` | Frames a call stack may hold, entry point inclusive |
| `maximumBreadth` | **none** | Callables one callable may call directly |
| `spreadThreshold` | `4` | Distinct modules a callable's transitive callees may touch |
| `directSpreadThreshold` | `3` | Modules a callable must call _directly_ before spread is reported |
| `maximumImplementationCandidates` | `8` | Implementations one interface member may resolve to |
| `minimumCallers` | `2` | Callers a callable needs before its placement is judged |
| `callerMajorityRatio` | `0.8` | Share of callers in one foreign module that marks a callable misplaced |

`maximumBreadth` is the one limit with no default. Until something declares a
number nothing can exceed it, so breadth is measured and reported without being
gated — and a run given `--check breadth` is refused rather than passing over a
limit nobody chose. It is also the one limit a workspace cannot usefully pick
alone: see [Project Configuration](#project-configuration).

`directSpreadThreshold` exists because transitive spread on its own flags every
entry point — an entry point legitimately reaches the whole program. Requiring
direct breadth as well is what isolates the callable personally orchestrating
unrelated concerns.

`maximumImplementationCandidates` is the primary noise control. A structurally matched
interface member named `run` or `sync` otherwise resolves to dozens of unrelated
classes and manufactures a call stack no execution ever takes.

## Entry Points

A depth measurement is only as meaningful as its roots, so which callables count
as roots is configurable.

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `addresses` | none | Callables named outright as roots, each `<file>#<qualified-name>` |
| `decorators` | 13 framework decorators | Decorators whose methods a framework invokes |
| `includeExportedFunctions` | `true` | Treat every `src/index.ts` export as a root |
| `includeOrphans` | `true` | Promote callables nothing in the repository calls |
| `includeTests` | `false` | Trace test files too |

`addresses` takes the same `<file>#<qualified-name>` form the `depth` and
`breadth` commands accept and every stack frame prints, so an address can be
copied out of a report straight into a configuration. A trailing `:<line>`
disambiguates a file holding two declarations under one qualified name.
Declared addresses are **additive**: the rules below keep running, orphan
promotion still catches whatever nobody named, and an address landing on a
callable a rule already rooted is one root rather than two. An address that
resolves to nothing, to more than one declaration, or to nothing parseable
fails the run — see [Refusals](#refusals).

`includeOrphans` is a safety net rather than a feature. Without it, a missing
entry-point rule silently removes whole subtrees from every measurement; with
it, they surface as orphan roots — which is itself worth knowing, since an
orphan is either dead code or a rule that needs adding.

## Exclusions

`exclude` globs are **additive** to the built-in defaults (`node_modules`,
`dist`, `coverage`, `output`, `.nx`, `.conformetry`), so a configuration naming
its own noise does not have to restate them.

`excludeFrom` names gitignore-syntax files, which is how a long exclusion list
stays out of the configuration file itself.

### An exclusion drops the callables, not the file

`exclude` decides what is **collected**, and nothing else. The file is still in
the `ts.Program`, so it is still compiled and still type-checked — what changes
is that its callables are never collected, and a call reaching into it becomes
an unfollowable call rather than disappearing. A stack therefore stops at the
excluded boundary instead of routing around it.

Two consequences worth knowing before reaching for `exclude`:

- **It cannot un-project a directory.** A project is the directory holding a
  `tsconfig.json`, and discovery has already happened by the time collection is
  filtered — so a project cannot exclude its own `tsconfig.json`, and excluding
  every file it holds leaves it a project that traced nothing rather than no
  project at all.
- **A `tsconfig.json` that will not parse still ends the run**, because it is
  opened before any of this. Use the run's `exclude` to drop such a project,
  which is settled early enough to keep discovery from opening it at all.

## Output

Every destination is optional, and unconfigured is the normal case: a run that
names no destination reports to the console and exits non-zero on violations, so
nothing it writes can go stale.

| Destination | Purpose |
| ----------- | ------- |
| `output.json` | A machine-readable report at `path`, indented by `indentation` |
| `output.markdown` | A marker-delimited block spliced into `path` |
| `output.mermaid` | The same block with its call stacks drawn as one mermaid flowchart |
| `output.projectReadmes` | One section per traced project, in that project's own `README.md` |

`output.mermaid` takes the same keys as `output.markdown` — they differ in what
goes between the anchors, not in how a block is placed or overridden — and is a
separate destination so a repository can publish the printed trees and the
diagram from one run.

`output.format` is separate from all four: it decides what the run prints,
`markdown`, `mermaid`, or `json`, and defaults to `markdown`. Writing to a file
and printing to a terminal are independent, so both can be on at once.

`output.markdown` and `output.mermaid` each take a `description`, placed under
the heading, and a `heading`, which defaults to `# 🔭 Callidescope`. Set it
whenever the block is spliced into a file that already has a title: a second
first-level heading is something most markdown linters reject. The block's
subsections follow the level down on their own, so an `##` heading writes
`###` subsections.

`output.projectReadmes` takes `heading` (`## 🔭 Callidescope` by default),
`previewCount` (how many stacks are shown before the rest go behind a
disclosure, three by default), and the same `startMarker`/`endMarker` pair the
markdown destination uses. `{}` accepts all four defaults.

One thing `projectReadmes` does is worth knowing before turning it on: it
writes a section for **every** traced project, creating a `README.md` where a
project has none. A workspace whose root holds a `tsconfig.json` is itself such
a project, and the section it gets describes whatever that config's `include`
catches and no other project claims — rarely anything anybody means by "the
workspace". Exclude the root's own `tsconfig.json` and point `output.markdown`
at the root readme instead, which is the block that really is about the
workspace: it carries the summary counts, one row per project against that
project's own depth limit, and a scoreboard of how many sit over, on, or clear
of theirs.

A markdown destination may supply `render` to replace the built-in tables, or
`write` to place the block itself. A `write` function is handed
`syncAnchoredBlock` and `wrapInAnchors`, so a custom writer reuses the same
splice rather than reimplementing it. Returning `false` reports the destination
as stale; anything else, `undefined` included, counts as current.

## Project Configuration

Everything above describes the file a run is pointed at — the **workspace**
configuration. A second `callidescope.config.ts` may also sit at any traced
project's own root, the directory holding the `tsconfig.json` that makes it a
project. It is found by name in that directory alone, with no upward walk, and
may use any of the same eight extensions.

A project with no file of its own is configured entirely by the run. That is
what every project did before per-project configuration existed and what most
projects keep doing.

One file, one role per run: the file a run was pointed at is never also read as
a project's. A package whose task names its own configuration and then traces
itself would otherwise have that file judged as a project's — a refusal for the
workspace-only fields it legitimately sets.

### What a project may set

| Field | What it does |
| ----- | ------------ |
| `entryPoints` | Which of that project's callables root a stack, `addresses` included |
| `limits.maximumDepth` | The depth every stack rooted in that project is judged against |
| `limits.maximumBreadth` | The breadth every callable that project declares is judged against |
| `exclude` | Globs naming that project's own files to leave untraced |

**A project's `exclude` globs are anchored to that project's root**, never to
the workspace: `exclude: ["src/generated/**"]` in `packages/thing`'s own file
names `packages/thing/src/generated/**`, and there is no spelling of it that
reaches a sibling. Write the path as the project sees it — a workspace-relative
glob here matches nothing, and the files it meant to drop stay traced.

The run's own `exclude` keeps its workspace-relative meaning and is layered
underneath, so a project can leave more out and can never put back what the run
left out. Noise spanning several projects still belongs in the workspace file.

It also filters **collection** and nothing else, exactly as the run's own does —
see [An exclusion drops the callables, not the file](#an-exclusion-drops-the-callables-not-the-file).
A project cannot exclude its own `tsconfig.json`, and a call into a file it
excluded becomes an unfollowable call rather than vanishing.

Every other field is refused by name before anything is traced.

### Write the override, never a spread

```ts
import { type CallidescopeConfiguration } from "@callidescope/configuration";

const projectConfiguration: CallidescopeConfiguration = {
  limits: { maximumDepth: 10 },
};

export default projectConfiguration;
```

**Do not spread a workspace limits object into a project's `limits`.** Such an
object carries `spreadThreshold` and the rest of the graph-shaping limits, every
one of which only a workspace may set, so a project file holding one is rejected
before anything is traced.

Nothing is lost by writing the override alone, because **a project inherits per
limit rather than per object**. Each limit falls back to the workspace's number
on its own, so a project naming `maximumDepth` still inherits `maximumBreadth`,
and a project naming neither is handed the workspace's object itself. A spread
would have nothing left to contribute either: depth and breadth are the only two
limits a project may set, so it would supply exactly the field being overridden
plus the one that gets the file rejected.

The workspace number is a **default rather than a ceiling**. A project declaring
a higher limit than the workspace keeps its own — a workspace number pinned by
the single worst stack anywhere in it gates nothing for the projects nowhere
near it, which is the whole reason a project gets to say.

`entryPoints` does not work that way: a project declaring any entry-point rule
replaces the rule set for its own callables outright, and the fields it leaves
out fall back to this package's defaults rather than to the workspace file's.
A project that declares `addresses` and wants a decorator list the workspace
customized has to restate that list too.

`includeTests` is the one field in that set that decides which of a project's
files are **collected** rather than which of its callables root a stack, so it
takes effect at the same layer `exclude` does: a project that asks for its test
files gets them walked in a run that left every other project's out, and a
project that refuses them keeps them out of a run that asked for everyone's.

### Why the other limits cannot vary per project

`maximumDepth` and `maximumBreadth` **judge** a call graph: the graph is built
once, and each project asks a different question of the same edges. Two answers
are two opinions about one artifact, which is coherent.

Every other limit **shapes what the graph is**. `spreadThreshold` and
`directSpreadThreshold` decide which callables become findings,
`maximumImplementationCandidates` decides which structural matches become edges
at all, and `minimumCallers` with `callerMajorityRatio` decides what counts as a
misplacement. Two projects disagreeing about any of them would each be
describing a different graph over the same shared code — and a run measures one
graph, so there is one set of those. The same reasoning puts `ignoreCallees`,
`allowSpreadFor`, `directories`, `excludeFrom`, `output`, and
`workspaceStructure` in the workspace file: they name what a run reads, what it
writes, or how it partitions the workspace, and a project cannot answer those
differently from the run tracing it.

### Reading the resolved set

A ratchet written one file per project is no longer reviewable in the single
file it used to live in. `@callidescope/cli`'s `limits` command is where it is
reviewable as a set instead — every project in scope, the number it is judged
against, and the file that number is written in, with an `Origin` column saying
`declared` for the project's own and `inherited` for the workspace default it
fell back to. It resolves configuration and measures nothing, so it costs
milliseconds rather than a trace.

It is also the answer to a limit that seems not to have taken effect. The schema
strips keys it does not recognize rather than refusing them, so a misspelled
`limits.maxDepth` loads cleanly and changes nothing — and an `Origin` of
`inherited` where `declared` was expected is what says so.

### Refusals

Each of these ends the run before anything is printed or written, so a checkout
is left exactly as the run found it. `<project>` is the workspace-relative
project root; the workspace configuration's own declared addresses are labelled
`the workspace configuration` instead.

Six of them. Each is shown under the headline it is logged with — five of the
six share one — and quoted as the tool writes it.

**`🔭 Rejected a project configuration` — the file could not be read.**

```text
Failed to read the callidescope configuration for <project> at <path>: <reason>
```

The read failed or the shape did not pass the schema. `<reason>` is the
underlying failure, which is also kept as the error's `cause`. Fix the named
file; nothing else was traced.

**`🔭 Rejected a project configuration` — a workspace-only field.**

```text
<project> sets <field>, which only the workspace configuration may set. A project configuration may set entryPoints, exclude, limits.maximumBreadth, and limits.maximumDepth.
```

Move that field to the workspace file. `<field>` is printed as
`limits.spreadThreshold` for a limit and as a bare name for a top-level field,
so the message says which of the two is wrong. Spreading the workspace limits
into a project is the usual way this happens.

**`🔭 Rejected a project configuration` — a declared address resolved to
nothing.**

```text
<project> declares an entryPoints.addresses entry that resolves to nothing: "<address>". Check the file path and the qualified name callidescope prints for it in a stack.
```

The callable was renamed, moved, or excluded from the run. Correct the address
or drop it. This refusal is the point of the field rather than an
inconvenience: a rename that silently dropped a declared root would lower the
project's measured depth with nothing in the output to say so, and loosen a gate
in the one commit nobody would think to check it in.

**`🔭 Rejected a project configuration` — a declared address was ambiguous.**

```text
<project> declares an entryPoints.addresses entry that matches more than one declaration: "<address>". Candidates: <address>:<line>, <address>:<line>. Add ":<line>" to the address to pick one.
```

Every candidate is rendered as an address that would have picked it, so the fix
is a copy rather than a file location to translate back. Two declarations on one
line are the case no address can separate; those name their column instead and
the advice changes to `Two declarations on one line cannot be told apart by
":<line>" — rename one, or name a different callable.`

**`🔭 Rejected a project configuration` — a declared address was malformed.**

```text
<project> declares an invalid entryPoints.addresses entry. "<address>" is not a callable address. It needs a file path and a qualified name joined by "#", as in "src/foo.service.ts#FooService.bar", optionally followed by ":<line>" to disambiguate.
```

**`🔭 Rejected the configuration` — `--check breadth` with nothing to gate on.**

```text
--check breadth requires at least one project in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to that project's callidescope.config.ts before running --check breadth.
```

A **project's own** file has to declare it. A workspace-declared
`maximumBreadth` is inherited rather than declared, so it reports breadth
findings without satisfying this. The check runs after the trace rather than
before it, because which projects were in scope is something only the trace
knows.

A run collects **every** unresolved address before it refuses, so several
mistakes are fixed from one message rather than one refusal at a time. More
than one arrives numbered, behind
`<count> declared entry points did not resolve.`

The headlines belong to the command rather than to the message. The first two
reach the `limits` command as well, where they are printed under
`🔭 Rejected a configuration`; a listing that quietly skipped the one project
whose configuration is wrong would be at its least trustworthy exactly when it
is most wanted. The three address refusals need a resolved call graph and the
breadth refusal needs to know which projects were in scope, so only a trace
raises those four.

### Worked examples

Four runnable examples in
[`@callidescope/examples`](../callidescope-examples/README.md) demonstrate the
whole of this, each against real traced code:

| Example | What it shows |
| ------- | ------------- |
| [`declared-entry-points`](../callidescope-examples/examples/declared-entry-points/README.md) | `entryPoints.addresses`, what declaring adds, and the refusals |
| [`project-depth-limit`](../callidescope-examples/examples/project-depth-limit/README.md) | One run, two depth limits, and why the two files at that package's root are separate |
| [`inherited-limits`](../callidescope-examples/examples/inherited-limits/README.md) | A project with no file at all, and per-limit inheritance |
| [`gated-leaf`](../callidescope-examples/examples/gated-leaf/README.md) | A leaf gated at three, and both halves of the `--check breadth` rule side by side |

## Call Graph Types

The result types define the JSON report's shape, so a consumer types against
this package rather than reverse-engineering the output. Each reported
`StackFrame` carries a `CallableSignature` (parameter names, types, optional and
rest flags, return type, and the one-line rendering) and a
`CallableDocumentation` (the whole comment as its summary, tag names, and a
deprecation flag — shortening belongs to whatever renders it). Both are
`undefined` when the callable has neither — and `undefined` fields are absent
from the JSON entirely rather than present and null.

## Exports

`ConfigurationModule` and `ConfigurationService` for NestJS consumers, the zod
schema and every default constant, and the type surface — both the configuration
types and the `CallGraphResult` types that define the JSON report's shape.

`loadConfiguration` does the file I/O; `resolveConfiguration` is pure
defaulting. They are split so that a host embedding callidescope can hand over a
configuration object it assembled itself and get the same resolved shape a file
produces, without touching the disk.

`ProjectConfigurationService` is the second service, and the only place a
per-project refusal is raised: `loadProjectConfigurations` reads the file beside
each traced project and rejects the ones setting a workspace-only field, and
`resolveLimits` says what every project is judged against, each number carrying
the file it was written in. One resolver rather than one per reader — a gate and
a listing that each worked the inheritance out for themselves could disagree
about the same number, and a limit two answers can be given for is worse than
no limit.

## Test

```bash
nx run callidescope-configuration:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-configuration`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 64 |
| Files | 15 |
| Calls traced | 57 |
| Call stacks | 3 |
| Deepest stack | 5 |
| Stacks through recursion | 0 |
| Unfollowable calls | 5 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 6 | declared |
| `maximumBreadth` | 8 | declared |

### Call stacks (depth)

**1. `ConfigurationService.loadConfiguration`** — depth ≥ 5 · orphan-root

```text
🚀 ConfigurationService.loadConfiguration(args?: LoadConfigurationArguments): Promise<ResolvedCallidescopeConfiguration> [packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:362]
   ↳ Loads and validates a callidescope configuration file.
  └─> ConfigurationService.loadConfigurationFile(args?: LoadConfigurationArguments): Promise<LoadedCallidescopeConfiguration> [packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:390]
     ↳ Loads a configuration, and says what the file itself declared and which file answered.
    └─> ConfigurationService.resolveConfigurationPath(configurationPath: string): string [packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:178]
       ↳ Resolves a configuration path against the cwd, then the repository root.
      └─> ConfigurationService.findRepositoryRoot(): string | undefined [packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:110]
         ↳ Walks upward from the process cwd looking for the repository root.
        └─> ConfigurationService.some(…)(marker: ".git" | "pnpm-workspace.yaml"): boolean [packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:115]
```

**2. `InputService.suggest`** — depth 3 · orphan-root

```text
🚀 InputService.suggest(input: string): Promise<{ title: string; value: string; }[]> [packages/callidescope-configuration/src/modules/input/input.service.ts:150]
  └─> InputService.completeSuggestions(args: { input: string; suggestions: readonly string[]; }): string[] [packages/callidescope-configuration/src/modules/input/input.service.ts:73]
     ↳ Narrows a suggestion list to what has been typed so far.
    └─> InputService.filter(…)(suggestion: string): boolean [packages/callidescope-configuration/src/modules/input/input.service.ts:78]
```

**3. `callbackSchema`** — depth 2 · orphan-root

```text
🚀 callbackSchema<TCallback>(): z.ZodType<TCallback> [packages/callidescope-configuration/src/modules/configuration/configuration.constants.ts:287]
   ↳ Accepts a function-valued option without inspecting its signature.
  └─> custom(…)(value: unknown): value is Function [packages/callidescope-configuration/src/modules/configuration/configuration.constants.ts:288]
```

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ConfigurationService.resolveConfiguration` | 8 | `ConfigurationService.resolveAllowSpreadFor`, `ConfigurationService.resolveEntryPoints`, `ConfigurationService.resolveExclude`, `ConfigurationService.resolveLimits`, `ConfigurationService.resolveJsonOutput`, `ConfigurationService.resolveMarkdownDestination`, `ConfigurationService.resolveProjectReadmes`, `ConfigurationService.resolveWorkspaceStructure` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:433` |
| `ConfigurationService.loadConfigurationFile` | 5 | `ConfigurationService.findConfigurationFile`, `ConfigurationService.resolveConfigurationPath`, `ConfigurationService.resolveConfiguration`, `UnknownConfigurationFileTypeError.constructor`, `ConfigurationService.loadConfigurationModule` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:390` |
| `InputService.promptForAutocompleteMultiselect` | 4 | `InputService.assertCanPrompt`, `InputService.map(…)`, `promptCancelledError`, `InputService.filter(…)` | `packages/callidescope-configuration/src/modules/input/input.service.ts:139` |

<details>
<summary>21 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `InputService.promptForSelect` | 4 | `InputService.assertCanPrompt`, `InputService.map(…)`, `promptCancelledError`, `InputService.find(…)` | `packages/callidescope-configuration/src/modules/input/input.service.ts:188` |
| `ProjectConfigurationService.loadProjectConfigurations` | 3 | `ConfigurationService.findConfigurationFileAt`, `ProjectConfigurationService.loadProjectConfiguration`, `ProjectConfigurationService.assertNoForbiddenFields` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:273` |
| `ProjectConfigurationService.resolveLimits` | 3 | `ProjectConfigurationService.buildWorkspaceLimits`, `ProjectConfigurationService.map(…)`, `ProjectConfigurationService.map(…)` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:320` |
| `ConfigurationService.resolveConfigurationPath` | 2 | `ConfigurationService.findRepositoryRoot`, `ConfigurationFileNotFoundError.constructor` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:178` |
| `ProjectConfigurationService.assertNoForbiddenFields` | 2 | `ProjectConfigurationService.findForbiddenField`, `ProjectConfigurationFieldNotPermittedError.constructor` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:48` |
| `ProjectConfigurationService.loadProjectConfiguration` | 2 | `ConfigurationService.loadConfigurationFile`, `ProjectConfigurationError.constructor` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:193` |
| `InputService.assertCanPrompt` | 2 | `InputService.isAtTerminal`, `missingInputError` | `packages/callidescope-configuration/src/modules/input/input.service.ts:41` |
| `InputService.suggest` | 2 | `InputService.map(…)`, `InputService.completeSuggestions` | `packages/callidescope-configuration/src/modules/input/input.service.ts:150` |
| `InputService.resolveFormatOption` | 2 | `InputService.isAtTerminal`, `InputService.promptForSelect` | `packages/callidescope-configuration/src/modules/input/input.service.ts:231` |
| `callbackSchema` | 1 | `custom(…)` | `packages/callidescope-configuration/src/modules/configuration/configuration.constants.ts:287` |
| `ConfigurationService.findConfigurationFile` | 1 | `ConfigurationService.findConfigurationFileAt` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:83` |
| `ConfigurationService.findRepositoryRoot` | 1 | `ConfigurationService.some(…)` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:110` |
| `ConfigurationService.loadConfigurationModule` | 1 | `ConfigurationService.loadJsonConfiguration` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:134` |
| `ConfigurationService.loadConfiguration` | 1 | `ConfigurationService.loadConfigurationFile` | `packages/callidescope-configuration/src/modules/configuration/configuration.service.ts:362` |
| `ProjectConfigurationService.buildProjectLimits` | 1 | `ProjectConfigurationService.readDeclaredLimit` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:69` |
| `ProjectConfigurationService.buildWorkspaceLimits` | 1 | `ProjectConfigurationService.readDeclaringPath` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:111` |
| `ProjectConfigurationService.map(…)` | 1 | `ProjectConfigurationService.buildProjectLimits` | `packages/callidescope-configuration/src/modules/configuration/project-configuration.service.ts:333` |
| `missingInputError` | 1 | `InputError.constructor` | `packages/callidescope-configuration/src/modules/input/input.constants.ts:27` |
| `promptCancelledError` | 1 | `InputError.constructor` | `packages/callidescope-configuration/src/modules/input/input.constants.ts:39` |
| `InputService.completeSuggestions` | 1 | `InputService.filter(…)` | `packages/callidescope-configuration/src/modules/input/input.service.ts:73` |
| `InputService.parseCommaDelimitedOption` | 1 | `InputService.map(…)` | `packages/callidescope-configuration/src/modules/input/input.service.ts:96` |

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
  callidescope_cli["callidescope-cli"]
  callidescope_configuration["callidescope-configuration"]
  callidescope_examples["callidescope-examples"]
  callidescope_graph["callidescope-graph"]
  callidescope_nx["callidescope-nx"]
  callidescope_output["callidescope-output"]
  callidescope_cli --> callidescope_configuration
  callidescope_examples --> callidescope_configuration
  callidescope_graph --> callidescope_configuration
  callidescope_nx --> callidescope_configuration
  callidescope_output --> callidescope_configuration
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_configuration subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  ConfigurationModule
  InputModule
```
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_index_unit_test_ts["src/index.unit.test.ts"]
  file_src_modules_configuration_call_graph_types_ts["src/modules/configuration/call-graph.types.ts"]
  file_src_modules_configuration_configuration_constants_ts["src/modules/configuration/configuration.constants.ts"]
  file_src_modules_configuration_configuration_module_ts["src/modules/configuration/configuration.module.ts"]
  file_src_modules_configuration_configuration_module_unit_test_ts["src/modules/configuration/configuration.module.unit.test.ts"]
  file_src_modules_configuration_configuration_service_ts["src/modules/configuration/configuration.service.ts"]
  file_src_modules_configuration_configuration_service_unit_test_ts["src/modules/configuration/configuration.service.unit.test.ts"]
  file_src_modules_configuration_configuration_types_ts["src/modules/configuration/configuration.types.ts"]
  file_src_modules_configuration_project_configuration_service_ts["src/modules/configuration/project-configuration.service.ts"]
  file_src_modules_configuration_project_configuration_service_unit_test_ts["src/modules/configuration/project-configuration.service.unit.test.ts"]
  file_src_modules_input_input_constants_ts["src/modules/input/input.constants.ts"]
  file_src_modules_input_input_module_ts["src/modules/input/input.module.ts"]
  file_src_modules_input_input_service_ts["src/modules/input/input.service.ts"]
  file_src_modules_input_input_service_unit_test_ts["src/modules/input/input.service.unit.test.ts"]
  file_src_modules_input_input_types_ts["src/modules/input/input.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_index_unit_test_ts --> file_src_index_ts
  file_src_modules_configuration_configuration_constants_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_project_configuration_service_ts
  file_src_modules_configuration_configuration_module_unit_test_ts --> file_src_modules_configuration_configuration_module_ts
  file_src_modules_configuration_configuration_module_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_module_unit_test_ts --> file_src_modules_configuration_project_configuration_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_types_ts --> file_src_modules_configuration_call_graph_types_ts
  file_src_modules_configuration_project_configuration_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_project_configuration_service_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_project_configuration_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_project_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_project_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_project_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_project_configuration_service_unit_test_ts --> file_src_modules_configuration_project_configuration_service_ts
  file_src_modules_input_input_module_ts --> file_src_modules_input_input_service_ts
  file_src_modules_input_input_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_input_input_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_constants_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_types_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_service_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_types_ts
  file_src_modules_input_input_types_ts --> file_src_modules_configuration_configuration_types_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-4266-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-151.41_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-5-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-22-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-16.74_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-22-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-49-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-1-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-5-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-185-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-5-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-12-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-10-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-143-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-48-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-111-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-80-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-217-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-67-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-101-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-289-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-703-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-149-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-95-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-80-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-134-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-2-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-3-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-2-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-3-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-5-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)

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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-222-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-45-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-73-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
