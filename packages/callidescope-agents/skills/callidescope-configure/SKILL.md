---
name: callidescope-configure
description: Tell callidescope what to do — the command-line flags (--check, --write, --addresses, --directories, --format, --config, --json, --markdown) and the callidescope.config.ts they read alongside, covering depth, breadth, and spread limits, declared and rule-based call-stack entry points, exclusions and ignored callees, the workspace's module layout, where a run writes its JSON, markdown, mermaid, and per-project reports, and the much smaller surface a project's own configuration file may set. Use when wiring a depth gate into CI or a commit hook, when a whole-workspace run is too slow, when choosing between --check and --write, when a repository has no callidescope configuration yet, when a project needs its own depth or breadth limit, when a package low in the graph measures nothing, when a trace judges code it should not be judging, when everything is reported as an orphan root, when reading callidescope limits, or when deciding where a committed report should live.
license: MIT
---

# Telling callidescope what to do

Two surfaces, read together on every run: the flags on the command line, and
the `callidescope.config.ts` they layer over. Neither is complete on its own —
`--check` names a limit the file has to have set, and a destination in the file
is only written when a flag asks for it.

## The two decisions a run makes

Every invocation answers two independent questions, neither implying the other:

| Question | Answered by |
| -------- | ----------- |
| What does this run fail on? | `--check`, a comma-separated set |
| What does this run rewrite? | `--write`, plus the destinations in the configuration |

A run given neither `--write` nor `--check reports` **reads no destination and
rewrites none**: it traces, prints, and exits. That is what makes a bare run
safe to type inside somebody's checkout, and why a gate on a pull request
leaves every committed report exactly as it found it.

## The flags

| Flag | Meaning |
| ---- | ------- |
| `-a, --addresses` | Comma-separated callable addresses, each `<file>#<qualified-name>`. `depth` and `breadth` only. Prompted for when omitted |
| `--config` | Path to a `callidescope.config.ts`. Searched for when omitted |
| `-d, --directories` | Comma-separated project directories to trace, each holding its own `tsconfig.json` |
| `-f, --format` | `markdown`, `mermaid`, or `json`, for what it prints. Markdown by default |
| `--json` | Where the machine-readable report goes. Needs `--write` or `--check reports` |
| `-m, --markdown` | Where the markdown block goes. Needs `--write` or `--check reports` |
| `--check` | Fail on a comma-separated set drawn from `breadth`, `depth`, and `reports` |
| `--write` | Write every configured destination |

`--config`, `--directories`, and `--format` are the three that `depth` and
`breadth` also take, and `--addresses` is theirs alone — it names what to
report on, which a whole-workspace trace never needs. The rest belong to the
whole-workspace command, which is the only one that writes or compares.

### `--check` takes a set, and the set matters

| Value | What fails the run |
| ----- | ------------------ |
| `depth` | A call stack deeper than `limits.maximumDepth` |
| `breadth` | A callable calling more callables directly than `limits.maximumBreadth` |
| `reports` | A configured destination no longer holding what a fresh run would write |

Three refusals to expect, all deliberate:

- **`--check` with no value is refused.** A set with nothing in it is
  indistinguishable from the flag having been left off, so reading it as "gate
  nothing" would produce a gate that cannot fail. `--check "$GATES"` with the
  variable unset would then pass forever over a stack twice as deep as anything
  allowed — worse than no gate, because it looks like protection.
- **An unrecognized value is refused**, and the message lists what is accepted.
- **`--check breadth` with no project in scope declaring `limits.maximumBreadth`
  is refused.** Breadth is the one limit with no default, and the one limit a
  workspace cannot usefully pick alone: until a **project** picks a number,
  nothing can exceed it, and falling back to an unbounded limit would look
  exactly like passing. This one is checked after the trace rather than before
  it, because which projects were in scope is something only the trace knows.

### Why `depth` and `reports` belong on opposite sides of a pull request

**Depth is the gate.** A stack got longer in this change, and this change is
what fixes it. Run it on every pull request, and on every commit if you like —
depth reads source and needs no build, which is what keeps it cheap enough for
a commit hook.

```bash
npx callidescope --check depth
```

**In an Nx workspace, prefer the per-project `gate` target to this flag.** A
whole-workspace `--check depth` reaches the right verdict the expensive way:
one uncacheable run over the repository on every commit. `@callidescope/nx`
infers a `gate` onto each project instead — tracing it with its Nx
dependencies, failing only on the findings **that project owns**, and caching
on that project's own inputs, so `nx affected --target=gate` judges what a
change touched and nothing else. The flag remains the answer without Nx.

