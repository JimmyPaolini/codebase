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
because no configuration this run reads declares one. A limit nobody sets stays
unset: it is not defaulted to the depth limit, and not invented. Breadth
therefore gates nothing here, and
[`gated-leaf`](../gated-leaf/README.md) — the one project in scope that does
declare a breadth limit — is the only reason `--check breadth` can run at all.

## Three real packages inherit the same number, and one of them suffers for it

This run reaches `packages/callidescope-configuration`,
`packages/codometer-configuration`, and `packages/logger` through its dependency
closure, and none of the three carries a configuration of its own either. They
are held to the same six, and six was chosen to make deliberately deep fixtures
into findings.

So `ConfigurationService.loadConfiguration` in `packages/codometer-configuration`
is reported at eight frames against a limit of six. It is ordinary code that has
done nothing wrong, and the report is not lying — it really is eight frames
against the only limit anything told this run about that package. **Do not
restructure it to quiet this run.** The answer is the one this whole set of
examples is about: a `callidescope.config.ts` in that package, saying what that
package should be held to. Until then, the workspace default is the honest
answer to a question nobody there has answered.

## Next

[gated leaf](../gated-leaf/README.md).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-examples/examples/inherited-limits`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 4 |
| Files | 1 |
| Calls traced | 3 |
| Call stacks | 1 |
| Deepest stack | 7 |
| Stacks through recursion | 0 |
| Unfollowable calls | 0 |

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

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `InheritedLimitsService.forward` | 1 | `GatedLeafService.read` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:26` |
| `InheritedLimitsService.prepare` | 1 | `InheritedLimitsService.forward` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:31` |
| `InheritedLimitsService.request` | 1 | `InheritedLimitsService.prepare` | `packages/callidescope-examples/examples/inherited-limits/inherited-limits.ts:38` |

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
