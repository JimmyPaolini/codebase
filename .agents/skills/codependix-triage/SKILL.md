---
name: codependix-triage
description: Act on a codependix run that failed or reported drift — a --check that reported stale exports, a project that failed its export, a missing anchor block, a NestJS container that failed to boot, a rejected command line, or a --write that produced no files at all. Use when codependix exits non-zero, when a committed Mermaid block disagrees with a fresh run, when a graph export is missing for one project but not others, or before hand-editing an exported diagram to make a check pass.
license: MIT
---

# Acting on a codependix failure

Codependix reports a handful of distinct outcomes, and reading which one
occurred is most of the work. Start by separating them: a **stale export** is
drift, a **failure** is a project that never got as far as producing one, and a
run that wrote nothing at all is usually neither.

## A stale `--check`

One or more configured exports disagree with a freshly built graph. The run
names the projects.

**Re-run `--write`. That is the entire fix.** The graphs move with the
workspace they describe, so a project graph that changed makes every export
that drew it stale — which is drift to refresh, not a defect to investigate.

**Never hand-edit inside the anchor markers.** The next `--write` replaces the
block wholesale, so an edited diagram is a diff that silently disappears on the
following run. The same goes for a standalone Markdown file: codependix owns
its whole contents.

Two more things a stale check does _not_ mean:

- **It is not a conformetry conformance difference.** The `codependix:start` /
  `codependix:end` markers are codependix's own syntax and carry no dependency
  on any `conformetry-*` package. Running a conformance check, or reaching for a
  conformetry generator, fixes nothing here.
- **It is not evidence of a missing anchor.** A project that has never been
  exported has no block to compare, and reports stale like any other drift.

## A project that failed

A failure is collected per project and reported by name. **One project failing
does not stop the rest** — every remaining project in that pass still runs, and
all four graph-type passes are attempted regardless of whether an earlier one
failed. So a run naming three failures is three things to fix, not one flaky
run to retry.

### The Markdown file does not exist

The only anchor problem that fails outright. A **missing anchor block** is
auto-created on `--write`; a **missing file** is not, because a project with no
readme at all is a more serious problem than an unplaced block, and inventing
the file would mean authoring a document nobody asked for.

Create the file — a project readme with at least a heading — and re-run.

### A missing anchor block, on `--write`

Not a failure. `--write` creates it, at one of exactly two safe places:

- Appended to the end of the file as a new `## 🕸️ Codependix` section, with an
  intro line and a `### <Subheading>` for the graph type.
- Inserted as a new `### <Subheading>` at the end of an existing
  `## 🕸️ Codependix` section, when an earlier graph type already created one.

It never places a block anywhere else in a document someone else is authoring,
and never duplicates the heading. If the block landed somewhere you did not
want it, move the whole marker pair by hand once and every later `--write`
replaces the content in place.

### A NestJS project that failed to boot its container

The NestJS pass explores a project's container in **preview mode**, which
registers every module and provider without instantiating any of them. A
project building a `TypeOrmModule.forRootAsync` options factory never has a
database contacted, so what breaks this pass is always something that throws
while modules are being _registered_ — a module whose static `forRoot` argument
reads a variable that is absent, a top-level throw in a module file, or a
project whose root module does not export what the pass expects. Look there.

An application is rooted in `src/main.module.ts` and its `MainModule` export; a
library package with no such file is rooted in a synthetic module built from
every `*.module.ts` it defines, so a module file that cannot be imported on its
own fails a library that an application would not notice.

Two fixes that look plausible and are not: starting or seeding a database (the
pass never contacts one), and building the project first (it imports the
project's own TypeScript module sources directly).

If the CLI is being run from TypeScript sources through some other loader,
check that decorator metadata survives it: NestJS constructor injection reads
metadata that plain type-stripping erases, and the failure looks like a
container that cannot resolve its own providers. The published `codependix`
binary registers a decorator-preserving loader itself; a hand-rolled invocation
has to do the same.

## A rejected command line

`--check` and `--write` are mutually exclusive and one is required. A command
line naming neither, or both, is rejected before anything is read — nothing is
inferred and no default write happens. Pick one.

## A `--write` that produced no files

The quietest outcome, and almost never a bug: the run exits 0, reports that
every configured export is current, and writes nothing, because **nothing was
configured**. Every unset `target` defaults to `"none"`, and a project
resolving to `"none"` is left out of the results entirely rather than reported
as up to date — so `0` projects in the report means codependix was configured
to produce nothing.

Work down this list before suspecting the tool:

1. **Was a configuration file found at all?** An absent one is legal and
   silent. Name it with `--config` to make its absence fail loudly instead.
2. **Is `target` set?** A graph type carrying destinations but no `target`
   still resolves to `"none"`.
3. **Is the field spelled `defaults`?** `default` is stripped as an unknown
   key and has no effect.
4. **Do the projects match `include`, and escape `exclude`?** Both match
   against a project's Nx name _and_ its workspace-relative root.
5. **Is `--directory` the workspace root?** It is what every project's path
   resolves against, not a subtree to scan — Nx resolves the graph itself from
   the process working directory. Pointed at a single project's folder, the
   run still reads the whole graph but resolves every project underneath that
   folder, so exports land somewhere unexpected or fail on a readme that is
   not there.

The `codependix-configure` skill covers each of those fields.

## A configuration that was rejected

Validation refuses two destination mismatches rather than silently exporting
half of what was asked for: a `"both"` or `"json"` target with no `json`
destination, and a `"both"` or `"markdown"` target with no `markdown`
destination. A `markdown` destination naming neither an `anchor` nor a `path`
is refused for the same reason — nothing would say where the export goes.

## Whose problem the graph is

A finished export is a description, not a verdict — codependix gates nothing
about a codebase's shape. A diagram that shows something alarming (a cycle, a
project depending on far more than expected) is a real finding about the code,
and the fix belongs in the code rather than in the configuration that exported
it. Reach for the `codependix-navigate` skill to read what the graph is
actually saying before changing anything.
