# 📏 Project depth limit

**Six frames: a finding under the five this package declares, and not one
under the six it would otherwise have inherited.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `deepStacks` in [`output/report.json`](../../output/report.json). Every
entry carries the `limit` it was judged against, and the entries do not agree:
`ProjectDepthLimitService.judge` says `"limit": 5`, and
`ConfigurationService.loadConfiguration` in `packages/codometer-configuration`
says `"limit": 6`. One run, two numbers, because the depth limit is a fact about
a project rather than about a run.

`ProjectDepthLimitService.judge` heads a chain of six ordinary frames. Six is
what this package would inherit: `limits.maximumDepth` is `6` in
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts),
and every project in this run that declares nothing of its own is judged by it —
the three dependency packages the closure reaches, and
[`inherited-limits`](../inherited-limits/README.md). Six frames pass six.

This package declares five for itself, in the
[`callidescope.config.ts`](../../callidescope.config.ts) at its root, so the
same chain is a finding. Nothing about the code changed — only which file the
number was written in.

## What a project may declare, and how

A project configuration is a `callidescope.config.ts` at the project's own root
— the directory holding the `tsconfig.json` that makes it a project. It may set
`entryPoints`, `limits.maximumDepth`, `limits.maximumBreadth`, and `exclude`,
and nothing else. A file setting anything else is refused by name, before
anything is traced.

**Write only the limits you override:**

```ts
limits: { maximumDepth: 5 }
```

**Never spread the workspace limits into it.** A workspace limits object carries
limits that shape the graph itself — `spreadThreshold`,
`maximumImplementationCandidates` — and those are workspace-only, so a project
file holding one is rejected outright. Two projects disagreeing about them would
be describing two different graphs over the same shared code, and there is one
graph.

Nothing is lost by writing the override alone. Limits fall back one at a time
rather than as an object, so every limit a project does not name still comes
from the run. And a spread would have nothing left to give: depth and breadth
are the only two a project may set, so it would supply the field being
overridden plus the one that gets the file rejected.

## Why two configuration files sit at this package's root

Because the two roles are read differently, and one file cannot hold both.
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts) is
the _workspace_ configuration this run is handed — output destinations, the
module layout, the default limits every project falls back to. It carries the
longer name because those fields are workspace-only, so being discovered as this
package's own project configuration would refuse the run. Its doc comment works
through that in full.

[`callidescope.config.ts`](../../callidescope.config.ts) is this _project's_
own, found the way every project's is: by that exact name, at the project root.

## Next

[inherited limits](../inherited-limits/README.md).