**Staleness is not a gate.** A report goes stale whenever the call graph moves
anywhere, which is nearly every change, so gating on it fails pull requests for
drift they did not cause. Publish on the default branch instead, where nothing
else competes to rewrite the same block:

```bash
npx callidescope --write
```

`--write --check reports` is **refused outright**: a report cannot be stale in
the run that just wrote it, so asking for both misunderstands one of them and
would pass whatever it was meant to catch.

Those two are the whole target set. If a task runner is in play, neither may be
reachable from a composite task that forwards a configuration down its
dependencies, or a `write` run from a branch publishes from a branch. Name the
gate directly alongside whatever else gates, not off a lint-style aggregate.

### `--directories`, and why a run is slow without it

This is the difference between a whole-workspace analysis and a check that
finishes in seconds. Each directory named needs its own `tsconfig.json`, and
the programs built are those plus every project they transitively import, so a
call into a dependency still resolves to a real frame:

```bash
npx callidescope -d packages/foo,packages/bar --check depth
```

Omit it and callidescope walks the working directory for every `tsconfig.json`
it finds. Reach for the wide run for the workspace-wide picture, not for an
answer about one package.

It takes **paths**, not project names: callidescope knows nothing of workspace
tooling, and a directory holding a `tsconfig.json` is the whole contract. The
same list can be set once as `directories` in the configuration file.

There is a real trade-off when narrowing a `breadth` lookup: **callers outside
the named directories and the closure below them do not exist to the run** —
the closure runs downward, so a dependent that calls in is never built. For a
rename whose blast radius is the point, trace wide enough to contain every
consumer; a lookup reporting two callers when there are nine is worse than a
slow one.

An Nx workspace can hand the selecting to Nx instead, through the separate
`@callidescope/nx` plugin, which infers `trace`, `depth`, `breadth`, and `gate`
targets onto every project and traces each one _with its Nx dependencies_ — so
those are projects the run is scoped to rather than ones it merely reached
through a closure. The first three only print; `gate` decides an exit code and
is what a branch runs. An excluded project keeps the three that print and is
denied the gate: its own code is never traced, so a gate there would report
green for a project it never read. It is a separate package rather than a flag
purpose: this CLI depends on nothing Nx-shaped, and a flag that worked only
when an optional package happened to be installed would advertise in `--help`
something that silently did nothing.

### `--format` decides what prints, not what is written

Printing and writing are independent, and both can be on at once. `--format`
names one of `markdown` (the default), `mermaid`, or `json` for standard
output; the destinations in the configuration decide what reaches a file.
`markdown` leads because it is the one rendering that reads in a terminal,
pastes into an issue, and is already what the files hold.

### Prompting, and why it will not hang a script

`callidescope`, `depth`, and `breadth` all prompt for a value left off the
command line — `depth` and `breadth` for a missing `--addresses`, all three for
a missing `--format`. There is no flag to turn that off, because **an attached
terminal is the whole condition**: a script, a hook, or a CI job never has one
and so is never prompted.

What each command does with a value it cannot ask for depends on whether
anything else could supply it:

| Value | With no terminal |
| ----- | ---------------- |
| `--addresses`, which `depth` and `breadth` need | **Refused**, exit non-zero. Nothing else can supply it |
| `--format` | The format in the configuration stands, and the run proceeds |

The refusal is the load-bearing half. `prompts` does not fail on a non-terminal
stdin — it draws its menu, never resolves, and lets the process **exit 0 having
done nothing** — so a required value asserts a terminal before prompting at all
and reports a rejected command line instead. Without it, a CI run that forgot
an argument would read as a green one.

## The configuration file

Any of `callidescope.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}`, searched for
upward from the working directory, TypeScript first because that is the form
that gets type checking. **Every field has a default except one**, so a file
names only what it wants to change.

```ts
import { type CallidescopeConfiguration } from "@callidescope/configuration";

const callidescopeConfiguration: CallidescopeConfiguration = {
  excludeFrom: ["configuration/.callidescopeignore"],
  limits: { maximumDepth: 6, spreadThreshold: 4 },
};

export default callidescopeConfiguration;
```

The whole surface is nine top-level keys: `allowSpreadFor`, `directories`,
`entryPoints`, `exclude`, `excludeFrom`, `ignoreCallees`, `limits`, `output`,
and `workspaceStructure`.

### `limits`

