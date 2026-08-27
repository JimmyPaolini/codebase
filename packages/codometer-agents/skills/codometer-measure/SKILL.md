---
name: codometer-measure
description: Run a codometer measurement, decide where its report goes, or read a badge block or JSON report it produced. Use when running codometer or npx codometer, choosing --write and --check flags, wiring codometer into a CI step, splicing a badge block into a README, or reading a codometer JSON report's metrics, limits, or failures. Covers the command-line host directly, without assuming any task runner.
license: MIT
---

# Running a codometer measurement

Codometer walks a directory, parses everything it recognizes, and reports what
it counted — as console output, a JSON report, a markdown document, or a badge
block spliced into an existing file. It counts languages the way any analyzer
would — files, lines, classes, functions — and also the declared conventions a
repository holds itself to, which is usually the more interesting number.

## One directory at a time

**Codometer measures one directory and knows nothing about workspaces, task
runners, or project graphs.** Pointed at a project, it measures that project's
own sources and whatever targets its configuration declares — nothing else, and
nothing about sibling projects.

```bash
codometer --directory packages/widgets
```

Do not assume it takes a project name, a package name, or anything a task
runner would resolve. If a workspace runs it per project, that iteration is the
runner's job, not codometer's.

## Finding the configuration

With no `--config`, codometer searches upward from the measured directory and
takes the **first** configuration file it finds. The nearest one wins outright:
nothing from a further ancestor is folded into it. A project with no
configuration of its own is measured by the nearest ancestor's, in full.

`.gitignore` is already in force through discovery — a build directory or
virtual environment pruned by an ignore file needs no exclusion naming it
again — and git itself is never invoked, so an unversioned directory measures
the same way a repository does.

## `--write` and `--check` are independent

Neither flag implies the other, and no combination is inferred:

| Invocation | Writes | Fails on staleness | Fails on a breach |
| ---------- | ------ | ------------------ | ------------------ |
| `codometer` | no | no | no |
| `codometer --check limits` | no | no | yes |
| `codometer --check reports` | no | yes | no |
| `codometer --check reports,limits` | no | yes | yes |
| `codometer --write` | yes | no | no |
| `codometer --write --check limits` | yes | no | yes, after writing |

`codometer --write --check reports` is refused rather than obeyed: nothing can
be stale in the run that just wrote it. A `--write` run that also gates still
produces **every** resolved report before it fails, so the report on disk
reflects the current measurement even when the run's exit code says no.

A **breach** and **staleness** are different findings, never reported as one. A
`warn`-severity breach prints and leaves the exit code alone; a `fail`-severity
breach exits `1`, and only where `--check limits` asked for a gate at all. For
what to do about either, reach for the `codometer-triage` skill.

```yaml
- run: npx codometer --check reports,limits
```

## Reading a report

The JSON report groups metrics by target. Every metric carries its value, its
path within its target, a unit (`"bytes"` or `null`), and every limit declared
against it — each with its severity and whether it was breached, whether or not
that breach failed the run:

```json
{
  "failures": [],
  "targets": [
    {
      "empty": false,
      "files": 42,
      "name": "codebase",
      "metrics": [
        {
          "limits": [{ "breached": false, "label": null, "severity": "fail", "value": 500 }],
          "name": "codebase.typescript.interfaces",
          "path": "typescript.interfaces",
          "unit": null,
          "value": 118
        }
      ]
    }
  ]
}
```

A limit that held is written out exactly like one that did not, so a consumer
can render headroom, not only failures. `failures` holds what the run could not
do at all — a target that matched no files despite carrying a limit, a limit
bound to a metric nothing measured — and is unrelated to a breach or staleness.

## Where output goes

What a run prints and what it writes are asked for separately. `--format json`
prints the report and `--format markdown` prints the rendered badges; a path
always names a file, never the console. On a run that touches no file
`--format` defaults to `markdown`, which is what a bare `codometer` does.

Two file sinks — `--output-json <path>` and `--output-markdown <path>` —
neither of which implies the other or implies printing. Both are refused on a
run that neither writes nor checks reports: the path names a file nothing
would populate, so the command line is rejected before anything is measured,
naming the flag to add.

`--output-markdown <path>` is never defaulted — it writes into a file somebody
else may have written the rest of, so guessing the filename would mean editing
a document nobody pointed the run at. The block sits between two markers, named
`CODE_STATISTICS_START` / `CODE_STATISTICS_END` unless the configuration
renames them; it is spliced between them when they are there, appended with
them when they are not, and the file is created when it does not exist.

Every file codometer would write is excluded from what it measures, on every
run regardless of flags — a written report left in the count would be stale
the instant it landed, and a splice would move the very markdown metrics it
just wrote into.

## A runtime detail that reads like a bug

Compressed sizes are Node-version dependent, because the bundled zlib differs
between releases. A report written on one Node runtime and checked on another
reads as stale even when nothing in the source changed. Run `--check reports`
on the same runtime the repository pins for everything else, and reach for the
`codometer-triage` skill before concluding a stale report is a real
regression.
