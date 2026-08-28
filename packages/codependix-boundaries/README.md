# 🚧 Codependix Boundaries

**Evaluates declared rules against a graph codependix already built, and reports the edges and cycles that break them.**

Codependix draws four graphs and says nothing about whether their shape is
allowed. This turns it from a documentation tool into a gate, at all four
levels — Nx project edges, NestJS module edges, and file-level TypeScript and
Python import edges.

```bash
codependix map --check boundaries
```

## Why not an ESLint rule

`@nx/enforce-module-boundaries` reads import statements, one file at a time.
Three facts it structurally cannot see:

1. **Implicit edges.** An Nx `implicitDependencies` entry creates a
   project-graph edge with no import statement to flag. `NeighborhoodEdge`
   already carries `implicit`, so codependix holds a fact the lint rule has no
   way to reach.
2. **A NestJS module edge is a container fact, not a source fact.**
   `SpelunkerModule.explore` reports what the container resolved, so a dynamic
   module, a `forRootAsync`, or a conditionally composed import produces an
   edge no `import` statement expresses.
3. **A rule can be about the graph rather than the edge.** A cycle, or a
   project's dependents, is a statement about a shape, and a rule that sees
   one file at a time cannot make one.

What this deliberately does **not** replace: the layered `depConstraints`
graph in
[`configuration/eslint.config.ts`](../../configuration/eslint.config.ts), which
reports at the import site with a line number, and `dependency-cruiser`'s
`no-circular`, which is already this repository's file-cycle gate.

The two were checked against each other rather than assumed equivalent. All 32
of this repository's `depConstraints` translate mechanically —
`onlyDependOnLibsWithTags` is an `allow` rule, `notDependOnLibsWithTags` is a
`forbid` rule, and an empty `onlyDependOnLibsWithTags` is a `forbid` reaching
everything — and with `edges: { implicit: false }` all 32 pass, exactly as
ESLint reports them. Without that narrowing one more edge is reported:
`conformetry-examples → conformetry-cli`, declared by an `implicitDependencies`
entry with no import statement behind it. Its own `depConstraint` comment says
that dependency should not exist, and ESLint has nothing to flag. Whether that
is a finding or a false positive is the question `edges` exists to let a rule
answer.

## The rule model

Rules are declared in `codependix.config.ts`, keyed by the graph level that
judges them — `imports`, `nestjs`, `nx`, `pythonImports` — the same keys the
export configuration already uses. A level declaring no rule is never built at
all, which is what keeps the gate affordable: judging the NestJS level means
booting every container in preview mode.

Two shapes and three kinds — an access rule, written as `from`/`to` with the
verdict running one way or the other, and an `acyclic` rule scoped by `nodes`:

| Kind | Reports |
| ---- | ------- |
| `forbid` | An edge whose source matches `from` and whose target matches `to` |
| `allow` | An edge leaving `from` for anywhere `to` does not claim |
| `acyclic` | A cycle among the nodes `nodes` selects, defaulting to every node |

An access rule may also narrow **which edges** it judges, rather than which
nodes it selects:

| `edges` | Judges |
| ------- | ------ |
| unset | every edge — the stricter reading, and the right default for a rule about what a project may _depend on_ |
| `{ implicit: false }` | only edges backed by an import statement — exactly what an `@nx/enforce-module-boundaries` `depConstraint` sees |
| `{ implicit: true }` | only edges an `implicitDependencies` entry declares and no import backs |

Only the Nx level draws an implicit edge; every other level's edges are read as
explicit.

Each rule carries a `name` and, optionally, a `message` saying why it exists.
The message is **appended** to the generated sentence rather than replacing
it, so no wording a configuration chooses can cost a report the rule that
fired and both ends of what it fired on.

## Selectors

One node shape covers three vocabularies, and every field is a list of globs
matched with `path.matchesGlob`:

| Field | Matches | Available at |
| ----- | ------- | ------------ |
| `id` | The node's identifier — a project name, a file path, or a module class name | every level |
| `path` | A workspace-relative project root, or a project-relative file path | `nx`, `imports`, `pythonImports` |
| `project` | The Nx project a node belongs to | `nx`, `imports`, `pythonImports` |
| `tags` | The node's Nx tags; one tag matching is enough | `nx` |

Every field a selector states must match — the fields narrow each other.
Within one field, one glob matching is enough. A selector naming a field its
level does not carry matches **nothing** rather than everything: a `path` rule
evaluated against a NestJS module graph, which carries no file paths, selects
no module instead of silently selecting all of them. A selector stating no
field at all is refused by the configuration schema, since it reads exactly
like a typo.

## The two halves, and the one seam between them

`src/modules/boundaries/` evaluates rules and knows nothing about workspaces: a
`BoundaryGraph` and a list of rules go in, and violations come out.
`src/modules/boundary-check/` is what turns a real workspace into those graphs
— one adapter per level, plus the orchestration around them.

`BoundaryGraph` is the seam, and it is deliberately not any of the four real
graph types. Each adapter flattens a `Neighborhood`, a `NestjsModuleGraph`, or
an import graph into it, so rule evaluation never sees `@nx/devkit`,
`nestjs-spelunker`, or `typescript` and could be lifted out again without
touching a rule.

`BoundaryCheckService.run` walks the four levels in `BOUNDARY_LEVEL_ORDER` —
cheapest first — and **skips any level with no declared rules before building
anything**. That is what keeps the gate affordable: judging the NestJS level
means booting every container in preview mode, and judging the TypeScript level
means building a `ts.Program` per project. A workspace declaring only Nx rules
pays for neither. Each level also isolates one project's failure to that
project, so a container that will not boot is collected as a
`BoundaryCheckFailure` while every other project is still judged.

Nothing here depends on `@codependix/cli` — the host calls in, never the
reverse — and a rule in `configuration/codependix.config.ts` says so, so the
two cannot close a cycle.

## Test

```bash
nx run codependix-boundaries:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.
