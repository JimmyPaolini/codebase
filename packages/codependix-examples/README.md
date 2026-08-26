# 🕸️ Codependix Examples

**Sixteen worked examples of what codependix builds, every one of them rendered
by the real tool from fixtures in this package.**

Codependix draws dependency graphs at four levels — the Nx Neighborhood, the
whole-workspace Workspace Graph, a NestJS container's module graph, and a
project's own TypeScript and Python file-level import graphs. Almost none of
that has ever been written down: everything a reader needs to know about
`include`/`exclude` matching a project's root as well as its name, about a
per-project override _replacing_ rather than merging with `defaults`, about the
`@Global()` heuristic that redraws a NestJS graph, or about why `--write`
auto-creates a section it once refused to, lived only in a JSDoc comment on the
type that implements it.

This package is where all of it is stated to a reader — and, because every
diagram, every JSON shape, and every refusal below is produced by running the
real services against fixtures, none of it can quietly go stale.

## Reading a graph

| I want to know | Read |
| -------------- | ---- |
| Which workspace projects this one sits between | [Nx Neighborhood](output/01-graph-levels.md), and [why one hop](output/02-neighborhood-scope.md) |
| What the whole repository looks like | [Nx Workspace Graph](output/01-graph-levels.md) |
| How a project's NestJS container is wired | [NestJS module graph](output/01-graph-levels.md), and [the ambient rule](output/03-ambient-modules.md) |
| Which of a project's own files import which | [TypeScript](output/06-typescript-resolution.md) and [Python](output/07-python-scanner.md) file imports |
| Whether it is safe to point at my application | [Preview mode](output/04-preview-mode.md) |

The four levels answer four different questions about the same project, and none
of them substitutes for another. [Example 1](output/01-graph-levels.md) graphs
one fixture at all four so the difference is visible rather than argued: the
module graph never draws `CatalogService`, because only modules are nodes; the
import graph draws `settings.ts`, which the module graph cannot see at all.

## Every example

| # | Example | What it settles |
| - | ------- | --------------- |
| 1 | [The four graph levels, side by side](output/01-graph-levels.md) | What each level does and does not say about the same project |
| 2 | [One hop, and every renderer rule](output/02-neighborhood-scope.md) | Implicit edges, self-edges, external packages, the root project, the subject highlight |
| 3 | [The ambient-module heuristic](output/03-ambient-modules.md) | Why a `@Global()` module is drawn without edges, and where the rule stops firing |
| 4 | [Preview mode](output/04-preview-mode.md) | A `forRootAsync` options factory graphed without ever running |
| 5 | [Rooting a container](output/05-container-rooting.md) | A real root module, a synthetic one, and one that refuses to load |
| 6 | [Imports resolve through the compiler](output/06-typescript-resolution.md) | NodeNext specifiers, path aliases, `extends` chains — and the four statements that draw nothing |
| 7 | [The Python statement scanner](output/07-python-scanner.md) | Every case the hand-rolled scanner handles, and every case it deliberately refuses |
| 8 | [Configuration resolution, field by field](output/08-configuration-resolution.md) | `defaults` versus an override, the glob lists, file precedence, the upward search |
| 9 | [Embedding the graph builders](output/09-embedding.md) | Getting a graph in memory with no command line and no configuration file |
| 10 | [All four export targets](output/10-export-targets.md) | Why `both` is a named target rather than something inferred |
| 11 | [Both Markdown modes](output/11-markdown-modes.md) | An anchored splice, and a standalone file |
| 12 | [Auto-creating the section](output/12-auto-created-sections.md) | Exactly where a missing `## 🕸️ Codependix` section lands, in every branch |
| 13 | [`--check` versus `--write`](output/13-check-and-write.md) | What drift is reported as, and the two command lines refused outright |
| 14 | [Every refusal](output/14-refusals.md) | Each one with the reproduction that produces it |
| 15 | [The JSON exports](output/15-json-exports.md) | Every graph's JSON shape, and why one ESLint rule is off for these files |
| 16 | [An export moves with the workspace](output/16-workspace-drift.md) | Why this repository gates no pull request on `codependix --check` |

## Configuring your first export

Nothing is exported until a `codependix.config.ts` says where. A workspace that
never wrote one resolves every graph to `target: "none"` and produces nothing —
it is never told to write one.

```ts
import { type CodependixConfiguration } from "@codependix/configuration";

const codependixConfiguration: CodependixConfiguration = {
  defaults: {
    nx: { markdown: { anchor: "codependix-nx" }, target: "markdown" },
  },
};

export default codependixConfiguration;
```

Three things about that shape catch people out, and
[example 8](output/08-configuration-resolution.md) shows each one resolving:

