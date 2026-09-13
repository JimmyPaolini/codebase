# 📜 Inherited limits

**A project with no configuration file at all, gated all the same.**

## Run it

```bash
nx run callidescope-examples:examples
```

This directory is its own project, so the run publishes a
`## 🔭 Callidescope` section for it, and that section is
[at the bottom of this guide](#-callidescope). There is no
`callidescope.config.ts` beside this file and there is nothing to add — a
project that declares nothing is configured entirely by the run, which is what
every project did before per-project configuration existed and what most
projects will keep doing.

`InheritedLimitsService.request` heads seven frames. Six is the limit, written
in [`callidescope.workspace.config.ts`](../../callidescope.workspace.config.ts)
and inherited here, so the stack is a finding: look it up in
[`output/report.json`](../../output/report.json) and it says `"limit": 6` —
the number this project was handed rather than one it chose. Compare the entry
below it, `ProjectDepthLimitService.judge`, which says `"limit": 5` because
[the package around this one](../project-depth-limit/README.md) declared that
for itself.

## Inheritance is per limit, not per object

A project that names one limit keeps every other one it inherits, because the
fallback happens a limit at a time. That is what makes
`limits: { maximumDepth: 5 }` a complete override and a spread of the workspace
limits both unnecessary and — since such an object carries workspace-only limits
— refused.

This project shows the same rule with nothing on its side of it. It inherits
`maximumDepth` as `6`, and it inherits `maximumBreadth` as nothing at all,
because the configuration this run is handed declares none and inheritance has
nowhere else to look — a project inherits from the run, never from a sibling
that happened to declare one. A limit nobody sets stays unset: it is not
defaulted to the depth limit, and not invented. Breadth therefore gates nothing
here. `--check breadth` still runs over this report, because some project in
scope has to declare a limit before it can and three do:
[`gated-leaf`](../gated-leaf/README.md) next door, and two of the real packages
the closure reaches.

## Three real packages inherited this same number, and no longer do

Which is this example's argument having been acted on — the ratchet arriving —
rather than an argument it has stopped needing to make. This fixture is now the
only project in the run whose depth limit is a number somebody else wrote.

This run reaches `packages/callidescope-configuration`,
`packages/codometer-configuration`, and `packages/logger` through its dependency
closure. All three once carried no configuration at all and were held to the
same six — and all three now carry a `callidescope.config.ts` of their own,
declaring what they actually measure: six frames and eight direct callees,
eight frames and seven callees, and four frames. Two real breadth limits and
three real depth limits, where a moment ago there were none.

The clearest thing that bought is a finding that stopped existing.
`ConfigurationService.loadConfiguration` in `packages/codometer-configuration`
heads eight frames. Held to the six this run defaults to, that was a finding
about ordinary code which had done nothing wrong; held to the eight that package
now declares for itself, it is silent. Nothing in the code moved — only which
file the number was written in, which is the same sentence
[`project-depth-limit`](../project-depth-limit/README.md) ends on, arrived at
from the other direction.

One dependency finding is left, and it is not the same phenomenon:
`LoggerService.log` is five frames here against the four `packages/logger`
declares. That package is judged at four because the whole-workspace run ignores
calls to `LoggerService.*` and measures four; this run deliberately does not
ignore them and measures five. So the same declared number is a pass there and a
finding here, on purpose, and
[`packages/logger/callidescope.config.ts`](../../../logger/callidescope.config.ts)
says so beside it. **Do not restructure the logger to quiet this run**, and do
not raise its four — that would buy headroom on the one gate that matters to
tidy a fixture package.

What is left inheriting is this fixture, which declares nothing because
declaring nothing is what it is for.

## Next

[gated leaf](../gated-leaf/README.md).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-examples/examples/inherited-limits`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 5 |
| Files | 2 |
| Calls traced | 3 |
| Call stacks | 1 |
| Deepest stack | 7 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 6 | inherited |
| `maximumBreadth` | none | — |

### Call stacks (depth)

**1. `InheritedLimitsService.request`** — depth 7 · orphan-root

```text
🚀 InheritedLimitsService.request(key: string): string [packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:38]
   ↳ Asks the leaf about one key, through the two frames above it.
  └─> InheritedLimitsService.prepare(key: string): string [packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:31]
     ↳ Prepares the key the leaf is asked about.
    └─> InheritedLimitsService.forward(key: string): string [packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:26]
       ↳ Hands the key to the leaf, which is where this project's code stops.
      └─> GatedLeafService.read(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40]
         ↳ The address this project declares as its entry point.
        └─> GatedLeafService.parse(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27]
           ↳ First of the three, and the way into the chain.
          └─> GatedLeafService.normalize(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22]
             ↳ Second of the three, one hop from the end.
            └─> GatedLeafService.finish(key: string): string [packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts:17]
               ↳ Ends the chain, which is where the fourth frame is.
```

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `InheritedLimitsService.forward` | 1 | `GatedLeafService.read` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:26` |
| `InheritedLimitsService.prepare` | 1 | `InheritedLimitsService.forward` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:31` |
| `InheritedLimitsService.request` | 1 | `InheritedLimitsService.prepare` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:38` |
<!-- CALL_STACKS_END -->