| Limit | Default | Meaning |
| ----- | ------- | ------- |
| `maximumDepth` | `6` | Frames a call stack may hold, entry point inclusive |
| `maximumBreadth` | **none** | Callables one callable may call directly |
| `spreadThreshold` | `4` | Distinct modules a callable's transitive callees may touch |
| `directSpreadThreshold` | `3` | Modules a callable must call _directly_ before spread is reported |
| `maximumImplementationCandidates` | `8` | Implementations one interface member may resolve to |
| `minimumCallers` | `2` | Callers a callable needs before its placement is judged |
| `callerMajorityRatio` | `0.8` | Share of callers in one foreign module that marks a callable misplaced |

Four are worth understanding rather than copying.

- **`maximumBreadth` has no default, on purpose.** Until something picks a
  number, breadth is reported without being gated, and `--check breadth` is
  refused rather than falling back to an unbounded limit that looks exactly
  like passing. It takes a **project's own** number: one in the workspace file
  is inherited rather than declared, so it produces findings without satisfying
  the gate. No single breadth number ever suited a whole workspace.
- **`directSpreadThreshold` is what makes module spread mean anything.**
  Transitive reach alone flags every entry point, since an entry point
  legitimately reaches the whole program. Requiring direct breadth as well is
  what isolates the callable personally orchestrating unrelated concerns.
- **`maximumImplementationCandidates` is the primary noise control.** A
  structurally matched interface member named `run` or `sync` otherwise
  resolves to dozens of unrelated classes and manufactures a call stack no
  execution ever takes. Lower it when a report is full of stacks that could not
  happen; raise it and expect noise.
- **`minimumCallers` and `callerMajorityRatio` together define "misplaced".** A
  callable with one caller is not evidence of anything, hence the floor.

Picking a first `maximumDepth`: run once with no gate, read the deepest stacks,
and set the limit at the shape you want rather than at whatever the code
currently is. A limit set to today's worst number gates nothing.

**Per project, pick each one by boundary-testing rather than by reading a number
off a run.** Write a candidate, run that project's gate, then run it one lower:
a limit worth having passes at the number written and fails at one below.
Anything looser is headroom — a limit that gates nothing while claiming to have
been measured. This is not belt-and-braces: a scoped run's printed summary
covers the whole trace, dependency closure included, so the depth it reports is
routinely deeper than anything the judged project owns. Only a gate's verdict
knows which findings belong to the project.

### `entryPoints`

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `addresses` | none | Callables named outright as roots, each `<file>#<qualified-name>` |
| `decorators` | 13 framework decorators | Decorators whose methods a framework invokes |
| `includeExportedFunctions` | `true` | Treat every `src/index.ts` export as a root |
| `includeOrphans` | `true` | Promote callables nothing in the repository calls |
| `includeTests` | `false` | Trace test files too |

**`addresses` is how a package states the surface it means to be measured on**,
in the same `<file>#<qualified-name>` form `depth` and `breadth` accept and
every frame prints, so an address is copied out of a report straight into the
configuration — with a trailing `:<line>` when one file declares the name
twice:

```ts
entryPoints: {
  addresses: ["packages/foo/src/modules/read/read.service.ts#ReadService.read"],
},
```

Declared addresses **add** roots and take none away: the rules below still run
first and keep the kind saying _why_ something calls a callable, orphan
promotion still catches whatever nobody named, and an already-rooted callable
stays one root.

Reach for it when a package sits low in the graph. A stack is filed under the
project owning its **root**, and most of what such a package publishes is
called from above — so it roots nothing, measures zero however deep its code
runs, and any limit on it gates nothing. **An address resolving to nothing, to
several declarations, or to nothing parseable fails the whole run**; the
`callidescope-triage` skill carries each message and its fix.

`decorators` **replaces** the built-in list rather than adding to it, so a
configuration naming its own framework's decorator should restate the ones it
still wants. A report where nearly everything is an orphan root usually means
the decorators in use are missing from it.

**`includeOrphans` is a safety net rather than a feature.** Without it, a
missing entry-point rule silently removes whole subtrees from every
measurement; with it they surface as orphan roots, which is itself worth
knowing — an orphan is either dead code or a rule that needs adding. Turn it
off and you lose the signal that the configuration was incomplete.

### Keeping code out of a run

Three tools, for three different questions:

- **`exclude`** takes globs and is **additive** to the built-in defaults
  (`node_modules`, `dist`, `coverage`, `output`, `.nx`, `.conformetry`), so a
  configuration naming its own noise does not restate them.
- **`excludeFrom`** names gitignore-syntax files. This is how a long exclusion
  list stays out of the configuration file itself, and it is the right home for
  fixture packages written to be deliberately bad.
