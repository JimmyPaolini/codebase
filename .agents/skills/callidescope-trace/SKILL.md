---
name: callidescope-trace
description: Run a callidescope trace and read what it printed — choosing between --check depth, --check breadth, and --check reports, narrowing a run with --directories, picking a --format, deciding whether a run writes anything, or reading a printed call stack frame by frame. Use when running callidescope or npx callidescope, when wiring a depth gate into CI or a commit hook, when a whole-workspace run is too slow, when a stack printed a depth as "≥ n", or when reading a committed markdown report, mermaid diagram, or JSON report it produced. Covers the command-line host directly, without assuming any task runner.
license: MIT
---

# Running a callidescope trace

Callidescope builds one call graph for a TypeScript workspace, measures how
deep a stack gets below each entry point, and reports the paths that exceed a
configured limit. It follows calls through **injected dependencies** — the hop
from `this.someService.load()` into `SomeService.load` — which is the edge no
file-at-a-time tool can see.

```bash
npx callidescope
```

A repository with no configuration file is traced with defaults rather than
told to write one, so a bare run always produces something. What it _gates_ on,
and what it _writes_, are both opt-in.

## The two decisions a run makes

Every invocation answers two independent questions, and neither implies the
other:

| Question | Answered by |
| -------- | ----------- |
| What does this run fail on? | `--check`, a comma-separated set |
| What does this run rewrite? | `--write`, plus the destinations in the configuration |

A run given neither `--write` nor `--check reports` **reads no destination and
rewrites none**. It traces, prints, and exits. That is what makes a bare run
safe to type inside somebody's checkout, and it is why `--check depth` on a
pull request leaves every committed report exactly as it found it.

## `--check` takes a set, and the set matters

| Value | What fails the run |
| ----- | ------------------ |
| `depth` | A call stack deeper than `limits.maximumDepth` |
| `breadth` | A callable calling more callables directly than `limits.maximumBreadth` |
| `reports` | A configured destination no longer holding what a fresh run would write |

Three refusals to expect, all of them deliberate:

- **`--check` with no value is refused.** A set with nothing in it is
  indistinguishable from the flag having been left off, so reading it as "gate
  nothing" would produce a gate that cannot fail. `--check "$GATES"` with the
  variable unset would then pass forever over a stack twice as deep as anything
  allowed — worse than no gate, because it looks like protection.
- **An unrecognized value is refused**, and the message lists what is accepted.
- **`--check breadth` with no `limits.maximumBreadth` configured is refused.**
  Breadth is the one limit with no default: until a repository picks a number,
  nothing can exceed it, and falling back to an unbounded limit would look
  exactly like passing.

## Why `depth` and `reports` belong on opposite sides of a pull request

**Depth is the gate.** A stack got longer in this change, and this change is
what fixes it. Run it on every pull request, and on every commit if you like —
depth reads source and needs no build, which is what keeps it cheap enough for
a commit hook.

```bash
npx callidescope --check depth
```

**Staleness is not a gate.** A report goes stale whenever the call graph moves
anywhere, which is nearly every change. Gating on it would fail pull requests
for drift they did not cause. Publish the report on the default branch instead,
where nothing else is competing to rewrite the same block:

```bash
npx callidescope --write
```

`--write --check reports` is **refused outright**: a report cannot be stale in
the run that just wrote it, so a command line asking for both has misunderstood
one of them and would pass whatever it was meant to catch.

## Narrowing a run with `--directories`

This is the difference between a whole-workspace analysis and a one-second
check. Each directory named needs its own `tsconfig.json`, and only those
TypeScript programs get built:

```bash
npx callidescope -d packages/foo,packages/bar --check depth
```

Omit it and callidescope walks the working directory for every `tsconfig.json`
it can find. On a large monorepo that is the slow path — reach for it when you
want the workspace-wide picture, not when you want an answer about one package.

`--directories` takes **paths**, not project names. Callidescope has no idea
what workspace tool a repository uses; a directory holding a `tsconfig.json` is
the whole contract, and it holds in a monorepo, in a single package, or in
neither. The same list can be set once as `directories` in the configuration
file.

An Nx workspace can hand the selecting to Nx instead, through the separate
`@callidescope/nx` plugin, which infers `trace`, `depth`, and `breadth` targets
onto every project and traces each one _with its Nx dependencies_ — so a stack
is not truncated the moment it crosses a package boundary. It is a separate
package rather than a flag here on purpose: this CLI depends on nothing
Nx-shaped, and a flag that worked only when an optional package happened to be
installed would advertise in `--help` something that silently did nothing.

## `--format` decides what prints, not what is written

Printing and writing are independent, and both can be on at once. `--format`
names one of `markdown` (the default), `mermaid`, or `json` for standard
output; the destinations in the configuration decide what reaches a file.

