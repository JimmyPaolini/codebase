---
name: callidescope-trace
description: Run callidescope and read what it printed — a whole-workspace trace, or the depth and breadth commands against one or more callables, each addressed as file#qualified-name. Use when running callidescope or npx callidescope, when reading a call stack, a module-spread row, a breadth row, or a possibly-misplaced row, when a depth printed as "≥ n" needs interpreting, when reading a committed markdown report, mermaid diagram, or JSON report, or when asking who calls this, what does it call, what would this rename touch, and where should this callable be split before a refactor starts.
license: MIT
---

# Running callidescope and reading what it says

Callidescope builds one call graph for a TypeScript workspace and measures the
shape of it. It follows calls through **injected dependencies** — the hop from
`this.someService.load()` into `SomeService.load` — which is the edge no
file-at-a-time tool can see, and where most of a framework codebase's control
flow actually lives.

Three commands, answering three different questions:

```bash
npx callidescope                                        # the whole workspace
npx callidescope depth --addresses src/foo.service.ts#FooService.bar    # one callable, vertically
npx callidescope breadth --addresses src/foo.service.ts#FooService.bar  # one callable, horizontally
```

A repository with no configuration file is traced with defaults rather than
told to write one, so a bare run always produces something. What a run _gates_
on and what it _writes_ are both opt-in and both live in the
`callidescope-configure` skill; this one is about reading the result.

## `callidescope`: the whole workspace

Reports four findings.

**Deep call stacks.** The single deepest path below each entry point, when it
exceeds `limits.maximumDepth`. Only one path per entry point is ever built, so
a wide graph costs no more than a narrow one.

**Module spread.** A callable whose transitive callees reach many unrelated
modules **and** which calls several of them directly. Both conditions matter:
transitive reach alone flags every entry point, because an entry point
legitimately reaches the whole program. A spread row is therefore specifically
a callable _personally orchestrating_ unrelated concerns.

**Breadth.** How many callables one callable calls directly. Reported always;
gated only when `limits.maximumBreadth` is set, which is the one limit with no
default.

**Possibly misplaced callables.** A callable whose callers nearly all sit in
one _other_ module of the same project. The output is a concrete move.

## Reading a stack

```text
Stack #1 | 🚨 [DEPTH ≥ 10 > 6] (decorated-method)
🚀 SomeCommand.run(options: SomeOptions): Promise<void> [.../some.command.ts:220]
   ↳ Measure the repository and write every configured output.
  └─> SomeService.measure(args: MeasureArguments): Result [.../some.service.ts:115]
     ↳ Measure aggregated statistics for the provided directory.
```

- **`≥ 10` is a floor, not a measurement.** Something on that path could not be
  followed — a callback invoked through a parameter, a computed member name —
  and the run says so rather than quietly under-reporting. The real depth is at
  least ten. Not a defect, and not a number to distrust: `≥ 10` against a limit
  of 6 is a genuine failure. `Unfollowable calls` in the summary counts them.
- **The parenthesized kind is the entry-point rule that claimed the root.**
  `orphan-root` means nothing in the repository calls it: either dead code, or
  an entry-point rule the configuration is missing.
- **Every frame carries `file:line`**, so the next step is opening one.
- **Each frame is annotated from the type checker** — the signature, and the
  JSDoc prose collapsed to one line — which is what makes a stack readable
  rather than a list of places to go look. A frame printed `(…): ReturnType`
  had a signature over 80 characters, almost always a constructor taking a
  dozen injected services. A summary over 120 characters prints only its
  opening sentence, unmarked; only a single sentence with no boundary to cut on
  is trimmed and marked `…`.

**Shortening applies to the printed tree only.** The JSON report carries every
comment in full, so a script wanting complete text should read JSON rather than
parse the tree.

**The mermaid rendering draws all the stacks as one flowchart**, not one
apiece. A single stack is a straight line, and a straight line is a list with
extra steps; drawn together the shared tails converge — every command reaching
the same repository, every resolver ending in the same service — and that
convergence is what a picture shows and an indented tree cannot. Entry points
are stadiums and everything else boxes, shape rather than color because the
diagram is read in whichever theme the reader has. A diagram stops at 300
callables, drops whole stacks rather than trimming so it never contains an edge
into something it did not draw, and says how many it left out.

## Addressing one callable

`depth` and `breadth` take `<file>#<qualified-name>` — the file path and the
qualified name callidescope already prints in every stack frame, joined by `#`.
It is the same shape a Python traceback or an ESLint rule id uses, which means
it is exactly what you can copy out of a report.

A file holding more than one declaration under the same qualified name — two
overloads, two callbacks bound to the same property — is disambiguated with a
trailing `:<line>`:

```bash
npx callidescope depth --addresses src/foo.service.ts#FooService.bar:118
```

When it cannot tell which one was meant, the run says so and prints every
candidate's line, so the disambiguated address is a copy away.

