---
name: callidescope-configure
description: Write or edit a callidescope.config.ts — depth, breadth, and spread limits, which callables count as call-stack entry points, exclusions and ignored callees, the workspace's module layout, and where a run writes its JSON, markdown, mermaid, and per-project reports. Use when a repository has no callidescope configuration yet, when --check breadth is refused for a missing maximumBreadth, when a trace reports findings on code it should not be judging, when every callable is showing up as an orphan root, when module identifiers look wrong for a non-standard directory layout, or when deciding where a committed report should live.
license: MIT
---

# Writing a callidescope configuration

Callidescope reads `callidescope.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}`,
searched for upward from the working directory, TypeScript first because that
is the form that gets type checking. `--config <path>` names one explicitly.

**Every field has a default except one**, so a configuration file names only
what it wants to change. A repository with no file at all is traced with
defaults rather than told to write one.

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

## `limits`

| Limit | Default | Meaning |
| ----- | ------- | ------- |
| `maximumDepth` | `6` | Frames a call stack may hold, entry point inclusive |
| `maximumBreadth` | **none** | Callables one callable may call directly |
| `spreadThreshold` | `4` | Distinct modules a callable's transitive callees may touch |
| `directSpreadThreshold` | `3` | Modules a callable must call _directly_ before spread is reported |
| `maximumImplementationCandidates` | `8` | Implementations one interface member may resolve to |
| `minimumCallers` | `2` | Callers a callable needs before its placement is judged |
| `callerMajorityRatio` | `0.8` | Share of callers in one foreign module that marks a callable misplaced |

Four of these are worth understanding rather than copying:

- **`maximumBreadth` has no default, on purpose.** Until a repository picks a
  number, nothing exceeds it and breadth is reported without being gated.
  `--check breadth` with no `maximumBreadth` set is **refused outright** rather
  than falling back to an unbounded limit, because an unbounded limit looks
  exactly like passing. Set it before asking for that gate.
- **`directSpreadThreshold` is what makes module spread mean anything.**
  Transitive reach alone flags every entry point — an entry point legitimately
  reaches the whole program. Requiring direct breadth as well is what isolates
  the callable personally orchestrating unrelated concerns.
- **`maximumImplementationCandidates` is the primary noise control.** A
  structurally matched interface member named `run` or `sync` otherwise
  resolves to dozens of unrelated classes and manufactures a call stack no
  execution ever takes. Lower it when a report is full of stacks that could not
  happen; raise it and expect noise.
- **`minimumCallers` and `callerMajorityRatio` together define "misplaced".**
  A callable with one caller is not evidence of anything, which is why the
  floor exists.

Picking a first `maximumDepth`: run once with no gate, read the deepest stacks,
and set the limit at the shape you want rather than at whatever the code
currently is. A limit set to today's worst number gates nothing.

## `entryPoints`

Depth is only meaningful relative to a root, and most code in a framework
codebase is called by the framework rather than by the repository.

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `decorators` | 13 framework decorators | Decorators whose methods a framework invokes |
| `includeExportedFunctions` | `true` | Treat every `src/index.ts` export as a root |
| `includeOrphans` | `true` | Promote callables nothing in the repository calls |
| `includeTests` | `false` | Trace test files too |

`decorators` **replaces** the built-in list rather than adding to it, so a
configuration naming its own framework's decorator should restate the ones it
still wants.

**`includeOrphans` is a safety net rather than a feature.** Without it, a
missing entry-point rule silently removes whole subtrees from every
measurement. With it, they surface as orphan roots — which is itself worth
knowing, since an orphan is either dead code or a rule that needs adding. Turn
it off and you lose the signal that told you the configuration was incomplete.

A report where nearly everything is an orphan root usually means the framework
decorators in use are not in `decorators`.

## Keeping code out of a run

Three different tools, for three different questions:

- **`exclude`** takes globs and is **additive** to the built-in defaults
  (`node_modules`, `dist`, `coverage`, `output`, `.nx`, `.conformetry`), so a
  configuration naming its own noise does not restate them.