- **`markdown`** is the default because it is the one rendering that reads in a
  terminal, pastes into an issue, and is already what the files hold.
- **`json`** is for a machine reading standard output. Note that the JSON
  report carries every documentation comment **in full**, while the printed
  tree shortens them — so a script wanting complete text should read JSON
  rather than parse the tree.
- **`mermaid`** prints diagram source to paste somewhere that draws it.

## Reading a printed stack

```text
Stack #1 | 🚨 [DEPTH ≥ 10 > 6] (decorated-method)
🚀 SomeCommand.run(options: SomeOptions): Promise<void> [.../some.command.ts:220]
   ↳ Measure the repository and write every configured output.
  └─> SomeService.measure(args: MeasureArguments): Result [.../some.service.ts:115]
     ↳ Measure aggregated statistics for the provided directory.
```

Four things to read off it:

- **`≥ 10` is a floor, not a measurement.** Something on that path could not be
  followed — a callback invoked through a parameter, a computed member name —
  and the run says so rather than quietly under-reporting. The real depth is at
  least ten. Do not treat the number as exact, and do not treat the `≥` as a
  defect.
- **The parenthesized kind is the entry-point rule that claimed the root.**
  `orphan-root` means nothing in the repository calls it: either dead code, or
  an entry-point rule the configuration is missing.
- **Every frame carries `file:line`**, so the next step is opening one.
- **A frame printed `(…): ReturnType`** had a signature over 80 characters —
  almost always a constructor taking a dozen injected services. A summary over
  120 characters prints only its opening sentence, unmarked; only a single
  sentence with no boundary to cut on is trimmed and marked `…`.

## The other three findings

Depth is not the only thing a run reports.

- **Module spread** — a callable whose transitive callees reach many unrelated
  modules **and** which calls several of them directly. Both conditions matter:
  transitive reach alone flags every entry point, because an entry point
  legitimately reaches the whole program.
- **Breadth** — how many callables one callable calls directly. Reported
  always; gated only when `limits.maximumBreadth` is set and `--check breadth`
  is asked for.
- **Possibly misplaced callables** — a callable whose callers nearly all sit in
  one _other_ module of the same project. The output is a concrete move.

## What a run does and does not follow

| Written as | Resolved to |
| ---------- | ----------- |
| `helper()` | The symbol at the callee, unwrapped through import aliases |
| `this.service.load()` | The symbol at the member name — the injected-dependency case |
| `provider.ingest()` | Every class structurally satisfying the interface, capped |
| `super.run()` | The base declaration the checker resolves to |
| `new Thing()` | The constructor, when it has a body |
| `list.map(callback)` | The callback, as its own frame — `map` itself is external |
| `target[key]()` | Nothing. Recorded as unfollowable rather than guessed |

Calls into dependencies are leaves. Whether `Array.prototype.map` is deeply
implemented says nothing about whether _your_ layering is too deep, and
counting it would move every number on an unrelated upgrade.

**Cycles are collapsed before depth is measured**, so a mutually recursive
cluster of three contributes three frames once. That is why the numbers do not
move between runs: detecting a repeat visit mid-walk would make the answer
depend on which path arrived first, and a linter whose numbers move on their
own is not usable as a gate.

## Prompting, and why it will not hang a script

`callidescope`, `depth`, and `breadth` all prompt interactively for a value
left off the command line — `depth` and `breadth` for a missing `<address>`,
all three for a missing `--format`. **Prompting is gated on an attached
terminal outside CI**, so a script, a hook, or a CI job gets the non-prompting
behavior for free and a missing value is reported as a rejected command line
instead. `--no-interactive` opts out explicitly when you want that behavior at
a real terminal too.

## Where a report can land

Four destinations, each independent and each configured rather than flagged
(`--json` and `--markdown` name one path apiece as a convenience):

| Destination | What it writes |
| ----------- | -------------- |
| `json` | The whole run as JSON, at one path |
| `markdown` | The whole run, spliced between markers in one file |
| `mermaid` | The same report with its stacks drawn as one flowchart |
| `projectReadmes` | One section per traced project, in that project's own readme |

The `callidescope-configure` skill covers writing those. Two facts worth
knowing before reading one:

- **All the stacks are drawn as one flowchart**, not one apiece. A single stack
  is a straight line, and a straight line is a list with extra steps; drawn
  together, the shared tails converge, and that convergence is what a picture
  shows and an indented tree cannot. A diagram stops at 300 callables and says
  how many stacks it dropped, dropping whole stacks so it never contains an
  edge into something it did not draw.
- **Never hand-edit inside the markers.** The next `--write` replaces the block
  wholesale, so an edited report is a diff that silently disappears.

When a run fails, or a report reads stale, reach for the `callidescope-triage`
skill. When the question is about one callable rather than the workspace, reach
for `callidescope-analysis`.
