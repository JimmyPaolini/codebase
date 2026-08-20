---
name: conformetry-validate
description: Run a conformetry conformance check and act on what it reports. Use when a conformetry-validate target fails; when a composite lint run reports conformance differences; when a report names a missing file, a missing declaration, a missing comment, an ambiguous instance, or an unmatched instance; when deciding whether to edit an instance or regenerate it; or before claiming generated code is finished. Covers both the Nx plugin and the conformetry command-line host.
license: MIT
---

# Checking conformance and fixing differences

Conformance measures an **instance** — generated code on disk — against the
**template** it came from. A **difference** is something the template declares
that the instance lacks.

## The one rule that governs every language

**The instance must carry everything its template declares. Anything it adds is
never a difference.**

Extra declarations, extra keys, extra lines, extra files, reordered class
members: all fine. So the fix for a difference is almost always to **add what is
missing**, never to delete what is extra. An agent that starts removing content
to make a file conform is working against the mechanism.

Implement freely inside generated files. Function bodies are not compared at all.

## Running it

Per project, or across the workspace:

```bash
nx run <project>:conformetry-validate
nx run-many --targets=conformetry-validate
```

Without Nx, the command-line host does the same:

```bash
conformetry validate
```

Both accept a language filter, and the command-line host also accepts a one-off
glob override in place of the configured instances. Narrowing is for iterating;
let the full run be the gate.

## Reading a report

A report opens with a score summary when anything scored below a perfect match,
then lists each file, the instance and template it compared, and every difference
with a suggested fix:

```text
  1. file: orders.service.ts
     Instance: packages/widgets/src/modules/orders/orders.service.ts
     Template: configuration/conformetry-templates/nestjs-service-module/…

     1. Missing Decorator "Injectable"
        Instance: Line 12, Column 1
        Template: Line 8, Column 1
        Fix     : Add the missing Decorator "Injectable" to the instance file.
```

**Read the `Fix` line before inventing a remedy.** Every difference carries one,
and it names the specific construct rather than describing the file in general.

Locations are 1-based. JSON differences report a path such as `scripts.build[0]`
instead of a line, because a key has no meaningful line in a reformatted file.

For what a difference means in a particular file type — why a string literal is
required verbatim, why a heading is pinned to its level, why a function body is
free — see [references/languages.md](references/languages.md).

## The kinds of difference, and what each asks of you

**A missing file or directory.** Checked before any content comparison, and a
missing _directory_ suppresses reporting for the files inside it. So create the
directory, re-run, and expect a new batch naming its contents. That is the check
working, not a regression.

**A missing declaration or comment.** Add it. Comments are compared as an ordered
subsequence, so a section marker in the wrong position reads as missing even
though the text is present.

**An unmatched instance** — no template explains this path. Either the path is
not generated code and should not be in the instance globs, or it has drifted so
far that nothing recognizes it.

**An ambiguous instance** — two templates fit equally well and only partially.
Either give the templates distinguishing files, or narrow the glob so one
applies.

Those last two are attribution failures rather than content failures, and they
are the hardest to act on from the report alone. Diagnose them by asking which
templates explain the path:

```bash
conformetry templates --instances packages/widgets/src/modules/orders
```

```text
  nestjs-service-module (nsm)
    Generate a NestJS service module
    Template: configuration/conformetry-templates/nestjs-service-module
    Instances:
      packages/widgets/src/modules/orders 5/5 files 100%
  nestjs-command-module (ncm)
    Generate a NestJS command module
    Template: configuration/conformetry-templates/nestjs-command-module
    Instances:
      packages/widgets/src/modules/orders 3/5 files 60%
```

**Every template that explains the path is listed, not just the winner** — which
is the point. A path legitimately belongs to more than one template, so a single
verdict would hide the tie that caused the difference. Read it as a ranking: a
template you expected near the top sitting low means its files are not where the
instance has them.

The complement asks the other direction — what generated code exists, and what
each piece answers to:

```bash
conformetry instances
conformetry instances --templates nestjs-service-module
```

Each path it prints is usable as the `--instances` argument above, so the two
commands compose. `--templates` narrows to the instances a given template
explains, which is how you find every instance that would be affected by
changing that template.

Both accept `--json` for parsing, and `--config` to read a configuration
elsewhere. [references/template-matching.md](references/template-matching.md)
explains how attribution works and how to read the ranking.

## Three behaviors that look like bugs and are not

**A second run can report new differences after you fixed everything.** Only the
smallest matching template's requirements are reported per file. Once those are
satisfied, requirements unique to a larger template surface. Iterate until clean
rather than treating the second report as a regression.

**A missing Python interpreter is reported as a difference, not a crash.** If
differences appear against `.py` files complaining that Python is unavailable,
the fix is to install `python3`, not to change the template.

**Nothing is fixed automatically.** There is no autofix and no write mode; the
only flag that changes the outcome is `--threshold`, which changes what passes
rather than changing any file. Remediation is either editing the instance by hand
or regenerating it — and regeneration overwrites unconditionally, so read
`conformetry-generate` before reaching for it.

## Deciding between editing and regenerating

Edit the instance when the differences are few and the file holds work you want.
That is almost always the answer.

Regenerate only when the instance has drifted so far that reconstructing it by
hand is worse, and only after reading what will be destroyed — generation has no
existence check, no merge, and no conflict detection.

## Scores and thresholds

A run does not only say whether an instance conforms — it scores **how much** of
its template the instance honours, and fails that instance when the score falls
below the threshold that applies to it. Differences carry weights, and the score
is the share of weighed requirements honoured.

The report prints a `Conformance scores:` summary above the differences, listing
every instance that scored below a perfect match, whether it met its threshold,
and a workspace total.

**The threshold defaults to `1` — a perfect match — so a fresh workspace is
strict.** Three levels set it, narrowest winning: an instance group's
`threshold`, then the generator's `threshold`, then a run-level `--threshold`.

Two consequences worth holding on to:

- **A lowered threshold permits drift, it does not hide it.** Differences still
  print for an instance that cleared its threshold. Reading a report and finding
  differences does not mean the run failed — check the score summary.
- **Lower a threshold to migrate, not to silence.** It is the tool for moving
  existing instances onto a new template gradually. If an instance can conform,
  make it conform; there is still no per-difference severity to downgrade.

## Before claiming the work is done

A clean conformance run is not optional polish — it is the check that generated
code still matches its standard. Run it after generating, after editing generated
files, and before saying an implementation is finished.
