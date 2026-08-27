# 🔭 Callidescope

**Traces call stacks across a TypeScript monorepo and flags the ones that got too deep.**

Callidescope builds one call graph for the whole workspace, measures how deep a
stack can get below each entry point, and reports the paths that exceed a limit
you set — with every frame's file and line, so the next step is opening one.

It follows calls through **NestJS injected dependencies**. When a command calls
`this.someService.load()`, the hop into `SomeService.load` is the whole point:
that edge is invisible to anything reading one file at a time, and it is where
most of this kind of codebase's control flow actually lives.

```bash
npm install --save-dev @callidescope/cli
```

```bash
callidescope --config configuration/callidescope.config.ts
```

```text
Stack #1 | 🚨 [DEPTH ≥ 10 > 6] (decorated-method)
🚀 CodometerCommand.run(_passedParameters: string[], options: CodometerCommandOptions): Promise<void> [.../codometer.command.ts:220]
   ↳ Measure the repository and write every configured output.
  └─> CodometerService.measure(args: MeasureArguments): CodeStatisticsResult [.../codometer.service.ts:115]
     ↳ Measure aggregated repository statistics for the provided directory.
    └─> LanguagesService.analyze(args: AnalyzeLanguagesArguments): LanguageResults [.../languages.service.ts:54]
       ↳ Analyze every language present in the discovered files.
      └─> JsonService.countArrayNode(node: unknown[], stats: JsonResult, depth: number): void (cycle) [.../json.service.ts:89]
         ↳ Count array nodes and their child values.
```

## Why

A deep call stack is not automatically wrong, but it is always worth looking at.
Ten frames between a command and the work it does usually means a layer that
exists only to forward arguments, and the tools that would tell you are the ones
that read a file at a time — so they see the forwarding and never the depth.

Two questions this answers that reading code does not:

- **How deep does this actually get?** Following an injected dependency by hand
  means opening the module, finding the provider, and opening that — for every
  hop. The tool does it with the type checker, which is what makes it exact.
- **Is this function in the right place?** A function whose callers all live in
  another module is usually in the wrong file, and nothing about reading it
  would tell you so.

## Usage

| Flag | Meaning |
| ---- | ------- |
| `--config` | Path to a `callidescope.config.ts`. Searched for when omitted |
| `-d, --directories` | Comma-separated project directories to trace, each holding its own `tsconfig.json`. Every such directory under the working directory when omitted |
| `-f, --format` | `markdown`, `mermaid`, or `json`, for what it prints. Markdown by default |
| `--json` | Path to write the machine-readable report to |
| `-m, --markdown` | Path to splice the markdown block into |
| `--check` | Fail on a comma-separated set drawn from `depth` and `reports` |
| `--write` | Write every configured destination |

### Two findings, two flags

A stack that runs deeper than the configured limit and a report that no longer
matches the code are separate findings, and `--check` names them separately.
`depth` is callidescope's own word for the magnitude it measures — `limit`
belongs to codometer, and blurring the two makes the messages unreadable.

| `--check` value | What fails the run |
| --------------- | ------------------ |
| `depth` | A call stack deeper than `limits.maximumDepth` |
| `reports` | A configured destination no longer holding what a fresh run would write |

`--check` refuses a value it does not recognize, and refuses a flag carrying no
value at all. A set with nothing in it looks exactly like the flag having been
left off, so it is a mistake rather than a shorthand: read as "gate nothing" it
would be a gate that cannot fail.

The two are separate because they belong on opposite sides of a pull request.
Depth is the gate — a stack got longer in this change, and this change is what
fixes it:

```bash
nx run codebase:callidescope:check
```

Staleness is not, because a report goes stale whenever the call graph moves
anywhere, which is nearly every change. The report is published on the default
branch instead, where nothing else is competing to rewrite the same block:

```bash
nx run codebase:callidescope:write
```

Nothing writes unless it is asked to. A run given neither `--write` nor
`--check reports` reads no destination and rewrites none, so `--check depth` on
a pull request leaves every committed report exactly as it found it.
`--write --check reports` is refused outright: a report cannot be stale in the
run that just wrote it.

Those two configurations are the whole target — there is no third one for the
release, because nothing forwards a configuration to it. `lint-codebase` does
not depend on `callidescope`: Nx forwards an explicit configuration down
`dependsOn`, so if it did, `lint-codebase --configuration=write` would publish
the report from a branch. `codebase:codometer` sits outside that list for the
same reason. The depth gate is therefore named directly, alongside
`lint-codebase` and inside the same `nx affected` invocation, in both places
that gate: the
[🧑‍💻 Lint Codebase](../../.github/workflows/lint-codebase.yml) workflow, so it
runs on every pull request, and
[`configuration/lint-staged.config.ts`](../../configuration/lint-staged.config.ts),
so it runs on every commit. Depth reads source and needs no build, which is
what keeps it in the commit path where codometer's limits — read from compiled
output — cannot go.

### Where the report goes

Printing and writing are separate. `--format` decides what reaches the terminal;
the destinations under `output` in the config decide what reaches a file, and
both can be on at once.

Markdown is the console default because it is the one rendering that reads in a
terminal, pastes into an issue, and is already what the files hold. `--format
json` is for a machine reading standard output, and `--format mermaid` prints
diagram source to paste somewhere that draws it.

Four destinations, each independent:

| `output` key | What it writes |
| ------------ | -------------- |
| `json` | The whole run as JSON, at one path |
| `markdown` | The whole run, spliced between anchors in one file |
| `mermaid` | The same report with its stacks drawn instead of printed |
| `projectReadmes` | One section per traced project, in that project's own `README.md` |

### The diagram

`mermaid` is its own destination rather than a mode on `markdown`, so a
repository can publish both. They answer different questions: the tree says
what each frame takes, returns, and documents; the diagram says what shape they
make together.

All the stacks are drawn as **one** flowchart, not one apiece. A single stack is
a straight line, and a straight line is a list with extra steps. Drawn together
the shared tails converge — every command reaching the same repository, every
resolver ending in the same service — and that convergence is the thing a
picture shows and an indented tree cannot. On this workspace the run's 48 deep
stacks collapse to 276 callables with 14 of them called from more than one
place.

Entry points are drawn as stadiums and everything below them as boxes. Shape
rather than color, because the diagram is read in whichever theme the reader
has and only one of those is the one it was authored in. Labels carry the
callable's name alone: a diagram trying to also carry signatures is unreadable
at any size, and the tree already has room for them.

