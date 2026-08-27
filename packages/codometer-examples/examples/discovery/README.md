# 🧭 One folder at a time

Codometer measures **one directory** and knows nothing about workspaces or
project graphs. With no `--config`, the configuration is found by walking upward
and taking the **first** file found.

## Run it

```bash
# examples/discovery/nested carries its own configuration, and it wins:
# one badge, "Configurations", and none of this package's counters.
codometer --directory examples/discovery/nested

# One folder up carries none, so the search continues to this package's:
# "Service Files" and "Unit Tests" return, "Configurations" does not.
codometer --directory examples/discovery
```

## What is here

```text
discovery/
└── nested/
    └── codometer.config.ts    the nearest configuration, which wins outright
```

The nearest one wins outright; nothing from a further ancestor is folded in,
because a merged configuration leaves a limit that never applied looking exactly
like one that did.

Three configuration files sit above that nested one — this package's, the
workspace root's, and the file the root one re-exports — and a run in
`examples/discovery/nested` takes nothing from any of them.

## A configuration may be a function

This package's own [`codometer.config.ts`](../../codometer.config.ts) is the
other half of the same idea: it is a **function**, handed the folder being
measured, so one file answers for the package (where the corpus is a size-gated
target) and for every folder beneath it (where it is not). That is also what the
workspace root's configuration does for every project in this repository, which
is why almost none of them carry a configuration file at all.

## Next

[staleness](../staleness/README.md), the last example, and the one that is a
warning rather than a feature.
