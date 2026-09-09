# 📏 Project depth limit

**Six frames: a finding under the five this package declares, and not one
under the six the run supplies as its default.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `deepStacks` in [`output/report.json`](../../output/report.json).
`ProjectDepthLimitService.judge` carries `"limit": 5` — this package's own
number, not the run's.

`ProjectDepthLimitService.judge` heads a chain of six ordinary frames. Six is
what `limits.maximumDepth` reads in
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts),
the number this run supplies as its own default — the one a project adopts by
spreading it, and the one `configuration/` in the surrounding repository is
judged by for want of a file of its own. Six frames would pass six.

This package declares five for itself, in the
[`callidescope.config.ts`](../../callidescope.config.ts) at its root, so the
same chain is a finding. Nothing about the code changed — only which file the
number was written in.

## What a project may declare, and how

A project configuration is a `callidescope.config.ts` at the project's own root
— the directory holding the `tsconfig.json` that makes it a project. It may set
`entryPoints`, `exclude`, `limits.maximumDepth`, `limits.maximumBreadth`,
`write.markdown`, and `write.mermaid`, and nothing else. A file setting
anything else — an output destination the run owns, say — is refused by name,
before anything is traced.

**Write every field, not only the ones you override.** A project's file is its
whole statement of how it is traced and judged, so a field left out is refused
rather than filled in from the run. Nothing falls back per limit any more:

```ts
limits: { maximumBreadth: undefined, maximumDepth: 5 }
```

`maximumBreadth: undefined` is this package saying outright that it gates depth
and not breadth — a statement an absent field could never be told apart from a
file that forgot. In the surrounding repository the cheap way to be complete is
to spread the shared `projectDefaults` export and override what the project
means to say; these fixtures write their fields out inline instead, so a reader
can see the whole set without resolving another file.

## Why two configuration files sit at this package's root

Because the two roles are read differently, and one file cannot hold both.
[`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts) is
the _workspace_ configuration this run is handed — output destinations, and the
default limits a project adopts by spreading them. It carries the
longer name because those fields are workspace-only, so being discovered as this
package's own project configuration would refuse the run. Its doc comment works
through that in full.

[`callidescope.config.ts`](../../callidescope.config.ts) is this _project's_
own, found the way every project's is: by that exact name, at the project root.

## Next

[gated leaf](../gated-leaf/README.md).