A diagram stops at 300 callables — GitHub refuses a mermaid block past 50,000
characters, and the widest project here draws 263. Whole stacks are dropped
rather than trimmed, so the diagram never contains an edge into something it
did not draw, and it says how many it left out.

`projectReadmes` is what puts a `## 🔭 Callidescope` section at the bottom of
every package in this repository. Each section carries that project's stacks and
findings rather than the workspace's, the first three stacks openly and the rest
behind a disclosure. Setting it to `{}` accepts every default:

```ts
output: { projectReadmes: {} }
```

Under `--check reports` a stale section fails and names every file that drifted,
rather than stopping at the first. This repository does not run that on a pull
request: `nx run codebase:callidescope:write` writes the sections on the
default branch, and the release commits them.

Narrowing with `--directories` is the difference between a whole-workspace
analysis and a one-second check, because each project needs its own TypeScript
program.

## Depth and breadth for named callables

`callidescope` reports the whole workspace; `depth` and `breadth` answer a
narrower question about callables you name, addressed the way a Python
traceback or an ESLint rule id points at a symbol — the file path and the
qualified name callidescope already prints in every stack, joined by `#`:

```bash
callidescope depth --addresses src/foo.service.ts#FooService.bar
callidescope breadth --addresses src/foo.service.ts#FooService.bar
```

`--addresses` is comma-separated, so one run can report on several callables —
which is what a rename spanning a handful of them actually needs:

```bash
callidescope depth --addresses src/foo.service.ts#FooService.bar,src/bar.service.ts#BarService.baz
```

**Every address has to resolve, or the run prints nothing.** A report covering
the addresses that were understood, under an exit code claiming success, is
worse than no report; a run naming an address it cannot match reports each
failure and exits non-zero.

A file holding more than one declaration under the same qualified name — two
overloads, two callbacks bound to the same property — is disambiguated with a
trailing `:<line>`, and both commands print every candidate's line when they
cannot tell which one was meant.

**`--addresses` is prompted for when omitted.** At a terminal, both commands
offer every callable the trace found as an autocompleting multiselect, so the
flag is something to skip rather than something to look up. With no terminal
there is nobody to ask, so the run is refused by name and exits non-zero
rather than drawing a menu nothing can answer.

Both accept the same workspace-scoping flags as `callidescope` itself —
`--directories`, `--config`, and `--format` — since resolving an address still
means tracing the workspace first. Neither takes `--check`,
`--write`, `--json`, or `--markdown`: a lookup only ever prints, to whichever
format `--format` names.

Under `--format json` both print **an array**, whatever the address count, so
one run is one document `JSON.parse` accepts without first counting how many
addresses were asked about.

**`depth`** prints every path above the callable and every path below it —
every caller chain up to a root, every callee chain down to a leaf — rather
than folding each direction into the single deepest one `callidescope`'s own
report keeps. A callable reached from a dozen places, or reaching a dozen
leaves, is exactly the shape this is asked to show in full, capped at 200
paths per direction so a widely-called utility cannot make the walk run away;
a capped run says so.

**`breadth`** prints the callable's direct callees and direct callers side by
side — what it calls, and what calls it — the two questions a refactor or a
rename needs answered together before either one is safe.

## Scoping by Nx project name

`--directories` takes paths, because callidescope has no idea what workspace
tool you use — a directory holding a `tsconfig.json` is the whole contract, and
it holds in a monorepo, a single package, or neither.

An Nx workspace can hand the selecting to Nx instead, through
[`@callidescope/nx`](../callidescope-nx/README.md) — a plugin that infers a
trace target onto every project:

```bash
nx run-many -t trace --projects=tag:type:package
nx affected -t trace
nx run callidescope-graph:depth --addresses="src/foo.service.ts#FooService.bar"
```

It infers a `trace`, a `depth`, and a `breadth` target onto every project, so
`callidescope`, `depth`, and `breadth` all become tasks — with Nx's own project
selection, caching, and affected-detection for free, none of which a flag here
could offer. It also traces each project **with its
Nx dependencies**, so a stack is not truncated the moment it crosses a package
boundary — the graph knowledge that makes the plugin worth having.

It is a separate package rather than a flag here on purpose: this CLI depends
on nothing Nx-shaped, and a flag that only worked when an optional package
happened to be installed would advertise in `--help` something that silently
did nothing without it.

## What it reports

**Deep call stacks.** The single deepest path below each entry point, when it
exceeds `maximumDepth`. Only one path per entry point is ever built — the deepest —
so a wide graph costs no more than a narrow one.

**Module spread.** A callable whose callees reach many unrelated modules, _and_
which calls several of them directly. Both conditions matter: transitive reach
alone flags every entry point, because an entry point legitimately reaches the
whole program.

**Possibly misplaced callables.** A callable whose callers nearly all sit in one
other module of the same project. The output is a concrete move.

A depth printed as `≥ 10` is a floor rather than a measurement: something on
that path could not be followed — a callback invoked through a parameter, a
computed member name — and the run says so rather than quietly under-reporting.

## What a frame carries

Every frame is annotated from the type checker, because a stack of bare names
is a list of places to go look rather than something you can read:

- **The signature** — parameter names and types, and the return type. On the
  repository this covers 100% of reported frames.
- **The documentation summary** — the JSDoc prose, collapsed to one line.
  Around 90% of reported frames have one.
- **Tags**, including `@deprecated`, which marks the frame inline.

Both come from the checker rather than the comment trivia, which is what makes
them right on the shapes this repository writes. An overload's documentation
lives on the signature rather than the implementation the graph points at; an
arrow-typed property's lives on the property rather than the arrow; a
destructured parameter has no name at all in the syntax. The checker resolves
all three.

A signature longer than 80 characters collapses to `(…): ReturnType`. That is
almost always a NestJS constructor taking a dozen injected services — which
services those are is noise at the point where you are reading a stack, and a
440-character line destroys the indentation that makes the stack legible.

A summary longer than 120 characters prints only its opening sentence. Comments
here state what a callable does and then explain why, and the first half is the
half that orients someone reading a stack. It prints unmarked, because a whole
sentence is a complete thought rather than an elision and the frame's
`file:line` already points at the rest. Only a single sentence with no boundary
to find is cut on a word and marked `…`, which across this repository is 30 of
905 printed summaries.

