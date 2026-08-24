# Codebase

A pnpm and Nx monorepo of personal applications, shared packages, and the tools
that keep them structurally consistent.

## Conformetry

**Generator**:
A named pairing of a template with the inputs needed to render it, declared once
in the conformetry configuration and reachable from both hosts.
_Avoid_: Schematic, scaffold, blueprint

**Template**:
A folder of ordinary files that a generator renders, and the standard every
instance is measured against afterwards.
_Avoid_: Rule, fixture, boilerplate

**Instance**:
Generated code on disk that a template explains — a whole module directory, a
single file, or a set of files located together by one pattern.
_Avoid_: Copy, output, generated folder

**Language**:
The comparison engine for one family of file types, selected by file extension,
that measures an instance against its template.
_Avoid_: Rule, validator rule, check

**Difference**:
Something a template declares that its instance lacks. Content the instance adds
is never a difference.
_Avoid_: Finding, violation, failure

**Error**:
A difference severe enough to fail a validation run.
_Avoid_: Finding, issue

**Conformance**:
How completely an instance carries what its template declares.
_Avoid_: Compliance, passing, matching

## Measurement

**Target**:
A named set of files, defined by include and exclude globs, that codometer
measures as a single unit. A target is a set of paths and nothing more — what
gets computed over it is chosen separately.
_Avoid_: File set, bundle, artifact, source, collection

**Analysis**:
A kind of examination codometer runs over a target, producing metrics. Language
analysis parses files and counts constructs; size analysis compresses them and
counts bytes.
_Avoid_: Check, scan, pass

**Metric**:
A single named number produced by one analysis over one target, addressed by a
dotted path.
_Avoid_: Statistic, measurement, count, stat

**Limit**:
A declared value a metric may not exceed. A metric without one is measured and
reported, never gated.
_Avoid_: Budget, threshold, ceiling, maximum, cap, size limit

**Breach**:
A metric that exceeds its limit.
_Avoid_: Violation, failure, overage, regression

**Severity**:
Whether a breach fails the run (`fail`) or is reported without affecting its
outcome (`warn`).

**Staleness**:
A committed output no longer matching what a fresh run would produce. Distinct
from a breach: staleness is about drift between the report and reality, a breach
is about magnitude. Both fail a run, and they are never the same finding.
_Avoid_: Drift, out of date, dirty

## Change reporting

**Baseline**:
A previously published report — from the latest successful run on `main` — that
a current report is compared against to find what changed.
_Avoid_: Previous run, main, comparison

**Change**:
The difference between a metric's current value and its value in the baseline.
A metric with no change is left out of a change report unless it is currently
breaching a limit.
_Avoid_: Delta, diff, drift

**Measured**:
Whether a metric was recomputed by the current run, as opposed to standing in
with its baseline value because the run's targets did not include that
project. An unmeasured metric can still breach if its baseline value already
exceeds a limit. Distinct from staleness below: measured is about which run
produced a number, staleness is about whether a committed one still matches.
_Avoid_: Fresh, rebuilt, stale

## Neighboring gates

Each quality tool owns one gating word, and they are not interchangeable.

**Threshold**:
Conformetry's zero-to-one score for the conformance it requires of an instance.
Never used for codometer's limits.

**Depth**:
Callidescope's call-stack length, and the thing it flags as too deep. Never used
for nesting elsewhere.
