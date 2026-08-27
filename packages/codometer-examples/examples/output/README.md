# 📤 The three sinks

Where a run's output lands. Three sinks, each with its own flag, and each
independently replaceable.

## Run it

```bash
codometer --directory examples/corpus --json | jq '.targets[0].files'   # 28
```

## What is here

```text
output/
├── codometer.config.ts          a configured report and document pair
├── renamed-markers.config.ts    a document that explains the default markers
├── custom-render.config.ts      a custom render, the built-in writer
├── custom-write.config.ts       a custom writer, the built-in render
└── self-excluded.config.ts      what a run writes, it does not measure
```

| Sink | Flag | What lands there |
| ---- | ---- | ---------------- |
| Report | `--json [path]` | the structured report |
| Document | `-m, --markdown [path]` | the rendered badges as a whole file |
| Splice | `--readme <path>` | the badge block, between two markers |

## Standard output carries the result

**Every diagnostic goes to standard error**, so the report survives a pipe, log
lines and all. The test proves it by taking the bytes the run wrote to standard
output — and only those — and feeding them to a second process that parses them.
One warning sharing the stream would break it.

**The document sink writes the badges as a whole file**, markers and all absent,
which is what a page that is nothing but statistics wants:

```bash
codometer --directory examples/corpus -m document.md --write
```

## A path needs a reason to exist

**`--json <path>` is refused unless the run writes or compares it**, because a
run doing neither would render the report to the console and leave that file
unwritten — noticed not here but downstream, by whatever reads the report,
finding nothing:

```text
--json report.json needs --write or --check reports: a run that neither writes
the report nor compares it would render it to the console and leave that file
unwritten. Add --write to write it, --check reports to fail on a stale one, or
drop the path to ask for the console.
```

A pathless `--json` is untouched: the console is what it asked for.

**A named destination stands for all of them.** `--json only-this.json --write`
against [`codometer.config.ts`](codometer.config.ts) writes the report and
**not** the configured markdown document. Adding to the configured set instead
would put a second document on the stream the first was piped out of.

## Splicing

The block sits between `CODE_STATISTICS_START` and `CODE_STATISTICS_END` unless
a configuration renames them. It is **appended when the markers are absent** and
the **file is created when it does not exist**, so a destination needs nothing
in it beforehand; a second run rewrites the block in place rather than appending
another.

[`renamed-markers.config.ts`](renamed-markers.config.ts) renames them, and the
reason is not cosmetic: a document that _explains_ the default markers holds the
default start marker in its own prose, so codometer reads it as already carrying
the block and rewrites the wrong region. This package's own README renames its
markers for exactly that reason, and so does the codometer README.

## Replacing half the behavior

`render` decides what markdown is produced; `write` decides which file it lands
in and how. **Supplying one keeps the built-in other.**

- [`custom-render.config.ts`](custom-render.config.ts) adds a line above the
  badges by calling `renderBadges()`, the built-in rendering of those same
  statistics — and the result is still spliced between the markers by the
  built-in writer.
- [`custom-write.config.ts`](custom-write.config.ts) picks the destination from
  what was measured, splicing with `anchors.syncAnchoredBlock` so choosing a
  different file does not mean reimplementing marker handling. The content it
  splices is the default badge block.

One detail that costs an afternoon otherwise: **derive a custom writer's
destination from the `path` it was handed**, which is already resolved against
the measured directory. A bare filename passed to `syncAnchoredBlock` is not
resolved the same way and lands relative to the working directory the command
was run from — for an Nx target, the workspace root rather than the project.

## What codometer writes, it does not measure

[`self-excluded.config.ts`](self-excluded.config.ts)

Every file a run would write is left out of what it measures, with no
configuration and no ignore-file entry — codometer knows its own destinations —
and the run says so on the console:

```text
📊 Excluded the files codometer writes from what it measures
   { paths: ["codometer-report.json", "statistics.md"] }
```

The reason is circular otherwise. A badge is an image inside a link, so a
spliced block moves `markdown.images`, `markdown.links`, and `markdown.lines` —
which moves the badges, which moves the counts. A report left in would be stale
the moment it landed.

Run it twice against a scratch copy and read the report the second run wrote:

```bash
cp -R examples/corpus /tmp/copy
codometer --directory /tmp/copy --config examples/output/self-excluded.config.ts --write
codometer --directory /tmp/copy --config examples/output/self-excluded.config.ts --write
jq '.targets[0].files' /tmp/copy/codometer-report.json   # 28
```

Still 28, one markdown file, one JSON file — exactly what a run before either
file existed reported. The exclusion is applied identically whatever the flags
say, so a `--write` run and a `--check reports` run always measure the same tree.

**Read the report from disk rather than adding `--json` to the second run.** A
destination named on the command line stands for all of them, so `--json`
replaces the configured pair with the console — and a run that was never going
to write those two files has no reason to exclude them. It reports 30.

## Next

[discovery](../discovery/README.md), for how a configuration is found in the
first place.