**Shortening applies to the printed tree only.** The JSON report carries every
comment in full, because a machine reading it has no line width to respect —
the longest in the workspace runs 288 characters.

Annotations are read only for the frames a report actually prints, not for all
3,264 callables. Rendering a type is the one genuinely costly thing the checker
does, and reports touch a few hundred frames.

## How it follows a call

The TypeScript type checker resolves each call site. A call on a
constructor-injected property needs no special handling: the parameter property
carries the service's type, and the checker follows it.

| Written as | Resolved by |
| ---------- | ----------- |
| `helper()` | The symbol at the callee, unwrapped through import aliases |
| `this.service.load()` | The symbol at the member name — the injected-dependency case |
| `provider.ingest()` | Every class structurally satisfying the interface, capped by `maximumImplementationCandidates` |
| `super.run()` | The base declaration the checker resolves to |
| `new Thing()` | The constructor, when it has a body |
| `list.map(callback)` | The callback, as its own frame — `map` itself is external |
| `target[key]()` | Nothing. Recorded as unfollowable rather than guessed |

Calls into dependencies are leaves. Whether `Array.prototype.map` is deeply
implemented says nothing about whether _your_ layering is too deep, and counting
it would make every number move on an unrelated upgrade.

Structural matching is not optional: classes here routinely satisfy an interface
without writing `implements`, and its members are usually arrow-typed properties
rather than method signatures. A nominal-only index finds none of them.

## Recursion

Cycles are collapsed before depth is measured, so a mutually recursive cluster
of three contributes three frames once — an honest floor on a stack that has no
ceiling. The alternative, detecting a repeat visit mid-walk, makes the answer
depend on which path arrived first, so the same function reports different
depths from different entry points and between runs. A linter whose numbers move
on their own is not usable as a gate.

## Entry points

Depth is only meaningful relative to a root, and most code here is called by a
framework rather than by the repository. Roots are therefore configurable:
decorated methods, lifecycle hooks, `main.ts` bootstraps, and every `src/index.ts`
export.

Anything left with no caller is promoted to an **orphan root**. That is the
safety net: without it, a missing rule silently removes a whole subtree from
every measurement instead of showing up.

## Examples

Every rule, finding, and output on this page has a worked example in
[`@callidescope/examples`](../callidescope-examples/README.md) — a small
codebase written to be traced, with its rendered reports committed. Its
[`AGENTS.md`](../callidescope-examples/AGENTS.md) is a "callidescope reported X
→ open this example" table, so a failing `callidescope:check` has somewhere to
go.

## Non-goals

**Control flow graphs.** Intra-procedural branching is already capped by this
repository's ESLint rules (`complexity`, `max-depth`, `max-statements`), and a
CFG is not what call-stack depth needs. Building one would duplicate ESLint at
much higher cost.

**Clone detection.** Repeated call-stack shapes are not a useful signal in a
dependency-injected codebase — the shared suffix _is_ the service layer, so
every resolver ends the same way. `jscpd` already covers real duplication.

## Packages

| Package | Role |
| ------- | ---- |
| [`@callidescope/cli`](.) | Orchestrates a run: traces the workspace, plans what to check, and reports |
| [`@callidescope/configuration`](../callidescope-configuration/README.md) | Reads `callidescope.config.ts` and resolves the limits |
| [`@callidescope/graph`](../callidescope-graph/README.md) | Builds the call graph from traced source and measures depth, breadth, and cohesion |
| [`@callidescope/nx`](../callidescope-nx/README.md) | Nx plugin: per-project `trace`/`depth`/`breadth` targets, scoped through the Nx dependency graph |
| [`@callidescope/output`](../callidescope-output/README.md) | Renders findings into markdown, mermaid, and JSON |
| [`@callidescope/examples`](../callidescope-examples/README.md) | A traced fixture codebase carrying one worked example of everything above |

## Start

```bash
nx run callidescope-cli:start
```

## Test

```bash
nx run callidescope-cli:vitest
```

## Contributing

```bash
nx run callidescope-cli:lint-codebase --configuration=check
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-cli`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 85 |
| Files | 32 |
| Calls traced | 119 |
| Call stacks | 14 |
| Deepest stack | 14 |
| Stacks through recursion | 0 |
| Unfollowable calls | 3 |

### Call stacks (depth)

**1. `BreadthCommand.run`** — depth ≥ 14 · decorated-method

```text
🚀 BreadthCommand.run(passedParameters: string[], options: AddressCommandOptions): Promise<void> [packages/callidescope-cli/src/modules/breadth/breadth.command.ts:197]
   ↳ Resolves the address and prints its direct callers and callees.
  └─> BreadthCommand.resolveDirectCalls(…): Promise<{ callable: DiscoveredCallable; directCalls: CallableDirectCalls; format: CallidescopeOutputFormat; id: string; } | undefined> [packages/callidescope-cli/src/modules/breadth/breadth.command.ts:96]
     ↳ Resolves the address to a callable and its direct calls, or fails the run and returns nothing.
    └─> AddressLookupService.lookup(args: LookupAddressArguments): Promise<LookupAddressOutcome> [packages/callidescope-cli/src/modules/address-lookup/address-lookup.service.ts:74]
       ↳ Loads the configuration, traces the workspace, and matches the address.
      └─> CallidescopeService.locate(args: TraceArguments): LocateOutcome [packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:233]
         ↳ Collects every callable and assembles the graph over them, without running the analysis a full trace does.
        └─> GraphAssemblyService.assemble(args: AssembleGraphArguments): AssembledGraph [packages/callidescope-graph/src/modules/graph/graph-assembly.service.ts:44]
           ↳ Builds the call graph and everything derived from it.
          └─> EdgesService.build(args: BuildEdgesArguments): EdgeCollection [packages/callidescope-graph/src/modules/edges/edges.service.ts:251]
             ↳ Builds every edge in the graph, and records the calls it could not.
            └─> EdgesService.buildSiteEdges(…): { edges: CallEdge[]; unresolved: UnresolvedCall[]; } [packages/callidescope-graph/src/modules/edges/edges.service.ts:59]
               ↳ Turns one call site into the edges and non-resolutions it produced.
              └─> EdgesService.resolveSite(…): ResolvedCallSite | undefined [packages/callidescope-graph/src/modules/edges/edges.service.ts:226]
                 ↳ Resolves one call site, choosing the right strategy for its shape.
                └─> SymbolResolutionService.resolve(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:267]
                   ↳ Resolves a call expression to every declaration it can reach.
                  └─> SymbolResolutionService.resolveSymbol(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:165]
                     ↳ Resolves an already-identified callee symbol to its declarations.
                    └─> SymbolResolutionService.resolveThroughHierarchy(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:217]
                       ↳ Expands an interface or abstract member to its implementations.
                      └─> ClassesService.resolveImplementations(…): ImplementationLookup [packages/callidescope-graph/src/modules/classes/classes.service.ts:207]
                         ↳ Finds the concrete declarations one interface member resolves to.
                        └─> ClassesService.filterAssignable(…): ClassDeclaration[] [packages/callidescope-graph/src/modules/classes/classes.service.ts:87]
                           ↳ Keeps only classes whose instance type satisfies the declaring type.
                          └─> ClassesService.filter(…)(candidate: ts.ClassDeclaration): boolean [packages/callidescope-graph/src/modules/classes/classes.service.ts:94]
```

