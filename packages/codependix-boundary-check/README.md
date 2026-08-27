# 🧮 Codependix Boundary Check

**Builds each level's graph for a workspace and judges it against the declared boundary rules.**

The bridge between the four graph builders and
[`@codependix/boundaries`](../codependix-boundaries/README.md), which evaluates
rules but knows nothing about workspaces. This package holds the adapters that
flatten an Nx Neighborhood, a NestJS module graph, and a file-level import graph
into the one `BoundaryGraph` shape rules read, plus the per-level orchestration
around them.

```bash
codependix map --check boundaries
```

## Why it is not in the command-line host

It used to be. Two things put it here instead:

1. **`@codependix/boundaries` must stay a leaf.** Reading `Neighborhood`,
   `NestjsModuleGraph`, or `TypescriptImportGraph` would drag `@nx/devkit`,
   `nestjs-spelunker`, and `typescript` behind a package whose whole job is
   evaluating rules. So the adapters cannot live there.
2. **A command-line host should stay thin.** `callidescope` keeps its graph and
   its output in packages of their own; `codometer` keeps seven. Codependix put
   this logic in its CLI and the CLI's compiled size went past its limit, which
   is the size gate doing exactly what it is for — catching logic accumulating
   somewhere it does not belong, rather than catching a number.

Nothing here depends on `@codependix/cli`, and a boundary rule in
`configuration/codependix.config.ts` says so, so the host and the logic it
hosts cannot close a cycle.

## What it does

`BoundaryCheckService.run` walks the four levels in `BOUNDARY_LEVEL_ORDER` —
cheapest first — and **skips any level with no declared rules before building
anything**. That is what keeps the gate affordable: judging the NestJS level
means booting every container in preview mode, and judging the TypeScript level
means building a `ts.Program` per project. A workspace declaring only Nx rules
pays for neither.

Each level isolates one project's failure to that project: a container that
will not boot is collected as a `BoundaryCheckFailure` while every other
project is still judged.

`BoundaryGraphService` holds one adapter per level. Each is only ever nodes,
edges, and the attributes rules select on — an Nx project carries tags and a
root, a file carries its project-relative path and its project, and a NestJS
module carries only its class name, because `NestjsModuleGraph` has no file
path to give.

## Test

```bash
nx run codependix-boundary-check:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.
