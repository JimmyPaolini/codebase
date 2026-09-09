# 📜 Spread defaults

**A project that overrides nothing, and writes that down anyway.**

## Run it

```bash
nx run callidescope-examples:examples
```

This directory is its own project, so the run publishes a
`## 🔭 Callidescope` section for it, and that section is
[at the bottom of this guide](#-callidescope). Beside this file sits a
[`callidescope.config.ts`](callidescope.config.ts) whose every value is a
default: the tool's own decorators, its entry-point switches, the depth the run
supplies, and a section published into this guide.

`InheritedLimitsService.request` heads seven frames. Six is the limit, and it is
written **here**, in this project's own file. Look the stack up in
[`output/report.json`](../../output/report.json) and it says `"limit": 6`.
Compare the entry below it, `ProjectDepthLimitService.judge`, which says
`"limit": 5` because [the package around this one](../project-depth-limit/README.md)
chose that for itself.

## Writing a default down is not the same as inheriting it

The directory is still called `inherited-limits`, which is what this fixture
used to be about: there was no file here at all, and it was the example of a
project configured entirely by the run. That is now a refusal: a traced project
with no `callidescope.config.ts` ends the run naming the project, and so does a
file that leaves a field out. See
[ADR 0007](../../../../docs/adr/0007-complete-project-configurations.md) for the
argument.

What replaced inheritance is the spread. A real package writes
`...projectDefaults` and overrides what it means to, so a complete file costs
one line; this fixture spells the same statement out because the fields, and
not the terseness, are what it is here to show. Either way the numbers a project
is judged by are in the project's own file, and a reader who opens it is
finished rather than sent to a second file to work out which one won.

The two members written as `undefined` are the reason it is worth the line.
`maximumBreadth: undefined` says this project gates depth and not breadth, and
`mermaid: undefined` says it publishes no diagram. Both used to be sayable only
by leaving the field out — which is also how a project that simply forgot
looked. Breadth therefore gates nothing here, deliberately and in writing.
`--check breadth` still runs over this report, because some project in scope has
to declare a number before it can and three do:
[`gated-leaf`](../gated-leaf/README.md) next door, and two of the real packages
the closure reaches.

## Three real packages once shared this number

This run reaches `packages/callidescope-configuration`,
`packages/codometer-configuration`, and `packages/logger` through its dependency
closure. All three once carried no configuration at all and were held to the
same six — and all three now carry a `callidescope.config.ts` of their own,
declaring what they actually measure: six frames and eight direct callees,
eight frames and seven callees, and four frames. Two real breadth limits and
three real depth limits, where a moment ago there were none.

The clearest thing that bought is a finding that stopped existing.
`ConfigurationService.loadConfiguration` in `packages/codometer-configuration`
heads eight frames. Held to the six this run supplies, that was a finding about
ordinary code which had done nothing wrong; held to the eight that package now
declares for itself, it is silent. Nothing in the code moved — only which file
the number was written in, which is the same sentence
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

## Next

[gated leaf](../gated-leaf/README.md).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-examples/examples/inherited-limits`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 5 |
| Files | 3 |
| Calls traced | 3 |
| Call stacks | 1 |
| Deepest stack | 7 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 6 |
| `maximumBreadth` | none |

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