**2. `CallidescopeCommand.run`** — depth ≥ 13 · decorated-method

```text
🚀 CallidescopeCommand.run(…): Promise<void> [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:396]
   ↳ Traces the workspace, reports, and sets the exit code.
  └─> CallidescopeService.trace(args: TraceArguments): TraceOutcome [packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:246]
     ↳ Traces a workspace and returns everything the run found.
    └─> CallidescopeService.analyze(…): CallGraphResult [packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:128]
       ↳ Derives every finding from the collected callables.
      └─> GraphAssemblyService.assemble(args: AssembleGraphArguments): AssembledGraph [packages/callidescope-graph/src/modules/graph/graph-assembly.service.ts:44]
         ↳ Builds the call graph and everything derived from it.
        └─> EdgesService.build(args: BuildEdgesArguments): EdgeCollection [packages/callidescope-graph/src/modules/edges/edges.service.ts:251]
           ↳ Builds every edge in the graph, and records the calls it could not.
          └─> EdgesService.buildSiteEdges(…): { edges: CallEdge[]; unresolved: UnresolvedCall[]; } [packages/callidescope-graph/src/modules/edges/edges.service.ts:59]
             ↳ Turns one call site into the edges and non-resolutions it produced.
            └─> EdgesService.resolveSite(…): ResolvedCallSite | undefined [packages/callidescope-graph/src/modules/edges/edges.service.ts:226]
               ↳ Resolves one call site, choosing the right strategy for its shape.
              └─> SymbolResolutionService.resolve(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:267]
                 ↳ Resolves a call expression to every declaration it can reach.
                └─> SymbolResolutionService.resolveSymbol(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:165]
                   ↳ Resolves an already-identified callee symbol to its declarations.
                  └─> SymbolResolutionService.resolveThroughHierarchy(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:217]
                     ↳ Expands an interface or abstract member to its implementations.
                    └─> ClassesService.resolveImplementations(…): ImplementationLookup [packages/callidescope-graph/src/modules/classes/classes.service.ts:207]
                       ↳ Finds the concrete declarations one interface member resolves to.
                      └─> ClassesService.filterAssignable(…): ClassDeclaration[] [packages/callidescope-graph/src/modules/classes/classes.service.ts:87]
                         ↳ Keeps only classes whose instance type satisfies the declaring type.
                        └─> ClassesService.filter(…)(candidate: ts.ClassDeclaration): boolean [packages/callidescope-graph/src/modules/classes/classes.service.ts:94]
```

**3. `DepthCommand.run`** — depth ≥ 13 · decorated-method

```text
🚀 DepthCommand.run(passedParameters: string[], options: AddressCommandOptions): Promise<void> [packages/callidescope-cli/src/modules/depth/depth.command.ts:144]
   ↳ Resolves the address, traces every path above and below it, and prints them.
  └─> AddressLookupService.lookup(args: LookupAddressArguments): Promise<LookupAddressOutcome> [packages/callidescope-cli/src/modules/address-lookup/address-lookup.service.ts:74]
     ↳ Loads the configuration, traces the workspace, and matches the address.
    └─> CallidescopeService.locate(args: TraceArguments): LocateOutcome [packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:233]
       ↳ Collects every callable and assembles the graph over them, without running the analysis a full trace does.
      └─> GraphAssemblyService.assemble(args: AssembleGraphArguments): AssembledGraph [packages/callidescope-graph/src/modules/graph/graph-assembly.service.ts:44]
         ↳ Builds the call graph and everything derived from it.
        └─> EdgesService.build(args: BuildEdgesArguments): EdgeCollection [packages/callidescope-graph/src/modules/edges/edges.service.ts:251]
           ↳ Builds every edge in the graph, and records the calls it could not.
          └─> EdgesService.buildSiteEdges(…): { edges: CallEdge[]; unresolved: UnresolvedCall[]; } [packages/callidescope-graph/src/modules/edges/edges.service.ts:59]
             ↳ Turns one call site into the edges and non-resolutions it produced.
            └─> EdgesService.resolveSite(…): ResolvedCallSite | undefined [packages/callidescope-graph/src/modules/edges/edges.service.ts:226]
               ↳ Resolves one call site, choosing the right strategy for its shape.
              └─> SymbolResolutionService.resolve(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:267]
                 ↳ Resolves a call expression to every declaration it can reach.
                └─> SymbolResolutionService.resolveSymbol(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:165]
                   ↳ Resolves an already-identified callee symbol to its declarations.
                  └─> SymbolResolutionService.resolveThroughHierarchy(…): ResolvedCallSite [packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:217]
                     ↳ Expands an interface or abstract member to its implementations.
                    └─> ClassesService.resolveImplementations(…): ImplementationLookup [packages/callidescope-graph/src/modules/classes/classes.service.ts:207]
                       ↳ Finds the concrete declarations one interface member resolves to.
                      └─> ClassesService.filterAssignable(…): ClassDeclaration[] [packages/callidescope-graph/src/modules/classes/classes.service.ts:87]
                         ↳ Keeps only classes whose instance type satisfies the declaring type.
                        └─> ClassesService.filter(…)(candidate: ts.ClassDeclaration): boolean [packages/callidescope-graph/src/modules/classes/classes.service.ts:94]
```

