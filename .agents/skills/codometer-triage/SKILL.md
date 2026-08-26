---
name: codometer-triage
description: Act on a codometer limit breach, a stale committed report, or a run that failed outright. Use when a codometer --check exits non-zero, when a size or count limit was breached, when a committed report reads stale against a fresh measurement even though nothing changed, when a limit fails to bind or a target matches no files, or before reaching for a repository's limit value to make a failing check pass.
license: MIT
---

# Acting on a codometer failure

A `--check` run reports three different kinds of finding, and they call for
three different responses. Reading which one occurred, rather than reacting to
"the check failed," is most of this skill.

## A breach

A metric went past a limit declared for it. The report names the metric, the
limit's value, and its severity:

- **`warn`** prints the breach and leaves the exit code alone. Nothing about
  the run fails; it is advance notice that a number is moving in a direction
  worth watching.
- **`fail`** exits `1`, and only when the run asked `--check limits` for a gate
  at all — a bare `codometer` measuring the same breach reports nothing wrong,
  because nothing asked it to gate.

**The instinctive fix — raising the limit's `value` — is not an option.** The
limit exists to keep a promise about the codebase's shape; loosening it on the
same change that broke the promise erases the evidence the check existed to
produce, and the next breach starts from a codebase that is already worse.
Reduce what is actually being measured instead:

- A size breach: shrink the target's own output — trim a dependency, split a
  bundle, delete dead code — rather than the number that reports it. The
  `codometer-configure` skill covers declaring a target and pointing it at
  compiled output correctly, which is a common reason a size looks larger than
  the code that produced it: a target measuring more than it should.
- A convention-count breach (too many of something, or too few): the count is
  usually accurate — the fix is in the code the counter is watching, not in
  the counter's `value`.

If the limit's number was simply wrong for what this metric should hold going
forward — not because of this change, but as a standing decision — that is a
deliberate edit to make and explain on its own, never a side effect of getting
one check to pass.

## Staleness

`--check reports` compares a committed report against a fresh measurement and
fails when they disagree, whether or not any limit is involved. Two causes
produce this, and only one of them is a real regression:

- **The code actually changed** and the committed report was never
  re-measured. Re-run with `--write` to refresh it.
- **The runtime changed.** Compressed sizes are Node-version dependent — the
  bundled zlib differs release to release — so a report written on one Node
  version and checked on another reads as stale with zero code changes
  involved. Check on the exact runtime the repository pins for everything
  else before concluding the source moved.

A **breach** and **staleness** are reported as separate findings even when
they come from the same run; do not read one as a symptom of the other.

## A run that failed outright

Distinct from both of the above: the run itself could not finish, collected
into `failures` in the report rather than folded into any metric.

- **A limit bound to nothing.** The metric path names no measurement the run
  actually took — misspelled, or naming an analysis its target never ran, or
  genuinely ambiguous between two targets. Fix the path in the configuration;
  the `codometer-configure` skill covers how a metric path resolves and why an
  ambiguous one is refused rather than guessed.
- **A target matched no files while carrying a limit.** Declaring a limit
  against a target asserts its files exist, so an empty match means the glob
  stopped matching or the build that should have produced those files never
  ran — check the build step before touching the configuration. A target
  nobody limited that matches nothing is unremarkable and reports no failure.

Every failure in one run is collected and reported together, so treat a report
naming three as three things to fix, not one flaky run to retry.

## Before reaching for `--write`

Remember that `--write` and `--check` are independent flags with no inferred
relationship between them — the `codometer-measure` skill has the full flag
table. `--write --check reports` in particular is refused outright: nothing
can be stale in a report the same run just wrote, so that combination is a
configuration mistake to fix, not a way to force a report current.
