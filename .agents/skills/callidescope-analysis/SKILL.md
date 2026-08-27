---
name: callidescope-analysis
description: Answer a question about one callable before refactoring it — who calls this, what does it call, what would this rename touch, where should this responsibility be split, is this function in the right file — using callidescope's depth and breadth commands against a file#qualified-name address. Use when scoping the blast radius of a rename or an extraction, when deciding whether to extract, inline, or move something, when a possibly-misplaced or module-spread finding needs the chain read before anything moves, or when an address matches more than one declaration.
license: MIT
---

# Reading one callable before changing it

A full `callidescope` run answers a question about a workspace: which stacks
are too deep, which callables are too wide, which ones look misplaced. The
`depth` and `breadth` commands answer a question about **one callable**, and
they are what turns a finding — or a hunch — into the exact set of files a
change has to touch.

```bash
npx callidescope depth src/foo.service.ts#FooService.bar
npx callidescope breadth src/foo.service.ts#FooService.bar
```

Neither writes anything, neither compares a destination, and neither takes
`--check`, `--write`, `--json`, or `--markdown`. A lookup only ever prints, in
whichever format `--format` names. Both take the same workspace-scoping flags
as `callidescope` itself — `--directories`, `--config`, `--format` — because
resolving an address still means tracing the workspace first.

## Addressing a callable

The address is `<file>#<qualified-name>` — the file path and the qualified name
callidescope already prints in every stack frame, joined by `#`. It is the same
shape a Python traceback or an ESLint rule id uses, and it is exactly what you
can copy out of a report.

A file holding more than one declaration under the same qualified name — two
overloads, two callbacks bound to the same property — is disambiguated with a
trailing `:<line>`:

```bash
npx callidescope depth src/foo.service.ts#FooService.bar:118
```

When it cannot tell which one was meant, the run says so and prints every
candidate's line, so the disambiguated address is a copy away. At a real
terminal outside CI a missing address is prompted for instead; in a script or a
CI job prompting is off and a missing address is a rejected command line.

## `breadth`: what it calls, and what calls it

`breadth` prints the callable's **direct callees and direct callers side by
side** — the two questions a refactor or a rename needs answered together,
before either one is safe.

Read it for three decisions:

- **A rename.** The callers are the exhaustive list of what has to be updated.
  This is the one question a text search answers badly in a
  dependency-injected codebase: a call through `this.someService.load()` is
  found by the type checker and missed by a grep for the class name.
- **An extraction.** Extracting a responsibility out of a wide callable means
  moving _some subset of the callees it names_. The callee list is the raw
  material for choosing the seam — look for the subset that shares a concern,
  and take those.
- **An inline.** A callable with one caller and few callees is a candidate for
  folding into that caller. Breadth is how you confirm the "one caller" part
  rather than assuming it.

`breadth` also reports on a callable nobody has flagged. It does not need a
finding to be worth running.

## `depth`: every chain above and below

`depth` prints **every path above the callable and every path below it** —
every caller chain up to a root, every callee chain down to a leaf — rather
than folding each direction into the single deepest one that `callidescope`'s
own report keeps.

That difference is the point. The workspace report answers "how deep does this
get", so one path per entry point is enough. `depth` answers "what is this
callable actually part of", and a callable reached from a dozen places, or
reaching a dozen leaves, is exactly the shape it is asked to show in full.

Each direction is capped at 200 paths, and a capped run says so. The cap exists
because a widely-called utility whose callees fan out just as wide multiplies
those branches together — enumerating every path is not bounded by
construction the way one deepest path is.

Read it for:

- **Turning a depth finding into a plan.** The `--check depth` report names the
  stack; `depth` against a frame in the middle of it shows every _other_ chain
  that frame participates in, which is what tells you whether collapsing a
  forwarding layer is safe or whether three other callers depend on it.
- **Testing a "this looks misplaced" hunch.** The caller trees show where the
  callable is really used from, which is the same evidence the
  possibly-misplaced finding is built on, in full rather than summarized.
- **Understanding a stack before opening a file.** Every frame carries its
  signature and the one-line summary of its documentation, so the tree reads
  rather than being a list of places to go look.

## Which one to reach for

| The question | The command |
| ------------ | ----------- |
| What breaks if I rename this? | `breadth` |
| Where do I cut this callable in two? | `breadth` |
| Can I inline this? | `breadth` |
| Can I collapse this layer? | `depth` |
| What is this callable actually part of? | `depth` |
| Does this belong in this file? | `depth` |

## Scoping the run

Both commands trace before they resolve, so `--directories` is what keeps a
lookup fast:

```bash
npx callidescope breadth packages/foo/src/foo.service.ts#FooService.bar \
  -d packages/foo
```

There is a real trade-off. Narrowing to one directory builds one TypeScript
program and answers in about a second, but **callers outside that directory do
not exist to the run**. For a rename whose blast radius is the whole point,
trace wide enough to contain every consumer — a narrowed `breadth` that reports
two callers when there are nine is worse than a slow one.

An Nx workspace can get the middle ground from the separate `@callidescope/nx`
plugin, which infers `depth` and `breadth` targets onto every project and
traces each one _with its Nx dependencies_, so a chain is not truncated the
moment it crosses a package boundary.

## What the graph does and does not contain

The same resolution rules apply as in a full trace, and they decide what these
commands can tell you:

- **Injected dependencies are followed.** `this.service.load()` resolves
  through the parameter property's type. This is the whole reason the answer
  beats a text search.
- **Interface members resolve structurally**, to every class satisfying the
  interface, capped by `maximumImplementationCandidates`. So a caller list can
  contain a class that never actually calls it at runtime — check the
  candidates when a result looks implausibly wide.
- **A computed member call, `target[key]()`, resolves to nothing.** It is
  recorded as unfollowable rather than guessed, which means a caller reaching
  the callable that way will not appear. A rename is not fully covered by
  `breadth` if the codebase dispatches through computed names.
- **Calls into dependencies are leaves**, so a callee chain stops at the
  package boundary.
- **`ignoreCallees` globs are dropped from the graph entirely**, so a callable
  the configuration ignores — typically a logger — appears in neither list.
- **Cycles are collapsed**, so a mutually recursive cluster does not repeat.

## After the change

A refactor moves the call graph, which makes every committed report stale.
Re-run the write configuration once the change lands, and lint **before**
regenerating: every frame carries a `file:line`, so a formatter that sorts
class members moves the line numbers of everything after it and a report
written before that sort is stale immediately. The `callidescope-trace` and
`callidescope-triage` skills cover running and reading those.
