# Callidescope Examples: Fixture Codebase

## Quick Start

**Type**: Fixture package — TypeScript source written to be traced, not run

**Purpose**: One worked example per thing callidescope can report, so a failing
`callidescope` run has somewhere concrete to point.

Nothing in `src/` is executed by anything. Do not "fix" it, do not refactor it,
and do not delete an uncalled callable: several fixtures are deliberately bad,
and one is defined by having no caller at all.

## Callidescope reported X → open this example

| What the run said | Open | What it means |
| ----------------- | ---- | ------------- |
| `🚨 [DEPTH n > limit]` and every frame's summary differs | [`deep-stack`](src/modules/deep-stack) | The layering is real. Question whether the stages are all needed; do not delete one layer at a time |
| `🚨 [DEPTH n > limit]` and a run of frames all say the same thing | [`forwarding-stack`](src/modules/forwarding-stack) | Layers that only pass arguments along. Collapse them |
| `depth ≥ n` rather than `depth n` | [`computed-member`](src/modules/computed-member) | Something on the path could not be followed. The number is a floor, not a bug |
| `Unfollowable calls` above zero | [`computed-member`](src/modules/computed-member), [`implementation-fan-out`](src/modules/implementation-fan-out) | A computed member name, or a structural expansion dropped for exceeding `maximumImplementationCandidates` |
| A `Module spread` row | [`module-spread`](src/modules/module-spread) | The callable joins unrelated concerns directly. Compare with [`spread-near-miss`](src/modules/spread-near-miss), which is correctly silent |
| A `Possibly misplaced` row | [`misplaced-callable`](src/modules/misplaced-callable) | Move the callable to the module the report names, or fold it into its one caller |
| `Stacks through recursion` above zero | [`mutual-recursion`](src/modules/mutual-recursion) | A cycle, collapsed before depth was measured. The depth is a floor |
| A stack headed `· orphan-root` | [`entry-points`](src/modules/entry-points) | Nothing claimed the callable. Either dead code, or an entry-point rule your configuration is missing |
| A frame marked `⚠ deprecated`, or printed `(…): T` | [`frame-annotations`](src/modules/frame-annotations) | Annotation shortening in the printed tree. `output/report.json` carries the full text |
| `A configured destination is stale` | [`callidescope.config.ts`](callidescope.config.ts) | Run the `write` configuration of whichever project owns the destination |
| `--check` rejected a value | [README, "The two flags"](README.md#the-two-flags) | Only `depth` and `reports` are findings; an empty `--check` is refused |

## Layout

```text
callidescope.config.ts   # This package's own limits and all four destinations
output/                  # The committed rendered results — json, markdown, mermaid
src/index.ts             # An `exported-function` root
src/main.ts              # A `module-bootstrap` root
src/modules/<example>/   # One directory per example; each readable on its own
testing/                 # The test that asserts every documented finding
```

Every directory under `src/modules/` is one **module** in callidescope's sense,
which is what module spread and misplacement are measured against. Splitting a
fixture across two directories changes those findings, so do not move files
between them casually.

## Changing a fixture

The numbers in [`testing/findings.integration.test.ts`](testing/findings.integration.test.ts)
are exact — callable count, edge count, every stack depth. That is deliberate: a
fixture whose meaning silently changes when the resolver changes is worse than
no fixture. Any edit under `src/` therefore takes three steps:

```bash
nx run callidescope-examples:lint-codebase --configuration=write   # first — see below
nx run callidescope-examples:callidescope:write                    # regenerate output/ and this README's section
nx run callidescope-examples:vitest                                # update the expectations, then confirm
```

Lint **before** regenerating, never after. Every frame in every report carries a
`file:line`, and `eslint --fix` sorts class members — so adding one method moves
the line numbers of the ones after it, and a report written before that sort is
stale the moment it lands.

If a number moved and you did not intend it, the resolver changed and that is
the finding. Do not update the expectation until you know which change caused
it.

## What must stay true

- **The package stays out of the workspace trace.** Its entry in
  [`configuration/.callidescopeignore`](../../configuration/.callidescopeignore)
  is what keeps deliberately-deep fixtures from failing
  `nx run codebase:callidescope:check`. Removing it fails that gate immediately.
- **This package gates `reports`, not `depth`.** Its fixtures are meant to
  breach the depth limit. Adding `--check depth` to its target would fail by
  design.
- **`src/` is not covered by tests and should not be.** See the comment in
  [`vitest.config.ts`](vitest.config.ts).
- **Every callable demonstrates exactly one thing.** A fixture doing two jobs
  makes both harder to point at.
- **Every example directory carries a `README.md`.** A new example without one
  is half an example: the code shows the shape, the README says what
  callidescope makes of it and why.

## Key Files

- [README.md](README.md): the human guide — how to read a stack, and how to act
  on each finding
- [callidescope.config.ts](callidescope.config.ts): why this package's limits
  differ from the workspace's
- [../callidescope-cli/README.md](../callidescope-cli/README.md): the behavior
  being demonstrated
- [../callidescope-configuration/README.md](../callidescope-configuration/README.md):
  every configuration field
