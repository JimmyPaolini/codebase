---
name: callidescope-triage
description: Act on a callidescope run that failed — a depth gate that reported a stack over the limit, a breadth gate, a stale committed report, a module-spread or possibly-misplaced finding, a project whose tsconfig could not be read, a run that traced nothing, a rejected command line, a project's own callidescope.config.ts refused for a workspace-only field or an unresolved entry-point address, or a configuration refused before anything was traced. Use when callidescope exits non-zero, when a call stack got deeper in a change, when a committed report or diagram disagrees with a fresh run, when a depth is printed as a floor rather than a number, when a declared entryPoints.addresses entry resolves to nothing or to more than one declaration, when --check breadth is refused for want of a declared limit, or before reaching for maximumDepth to make a failing check pass.
license: MIT
---

# Acting on a callidescope failure

Callidescope fails for a handful of distinct reasons, and reading which one
occurred is most of the work. Separate them first:

| The run said | It is |
| ------------ | ----- |
| `🚨 [DEPTH n > limit]` | A **finding** about the code. Fix the layering |
| A breadth row over the limit | A **finding**. Split the callable |
| `A configured destination is stale` | **Drift**. Re-run `--write` |
| `🔭 Rejected a project it could not read` | A `tsconfig.json` **did not parse**. The trace stopped there |
| `🔭 Traced nothing` | The run **saw no code at all**. Nothing below it means anything |
| `🔭 Rejected the command line` | A **mistake** in the flags. Nothing was traced |
| `🔭 Rejected a project configuration` | One project's own `callidescope.config.ts` **was refused**. Nothing was reported |
| `🔭 Rejected the configuration` | The run **cannot do what was asked**. Nothing was reported |

The bottom five all mean the run never produced a verdict on the code. None of
them writes a destination, so a checkout is unchanged by any of them — and no
finding, or absence of one, should be believed from a run that printed one.

