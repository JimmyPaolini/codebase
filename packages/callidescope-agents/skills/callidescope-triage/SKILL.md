---
name: callidescope-triage
description: Act on a callidescope run that failed — a depth gate that reported a stack over the limit, a breadth gate, a stale committed report, a module-spread or possibly-misplaced finding, a rejected command line, or a configuration refused before anything was traced. Use when callidescope exits non-zero, when a call stack got deeper in a change, when a committed report or diagram disagrees with a fresh run, when a depth is printed as a floor rather than a number, or before reaching for maximumDepth to make a failing check pass.
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
| `🔭 Rejected the command line` | A **mistake** in the flags. Nothing was traced |
| `🔭 Rejected the configuration` | The run **cannot do what was asked**. Nothing was traced |

The two rejections happen before any tracing, so they never say anything about
the code.

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

## A rejected configuration

The command line was fine but the configuration cannot support what was asked:

- **`--check breadth` requires `limits.maximumBreadth`.** It is the one limit
  with no default. A run asked to gate on it without one configured is refused
  outright rather than silently passing, which is what falling back to an
  unbounded limit would look like. Add
  `limits: { maximumBreadth: <number> }` and re-run.

## A run that reported nothing at all

Not a failure, and usually not a bug. Work down this list:

1. **Did it trace anything?** The summary carries callable, file, and edge
   counts. Zero callables means the directories held no `tsconfig.json`, or
   everything matched an exclusion.
2. **Is the code excluded?** `exclude` globs are additive to the built-in
   defaults, and `excludeFrom` files are easy to forget. A fixture package
   deliberately listed there is meant to be silent.
3. **Is `--directories` pointed where you think?** It takes paths holding their
   own `tsconfig.json`, not project names.
4. **Is `maximumDepth` simply not exceeded?** A clean run is the normal
   outcome, and a repository under its limits reports no stacks.

## Whose problem a finding is

A depth, breadth, spread, or misplacement row is a statement about the code,
not about the configuration that measured it. The fix belongs in the code. Turn
to the configuration only when the measurement itself is wrong — a module
identifier derived from the wrong directory, an entry-point rule missing, a
cross-cutting logger inflating everything's numbers — and the
`callidescope-configure` skill covers each of those.