- **`ignoreCallees`** takes globs matched against a callable's display name
  (`Type.member`) and drops matching calls from the graph entirely, counting
  toward neither depth nor breadth. This is for cross-cutting instrumentation:
  a call to a logger is a fact about instrumentation rather than about the
  shape of the code around it, and counting it would move every other
  callable's numbers on a change that has nothing to do with them.

`exclude` and `excludeFrom` drop _files_ from collection; `ignoreCallees` drops
_edges_, and reaching for the first when you meant the second deletes real
findings. Neither leaves the `ts.Program`: an excluded file is still compiled, a
call into it becomes unfollowable rather than vanishing, and no `exclude` can
un-project a directory holding a `tsconfig.json`. A project's own `exclude`
behaves the same way.

**`allowSpreadFor`** is narrower still: globs whose callables are exempt from
the module-spread finding alone, defaulting to command files, module files, and
`main.ts`. Orchestrating unrelated concerns is a command's job, not a service's.

### `directories` and `workspaceStructure`

`directories` is the same list `--directories` takes, set once.
`workspaceStructure` is only needed by a repository whose layout differs from
the tool's assumptions, because module identity is what spread and misplacement
are measured against: `modulesDirectory` (default `"modules"`) is the
subdirectory a module identifier derives from, and `rootModuleSegment` (default
`"src"`) is the identifier for a file directly under the source root. Get it
wrong and either every file collapses into one module, so spread is never
reported, or each becomes its own, so everything looks misplaced.

### `output`

Every destination is optional, and unconfigured is the normal case: a run
naming no destination reports to the console and exits non-zero on violations,
so nothing it writes can go stale.

| Key | Purpose |
| --- | ------- |
| `output.format` | What the run **prints**: `markdown`, `mermaid`, or `json`. Default `markdown` |
| `output.json` | A machine-readable report at `path`, indented by `indentation` |
| `output.markdown` | A marker-delimited block spliced into `path` |
| `output.mermaid` | The same block with the stacks drawn as one flowchart |
| `output.projectReadmes` | One section per traced project, in that project's own readme |

`output.mermaid` takes the same keys as `output.markdown` — they differ in what
goes between the markers, not in how a block is placed — and is separate so one
run publishes both: the tree says what each frame takes, returns, and documents,
the diagram what shape they make together.

```ts
output: {
  json: { indentation: 2, path: "output/callidescope.json" },
  markdown: { path: "docs/call-stacks.md" },
  mermaid: { path: "docs/call-stacks-diagram.md" },
  projectReadmes: {},
},
```

Both take a `description`, placed under the heading, and a `heading`, which
defaults to `# 🔭 Callidescope`. **Set it when the block is spliced into a file
that already has a title** — most markdown linters reject a second first-level
heading — and the subsections follow the level down. A whole-run block opens
with the summary counts, one row per project against **its own** depth limit,
and a scoreboard of how many sit over, on, or clear of theirs, counting a
project that measured nothing apart from one with room to spare. The findings
tables follow.

`output.projectReadmes` takes `heading` (`## 🔭 Callidescope` by default),
`previewCount` (stacks shown before the rest fold away, three by default), and
the same `startMarker`/`endMarker` pair. `{}` accepts all four defaults, and is
usually right: which files those are follows from which projects were traced,
so a list of paths would only give it somewhere to drift from.

A project's block opens with its counts, then a `### Limits` table stating the
depth and breadth it is judged against and whether each was `declared` in its
own file or `inherited` from the run. A block saying a project's deepest stack
is ten says nothing about whether ten is allowed, and once fifty projects hold
fifty answers the limit is inferable from nothing else on the page.

A markdown destination may also supply `render`, to replace the built-in
tables, or `write`, to place the block itself — handed `syncAnchoredBlock` and
`wrapInAnchors`, so it reuses the same splice. **Returning `false` reports the
destination as stale**; anything else, `undefined` included, counts as current.

## A project's own configuration file

Everything above describes the file a run is pointed at — the **workspace**
configuration. A second `callidescope.config.ts` may also sit at any traced
project's own root, the directory holding the `tsconfig.json` that makes it a
project, found by name in that directory alone with no upward walk, in any of
the same eight extensions. A project with no file of its own is configured
entirely by the run, which is what most projects should keep doing — add one
when a project needs a limit or a root the run cannot pick for it, not as a
matter of course.

The file a run was pointed at is never also read as a project's — one file, one
role per run. A package whose task names its own configuration and then traces
itself would otherwise have it refused for the workspace-only fields it
legitimately sets, so a package needing both keeps two files under two names.

