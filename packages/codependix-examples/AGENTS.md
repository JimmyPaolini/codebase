# CodependixExamples: Worked Examples

## Quick Start

**Type**: Documentation package — worked examples, and the script that renders them

**Purpose**: Fifteen worked examples of what codependix builds, each one rendered
by the real graph builders from subjects in this package. Reach for it when
codependix says something you need to act on.

```bash
nx run codependix-examples:examples:check   # Fail if any committed example has drifted
nx run codependix-examples:examples:write   # Re-render every example into output/
nx run codependix-examples:vitest           # The tests that keep every claim true
```

## Codependix said X — open this example

Every row is a real rendered file, not prose. If codependix refused something,
the reproduction that produces that exact message is in example 13.

| What you were told | Open |
| ------------------ | ---- |
| `Found stale codependix exports`, with a list of projects | [12](output/12-check-and-write.md), then [15](output/15-workspace-drift.md) — an export moves with the workspace, so a branch that changed any project graph fails `--check` for projects it never touched. This repository gates no pull request on it |
| `AnchorNotFoundError: Anchor "…" not found in …/README.md` | [11](output/11-auto-created-sections.md) — the file itself does not exist. A missing _anchor_ is auto-created on `--write`; a missing _file_ is not |
| A project reported stale that has never had codependix output | [11](output/11-auto-created-sections.md) — expected. `--check` reports it as needing a write rather than raising |
| `A "both" export target needs a json destination.` | [13](output/13-refusals.md) |
| `A "markdown" export target needs a markdown destination.` | [13](output/13-refusals.md) |
| `A markdown destination needs an anchor, a path, or both` | [13](output/13-refusals.md), and [10](output/10-markdown-modes.md) for the four shapes a destination can take |
| `ConfigurationFileNotFoundError` | [13](output/13-refusals.md) — an explicitly named `--config` must exist; an unnamed one may be absent |
| `UnknownConfigurationFileTypeError` | [13](output/13-refusals.md) — the seven readable extensions are listed there |
| `TypescriptProjectConfigurationError` | [6](output/06-typescript-resolution.md) — the compiler's own diagnostics, and why a parse failure is fatal rather than skipped |
| `💥 Failed running codependix`, naming one project | [5](output/05-container-rooting.md) — one project's failure is isolated; every other project still completed |
| `Either --check or --write is required` | [12](output/12-check-and-write.md) |
| `Only one of --check or --write may be given` | [12](output/12-check-and-write.md) |
| A graph came out emptier than the code looks | [3](output/03-ambient-modules.md) for a rounded module with no edges; [6](output/06-typescript-resolution.md) and [7](output/07-python-scanner.md) for the statements deliberately not walked |
| A project produced no graph at all | [8](output/08-configuration-resolution.md) — check `include`/`exclude` and whether a per-project override replaced the default |
| A NestJS module you expected is missing | [5](output/05-container-rooting.md) — a rooted project is explored from `MainModule` outward, so a module nothing imports is absent |

## Before changing a graph builder

`nx run codependix-examples:examples:check` is the regression gate for every
documented behavior, and it is stricter than the unit tests: it compares the
committed Markdown byte for byte. Two rules follow from that.

- **A deliberate behavior change means regenerating**, with
  `nx run codependix-examples:examples:write`, and reading the diff. If a
  diagram moved, the guides moved with it.
- **An accidental behavior change shows up here first.** Every case in
  examples 6 and 7 that exists to _not_ be walked — a re-export, a dynamic
  `import()`, a `require`, an import indented inside a function — is a claim a
  resolver or scanner change could silently reverse. A failing `examples:check`
  on one of those is a bug report, not a stale snapshot.

Never hand-edit anything under `output/`.

## Layout

```text
examples/                  # The subjects being graphed — never this package's own code
  atlas/                   # One small Nx workspace, graphed at all four levels
  nestjs/                  # Seven containers, one per rule the module graph applies
  typescript/              # Module resolution, and the four statements that draw nothing
  python/                  # Every case the statement scanner handles, and every non-case
  configuration/           # File precedence, upward search, unknown fields, refusals
output/                    # The rendered examples — generated, never hand-edited
  json/                    # One committed JSON export per graph type
scripts/
  render-examples.ts       # Entry point: --check or --write
  render/                  # One module per example group, plain exported functions
testing/                   # The tests that keep every documented claim true
```

There is no `src/`. This package ships examples, not an application — no CLI, no
NestJS container of its own, no public API. `scripts/render/builders.ts`
constructs the codependix services the examples render through, and everything
else in `scripts/render/` is a plain function.

## Adding an example

1. **Add the subject** under `examples/<group>/`, if the example needs one on
   disk. Nothing there is linted or formatted, so shape it however the behavior
   requires.
2. **Render it** from the matching module in `scripts/render/`. Each exports a
   `build*Documents()` returning `ExampleDocument`s; add a section, or a whole
   document with the next free `id`.
3. **Register it** in `scripts/render/catalog.ts` if it is a new group.
4. **Assert the behavior** in `testing/`, not just the rendering — the point of
   an example is the claim it makes, and a test is what stops that claim from
   quietly reversing.
5. **Regenerate and commit** `output/`.

Document `id`s are ordered (`01-`…`15-`) and the guides link them by number, so
inserting one in the middle means renumbering the files and both guides.

## Constraints worth knowing

- **The subjects carry no `project.json`**, so none of them joins this
  workspace's Nx project graph, `nx affected`, or `sherif`. Adding one would put
  a deliberately-broken `tsconfig.json` into the real build.
- **The Python subjects are never tagged `language:python`**, so `ruff`,
  `pyright`, `ty`, and `vulture` never run over input that exists precisely to
  look malformed.
- **Every anchor this package prints is named `example-*`** and lands under
  `output/`, never in a `README.md`. An example printing `codependix-nx` inside a
  Markdown file would be an anchor `codebase:codependix:write` could claim and
  overwrite.
- **A committed example must not carry an absolute path.** The TypeScript and
  configuration renderers redact theirs; anything new that quotes a filesystem
  error needs the same treatment, or `examples:check` fails on every machine but
  the one that rendered it.

## Key Files

- [README.md](README.md): the human guide, and the reasoning behind the layout
- [scripts/render/catalog.ts](scripts/render/catalog.ts): every document, in reading order
- [scripts/render/builders.ts](scripts/render/builders.ts): the codependix services the examples render through
- [scripts/render/document.ts](scripts/render/document.ts): Markdown rendering and the check/write delivery
- [project.json](project.json): the `examples` target, and why both its configurations are safe on a branch
