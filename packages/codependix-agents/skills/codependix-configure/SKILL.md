---
name: codependix-configure
description: Write or edit a codependix.config.ts — which graph types run, per-project overrides, include and exclude globs, the whole-workspace graph, and where each export lands. Use when a workspace has no codependix configuration yet, when a run produced no output because everything resolved to target none, when adding a JSON or Markdown destination, when choosing between an anchor block and a standalone file, when a configuration is rejected for a missing destination, or when deciding whether one configuration can describe every project in a workspace.
license: MIT
---

# Writing a codependix configuration

Codependix produces nothing until a configuration tells it what to export and
where. Every field is optional, and a workspace with no configuration file
resolves every graph type for every project to `target: "none"` — a successful
run that writes nothing. The configuration is the whole control surface; there
is no flag that selects a graph type.

```ts
import { type CodependixConfiguration } from "@codependix/configuration";

const codependixConfiguration: CodependixConfiguration = {
  defaults: {
    imports: { markdown: { anchor: "codependix-imports" }, target: "markdown" },
    nestjs: { markdown: { anchor: "codependix-nestjs" }, target: "markdown" },
    nx: { markdown: { anchor: "codependix-nx" }, target: "markdown" },
  },
  exclude: ["fixtures/**"],
  include: ["**"],
  projects: {
    widgets: {
      nx: {
        json: { path: "output/nx-graph.json" },
        markdown: { anchor: "codependix-nx", path: "docs/architecture.md" },
        target: "both",
      },
    },
  },
  workspace: {
    nx: { markdown: { anchor: "codependix-workspace" }, target: "markdown" },
  },
};

export default codependixConfiguration;
```

## Where the file is found

`codependix.config.{ts,mts,cts,js,mjs,cjs,json}` is searched for **upward**
from the run's directory, and the first file found wins outright — nothing from
a further ancestor is merged into it. A workspace carrying both a TypeScript
and a JSON file gets the TypeScript one.

Two paths behave differently on purpose:

- **A path given with `--config` must exist.** A typo fails the run rather than
  quietly resolving every graph to `"none"`. It is resolved against the working
  directory first, then against the workspace root, so a configuration kept in
  a `configuration/` folder can be named relative to either.
- **An absent configuration is legal.** A workspace that never wrote one is not
  told to; it simply exports nothing.

## `defaults`, never `default`

The field that applies to every project naming no override of its own is
spelled **`defaults`**. A configuration module's default export is unwrapped by
name while loading, so a field called `default` would collide with that
unwrapping. A configuration that writes `default:` is not rejected — unknown
keys are stripped rather than refused, so a newer configuration still loads
under an older codependix — it simply has no effect at all, which reads exactly
like a tool that ignored it.

## `target` is explicit

Each graph type's export target is named, never inferred from which
destinations are present:

| `target` | Writes |
| -------- | ------ |
| `"both"` | The JSON and the Markdown destination together |
| `"json"` | The JSON destination only |
| `"markdown"` | The Markdown destination only |
| `"none"` | Nothing — and the default for every unset target |

That explicitness is what lets a project keep a `json` destination it is not
ready to write yet: leave the destination in place and set `target: "markdown"`.

The configuration is validated, and two mismatches are rejected rather than
ignored:

- A `"both"` or `"json"` target with no `json` destination.
- A `"both"` or `"markdown"` target with no `markdown` destination.

## Markdown has two shapes

```ts
// Anchor mode — spliced into a named block inside an existing file.
{ markdown: { anchor: "codependix-nx" }, target: "markdown" }

// Anchor mode, in a file other than the default README.md.
{ markdown: { anchor: "codependix-nx", path: "docs/graphs.md" }, target: "markdown" }

// Standalone mode — the export is the whole contents of the file.
{ markdown: { path: "output/graph.md" }, target: "markdown" }
```

- **Naming an `anchor`** splices the export between two comment markers inside
  the file at `path`, which **defaults to `README.md`** — the common case is a
  project's own readme, so it is worth not repeating.
- **Leaving `anchor` unset** writes the export as the entire contents of a
  standalone file, and `path` is then **required**: there is no default worth
  guessing for a file codependix owns outright.
- A `markdown` destination naming neither is rejected, since nothing would say
  where the export goes.

A missing anchor block is auto-created on `--write`, so anchors do not have to
be placed by hand first. See the `codependix-triage` skill for exactly where a
new block lands and what still fails.

Paths in both destinations resolve relative to the **project's own root**, so
one `defaults` entry describes every project without naming any of them. The
whole-workspace graph resolves relative to the workspace root instead.

## `include` and `exclude`

Both are lists of globs matched against **a project's Nx name and its
workspace-relative root**, so either spelling works:

```ts
{ exclude: ["examples/**", "*-fixtures"], include: ["**"] }
```

`include` defaults to `["**"]` and `exclude` to empty, so leaving both out
means every project participates. A project is included when at least one
`include` glob claims its name or root and no `exclude` glob claims either.

An excluded project resolves to `target: "none"` for every graph type
regardless of what `defaults` or its own `projects` entry says — so excluding a
project takes one line rather than rewriting each of its overrides to `"none"`.

## A project override replaces, it does not merge

When a `projects` entry names a graph type, that entry **replaces** the
`defaults` entry for that graph type outright — it is not merged field by
field. A project turning its Markdown export off by omitting `markdown` should
not have the default's `markdown` destination resurface underneath it.

The practical consequence: an override has to restate every destination it
still wants, including the `target`.

```ts
{
  defaults: { nx: { markdown: { anchor: "codependix-nx" }, target: "markdown" } },
  projects: {
    // Loses the Markdown export entirely — this is the whole nx entry now.
    widgets: { nx: { json: { path: "graph.json" }, target: "json" } },
    // Keeps both, because both are restated.
    gadgets: {
      nx: {
        json: { path: "graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
  },
}
```

Graph types the override does not mention still fall back to `defaults`; the
replacement is per graph type, not per project.

## The whole-workspace graph

`workspace` is separate from `defaults` and `projects`, and accepts only `nx`:

```ts
{ workspace: { nx: { markdown: { anchor: "codependix-workspace" }, target: "markdown" } } }
```

There is no workspace-wide NestJS or import graph to configure. The workspace
graph is exported once for the repository, carries no per-project override, and
is **unaffected by `include` and `exclude`** — excluding a project from
per-project exports does not remove it from the workspace graph.

## Configuring a graph type a project does not have costs nothing

A project that is not a NestJS project never appears in the NestJS pass; a
project with no `tsconfig.json` never appears in the TypeScript import pass.
Neither is a failure and neither needs an override, so a single `defaults`
block naming all four graph types is the normal shape of a
whole-workspace configuration rather than an over-broad one.
