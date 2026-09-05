# 🔭 Callidescope Examples — Agent Guide

A small codebase written to be traced, not run: one worked example per thing
callidescope can report, so a failing `callidescope` run has somewhere concrete
to point. Read [README.md](README.md) for the guided tour; this file is the
lookup table for when callidescope has already said something.

Nothing here is executed by anything. Do not "fix" it, do not refactor it, and
do not delete an uncalled callable: several fixtures are deliberately bad, and
one is defined by having no caller at all.

## Run one

```bash
nx run callidescope-examples:examples          # trace the fixtures, gate the committed reports
nx run callidescope-examples:examples:write    # regenerate output/ and this README's section
nx run callidescope-examples:vitest            # assert every documented finding
```

There is no per-example command. An example directory carries no
`tsconfig.json`, so the package traces as one unit — every example's `## Run it`
names the command above and then says where in `output/` to look.

The run is not confined to this package, though. A scoped run also traces every
project its imports transitively reach, so this one covers four projects:
`packages/callidescope-examples`, `packages/callidescope-configuration`,
`packages/codometer-configuration`, and `packages/logger`. See
[`dependency-closure`](examples/dependency-closure/README.md).

## Callidescope said X — open this example

| What the run said | Open | What it means |
| ----------------- | ---- | ------------- |
| `🚨 [DEPTH n > limit]` and every frame's summary differs | [`deep-stack`](examples/deep-stack/README.md) | The layering is real. Question whether the stages are all needed; do not delete one layer at a time |
| `🚨 [DEPTH n > limit]` and a run of frames all say the same thing | [`forwarding-stack`](examples/forwarding-stack/README.md) | Layers that only pass arguments along. Collapse them |
| `depth ≥ n` rather than `depth n` | [`computed-member`](examples/computed-member/README.md) | Something on the path could not be followed. The number is a floor, not a bug |
| `Unfollowable calls` above zero | [`computed-member`](examples/computed-member/README.md), [`implementation-fan-out`](examples/implementation-fan-out/README.md) | A computed member name, or a structural expansion dropped for exceeding `maximumImplementationCandidates` |
| A `Module spread` row | [`module-spread`](examples/module-spread/README.md) | The callable joins unrelated concerns directly. Compare with [`spread-near-miss`](examples/spread-near-miss/README.md), which is correctly silent |
| A `Possibly misplaced` row | [`misplaced-callable`](examples/misplaced-callable/README.md) | Move the callable to the module the report names, or fold it into its one caller |
| `Stacks through recursion` above zero | [`mutual-recursion`](examples/mutual-recursion/README.md) | A cycle, collapsed before depth was measured. The depth is a floor |
| A stack headed `· orphan-root` | [`entry-points`](examples/entry-points/README.md) | Nothing claimed the callable. Either dead code, or an entry-point rule your configuration is missing |
| A frame marked `⚠ deprecated`, or printed `(…): T` | [`frame-annotations`](examples/frame-annotations/README.md) | Annotation shortening in the printed tree. `output/report.json` carries the full text |
| A call resolved to a class that never writes `implements` | [`structural-interface`](examples/structural-interface/README.md) | Structural matching, which is the only thing that works on an arrow-typed property |
| A frame you did not expect, named for a declaration rather than the local name | [`plain-call`](examples/plain-call/README.md) | The checker unwraps the import alias. A report always names the declaration |
| A frame, a stack, or a per-project row in a package the run was not pointed at | [`dependency-closure`](examples/dependency-closure/README.md) | A scoped run traces the projects its imports reach. Not a leak — a call into a dependency lands on a frame instead of stopping at the package boundary |
| A stack that ends at a call into another directory, with no frame for it | [`dependency-closure`](examples/dependency-closure/README.md) | The destination is refused: a project root holding no `package.json` is shared settings rather than a package, and the workspace root contains every project |
| `A configured destination is stale` | [`callidescope.config.ts`](callidescope.config.ts) | Run the `write` configuration of whichever project owns the destination |
| `--check` rejected a value | [README, "The two flags"](README.md#the-two-flags) | Only `depth` and `reports` are findings; an empty `--check` is refused |

## Layout

```text
callidescope-examples/
├── callidescope.config.ts             what traces this package, and every limit it sets
├── examples/
│   └── <name>/
│       ├── README.md                  the guide for this example
│       └── *.ts                       the fixture callables
├── output/
│   ├── report.json                    the whole run, machine-readable
│   ├── report.md                      the printed trees, between anchors
│   └── diagram.md                     the same stacks, drawn
├── src/
│   ├── index.ts                       an `exported-function` root
│   └── main.ts                        a `module-bootstrap` root
└── testing/
    └── examples.integration.test.ts   every finding this guide documents
```

- Every directory under `examples/` is one **module** in callidescope's sense,
  which is what module spread and misplacement are measured against. Splitting a
  fixture across two directories changes those findings, so do not move files
  between them casually.
- **`src/` is a requirement, not a leftover.** The `module-bootstrap` and
  `exported-function` entry-point rules key on the literal paths `src/main.ts`
  and `src/index.ts`, so those two fixtures cannot live under `examples/` with
  the rest. This is the one structural difference from the three sibling
  `*-examples` packages, and this is why.
- `src/` is not covered by tests and should not be — see the comment in
  [`vitest.config.ts`](vitest.config.ts).

## Adding an example

- One directory under `examples/`, named for the behavior it demonstrates.
- Every callable demonstrates exactly one thing. A fixture doing two jobs makes
  both harder to point at.
- A `README.md` in that directory: `# <emoji> Title`, then the bold one-line
  claim, then `## Run it` with the trace command and where in `output/` to look,
  then the explanation, then `## Next` linking to the next example.
- A link in the reading order in [README.md](README.md)'s `## The examples`, and
  a `## Next` link from the example before it.
- An assertion in `testing/examples.integration.test.ts` in the same change. A
  fixture with no assertion is a claim, not an example.
- Regenerate `output/` — see [Changing a fixture](#changing-a-fixture) for the
  order, which matters.

## Do not fix a deliberately broken example

Most of this package is code that would fail review if it were real, and that is
the point:

- `deep-stack` and `forwarding-stack` both breach `maximumDepth` on purpose.
  `configuration/.callidescopeignore` is what keeps them from failing
  `nx run codebase:callidescope:check`; removing that entry fails the workspace
  gate immediately.
- `computed-member` cannot be followed on purpose, which is what makes a depth a
  floor.
- `implementation-fan-out` exceeds `maximumImplementationCandidates` on purpose.
- `entry-points` holds a callable nothing calls on purpose.
  `dependency-cruiser` reports `no-orphans` against it on every run — two tools
  independently noticing the same file is the example working, not a lint
  failure to chase.
- `frame-annotations` carries a `@deprecated` member and a signature past 80
  characters on purpose.

One finding is not a fixture at all. This package's `maximumDepth` is 6 — the
tool's default, low enough to make the deep fixtures findings — and the closure
now judges three real dependency packages by it, so a genuine stack in one of
them is reported as too deep. Do not restructure a dependency to quiet this
run: nothing here gates depth, and `configuration/callidescope.config.ts` is the
limit that has a say over those packages.

**This package gates `reports`, not `depth`.** Adding `--check depth` to its
`examples` target would fail by design.

## Changing a fixture

The numbers in
[`testing/examples.integration.test.ts`](testing/examples.integration.test.ts)
are exact — callable count, edge count, every stack depth. That is deliberate: a
fixture whose meaning silently changes when the resolver changes is worse than
no fixture. Any edit under `examples/` or `src/` therefore takes three steps:

```bash
nx run callidescope-examples:lint-codebase --configuration=write   # first — see below
nx run callidescope-examples:examples:write                        # regenerate output/ and this README's section
nx run callidescope-examples:vitest                                # update the expectations, then confirm
```

Lint **before** regenerating, never after. Every frame in every report carries a
`file:line`, and `eslint --fix` sorts class members — so adding one method moves
the line numbers of the ones after it, and a report written before that sort is
stale the moment it lands.

If a number moved and you did not intend it, the resolver changed and that is
the finding. Do not update the expectation until you know which change caused
it.

Numbers can also move with no edit here at all. The committed reports cover the
three projects the closure reaches, so a change to
`packages/callidescope-configuration`, `packages/codometer-configuration`, or
`packages/logger` makes them stale. The `examples` target names those packages'
sources in its `inputs`, so the staleness is caught rather than cached over, and
the three steps above are the fix. Their READMEs are not named there: this run
measures those packages but publishes nothing into them. The assertions in the test
suite are deliberately written against this package's **own** per-project report
for that reason — a sibling package gaining a method should not fail a suite
about fixtures.

## Key files

| File | What it is |
| ---- | ---------- |
| [README.md](README.md) | The human guide — how to read a stack, and how to act on each finding |
| [callidescope.config.ts](callidescope.config.ts) | Why this package's limits differ from the workspace's |
| [../callidescope-cli/README.md](../callidescope-cli/README.md) | The behavior being demonstrated |
| [../callidescope-configuration/README.md](../callidescope-configuration/README.md) | Every configuration field |
