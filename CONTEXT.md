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

## Meanders

**Meander**:
A single generated Greek key/fret ornament: one family, one tile or modifier, a row
count, and a repeat count, rendered as one SVG document.
_Avoid_: Pattern, motif, key pattern

**Family**:
The top-level generative model a meander is drawn from — `boxes`, `chain`, `cross`,
`mosaic`, `snake`, `swirl`, or `whirl`. Each family generates its own repeat units and
accepts its own modifiers. The primary term; `type` survives only as the name of the
command-line flag.
_Avoid_: Style, kind, category

**Unit space**:
The set of repeat units a family can generate. Materialized and enumerable for `mosaic`,
latent for every other family — which is the whole reason only `mosaic` has
sub-families.
_Avoid_: Tile set, permutations, search space

**Tile**:
One member of a family's unit space, named by a canonical identifier.
_Avoid_: Cell, unit, permutation

**Sub-family**:
A named, recognizable class of meanders within one family — `dots`, `lines`, `dashes`,
`diamond`. Some sub-families arise by applying a modifier, others by recognizing a
structural property of a tile; both routes produce the same kind of thing.
_Avoid_: Variant, subtype, group

**Modifier**:
A named transform applied to a family's units — rotation (`spin`), mirroring (`flip`),
border-closing (`edge`), the `cross`-specific `interrupted`, or the `mosaic`-specific
`alternated`, `split`, and `dot`.
One route by which a sub-family comes about, not a separate level of the model. Only
certain modifiers are compatible with each family.
_Avoid_: Variant, option, flag

**Rows**:
The parameter that sets a meander's grid density. It does not change the
canvas height, which stays fixed; instead it divides that fixed height into
finer subdivisions, shrinking the grid unit and stroke width as rows
increases.
_Avoid_: Row count, height, N

**Repeat count**:
How many times a family's unit is tiled horizontally across a meander.
_Avoid_: Width, unit count, columns

**Grid unit**:
The base spacing a meander's coordinates are built from, derived from canvas
height divided by rows. Stroke width and offsets are themselves derived from
the grid unit, not set independently.
_Avoid_: Cell size, spacing, step

**Channel**:
The white space separating two neighboring strokes. Exactly one stroke width wide
everywhere inside a band, which is what makes a meander space-filling.
_Avoid_: Gap, whitespace, margin

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

## Codependix

**Graph**:
A dependency structure for one level of the codebase — projects, NestJS
modules, or files — built by exactly one codependix package (`codependix-nx`,
`codependix-nestjs`, `codependix-imports` respectively).
_Avoid_: Diagram, tree, map

**Neighborhood**:
A project's own graph, scoped to its immediate one-hop dependencies and
dependents. The default granularity codependix exports per project.
_Avoid_: Local graph, one-hop graph, subgraph

**Workspace Graph**:
The whole-repository graph across every project, exported once at the
workspace root rather than per project.
_Avoid_: Full graph, global graph, root graph

**Export**:
A graph rendered to JSON or Markdown. An export is descriptive: it is written
or found stale, never breached. Gating is the boundary's job, not the
export's.
_Avoid_: Report, output, artifact

**Boundary**:
A declared rule about what a graph is allowed to look like, and codependix's
gating word. A rule is `allow`, `forbid`, or `acyclic`, is keyed by the graph
level it judges, and produces a **violation** — an edge or a cycle it
condemns. Never a breach (codometer's), a threshold (conformetry's), or a
depth (callidescope's).
_Avoid_: Constraint, policy, rule violation, breach

**Anchor**:
The comment marker codependix writes an export between in a Markdown file,
read and rewritten in place on `--write`. Independent of conformetry's
template mechanism — codependix owns its own anchor syntax and does not
depend on any conformetry package.
_Avoid_: Marker block, placeholder, template

## Neighboring gates

Each quality tool owns one gating word, and they are not interchangeable.

**Threshold**:
Conformetry's zero-to-one score for the conformance it requires of an instance.
Never used for codometer's limits.

**Depth**:
Callidescope's call-stack length, and the thing it flags as too deep. Never used
for nesting elsewhere.

**Boundary**:
Codependix's declared rule about the shape of a graph, and the thing it flags
as violated. Never used for a limit, a threshold, or a depth. Its export
remains descriptive — only a boundary gates.

**Reports** is the one word three of them share deliberately. `--check
reports` means the same thing in callidescope, codometer, and codependix: a
configured destination no longer holds what a fresh run would write. Each
tool's other `--check` name is its own gating word — `depth`, `limits`,
`boundaries` — because those are the magnitudes only it measures.

## Publishing

**Suite**:
One of the four toolchains this repository publishes — conformetry, codometer,
callidescope, codependix — named for the command a reader runs. A suite is a
product, not a directory: its packages version independently but are documented
and discovered as one thing.
_Avoid_: Toolchain family, package group, monorepo project

**Publish set**:
The packages a release actually sends to npm. Deliberately narrower than the
packages that build: the `*-agents` and `*-examples` packages are never
published, because skills travel through `skills-lock.json` and examples are
fixtures, several broken on purpose.
_Avoid_: Publishable packages, the packages, release set

**Gate**:
A control that stops a package reaching npm. Three exist and they are not
interchangeable: `private` in the manifest, which npm itself refuses to publish
past; the orchestrator's own projects filter; and the registry's permissions.
A package outside the publish set is held by the first two, never by only one.
_Avoid_: Flag, switch, block

**Inline**:
Compiling another workspace package's code into a package's own build output,
so the published tarball carries it and never names it as a dependency. What
is inlined is the code, never the source file — nothing is copied into the
repository, and the dependency stays a single package here.
_Avoid_: Vendor, bundle, embed, copy

**Cascade**:
The patch bump a package receives because something it depends on was
versioned, rather than because it changed. What keeps independently versioned
packages within a suite consistent.
_Avoid_: Ripple, propagate, bump dependents

**Round size**:
The shape every declared codometer limit takes: a power of two, or three times
one. `4`, `6`, `12`, `16`, `24`, `32`, `48`, `64`, `96`, `128`, `192`, `256`,
`384`, `512`. A limit is chosen by rounding a measurement up to the next such
number, never by recording what a run happened to measure — an exact figure
reads as a target and invites being edited to whatever the next run produced.
Nothing enforces this; every limit in the workspace follows it.
_Avoid_: Budget, rounded limit, nice number
