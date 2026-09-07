# 🍃 Gated leaf

**A leaf measuring four frames, gated at three — the case the whole per-project
configuration exists for.**

## Run it

```bash
nx run callidescope-examples:examples
```

This directory is its own project, so the run publishes a
`## 🔭 Callidescope` section for it, and that section is
[at the bottom of this guide](#-callidescope). The limits behind it are in
[`output/report.json`](../../output/report.json): `deepStacks` carries this
stack at `"limit": 3` and `wideCallables` carries `GatedLeafService.read` at
`"limit": 2`.

`GatedLeafService.read` heads four frames and calls three things directly. Those
are small numbers, and that is the point. A package low in the call graph
measures small numbers; every limit picked for the packages above it is picked
for their code, and every one of them leaves a leaf with no limit that binds:

| A limit the leaf could be held to | Written in | The leaf's four frames |
| --------------------------------- | ---------- | ---------------------- |
| 3 | [`callidescope.config.ts`](callidescope.config.ts), its own | a finding |
| 5 | [`../../callidescope.config.ts`](../../callidescope.config.ts), the package around it | silent |
| 6 | [`../../callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts), the run's default | silent |
| 17 | [`configuration/callidescope.config.ts`](../../../../configuration/callidescope.config.ts), this repository's ratchet | silent |

That last row is the real workspace, and the number is pinned by the single
deepest stack anywhere in it. The motivating measurement behind all of this was
`codometer-changes`: ten frames of its own, held to seventeen, which was to say
held to nothing. It now declares those ten in a
[`callidescope.config.ts`](../../../codometer-changes/callidescope.config.ts) of
its own, which is this example's argument having been acted on rather than an
argument it has stopped needing to make — every leaf added after it starts out
in the row above.

## Two things had to be true before a limit here meant anything

**It had to be a project.** Limits resolve per project, and a project is a
directory holding a `tsconfig.json`. This directory has one, which is what lets
the [`callidescope.config.ts`](callidescope.config.ts) beside it be read as a
project configuration at all.

**It had to declare its entry point.** `read` is called by
[`inherited-limits`](../inherited-limits/README.md), so no rule promotes it and
orphan promotion never sees it — this project would root nothing and measure
zero, however deep its code ran. A limit on a project that roots nothing gates
nothing. Declaring the address is what turns the measurement on; see
[`declared-entry-points`](../declared-entry-points/README.md) for the field and
its refusals.

## Counted in a stack is not judged by a stack

`InheritedLimitsService.request` is seven frames, and four of them are this
project's. It is judged against the six that project inherits, and the leaf's
own three has no say over it — a stack is weighed against the limit of the
project its **root** belongs to. So the same four frames are a finding here and
part of a passing measurement one project up, which is what "downward only"
buys: this project's gate answers for this project's code and for nothing that
reaches into it.

## Breadth can be gated at all only because some project declares a limit

`maximumBreadth` has no tool default and no workspace default — a single breadth
number was never something anybody could pick for a whole workspace — so
`--check breadth` is refused until some project in scope declares one. This
project is one of the several that now do, and the two halves of that rule are
runnable side by side:

```bash
# In scope: this project declares maximumBreadth, so the gate runs and fails.
node --import @swc-node/register/esm-register packages/callidescope-cli/src/main.ts \
  callidescope --check breadth \
  --config packages/callidescope-examples/callidescope.workspace.config.ts \
  --directories packages/callidescope-examples,packages/callidescope-examples/examples/gated-leaf,packages/callidescope-examples/examples/inherited-limits
```

```text
🔭 Found callables calling too much directly {"callables":["GatedLeafService.read"],"count":1,"widest":3}
```

```bash
# Out of scope: name the fixture next door, whose closure reaches no package
# at all, and nothing in scope declares a breadth limit.
node --import @swc-node/register/esm-register packages/callidescope-cli/src/main.ts \
  callidescope --check breadth \
  --config packages/callidescope-examples/callidescope.workspace.config.ts \
  --directories packages/callidescope-examples/examples/inherited-limits
```

```text
🔭 Rejected the configuration {"reasons":["--check breadth requires at least one project
in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to
that project's callidescope.config.ts before running --check breadth."]}
```

Both exit non-zero, for opposite reasons: the first found the finding it was
asked to look for, the second had no limit to look with.

## And it excludes one file, which is the whole of what `exclude` does

A project's own configuration may name globs to leave untraced, and this one
names `*.generated.ts`. **The glob is anchored to this project's root**, never
to the workspace: it names `gated-leaf.generated.ts` beside it and there is no
spelling of it that could name anything outside this directory.

The proof is a pair. The same file was written into this project and into
[`inherited-limits`](../inherited-limits/README.md) next door, which declares
no configuration at all:

| Project | Files it holds | Files the run traced |
| ------- | -------------- | -------------------- |
| this one | `gated-leaf.ts`, `callidescope.config.ts`, `gated-leaf.generated.ts` | 2 — the generated one is gone |
| [`inherited-limits`](../inherited-limits/README.md) | `inherited-limits.ts`, `inherited-limits.generated.ts` | 2 — both of them |

Those two numbers are the `Files` rows in the two `## 🔭 Callidescope` sections,
[this one](#-callidescope) and [that one](../inherited-limits/README.md#-callidescope),
and `Callables` moves with them: 4 here and 5 there. The generated twin is the
same file in both places, and only the project that named it lost it — a glob
written in one project's file reached that project's file and stopped.

Anchoring it here rather than at the workspace root is what makes that true by
construction instead of by a rule somebody has to enforce, and it is how every
other file at a project root is already read — a `tsconfig.json`'s own `include`
and `exclude` are project-relative too. The run's `exclude` keeps its
workspace-relative meaning, and it is layered underneath: a project can leave
more out, never put back what the run left out.

What it drops is the **collection**, not the file. `gated-leaf.generated.ts` is
still in the `ts.Program` and still type-checked; what changed is that its
callables were never collected, so a call reaching into it would be an
unfollowable call rather than one that vanished. That is the run-level
`exclude`'s behavior too, not a per-project quirk — and it is why no `exclude`
can un-project a directory. This project cannot exclude the `tsconfig.json` that
makes it a project: discovery is settled from the run's own filter, long before
a project file has been read at all.

## Why this project is named rather than reached

Every other project this run measures arrives through the dependency closure,
the way [`dependency-closure`](../dependency-closure/README.md) describes. This
one is named in the run's `--directories` instead, and the reason is a
collision between two tools rather than anything about callidescope: a closure
**destination** must hold a `package.json`, and a `package.json` at this root
would make Nx infer a project of its own from it — after which the relative
import in `inherited-limits` crosses an inferred project boundary and fails
`@nx/enforce-module-boundaries`.

Naming a directory is the other way it becomes a project a run measures, and it
costs this fixture nothing: a starting project is traced in full, and the
closure rules only ever refuse a destination.

## Next

[shared tail](../shared-tail/README.md).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-examples/examples/gated-leaf`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 4 |
| Files | 2 |
| Calls traced | 5 |
| Call stacks | 1 |
| Deepest stack | 4 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 3 | declared |
| `maximumBreadth` | 2 | declared |

### Call stacks (depth)

**1. `GatedLeafService.read`** — depth 4 · declared

```text
🚀 GatedLeafService.read(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40]
   ↳ The address this project declares as its entry point.
  └─> GatedLeafService.parse(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27]
     ↳ First of the three, and the way into the chain.
    └─> GatedLeafService.normalize(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22]
       ↳ Second of the three, one hop from the end.
      └─> GatedLeafService.finish(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:17]
         ↳ Ends the chain, which is where the fourth frame is.
```

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GatedLeafService.read` | 3 | `GatedLeafService.parse`, `GatedLeafService.normalize`, `GatedLeafService.finish` | `packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40` |
| `GatedLeafService.normalize` | 1 | `GatedLeafService.finish` | `packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22` |
| `GatedLeafService.parse` | 1 | `GatedLeafService.normalize` | `packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27` |

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