Neither command writes anything, compares a destination, or takes `--check`,
`--write`, `--json`, or `--markdown`. A lookup only ever prints. Both do take
the same workspace-scoping flags as `callidescope` itself, because resolving an
address still means tracing the workspace first.

## `breadth`: what it calls, and what calls it

Prints the callable's **direct callees and direct callers side by side** — the
two questions a refactor or a rename needs answered together, before either one
is safe.

- **A rename.** The callers are the exhaustive list of what has to be updated.
  This is the one question a text search answers badly in a
  dependency-injected codebase: a call through `this.someService.load()` is
  found by the type checker and missed by a grep for the class name.
- **An extraction.** Extracting a responsibility out of a wide callable means
  moving _some subset of the callees it names_. The callee list is the raw
  material for choosing the seam — look for the subset that shares a concern,
  and take those.
- **An inline.** A callable with one caller and few callees is a candidate for
  folding into that caller. Breadth confirms the "one caller" part rather than
  assuming it.

It reports on a callable nobody has flagged. It does not need a finding to be
worth running.

## `depth`: every chain above and below

Prints **every path above the callable and every path below it** — every caller
chain up to a root, every callee chain down to a leaf — rather than folding
each direction into the single deepest one that `callidescope`'s own report
keeps.

That difference is the point. The workspace report answers "how deep does this
get", so one path per entry point is enough. `depth` answers "what is this
callable actually part of", and a callable reached from a dozen places, or
reaching a dozen leaves, is exactly the shape it is asked to show in full.

Each direction is capped at 200 paths, and a capped run says so. The cap exists
because a widely-called utility whose callees fan out just as wide multiplies
those branches together — enumerating every path is not bounded by construction
the way one deepest path is.

- **Turning a depth finding into a plan.** The workspace report names the
  stack; `depth` against a frame in the middle of it shows every _other_ chain
  that frame participates in, which is what tells you whether collapsing a
  forwarding layer is safe or whether three other callers depend on it.
- **Testing a "this looks misplaced" hunch.** The caller trees show where the
  callable is really used from — the same evidence the possibly-misplaced
  finding is built on, in full rather than summarized.

## Which one to reach for

| The question | The command |
| ------------ | ----------- |
| Is anything in this workspace too deep, too wide, or misplaced? | `callidescope` |
| What breaks if I rename this? | `breadth` |
| Where do I cut this callable in two? | `breadth` |
| Can I inline this? | `breadth` |
| Can I collapse this layer? | `depth` |
| What is this callable actually part of? | `depth` |
| Does this belong in this file? | `depth` |

## What the graph does and does not contain

The same resolution rules govern all three commands, and they decide what any
of them can tell you.

| Written as | Resolved to |
| ---------- | ----------- |
| `helper()` | The symbol at the callee, unwrapped through import aliases |
| `this.service.load()` | The symbol at the member name — the injected-dependency case |
| `provider.ingest()` | Every class structurally satisfying the interface, capped |
| `super.run()` | The base declaration the checker resolves to |
| `new Thing()` | The constructor, when it has a body |
| `list.map(callback)` | The callback, as its own frame — `map` itself is external |
| `target[key]()` | Nothing. Recorded as unfollowable rather than guessed |

Four consequences worth holding on to:

- **Structural matching is not optional**, because classes routinely satisfy an
  interface without writing `implements`. It also means a caller list can
  contain a class that never actually calls the callable at runtime — check
  `maximumImplementationCandidates` when a result looks implausibly wide.
- **A computed member call resolves to nothing.** A caller reaching the
  callable that way will not appear, so `breadth` does not fully cover a rename
  in a codebase that dispatches through computed names.
- **Calls into dependencies are leaves.** Whether `Array.prototype.map` is
  deeply implemented says nothing about whether _your_ layering is too deep,
  and counting it would move every number on an unrelated upgrade.
- **`ignoreCallees` globs are dropped from the graph entirely**, so a callable
  the configuration ignores — typically a logger — appears in no list and
  counts toward nobody's depth or breadth.

**Cycles are collapsed before depth is measured**, so a mutually recursive
cluster of three contributes three frames once — an honest floor on a stack
that has no ceiling. That is why the numbers do not move between runs:
detecting a repeat visit mid-walk would make the answer depend on which path
arrived first, and a linter whose numbers move on its own is not usable as a
gate.

**Depth is only meaningful relative to a root**, and most code in a framework
codebase is called by the framework rather than by the repository. Roots are
therefore configurable — decorated methods, lifecycle hooks, bootstraps, index
exports — and anything left with no caller is promoted to an orphan root rather
than dropped.

## After reading

To narrow, gate, or publish a run, and to change any of the thresholds above,
reach for the `callidescope-configure` skill. When a run fails or a report
reads stale, reach for `callidescope-triage`.

A refactor moves the call graph, which makes every committed report stale.
Re-run the write configuration once the change lands, and lint **before**
regenerating: every frame carries a `file:line`, so a formatter that sorts
class members moves the line numbers of everything after it, and a report
written before that sort is stale the moment it lands.
