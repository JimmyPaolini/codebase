# 🔭🧬 Callidescope Nx

**Resolves Nx project names to the directories `callidescope` traces.**

[`@callidescope/cli`](../callidescope-cli/README.md) is Nx-free on purpose: it
takes `--directories`, each one a path holding its own `tsconfig.json`, so it
works in any TypeScript workspace whether or not Nx is anywhere near it. What
an Nx workspace has that plain paths do not is a **stable name** for each of
those directories. This package is the one piece that knows how to turn one
into the other, and it is the only place in the callidescope toolchain that
depends on `@nx/devkit`.

```bash
npm install --save-dev @callidescope/nx
```

## Usage

```bash
callidescope-nx directories --projects callidescope-graph,callidescope-cli
```

```text
packages/callidescope-cli,packages/callidescope-graph
```

| Flag | Meaning |
| ---- | ------- |
| `-p, --projects` | Comma-separated Nx project names to resolve. Required |

Only the resolved directories reach standard output — every log line goes to
standard error — so the whole line substitutes straight into `--directories`:

```bash
directories="$(callidescope-nx directories --projects callidescope-graph)" \
  && callidescope --directories "$directories" --check depth
```

The `&&` is the point. Command substitution discards the exit code of the
command inside it, so `callidescope --directories "$(callidescope-nx …)"`
written as one command would answer a failed resolution by tracing the entire
workspace instead — an empty `--directories` is what asks for that. Resolving
first and joining with `&&` means a rejected name stops the run.

## Why a second command

`--projects` used to live on `callidescope` itself, back when its project
discovery was Nx-shaped. Re-landing it there would put Nx in the core CLI's
help text and, sooner or later, in its dependencies — the coupling that was
removed so callidescope could work standalone in any workspace, monorepo or
not.

Two commands composed by a shell keeps that separation exact. `callidescope`
still has no idea Nx exists; this package has no idea how a call graph is
built. Nothing depends on both.

## What resolution does

- **Every name must resolve.** A name the workspace does not have fails the
  whole run, listing what it does have. Dropping the name instead would leave
  a trace quietly covering less than it was asked to, and a report of what it
  did cover cannot show you what it did not.
- **Directories come back sorted and deduplicated**, so the same set of names
  always produces the same line.
- **A project rooted at the workspace root resolves to `.`.** Naming it means
  the root program, which is a different thing from omitting `--directories`
  — that walks the workspace for every `tsconfig.json` there is.

## As a library

The resolution is a NestJS provider, for a host that would rather import it
than shell out:

```ts
import { ProjectsService } from "@callidescope/nx";

const graph = await projectsService.readProjectGraph();
const { directories, unknownNames } = projectsService.resolveDirectories({
  graph,
  projectNames: ["callidescope-graph"],
});
```

`readProjectGraph` is the only method that touches Nx at run time; every
resolution rule takes the graph as an argument, so it can be exercised without
a workspace to build one from.

## Packages

| Package | Role |
| ------- | ---- |
| [`@callidescope/nx`](.) | Resolves Nx project names to directories |
| [`@callidescope/cli`](../callidescope-cli/README.md) | Orchestrates a run: traces the workspace, plans what to check, and reports |
| [`@callidescope/configuration`](../callidescope-configuration/README.md) | Reads `callidescope.config.ts` and resolves the limits |
| [`@callidescope/graph`](../callidescope-graph/README.md) | Builds the call graph from traced source and measures depth, breadth, and cohesion |
| [`@callidescope/output`](../callidescope-output/README.md) | Renders findings into markdown, mermaid, and JSON |

## Start

```bash
nx run callidescope-nx:start
```

## Test

```bash
nx run callidescope-nx:vitest
```

## Contributing

```bash
nx run callidescope-nx:lint-codebase --configuration=check
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.