- **`excludeFrom`** names gitignore-syntax files. This is how a long exclusion
  list stays out of the configuration file itself, and it is the right home for
  fixture packages written to be deliberately bad.
- **`ignoreCallees`** takes globs matched against a callable's display name
  (`Type.member`), and drops calls landing on a match from the graph entirely —
  counting toward neither the caller's depth nor its breadth. This is for
  cross-cutting instrumentation: every call to a logger is a fact about
  instrumentation, not about how deep or wide the code around it is, and
  counting it would move every other callable's numbers on a change that has
  nothing to do with them.

`exclude` and `excludeFrom` remove _files_. `ignoreCallees` removes _edges_.
Reaching for the first when you meant the second deletes real findings.

**`allowSpreadFor`** is narrower still: globs whose callables are exempt from
the module-spread finding alone, defaulting to command files, module files, and
`main.ts`. Orchestrating unrelated concerns is the job of a command; it is not
the job of a service.

## `directories`

The same list `--directories` takes on the command line, set once. Each entry
is a project directory holding its own `tsconfig.json`. Every such directory
under the working directory is traced when this is omitted.

Narrowing it is the difference between a whole-workspace analysis and a
one-second check, because each directory needs its own TypeScript program
built.

## `workspaceStructure`

Only needed by a repository whose layout differs from the tool's own
assumptions, because module identity is what module spread and misplacement are
measured against.

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `modulesDirectory` | `"modules"` | The subdirectory a module identifier is derived from |
| `rootModuleSegment` | `"src"` | Identifier used for a file sitting directly under the source root |

Symptoms of getting this wrong: every file collapsing into one module (so
spread is never reported), or every file becoming its own module (so everything
looks misplaced).

## `output`

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

`output.format` is separate from the other four. Writing to a file and printing
to a terminal are independent, so both can be on at once.

`output.mermaid` takes the same keys as `output.markdown` — they differ in what
goes between the markers, not in how a block is placed — and is a separate
destination precisely so a repository can publish the printed trees _and_ the
diagram from one run. They answer different questions: the tree says what each
frame takes, returns, and documents; the diagram says what shape they make
together.

```ts
output: {
  json: { indentation: 2, path: "output/callidescope.json" },
  markdown: { path: "docs/call-stacks.md" },
  mermaid: { path: "docs/call-stacks-diagram.md" },
  projectReadmes: {},
},
```

`output.projectReadmes` takes `heading` (`## 🔭 Callidescope` by default),
`previewCount` (stacks shown before the rest fold into a disclosure, three by
default), and the same `startMarker`/`endMarker` pair the markdown destination
uses. `{}` accepts all four defaults — and is the usual right answer, because
which files those are follows from which projects were traced. Restating that
as a list of paths would only give it somewhere to drift from.

A markdown destination may also supply `render`, to replace the built-in
tables, or `write`, to place the block itself. A `write` function is handed
`syncAnchoredBlock` and `wrapInAnchors`, so a custom writer reuses the same
splice rather than reimplementing it. **Returning `false` reports the
destination as stale**; anything else, `undefined` included, counts as current.

## Choosing where a report lives

Two configurations, not three, is the shape that works:

- A **check** configuration gating `depth` (and `breadth`, once a limit is set)
  and writing nothing, run on every pull request.
- A **write** configuration writing every destination, run on the default
  branch.

There is no third for a release, and the two must not be reachable from a
composite task that forwards a configuration down its dependencies — otherwise
a `write` run from a branch publishes a report from a branch. Name the depth
gate directly alongside whatever else gates, rather than hanging it off a
lint-style aggregate.

## After changing a configuration

A configuration change usually moves the numbers, which makes every committed
report stale. Re-run the write configuration in the same change, and lint
**before** regenerating rather than after: every frame carries a `file:line`,
so a formatter that sorts class members moves the line numbers of everything
after it, and a report written before that sort is stale the moment it lands.

When a run refuses a configuration or a report reads stale, reach for the
`callidescope-triage` skill.
