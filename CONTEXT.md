# Codebase

The shared language of this workspace's own quality tooling — the tools that
measure, generate, and gate the code here rather than serving any product
domain. Terms below are the ones that have been ambiguous in practice; general
programming vocabulary is deliberately absent.

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
A declared ceiling on a metric. A metric without one is measured and reported,
never gated.
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

## Neighboring gates

Each quality tool owns one gating word, and they are not interchangeable.

**Threshold**:
Conformetry's zero-to-one score for how closely an instance matches the template
it was generated from. Never used for codometer's ceilings.

**Depth**:
Callidescope's call-stack length, and the thing it flags as too deep. Never used
for nesting elsewhere.