The `limits` command prints its own refusals under `🔭 Rejected a configuration`
— singular article, no `project` — and they are the first two in
[A refused project configuration](#a-refused-project-configuration), fixed the
same way.

## A depth gate that failed

A stack ran deeper than `limits.maximumDepth`. **The change that made it longer
is the change that fixes it** — that is the whole reason depth is the gate and
staleness is not.

Read the printed stack before doing anything. The frames carry each callable's
signature and the one-line summary of its documentation, and those summaries
are how you tell the two cases apart:

- **Every frame says something different.** The layering is real: each stage
  does its own work. Question whether all the stages are needed, but do not
  start deleting one layer at a time — this case usually needs a design
  decision, not a trim.
- **A run of frames all say roughly the same thing.** Those are forwarding
  layers that exist only to pass arguments along. **Collapse them.** This is
  the common case and it is exactly what the tool was built to surface: the
  tools that would otherwise tell you are the ones reading a file at a time, so
  they see the forwarding and never the depth.

**Raising `maximumDepth` is not a fix.** The limit describes the shape the
repository wants; moving it to fit today's worst stack means the gate stops
gating, and every later stack gets a free pass to that new number. If the limit
is genuinely wrong for the repository, change it as its own decision, on its
own, with the reasoning written down — not as the thing that unblocks a pull
request.

### `≥ n` rather than `n`

A depth printed with `≥` is a **floor, not a measurement**. Something on that
path could not be followed — a callback invoked through a parameter, a computed
member name like `target[key]()`, or a structural expansion dropped for
exceeding `maximumImplementationCandidates` — and the run says so rather than
quietly under-reporting.

This is not a defect to fix and not a number to distrust. It means the real
depth is _at least_ that, so a `≥ 10` against a limit of 6 is a genuine
failure. `Unfollowable calls` in the summary counts how many such calls the run
hit.

### A stack headed `orphan-root`

Nothing in the repository calls the root. Either it is dead code, or an
entry-point rule the configuration is missing — most often a framework
decorator absent from `entryPoints.decorators`. Decide which before treating
the depth as real: a stack under a root that a framework actually invokes is a
finding, and one under genuinely dead code is a reason to delete the code.

### `Stacks through recursion` above zero

A cycle, collapsed before depth was measured. A mutually recursive cluster of
three contributes three frames once. The depth is a floor for the same reason
as above, and the collapsing is what keeps the numbers from moving between
runs — do not try to "fix" the recursion because callidescope mentioned it.

## A breadth gate that failed

A callable calls more callables directly than `limits.maximumBreadth`. Unlike
depth, this one has no default limit at all, so a breadth failure only ever
happens in a repository that chose a number.

The fix is to **split the callable along the responsibilities its callees
already group into**, not to inline anything. Run the `breadth` command against
the callable's address to see the direct callees and callers side by side
before deciding where the seam goes — the `callidescope-trace` skill covers
reading that.

## A module-spread row

A callable whose transitive callees reach many unrelated modules **and** which
calls several of them directly. Both conditions had to hold: transitive reach
alone flags every entry point, because an entry point legitimately reaches the
whole program. So a spread row is specifically a callable _personally
orchestrating_ unrelated concerns.

Three ways out, in order of preference:

1. **Push the orchestration up.** If it belongs in a command or a module file,
   move it there — those are exempt by default under `allowSpreadFor`, because
   joining unrelated concerns is a command's job.
2. **Introduce a facade** so the callable talks to one thing instead of five.
3. **Add the callable's file to `allowSpreadFor`**, only when it genuinely is
   an orchestration point the default globs did not name. This is
   configuration, not a fix, so it needs the same justification as changing a
   limit.

Do not raise `spreadThreshold` to silence one row.

## A possibly-misplaced row

A callable whose callers nearly all sit in one _other_ module of the same
project. The report names the module, so the output is a concrete move: put the
callable where its callers are, or fold it into its single caller if there is
only one worth keeping.

Two guards make this quieter than it sounds — `minimumCallers` (a callable with
one caller is not evidence of anything) and `callerMajorityRatio` — so a row
that appears has cleared both.

## A stale report

One or more configured destinations no longer hold what a fresh run would
write. The run names every file that drifted rather than stopping at the first.

**Re-run `--write`. That is the entire fix.**

```bash
npx callidescope --write
```

Three things a stale report does _not_ mean:

- **It is not a defect.** The call graph moves with the code, so a report goes
  stale whenever anything anywhere moves. That is exactly why `--check reports`
  belongs on the default branch and not on a pull request.
- **It is not something to hand-edit.** The next `--write` replaces the block
  between its markers wholesale, so an edited report is a diff that silently
  disappears on the following run.
- **It is not a reason to add `--check reports` to the pull request gate.**
  Doing that fails pull requests for drift they did not cause.

**Lint before regenerating, never after.** Every frame in every report carries
a `file:line`, and a formatter that sorts class members moves the line numbers
of everything after the one it inserted — so a report written before that sort
is stale the moment it lands.

## A rejected command line

Nothing was traced. The message lists the reasons; these are the ones to expect:

- **`--check` needs a value.** A valueless flag, an empty string, or a
  comma-only value are all the same mistake. A set with nothing in it is
  indistinguishable from the flag having been left off, and reading it as "gate
  nothing" would produce a gate that cannot fail — `--check "$GATES"` with the
  variable unset would pass forever over a stack twice as deep as anything
  allowed, which is worse than no gate because it looks like protection.
- **`--check` does not accept that value.** It takes a comma-separated set
  drawn from `breadth`, `depth`, and `reports`, and the message lists them.
- **`--write` cannot be combined with `--check reports`.** A report cannot be
  stale in the run that just wrote it, so the combination would pass whatever
  it was meant to catch. Run them separately, on the sides of the pull request
  they belong to.
- **`depth` or `breadth` with no address.** Those commands take
  `<file>#<qualified-name>`. At a real terminal outside CI they trace first and
  then complete the address against every callable they found, so the name can
  be picked rather than recalled; a name declared twice in one file arrives
  with its `:<line>` already attached. In a script or a CI job prompting is
  off, so a missing argument is a rejection rather than a hang.

## A refused project configuration

A `callidescope.config.ts` sitting at one project's own root was read and
refused. Nothing was printed and no destination was touched, so the checkout is
exactly as the run found it — fix the named file and re-run. Five messages, each
with one fix. `<project>` is the workspace-relative project root; an address the
workspace file declared is labelled `the workspace configuration` instead.

**The file could not be read.**

```text
Failed to read the callidescope configuration for <project> at <path>: <reason>
```

The read failed, or the object did not pass the schema. `<reason>` is the
underlying failure and is kept as the error's `cause`. A schema complaint names
the field: a limit that is not a positive integer, `callerMajorityRatio` outside
its range, an `addresses` entry that is not a string.

**A field only the workspace may set.**

```text
<project> sets <field>, which only the workspace configuration may set. A project configuration may set entryPoints, limits.maximumDepth, limits.maximumBreadth, and exclude.
```

Move that field to the workspace file. `<field>` prints as `limits.<name>` for a
limit and as a bare name for a top-level field, so the message says which of the
two is wrong.

Two ways to arrive here, and the fix differs:

- **A spread of the workspace limits into the project's `limits`.** Delete the
  spread and leave the override — `limits: { maximumDepth: 10 }`. Nothing is
  lost: limits fall back **per limit**, so every limit the project does not name
  still comes from the workspace. Older documentation that tells you to spread
  is out of date; the tool refuses it, because such an object carries
  `spreadThreshold`.
- **A genuinely workspace-level field** — `directories`, `output`,
  `workspaceStructure`, `excludeFrom`, `ignoreCallees`, `allowSpreadFor`, or a
  graph-shaping limit. It belongs in the workspace file and there is no
  per-project form of it. Those limits decide what the graph **is** rather than
  gating it, so two projects disagreeing would describe two different graphs
  over the same shared code — and a run measures one graph.

**A declared address resolved to nothing.**

```text
<project> declares an entryPoints.addresses entry that resolves to nothing: "<address>". Check the file path and the qualified name callidescope prints for it in a stack.
```

The callable was renamed, moved, or excluded from this run. Correct the address
or delete it. **Do not silence it**: this refusal exists because a rename that
silently dropped a declared root would lower that project's measured depth with
nothing in the output to say so, loosening a gate in the one commit nobody would
think to check it in. If the address is right but the callable is outside what
this run traced, the scope is the problem, not the address.

**A declared address was ambiguous.**

```text
<project> declares an entryPoints.addresses entry that matches more than one declaration: "<address>". Candidates: <address>:<line>, <address>:<line>. Add ":<line>" to the address to pick one.
```

Every candidate is rendered as an address that would have picked it, so copy one
into the configuration. Two declarations on **one line** cannot be told apart
that way; those name their column instead and the advice changes to
`Two declarations on one line cannot be told apart by ":<line>" — rename one, or
name a different callable.`

**A declared address was malformed.**

```text
<project> declares an invalid entryPoints.addresses entry. "<address>" is not a callable address. It needs a file path and a qualified name joined by "#", as in "src/foo.service.ts#FooService.bar", optionally followed by ":<line>" to disambiguate.
```

Usually a bare file path, a bare qualified name, or a path separator where the
`#` should be. The path is workspace-relative.

A run collects **every** unresolved address before it refuses, so fix them as a
set: more than one arrives numbered, behind
`<count> declared entry points did not resolve.` The `depth` and `breadth`
commands report the same three problems about an address typed at a prompt,
worded for that context and rendered by the same code.

### A project configuration that is refused by nothing and does nothing

A misspelled key is not a refusal. The schema strips what it does not
recognize, so `limits: { maxDepth: 10 }` loads cleanly and changes nothing. If a
project's limit seems not to be taking effect, ask what it actually resolved to
rather than re-reading the file:

```bash
npx callidescope limits
```

The row for that project says the number and the file it came from, and an
`Origin` of `inherited` where you expected `declared` is the misspelling.

**A project's `exclude` goes quiet the same way, for a different reason.** Its
globs are anchored to that project's own root, so a workspace-relative one —
`packages/thing/src/generated/**` written in `packages/thing`'s own file —
matches nothing and those files stay traced. Drop the project root from the
front of it: `src/generated/**`. A glob that would reach into another project
cannot be written here at all, and noise spanning several projects belongs in
the run's own `exclude` instead.

## A rejected configuration

The command line was fine but the configuration cannot support what was asked.
One message today:

```text
--check breadth requires at least one project in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to that project's callidescope.config.ts before running --check breadth.
```

Breadth is the one limit with no default, and a run asked to gate on it with
none declared is refused outright rather than silently passing — which is what
falling back to an unbounded limit would look like. Two ways out:

- **Declare it in a project's own `callidescope.config.ts`.** A
  `maximumBreadth` in the **workspace** file does not satisfy this: every
  project inherits it rather than declaring it, so it reports breadth findings
  and still leaves the gate with nothing to run on.
- **Widen `--directories`** until a project that already declares one is in
  scope. The refusal is about what this run reached, not about the repository.

This one is raised after the trace rather than before it, because which projects
were in scope is something only the trace knows.

## A project it could not read

One project's `tsconfig.json` did not parse, and the run stopped there. The
message carries the path and the compiler's own diagnostic.

Nothing was printed and no destination was written, which is the point of
stopping rather than stepping over it: a caller writes its report before it
weighs its findings, so a partial graph would publish depths measured through a
workspace missing a project and only then fail. Stopping means there is nothing
to un-commit.

Two ways out, and which one is right depends on why the file does not parse:

- **The configuration is broken by accident.** Fix it. The message carries the
  compiler's own diagnostic, which usually names the option.
- **The configuration is broken on purpose.** Some repositories commit a
  broken `tsconfig.json` as a fixture — this workspace has one in
  `codependix-examples`, and repairing it would delete the only place that
  failure is demonstrated. Exclude the project instead, by adding its directory
  to an `excludeFrom` ignore file or an `exclude` glob. Exclusions are applied
  to the `tsconfig.json` before it is opened, so this really does keep the run
  away from it. Excluding the project's _files_ does not: opening its
  configuration is the step that fails, and that happens first.

## A run that traced nothing

Every gate above passed for having nothing to judge, so the run fails on its
own emptiness. It is never a clean result. Work down this list:

1. **Is the code excluded?** `exclude` globs are additive to the built-in
   defaults, and `excludeFrom` files are easy to forget. An exclusion broad
   enough to cover every project empties the run.
2. **Is `--directories` pointed where you think?** It takes paths holding their
   own `tsconfig.json`, not project names.

## A run that found no stacks

Not a failure. A run that traced real code and reported no findings is the
normal outcome: the summary carries the callable, file, and edge counts that
say it looked, and a repository under its limits has no stacks to name.

## Whose problem a finding is

A depth, breadth, spread, or misplacement row is a statement about the code,
not about the configuration that measured it. The fix belongs in the code. Turn
to the configuration only when the measurement itself is wrong — a module
identifier derived from the wrong directory, an entry-point rule missing, a
cross-cutting logger inflating everything's numbers — and the
`callidescope-configure` skill covers each of those.
