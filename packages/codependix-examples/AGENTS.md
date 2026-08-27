# CodependixExamples: Worked Examples

## Quick Start

**Type**: Examples package — subjects built to be graphed, and the guides
rendered from them

**Purpose**: Fifteen worked examples of what codependix builds, each rendered by
the real graph builders from the subject beside it. Reach for it when codependix
says something you need to act on.

```bash
nx run codependix-examples:examples          # Fail if any committed guide has drifted
nx run codependix-examples:examples:write    # Re-render every guide
nx run codependix-examples:vitest            # The tests that keep every claim true
```

## Codependix said X — open this example

Every row is a real rendered file, not prose. If codependix refused something,
the reproduction that produces that exact message is in
[`refusals`](examples/refusals).

| What you were told | Open |
| ------------------ | ---- |
| `Found stale codependix exports`, with a list of projects | [`check-and-write`](examples/check-and-write), then [`workspace-drift`](examples/workspace-drift) — an export moves with the workspace, so a branch that changed any project graph fails `--check` for projects it never touched. This repository gates no pull request on it |
| `AnchorNotFoundError: Anchor "…" not found in …/README.md` | [`auto-created-sections`](examples/auto-created-sections) — the file itself does not exist. A missing _anchor_ is auto-created on `--write`; a missing _file_ is not |
| A project reported stale that has never had codependix output | [`auto-created-sections`](examples/auto-created-sections) — expected. `--check` reports it as needing a write rather than raising |
| `A "both" export target needs a json destination.` | [`refusals`](examples/refusals) |
| `A "markdown" export target needs a markdown destination.` | [`refusals`](examples/refusals) |
| `A markdown destination needs an anchor, a path, or both` | [`refusals`](examples/refusals), and [`markdown-modes`](examples/markdown-modes) for the four shapes a destination can take |
| `ConfigurationFileNotFoundError` | [`refusals`](examples/refusals) — an explicitly named `--config` must exist; an unnamed one may be absent |
| `UnknownConfigurationFileTypeError` | [`refusals`](examples/refusals) — the seven readable extensions are listed there |
| `TypescriptProjectConfigurationError` | [`typescript-resolution`](examples/typescript-resolution) — the compiler's own diagnostics, and why a parse failure is fatal rather than skipped |
| `💥 Failed running codependix`, naming one project | [`container-rooting`](examples/container-rooting) — one project's failure is isolated; every other project still completed |
| `Either --check or --write is required` | [`check-and-write`](examples/check-and-write) |
| `Only one of --check or --write may be given` | [`check-and-write`](examples/check-and-write) |
| A graph came out emptier than the code looks | [`ambient-modules`](examples/ambient-modules) for a rounded module with no edges; [`typescript-resolution`](examples/typescript-resolution) and [`python-scanner`](examples/python-scanner) for the statements deliberately not walked |
| A project produced no graph at all | [`configuration-resolution`](examples/configuration-resolution) — check `include`/`exclude` and whether a per-project override replaced the default |
| A NestJS module you expected is missing | [`container-rooting`](examples/container-rooting) — a rooted project is explored from `MainModule` outward, so a module nothing imports is absent |

## Before changing a graph builder

`nx run codependix-examples:examples` is the regression gate for every
documented behavior, and it is stricter than the tests: it compares the
committed Markdown byte for byte. Two rules follow from that.

- **A deliberate behavior change means regenerating**, with
  `nx run codependix-examples:examples:write`, and reading the diff. If a
  diagram moved, the guides moved with it.
- **An accidental behavior change shows up here first.** Every case in
  [`typescript-resolution`](examples/typescript-resolution) and
  [`python-scanner`](examples/python-scanner) that exists to _not_ be walked — a
  re-export, a dynamic `import()`, a `require`, an import indented inside a
  function — is a claim a resolver or scanner change could silently reverse. A
  failing `examples` check on one of those is a bug report, not a stale
  snapshot.

Never hand-edit an `examples/*/README.md` or an `examples/*/*.json`.

## Layout

```text
examples/<example>/README.md      # Rendered from the subject beside it
examples/<example>/<subject>/     # The code being graphed — nested, and scoped out of the linters
scripts/render-examples.ts        # Entry point: --check or --write
scripts/render/                   # One module per example, plain exported functions
testing/                          # The tests that keep every documented claim true
```

There is no `src/`. This package ships examples, not an application — no CLI, no
NestJS container of its own, no public API. `scripts/render/builders.ts`
constructs the codependix services the examples render through, and everything
else in `scripts/render/` is a plain function.

**The nesting depth is load-bearing.** One level under `examples/` is the
rendered guide and its JSON exports, which every linter still checks; two levels
down is the subject, which `eslint` and `fallow` are scoped out of by the
`examples/*/*/**` pattern. Putting a subject file directly in an example
directory would drag it into the lint run.

## Adding an example

1. **Create `examples/<name>/`** and put the subject in a subdirectory of it,
   if the example needs one on disk. Nothing nested there is linted, so shape it
   however the behavior requires.
2. **Render it** from the matching module in `scripts/render/`. Each exports a
   `build*Documents()` returning `ExampleDocument`s whose `id` is the directory
   name.
3. **Add the `id` to `EXAMPLE_ORDER`** in `scripts/render/catalog.ts` — the one
   place the reading order is written down. A document missing from it fails the
   run rather than being silently dropped.
4. **Assert the behavior** in `testing/`, not just the rendering — the point of
   an example is the claim it makes, and a test is what stops that claim from
   quietly reversing.
5. **Regenerate and commit**, then add a row to the README's table.

## Constraints worth knowing

- **The subjects carry no `project.json`**, so none of them joins this
  workspace's Nx project graph, `nx affected`, or `sherif`. Adding one would put
  a deliberately-broken `tsconfig.json` into the real build.
- **The Python subjects are never tagged `language:python`**, so `ruff`,
  `pyright`, `ty`, and `vulture` never run over input that exists precisely to
  look malformed.
- **Every anchor this package prints is named `example-*`.** An example printing
  `codependix-nx` inside a Markdown file would be an anchor
  `codebase:codependix:write` could claim and overwrite.
- **A committed guide must not carry an absolute path.** The
  `typescript-resolution` and `refusals` renderers redact theirs; anything new
  that quotes a filesystem error needs the same treatment, or the `examples`
  check fails on every machine but the one that rendered it.
- **`examples/tsconfig.json` exists for the NestJS subjects.** Vite resolves a
  file's compiler options through the nearest tsconfig whose `include` claims
  it, so without that file the `@Module()` decorators reach Node untransformed
  and every container boot dies with a bare `SyntaxError`.

## Key Files

- [README.md](README.md): the human guide, and the reasoning behind the layout
- [scripts/render/catalog.ts](scripts/render/catalog.ts): every example, in reading order
- [scripts/render/builders.ts](scripts/render/builders.ts): the codependix services the examples render through
- [scripts/render/document.ts](scripts/render/document.ts): Markdown rendering and the check/write delivery
- [project.json](project.json): the `examples` target, and why both its configurations are safe on a branch