<details>
<summary>11 more call stacks</summary>

**4. `CallidescopeCommand.parseDirectories`** — depth 3 · decorated-method

```text
🚀 CallidescopeCommand.parseDirectories(value: string | undefined): string[] [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:328]
   ↳ Parses `--directories`, a comma-separated list of project directories.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] [packages/callidescope-configuration/src/modules/input/input.service.ts:55]
     ↳ Splits `--directories`, a comma-separated list of project directories.
    └─> InputService.map(…)(entry: string): string [packages/callidescope-configuration/src/modules/input/input.service.ts:60]
```

**5. `BreadthCommand.parseDirectories`** — depth 3 · decorated-method

```text
🚀 BreadthCommand.parseDirectories(value: string | undefined): string[] [packages/callidescope-cli/src/modules/breadth/breadth.command.ts:170]
   ↳ Parses `--directories`, a comma-separated list of project directories.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] [packages/callidescope-configuration/src/modules/input/input.service.ts:55]
     ↳ Splits `--directories`, a comma-separated list of project directories.
    └─> InputService.map(…)(entry: string): string [packages/callidescope-configuration/src/modules/input/input.service.ts:60]
```

**6. `DepthCommand.parseDirectories`** — depth 3 · decorated-method

```text
🚀 DepthCommand.parseDirectories(value: string | undefined): string[] [packages/callidescope-cli/src/modules/depth/depth.command.ts:114]
   ↳ Parses `--directories`, a comma-separated list of project directories.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] [packages/callidescope-configuration/src/modules/input/input.service.ts:55]
     ↳ Splits `--directories`, a comma-separated list of project directories.
    └─> InputService.map(…)(entry: string): string [packages/callidescope-configuration/src/modules/input/input.service.ts:60]
```

**7. `CallidescopeCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 CallidescopeCommand.parseConfig(value: string | undefined): string | undefined [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:319]
   ↳ Parses `--config`.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/callidescope-configuration/src/modules/input/input.service.ts:80]
     ↳ Trims an optional string option, treating blank as absent.
```

**8. `CallidescopeCommand.parseFormat`** — depth 2 · decorated-method

```text
🚀 CallidescopeCommand.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:337]
   ↳ Parses `--format`, which decides what the run prints.
  └─> InputService.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-configuration/src/modules/input/input.service.ts:71]
     ↳ Parses `--format`, which decides what a run prints.
```

**9. `CallidescopeCommand.parseJson`** — depth 2 · decorated-method

```text
🚀 CallidescopeCommand.parseJson(value: string | undefined): string | undefined [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:355]
   ↳ Parses `--json`.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/callidescope-configuration/src/modules/input/input.service.ts:80]
     ↳ Trims an optional string option, treating blank as absent.
```

**10. `CallidescopeCommand.parseMarkdown`** — depth 2 · decorated-method

```text
🚀 CallidescopeCommand.parseMarkdown(value: string | undefined): string | undefined [packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:364]
   ↳ Parses `--markdown`.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/callidescope-configuration/src/modules/input/input.service.ts:80]
     ↳ Trims an optional string option, treating blank as absent.
```

**11. `BreadthCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 BreadthCommand.parseConfig(value: string | undefined): string | undefined [packages/callidescope-cli/src/modules/breadth/breadth.command.ts:161]
   ↳ Parses `--config`.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/callidescope-configuration/src/modules/input/input.service.ts:80]
     ↳ Trims an optional string option, treating blank as absent.
```

**12. `BreadthCommand.parseFormat`** — depth 2 · decorated-method

```text
🚀 BreadthCommand.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-cli/src/modules/breadth/breadth.command.ts:179]
   ↳ Parses `--format`.
  └─> InputService.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-configuration/src/modules/input/input.service.ts:71]
     ↳ Parses `--format`, which decides what a run prints.
```

**13. `DepthCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 DepthCommand.parseConfig(value: string | undefined): string | undefined [packages/callidescope-cli/src/modules/depth/depth.command.ts:105]
   ↳ Parses `--config`.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/callidescope-configuration/src/modules/input/input.service.ts:80]
     ↳ Trims an optional string option, treating blank as absent.
```

**14. `DepthCommand.parseFormat`** — depth 2 · decorated-method