### What a project may set, and nothing else

| Field | What it does |
| ----- | ------------ |
| `entryPoints` | Which of that project's callables root a stack, `addresses` included |
| `limits.maximumDepth` | The depth every stack rooted in that project is judged against |
| `limits.maximumBreadth` | The breadth every callable that project declares is judged against |
| `exclude` | Globs naming that project's own files to leave untraced |

**A project's `exclude` globs are anchored to that project's root**, never to
the workspace: `exclude: ["src/generated/**"]` in `packages/thing`'s own file
names `packages/thing/src/generated/**`, and no spelling of it reaches a
sibling. A workspace-relative glob here matches nothing, silently.

The run's own `exclude` stays workspace-relative and is layered underneath, so
a project can leave more out and never put back what the run left out. Noise
spanning several projects still belongs in the workspace file.

Every other field is refused **by name, before anything is traced**, and the
message names the four above so it is actionable without opening this skill.

### Write the override, never a spread

```ts
export default { limits: { maximumDepth: 10 } };
```

Annotating it with `CallidescopeConfiguration` is optional. Where a dependency
graph is built from imports, leaving it off keeps the project from gaining an
edge on the toolchain it does not otherwise use.

**Never spread a workspace limits object into a project's `limits`.** Such an
object carries `spreadThreshold` and the other graph-shaping limits, which only
a workspace may set, so a project file holding one is rejected before anything
is traced. Documentation telling you to spread is out of date — the tool
refuses it.

Nothing is lost, because **a project inherits per limit rather than per
object**: each limit falls back to the workspace's number on its own, so a
project naming `maximumDepth` still inherits `maximumBreadth`. A spread has
nothing to contribute either — depth and breadth are the only two a project may
set, so it would supply exactly the field being overridden plus the one that
gets the file rejected. A "spread or you will clobber the rest" rule elsewhere
in a repository is worth checking rather than copying: that is the right rule
for an incomplete list element with no per-field fallback behind it, which a
limit is not.

The workspace number is a **default rather than a ceiling**: a project
declaring a higher limit keeps it, because a workspace number pinned by the
single worst stack anywhere gates nothing for the projects nowhere near it.

`entryPoints` does not inherit that way. A project declaring any entry-point
rule replaces the rule set for its own callables outright, and the fields it
omits fall back to the tool's defaults rather than the workspace file's — so a
project declaring `addresses` that wants a customized decorator list must
restate it.

### Why the other limits cannot vary per project

Not an oversight, and not a rule to argue with:

- `maximumDepth` and `maximumBreadth` **judge** a call graph. The graph is built
  once and each project asks a different question of the same edges, which is
  two opinions about one artifact — coherent.
- Every other limit **shapes what the graph is**. `spreadThreshold` and
  `directSpreadThreshold` decide which callables become findings,
  `maximumImplementationCandidates` decides which structural matches become
  edges at all, and `minimumCallers` with `callerMajorityRatio` decides what
  counts as a misplacement. Two projects disagreeing about any of them would
  each be describing a **different graph over the same shared code**, and a run
  measures one graph — so there is one set of those.

The same reasoning keeps `ignoreCallees`, `allowSpreadFor`, `directories`,
`excludeFrom`, `output`, and `workspaceStructure` in the workspace file: they
name what a run reads, writes, or partitions, which a project cannot answer
differently from the run tracing it.

### Reading the whole set back

A ratchet written one file per project is no longer reviewable in the single
file it used to live in. The `limits` command is where it is reviewable as a set
instead:

```bash
npx callidescope limits
```

A markdown table, one row per project per limit, with an `Origin` column saying
`declared` for a project's own number and `inherited` for the workspace default
it fell back to, and a `Declared in` column naming the file. `none` in the value
column means nothing anywhere declares that limit — the usual case for breadth.
The workspace's own row comes first and is the only one that may carry no origin
at all: a limit that file never wrote is still what everything is judged
against.

It resolves configuration and measures nothing, so it costs milliseconds rather
than a trace, takes `--config` alone, and fails on nothing but a configuration
it cannot read.

## After changing any of this

A configuration change usually moves the numbers, making every committed report
stale. Re-run the write configuration in the same change, and lint **before**
regenerating: every frame carries a `file:line`, so a formatter that sorts class
members moves the line numbers after it, and a report written before that sort
is stale the moment it lands.

When a run is refused or a report reads stale, reach for `callidescope-triage`.
To read what a run printed, reach for `callidescope-trace`.