- **A per-project override replaces the default outright.** Naming
  `projects["atlas-core"].nx` does not merge into `defaults.nx` — a project that
  turns its Markdown export off by omitting `markdown` should not have the
  default's destination resurface underneath it.
- **`include` and `exclude` match a project's name _and_ its root.** `packages/*`
  and `codependix-*` are both valid ways to name overlapping sets.
- **The field is `defaults`, not `default`.** The loader unwraps a module's
  default export by name, and a field of that name would collide with the
  unwrapping.

## Adopting codependix where no anchors exist

Markdown used to be the opt-in exception, because a missing anchor block was an
error — placing one was something a person did once, by hand, rather than
codependix guessing where in a document it belonged. That could not scale to
every project in a workspace nobody had hand-placed anchors in.

`--write` now auto-creates the `## 🕸️ Codependix` section, and takes that risk
in exactly two well-defined places: the end of the file, or the end of a section
that already exists. [Example 12](output/12-auto-created-sections.md) renders
every branch, including a heading a person wrote by hand being reused rather
than duplicated. Only a project with no `README.md` at all still fails outright,
and a `--check` against a project that has never had codependix output simply
reports it as stale.

So adopting it is one command:

```bash
nx run codebase:codependix:write
```

## Running the examples

```bash
nx run codependix-examples:examples:write
```

```bash
nx run codependix-examples:examples:check
```

`check` is the gate that keeps the guides honest. Every diagram, JSON export,
and refusal quoted anywhere in this package is rendered by the same run, so a
resolver or scanner change that silently reversed one of the documented
behaviors fails here rather than leaving a guide describing behavior the tool
no longer has. That matters most for the cases in examples 6 and 7 that exist to
_not_ be walked: a guide quoting a diagram the tool no longer renders is worse
than no guide.

## Why the fixtures are not a nested workspace

Codependix does not read a directory the way codometer does.
`NeighborhoodService.readProjectGraph` calls `createProjectGraphAsync()`, which
resolves the Nx workspace from the **process working directory** and takes no
directory argument — `--directory` supplies only the root that export paths are
resolved against. A fixture graph is therefore reachable exactly three ways: a
nested fixture Nx workspace run with the working directory set inside it; the
graph builder services driven directly; or fixtures that are real projects of
_this_ workspace.

This package takes the second. Every other method in `@codependix/nx`,
`@codependix/nestjs`, and `@codependix/imports` is _handed_ the graph, the
project, or the program it works on:

| Builder | What an example hands it |
| ------- | ------------------------ |
| `NeighborhoodService`, `WorkspaceGraphService` | A `ProjectGraph` literal built from `fixtures/`-shaped data |
| `NestjsProjectService` | A project descriptor built by its own `describeProject` |
| `TypescriptService` | A project descriptor from its own `discoverProjects` |
| `PythonService` | A project graph carrying the `language:python` tag discovery reads |

That choice is what makes this package the embedding example
([example 9](output/09-embedding.md)) as well: nothing here goes through the
command line or reads a configuration file, which is exactly the demonstration
that `@codependix/cli` holds only orchestration and delivery.

It also settles every cross-cutting constraint at once. The fixtures carry no
`project.json`, so none of them joins this workspace's Nx project graph, the
root README's Workspace Graph, `nx affected`, or `sherif`. The Python fixtures
are never tagged `language:python`, so `ruff`, `pyright`, `ty`, and `vulture`
never run over input that exists precisely to look malformed. And no fixture
container has to boot from a working directory it was not run in, on a
workstation or on a runner.

## What is deliberately scoped out

Fixtures are input to be graphed, not code this repository authors, so three
tools are scoped away from `fixtures/`:

| Tool | Why |
| ---- | --- |
| `eslint` | A fixture declares a self-referential `tsconfig` path alias, a `require` call, and an unused re-export **on purpose** — each is a behavior example 6 exists to pin down |
| `oxfmt`, `prettier` | Reformatting a fixture would rewrite the very shape the scanner examples measure, and reformatting `output/` would fight `examples --check` |
| `knip` | Fixture TypeScript is uncalled and unimported by construction |

Each is a directory-level scope declaration rather than a per-error suppression,
which is the difference between saying "this is not our code" and silencing a
finding about code that is.

`output/` stays inside ESLint's scope on purpose: the committed JSON exports are
named `codependix-*graph.json`, so the `jsonc/sort-array-values` carve-out
`configuration/eslint.config.ts` declares for every graph codependix writes
covers them too — see [example 15](output/15-json-exports.md).

This package declares no `codometer` size limit, because it builds nothing:
there is no `build` target and therefore no compiled bundle to measure.

## Start

```bash
nx run codependix-examples:start
```

## Test

```bash
nx run codependix-examples:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.