```text
🚀 DepthCommand.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-cli/src/modules/depth/depth.command.ts:123]
   ↳ Parses `--format`.
  └─> InputService.parseFormat(value: string | undefined): CallidescopeOutputFormat [packages/callidescope-configuration/src/modules/input/input.service.ts:71]
     ↳ Parses `--format`, which decides what a run prints.
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `CallidescopeService.analyze` | 11 | `packages/callidescope-graph:modules/cohesion`, `packages/callidescope-graph:modules/entries`, `packages/callidescope-graph:modules/graph`, `packages/callidescope-output:modules/project-reports` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:128` |
| `AddressLookupService.lookup` | 10 | `packages/callidescope-cli:modules/callidescope`, `packages/callidescope-cli:modules/run-plan`, `packages/callidescope-graph:modules/callables` | `packages/callidescope-cli/src/modules/address-lookup/address-lookup.service.ts:74` |
| `CallidescopeService.discoverCallables` | 5 | `packages/callidescope-graph:modules/callables`, `packages/callidescope-graph:modules/classes`, `packages/callidescope-graph:modules/program`, `packages/callidescope-graph:modules/workspace` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:71` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CallidescopeService.analyze` | 10 | `GraphAssemblyService.assemble`, `EntriesService.resolve`, `CohesionService.findMisplacedCallables`, `CohesionService.findModuleSpreads`, `CohesionService.summarizeTypeDepths`, `ProjectReportsService.build`, `CallidescopeService.filter(…)`, `CallidescopeService.readMaximumDepth`, `ProjectReportsService.findDeepStacks`, `ProjectReportsService.findWideCallables` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:128` |
| `CallidescopeService.discoverCallables` | 9 | `WorkspaceService.configure`, `WorkspaceService.discoverProjects`, `ProgramService.buildPrograms`, `ExternalService.configure`, `ClassesService.build`, `CallablesService.collect`, `WorkspaceService.buildFileFilter`, `CallidescopeService.map(…)`, `CallidescopeService.map(…)` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:71` |
| `DepthCommand.run` | 9 | `InputService.canPrompt`, `DepthCommand.resolveAddress`, `DepthCommand.resolveOptions`, `AddressLookupService.lookup`, `AddressLookupService.describeProblem`, `DepthCommand.rejectAddress`, `AddressDepthService.buildDownwardStacks`, `AddressDepthService.buildUpwardStacks`, `AddressReportService.renderDepth` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:144` |

<details>
<summary>46 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CallidescopeCommand.run` | 8 | `InputService.canPrompt`, `CallidescopeCommand.resolveOptions`, `RunPlanService.prepareRun`, `CallidescopeService.trace`, `CallidescopeCommand.report`, `RunPlanService.touchesFiles`, `CallidescopeCommand.syncDestinations`, `CallidescopeCommand.reportFindings` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:396` |
| `CallidescopeCommand.syncDestinations` | 6 | `OutputJsonService.sync`, `OutputMarkdownService.sync`, `MarkdownReportService.renderRun`, `CallidescopeCommand.readPreviewCount`, `OutputMarkdownService.syncProjectReadmes`, `CallidescopeCommand.buildProjectSections` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:243` |
| `BreadthCommand.run` | 5 | `InputService.canPrompt`, `BreadthCommand.resolveAddress`, `BreadthCommand.resolveOptions`, `BreadthCommand.resolveDirectCalls`, `AddressReportService.renderBreadth` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:197` |
| `RunPlanService.readCheckNames` | 4 | `RunPlanService.describeAcceptedCheckNames`, `RunPlanService.filter(…)`, `RunPlanService.map(…)`, `RunPlanService.validateCheckNames` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:60` |
| `RunPlanService.prepareRun` | 4 | `RunPlanService.selectMode`, `ConfigurationService.loadConfiguration`, `RunPlanService.resolveMarkdownDestination`, `RunPlanService.validateConfiguration` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:165` |
| `AddressReportService.renderBreadthDiagram` | 4 | `AddressReportService.toFrame`, `AddressReportService.map(…)`, `AddressReportService.map(…)`, `MermaidReportService.renderStacks` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:37` |
| `BreadthCommand.resolveDirectCalls` | 4 | `AddressLookupService.lookup`, `AddressLookupService.describeProblem`, `BreadthCommand.rejectAddress`, `BreadthService.describeDirectCalls` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:96` |
| `CallidescopeCommand.report` | 3 | `OutputJsonService.buildReport`, `MarkdownReportService.renderRun`, `CallidescopeCommand.readPreviewCount` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:114` |
| `CallidescopeCommand.reportFindings` | 3 | `CallidescopeCommand.reportStaleness`, `CallidescopeCommand.reportDeepStacks`, `CallidescopeCommand.reportWideCallables` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:175` |
| `AddressLookupService.lookup` | 3 | `RunPlanService.prepareLookup`, `CallidescopeService.locate`, `AddressService.resolve` | `packages/callidescope-cli/src/modules/address-lookup/address-lookup.service.ts:74` |
| `CallidescopeService.locate` | 2 | `CallidescopeService.discoverCallables`, `GraphAssemblyService.assemble` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:233` |
| `CallidescopeService.trace` | 2 | `CallidescopeService.discoverCallables`, `CallidescopeService.analyze` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:246` |
| `CallidescopeCommand.reportDeepStacks` | 2 | `CallidescopeCommand.map(…)`, `CallidescopeCommand.map(…)` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:150` |
| `CallidescopeCommand.reportWideCallables` | 2 | `CallidescopeCommand.map(…)`, `CallidescopeCommand.map(…)` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:205` |
| `AddressReportService.renderBreadth` | 2 | `AddressReportService.renderBreadthDiagram`, `AddressReportService.renderReferenceTable` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:129` |
| `AddressReportService.renderDepth` | 2 | `MermaidReportService.renderStacks`, `AddressReportService.renderDepthStacks` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:166` |
| `RunPlanService.describeAcceptedCheckNames` | 1 | `RunPlanService.map(…)` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:48` |
| `RunPlanService.resolveMarkdownDestination` | 1 | `ConfigurationService.resolveConfiguration` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:92` |
| `RunPlanService.validateCheckNames` | 1 | `RunPlanService.describeAcceptedCheckNames` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:108` |
| `RunPlanService.prepareLookup` | 1 | `ConfigurationService.loadConfiguration` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:136` |
| `RunPlanService.selectMode` | 1 | `RunPlanService.readCheckNames` | `packages/callidescope-cli/src/modules/run-plan/run-plan.service.ts:230` |
| `CallidescopeService.readMaximumDepth` | 1 | `CallidescopeService.reduce(…)` | `packages/callidescope-cli/src/modules/callidescope/callidescope.service.ts:118` |
| `CallidescopeCommand.buildProjectSections` | 1 | `CallidescopeCommand.flatMap(…)` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:69` |
| `CallidescopeCommand.flatMap(…)` | 1 | `MarkdownReportService.renderProjectSection` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:77` |
| `CallidescopeCommand.resolveOptions` | 1 | `InputService.promptForSelect` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:226` |
| `CallidescopeCommand.parseConfig` | 1 | `InputService.parseOptionalOption` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:319` |
| `CallidescopeCommand.parseDirectories` | 1 | `InputService.parseCommaDelimitedOption` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:328` |
| `CallidescopeCommand.parseFormat` | 1 | `InputService.parseFormat` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:337` |
| `CallidescopeCommand.parseJson` | 1 | `InputService.parseOptionalOption` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:355` |
| `CallidescopeCommand.parseMarkdown` | 1 | `InputService.parseOptionalOption` | `packages/callidescope-cli/src/modules/callidescope/callidescope.command.ts:364` |
| `AddressLookupService.describeProblem` | 1 | `AddressLookupService.map(…)` | `packages/callidescope-cli/src/modules/address-lookup/address-lookup.service.ts:45` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.toFrame` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:48` |
| `AddressReportService.map(…)` | 1 | `AddressReportService.toFrame` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:51` |
| `AddressReportService.renderDepthStacks` | 1 | `AddressReportService.map(…)` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:60` |
| `AddressReportService.map(…)` | 1 | `ReportService.renderStackTree` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:71` |
| `AddressReportService.renderReferenceTable` | 1 | `AddressReportService.map(…)` | `packages/callidescope-cli/src/modules/address-report/address-report.service.ts:92` |
| `BreadthCommand.resolveAddress` | 1 | `InputService.promptForText` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:66` |
| `BreadthCommand.resolveOptions` | 1 | `InputService.promptForSelect` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:142` |
| `BreadthCommand.parseConfig` | 1 | `InputService.parseOptionalOption` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:161` |
| `BreadthCommand.parseDirectories` | 1 | `InputService.parseCommaDelimitedOption` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:170` |
| `BreadthCommand.parseFormat` | 1 | `InputService.parseFormat` | `packages/callidescope-cli/src/modules/breadth/breadth.command.ts:179` |
| `DepthCommand.resolveAddress` | 1 | `InputService.promptForText` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:59` |
| `DepthCommand.resolveOptions` | 1 | `InputService.promptForSelect` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:86` |
| `DepthCommand.parseConfig` | 1 | `InputService.parseOptionalOption` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:105` |
| `DepthCommand.parseDirectories` | 1 | `InputService.parseCommaDelimitedOption` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:114` |
| `DepthCommand.parseFormat` | 1 | `InputService.parseFormat` | `packages/callidescope-cli/src/modules/depth/depth.command.ts:123` |

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
  logger["logger"]
  callidescope_cli --> callidescope_configuration
  callidescope_cli --> callidescope_graph
  callidescope_cli --> callidescope_output
  callidescope_cli --> logger
  callidescope_examples -.-> callidescope_cli
  callidescope_nx --> callidescope_cli
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_cli subject
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  AddressLookupModule
  AddressReportModule
  BreadthModule
  CallablesModule
  CallidescopeModule
  ClassesModule
  CohesionModule
  ConfigModule([ConfigModule])
  ConfigurationModule
  DepthModule
  DiscoveryModule
  DocumentationModule
  EdgesModule
  EntriesModule
  GraphModule
  InputModule
  LoggerModule([LoggerModule])
  MainModule
  OutputJsonModule
  OutputMarkdownModule
  ProgramModule
  ProjectReportsModule
  ReportModule
  RunPlanModule
  SignaturesModule
  WorkspaceModule
  AddressLookupModule --> CallablesModule
  AddressLookupModule --> CallidescopeModule
  AddressLookupModule --> RunPlanModule
  AddressReportModule --> ReportModule
  BreadthModule --> AddressLookupModule
  BreadthModule --> AddressReportModule
  BreadthModule --> GraphModule
  BreadthModule --> InputModule
  CallablesModule --> ProgramModule
  CallablesModule --> WorkspaceModule
  CallidescopeModule --> CallablesModule
  CallidescopeModule --> ClassesModule
  CallidescopeModule --> CohesionModule
  CallidescopeModule --> ConfigurationModule
  CallidescopeModule --> EdgesModule
  CallidescopeModule --> EntriesModule
  CallidescopeModule --> GraphModule
  CallidescopeModule --> InputModule
  CallidescopeModule --> OutputJsonModule
  CallidescopeModule --> OutputMarkdownModule
  CallidescopeModule --> ProgramModule
  CallidescopeModule --> ProjectReportsModule
  CallidescopeModule --> ReportModule
  CallidescopeModule --> RunPlanModule
  CallidescopeModule --> WorkspaceModule
  DepthModule --> AddressLookupModule
  DepthModule --> AddressReportModule
  DepthModule --> GraphModule
  DepthModule --> InputModule
  EdgesModule --> CallablesModule
  EdgesModule --> ClassesModule
  EdgesModule --> ProgramModule
  EdgesModule --> WorkspaceModule
  GraphModule --> DocumentationModule
  GraphModule --> EdgesModule
  GraphModule --> SignaturesModule
  MainModule --> BreadthModule
  MainModule --> CallidescopeModule
  MainModule --> ConfigurationModule
  MainModule --> DepthModule
  MainModule --> DiscoveryModule
  ProgramModule --> WorkspaceModule
  ProjectReportsModule --> GraphModule
  ProjectReportsModule --> SignaturesModule
  RunPlanModule --> ConfigurationModule
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
  file_src_modules_address_lookup_address_lookup_constants_ts["src/modules/address-lookup/address-lookup.constants.ts"]
  file_src_modules_address_lookup_address_lookup_module_ts["src/modules/address-lookup/address-lookup.module.ts"]
  file_src_modules_address_lookup_address_lookup_service_ts["src/modules/address-lookup/address-lookup.service.ts"]
  file_src_modules_address_lookup_address_lookup_service_unit_test_ts["src/modules/address-lookup/address-lookup.service.unit.test.ts"]
  file_src_modules_address_lookup_address_lookup_types_ts["src/modules/address-lookup/address-lookup.types.ts"]
  file_src_modules_address_report_address_report_constants_ts["src/modules/address-report/address-report.constants.ts"]
  file_src_modules_address_report_address_report_module_ts["src/modules/address-report/address-report.module.ts"]
  file_src_modules_address_report_address_report_service_ts["src/modules/address-report/address-report.service.ts"]
  file_src_modules_address_report_address_report_service_unit_test_ts["src/modules/address-report/address-report.service.unit.test.ts"]
  file_src_modules_address_report_address_report_types_ts["src/modules/address-report/address-report.types.ts"]
  file_src_modules_breadth_breadth_command_ts["src/modules/breadth/breadth.command.ts"]
  file_src_modules_breadth_breadth_command_unit_test_ts["src/modules/breadth/breadth.command.unit.test.ts"]
  file_src_modules_breadth_breadth_constants_ts["src/modules/breadth/breadth.constants.ts"]
  file_src_modules_breadth_breadth_module_ts["src/modules/breadth/breadth.module.ts"]
  file_src_modules_breadth_breadth_types_ts["src/modules/breadth/breadth.types.ts"]
  file_src_modules_callidescope_callidescope_command_ts["src/modules/callidescope/callidescope.command.ts"]
  file_src_modules_callidescope_callidescope_command_unit_test_ts["src/modules/callidescope/callidescope.command.unit.test.ts"]
  file_src_modules_callidescope_callidescope_constants_ts["src/modules/callidescope/callidescope.constants.ts"]
  file_src_modules_callidescope_callidescope_module_ts["src/modules/callidescope/callidescope.module.ts"]
  file_src_modules_callidescope_callidescope_service_integration_test_ts["src/modules/callidescope/callidescope.service.integration.test.ts"]
  file_src_modules_callidescope_callidescope_service_ts["src/modules/callidescope/callidescope.service.ts"]
  file_src_modules_callidescope_callidescope_service_unit_test_ts["src/modules/callidescope/callidescope.service.unit.test.ts"]
  file_src_modules_callidescope_callidescope_types_ts["src/modules/callidescope/callidescope.types.ts"]
  file_src_modules_depth_depth_command_ts["src/modules/depth/depth.command.ts"]
  file_src_modules_depth_depth_command_unit_test_ts["src/modules/depth/depth.command.unit.test.ts"]
  file_src_modules_depth_depth_constants_ts["src/modules/depth/depth.constants.ts"]
  file_src_modules_depth_depth_module_ts["src/modules/depth/depth.module.ts"]
  file_src_modules_depth_depth_types_ts["src/modules/depth/depth.types.ts"]
  file_src_modules_run_plan_run_plan_constants_ts["src/modules/run-plan/run-plan.constants.ts"]
  file_src_modules_run_plan_run_plan_module_ts["src/modules/run-plan/run-plan.module.ts"]
  file_src_modules_run_plan_run_plan_service_ts["src/modules/run-plan/run-plan.service.ts"]
  file_src_modules_run_plan_run_plan_service_unit_test_ts["src/modules/run-plan/run-plan.service.unit.test.ts"]
  file_src_modules_run_plan_run_plan_types_ts["src/modules/run-plan/run-plan.types.ts"]
  file_src_repl_ts["src/repl.ts"]
  file_src_repl_unit_test_ts["src/repl.unit.test.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_modules_ts["testing/modules.ts"]
  file_testing_programs_ts["testing/programs.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_main_end_to_end_test_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_modules_breadth_breadth_module_ts
  file_src_main_module_ts --> file_src_modules_callidescope_callidescope_module_ts
  file_src_main_module_ts --> file_src_modules_depth_depth_module_ts
  file_src_main_ts --> file_src_main_module_ts
  file_src_modules_address_lookup_address_lookup_module_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_address_lookup_address_lookup_module_ts --> file_src_modules_callidescope_callidescope_module_ts
  file_src_modules_address_lookup_address_lookup_module_ts --> file_src_modules_run_plan_run_plan_module_ts
  file_src_modules_address_lookup_address_lookup_service_ts --> file_src_modules_address_lookup_address_lookup_types_ts
  file_src_modules_address_lookup_address_lookup_service_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_address_lookup_address_lookup_service_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_address_lookup_address_lookup_service_unit_test_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_address_lookup_address_lookup_service_unit_test_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_address_lookup_address_lookup_service_unit_test_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_address_lookup_address_lookup_service_unit_test_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_address_lookup_address_lookup_types_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_address_report_address_report_module_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_address_report_address_report_service_ts --> file_src_modules_address_report_address_report_types_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_address_report_address_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_breadth_breadth_command_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_breadth_breadth_command_ts --> file_src_modules_address_lookup_address_lookup_types_ts
  file_src_modules_breadth_breadth_command_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_breadth_breadth_command_unit_test_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_breadth_breadth_command_unit_test_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_breadth_breadth_command_unit_test_ts --> file_src_modules_breadth_breadth_command_ts
  file_src_modules_breadth_breadth_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_breadth_breadth_module_ts --> file_src_modules_address_lookup_address_lookup_module_ts
  file_src_modules_breadth_breadth_module_ts --> file_src_modules_address_report_address_report_module_ts
  file_src_modules_breadth_breadth_module_ts --> file_src_modules_breadth_breadth_command_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_callidescope_callidescope_constants_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_run_plan_run_plan_constants_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_callidescope_callidescope_command_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_callidescope_callidescope_command_unit_test_ts --> file_src_modules_callidescope_callidescope_command_ts
  file_src_modules_callidescope_callidescope_command_unit_test_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_callidescope_callidescope_command_unit_test_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_callidescope_callidescope_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_callidescope_callidescope_module_ts --> file_src_modules_callidescope_callidescope_command_ts
  file_src_modules_callidescope_callidescope_module_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_callidescope_callidescope_module_ts --> file_src_modules_run_plan_run_plan_module_ts
  file_src_modules_callidescope_callidescope_service_integration_test_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_callidescope_callidescope_service_integration_test_ts --> file_testing_modules_ts
  file_src_modules_callidescope_callidescope_service_ts --> file_src_modules_callidescope_callidescope_constants_ts
  file_src_modules_callidescope_callidescope_service_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_callidescope_callidescope_service_unit_test_ts --> file_src_modules_callidescope_callidescope_service_ts
  file_src_modules_callidescope_callidescope_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_callidescope_callidescope_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_depth_depth_command_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_depth_depth_command_ts --> file_src_modules_address_lookup_address_lookup_types_ts
  file_src_modules_depth_depth_command_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_depth_depth_command_unit_test_ts --> file_src_modules_address_lookup_address_lookup_service_ts
  file_src_modules_depth_depth_command_unit_test_ts --> file_src_modules_address_report_address_report_service_ts
  file_src_modules_depth_depth_command_unit_test_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_depth_depth_command_unit_test_ts --> file_src_modules_depth_depth_command_ts
  file_src_modules_depth_depth_module_ts --> file_src_modules_address_lookup_address_lookup_module_ts
  file_src_modules_depth_depth_module_ts --> file_src_modules_address_report_address_report_module_ts
  file_src_modules_depth_depth_module_ts --> file_src_modules_depth_depth_command_ts
  file_src_modules_run_plan_run_plan_module_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_address_lookup_address_lookup_types_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_callidescope_callidescope_types_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_run_plan_run_plan_constants_ts
  file_src_modules_run_plan_run_plan_service_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_modules_run_plan_run_plan_service_unit_test_ts --> file_src_modules_run_plan_run_plan_service_ts
  file_src_modules_run_plan_run_plan_service_unit_test_ts --> file_src_modules_run_plan_run_plan_types_ts
  file_src_repl_ts --> file_src_main_module_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5759-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-182.14_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-9-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-48-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-21.52_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-47-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-15-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-33-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-122-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-1-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-10-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-18-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-14-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-230-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-76-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-219-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-87-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-208-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-223-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-51-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-235-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-399-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-156-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-35-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-103-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-83-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-32-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-139-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-7-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-4-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-3-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-6-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-6-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-0-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-8-7c3aed?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-1-0284c7?style=flat-square)
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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-251-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-14-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-50-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-28-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-13-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-80-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
