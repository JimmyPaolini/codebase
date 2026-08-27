# 📤 The output sinks

Where a run's output lands. What a run prints and what it writes are asked for
separately, and each sink is independently replaceable.

## Run it

```bash
codometer --directory examples/corpus --format json | jq '.targets[0].files'   # 28
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
| Console | `-f, --format <format>` | the report as `json`, or the badges as `markdown` |
| Report | `--output-json <path>` | the structured report |
| Markdown | `--output-markdown <path>` | the badge block, in a markdown file |

A path always names a file, never the console. `--format` defaults to
`markdown` on a run that touches no file, which is what a bare `codometer`
does.

## Standard output carries the result

**Every diagnostic goes to standard error**, so the report survives a pipe, log
lines and all. The test proves it by taking the bytes the run wrote to standard
output — and only those — and feeding them to a second process that parses them.
One warning sharing the stream would break it.

**The markdown sink writes the badge block into a file**, which serves a page
that is nothing but statistics as readily as a README with prose around it:

```bash
codometer --directory examples/corpus --output-markdown document.md --write
```

## A path needs a reason to exist

**An `--output-*` path is refused unless the run writes or compares it**,
because a run doing neither would leave that file exactly as it found it —
noticed not here but downstream, by whatever reads the report, finding nothing:

```text
--output-json report.json needs --write or --check reports: a run that neither
writes that file nor compares it would leave it exactly as it found it. Add
--write to write it, --check reports to fail on a stale one, or ask for
--format json to read it on the console instead.
```

Asking for the console is `--format json`, which names no file and so is never
refused.

**A named destination stands for all of them.** `--output-json only-this.json
--write` against [`codometer.config.ts`](codometer.config.ts) writes the report
and **not** the configured markdown file. Adding to the configured set instead
would write a file the command line never asked for.

## One markdown sink, not two

`--output-markdown` splices the block between `CODE_STATISTICS_START` and
`CODE_STATISTICS_END` unless a configuration renames them. It is **appended
with its markers when they are absent** and the **file is created when it does
not exist**, so a destination needs nothing in it beforehand; a second run
rewrites the block in place rather than appending another. A README somebody
else wrote the rest of and a file holding nothing but badges are the same case,
so neither needs a flag of its own.

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

**Reading the report back does not change what is measured.** `--format json`
names no destination, so the configured pair stays excluded and the second run
reports the same 28. Naming a destination outright — `--output-json
only-this.json --write` — does replace the configured pair, and a run that was
never going to write those two files has no reason to exclude them.

## Next

[discovery](../discovery/README.md), for how a configuration is found in the
first place.
