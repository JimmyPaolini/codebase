# 🔭🧬 Callidescope Nx

**An Nx plugin that traces call stacks per project, following the Nx dependency graph.**

[`@callidescope/cli`](../callidescope-cli/README.md) is Nx-free on purpose: it
takes `--directories`, each one a path holding its own `tsconfig.json`, so it
works in any TypeScript workspace whether or not Nx is anywhere near it. This
package is the one place in the toolchain that knows Nx exists, and the only
one that depends on `@nx/devkit`.

It adds two things the core CLI cannot know about:

- **A target on every project**, so the workspace's task runner does the
  selecting — `nx affected`, `--projects=tag:…`, caching, and all.
- **Dependency-aware scope**, so tracing one project does not truncate its call
  stacks at the first package boundary.

## Install

```bash
npm install --save-dev @callidescope/nx
```

Register it in `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@callidescope/nx",
      "options": {
        "configurationPath": "configuration/callidescope.config.ts",
        "traceTargetName": "callidescope-trace"
      }
    }
  ]
}
```

| Option | Meaning |
| ------ | ------- |
| `configurationPath` | Where the callidescope configuration lives. The conventional root filenames are searched when omitted |
| `traceTargetName` | Name of the inferred target. `callidescope` when omitted |

## Usage

The target is inferred onto every project holding a `tsconfig.json`, so
selection is Nx's job rather than a flag of this package's own:

```bash
nx run callidescope-graph:callidescope-trace     # one project
nx run-many -t callidescope-trace                # the workspace
nx run-many -t callidescope-trace --projects=tag:type:package
nx affected -t callidescope-trace                # only what changed
```

Two projects are deliberately skipped: the **workspace-root project**, whose
target would trace everything under one uncacheable task, and any project with
**no `tsconfig.json`**, whose target would be a permanently empty report.

### Why the trace follows dependencies

`nx run callidescope-cli:callidescope-trace` traces `callidescope-cli` **and
everything it depends on**, resolved transitively from the Nx project graph.

That is the whole point of the plugin. A call stack runs downward — a command
calls into the service it was injected with, which lives in a package it
depends on — so tracing a project alone truncates every stack at the first
package boundary, which is the one measurement callidescope exists to take.
Tracing `callidescope-nx` on its own finds 17 callables; tracing it with its
dependencies finds 469.

Dependencies, never dependents: a project's dependents call _into_ it and add
no frames below it.

Pass `--withDependencies=false` for the narrow reading.

### Executor options

```bash
nx run logger:callidescope-trace --tags=type:package
nx run logger:callidescope-trace --projects=callidescope-cli,callidescope-graph
```

| Option | Meaning |
| ------ | ------- |
| `projects` | Nx project names to trace, replacing the target's own project |
| `tags` | Nx project tags, selecting every project carrying **any** of them |
| `withDependencies` | Widen along the Nx dependency graph. `true` by default |
| `format` | `markdown`, `mermaid`, or `json` |
| `configurationPath` | Overrides the registered configuration path |

`--projects` and `--tags` union rather than intersect, and a project reached
both ways is still traced once. `--tags` matches **any** of the tags given,
because Nx tag families are mutually exclusive on a single project — nothing is
both `type:application` and `type:package`, so requiring all of them would
select nothing.

Prefer Nx's own `--projects=tag:…` on `run-many` for ordinary selection; these
options exist for a target that wants to declare a fixed scope in its
`project.json`.

### Nothing resolves silently to less

A project name the workspace does not have, or a tag no project carries, fails
the task and names the workspace's actual vocabulary. Narrowing the run instead
would let it pass while measuring less than it was asked to — and a report of
what a run did cover cannot show you what it did not.

## As a library

The Nx-graph reading is a NestJS provider, for a host that would rather import
it than run a task:

```ts
import { resolveProjectsService } from "@callidescope/nx";

const projectsService = await resolveProjectsService();
const graph = await projectsService.readProjectGraph();
const names = projectsService.resolveDependencyClosure({
  graph,
  projectNames: ["callidescope-cli"],
});
const directories = projectsService.toDirectories({ graph, projectNames: names });
```

`readProjectGraph` is the only method that touches Nx at run time; every
resolution rule takes the graph as an argument, so it can be exercised without
a workspace to build one from.

## Packages

| Package | Role |
| ------- | ---- |
| [`@callidescope/nx`](.) | Nx plugin: per-project trace targets, resolved through the Nx graph |
| [`@callidescope/cli`](../callidescope-cli/README.md) | Orchestrates a run: traces the workspace, plans what to check, and reports |
| [`@callidescope/configuration`](../callidescope-configuration/README.md) | Reads `callidescope.config.ts` and resolves the limits |
| [`@callidescope/graph`](../callidescope-graph/README.md) | Builds the call graph from traced source and measures depth, breadth, and cohesion |
| [`@callidescope/output`](../callidescope-output/README.md) | Renders findings into markdown, mermaid, and JSON |

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

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.
