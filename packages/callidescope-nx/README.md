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
| `-p, --projects` | Comma-separated Nx project names to resolve |
| `-t, --tags` | Comma-separated Nx project tags, selecting every project carrying **any** of them |

Name at least one of the two. Both together select the union — everything
named, plus everything tagged — and a project reached both ways is still one
directory.

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

## Selecting by tag

`--tags` selects every project carrying **any** of the tags given, not every
project carrying all of them:

```bash
callidescope-nx directories --tags type:package
callidescope-nx directories --tags domain:lexico,language:python
```

Any rather than all, because Nx tags come in families whose members are
mutually exclusive on a single project. Nothing is both `type:application` and
`type:package`, so `--tags type:application,type:package` under all-semantics
would select nothing at all — while under any-semantics it selects both kinds,
which is what someone writing that line wants. It is also the reading that
composes: each tag widens the selection, exactly the way naming another
project does.

A tag no project in the workspace carries fails the run, the same as an
unknown project name, and the rejection lists every tag the workspace does
carry. A tag matching nothing is far more often a typo — `typ:package` for
`type:package` — than a deliberately empty category, and either way the trace
it would produce covers less than it was asked to without saying so.

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

- **Every name and tag must resolve.** A name the workspace does not have, or
  a tag no project carries, fails the whole run, listing what it does have.
  Dropping the entry instead would leave a trace quietly covering less than it
  was asked to, and a report of what it did cover cannot show you what it did
  not.
- **A flag passed without a value is refused**, even beside a flag that named
  something usable — proceeding would silently drop half of what was asked
  for.
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
const { directories, unknownNames, unmatchedTags } =
  projectsService.resolveDirectories({
    graph,
    projectNames: ["callidescope-graph"],
    tags: ["type:package"],
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
