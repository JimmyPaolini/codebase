---
name: codometer-configure
description: Write or edit a codometer.config.ts, declaring targets, limits, custom convention counters, exclusions, or output destinations. Use when a repository has no codometer configuration yet, when adding a size or count limit, when declaring a target for compiled or generated output, when counting a naming convention no built-in analyzer knows about, when a limit fails to bind or a target matches no files, or when deciding whether one configuration can describe every project in a workspace.
license: MIT
---

# Writing a codometer configuration

`codometer.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}` is read from the directory
being measured, or from any directory above it — the search walks upward and
takes the **first** file found. The nearest configuration wins outright, and is
never merged with one further up: a merged limit that never applied to this
folder would look exactly like one that did. Every field is optional; a
repository with none of these files is measured with the defaults.

```ts
import { type CodometerConfiguration } from "@codometer/configuration";

const codometerConfiguration: CodometerConfiguration = {
  exclude: ["notepads/**"],
  excludeFrom: ["configuration/.codometerignore"],
  defaultTarget: "codebase",
  limits: [{ metric: "typescript.interfaces", severity: "warn", value: 500 }],
  targets: [
    {
      analyses: ["size"],
      include: ["dist/**/*.js", "!dist/**/*.map.js"],
      name: "compiled",
    },
  ],
  output: { markdown: { path: "README.md" } },
};

export default codometerConfiguration;
```

Output paths resolve relative to the directory being **measured**, not to the
configuration file, so a configuration kept in a `configuration/` folder still
writes to the project root it describes.

## One configuration for every folder in a workspace

Export a **function** instead of an object to let one file at the top of a
workspace describe every project beneath it:

```ts
import path from "node:path";

import {
  type CodometerConfiguration,
  type CodometerConfigurationFactory,
} from "@codometer/configuration";

const codometerConfiguration: CodometerConfigurationFactory = (context) => {
  const projectPath = path.relative(
    context.configurationDirectory,
    context.directory,
  );

  return {
    targets: [
      {
        analyses: ["size"],
        directory: path.relative(context.directory, context.configurationDirectory),
        include: [`dist/${projectPath}/**/*.js`],
        name: "compiled",
      },
    ],
  } satisfies CodometerConfiguration;
};

export default codometerConfiguration;
```

The factory receives only two absolute directories — `directory` (what this
run measures) and `configurationDirectory` (where this file lives) — and
nothing about the run's flags, so the same configuration can never describe a
different repository depending on whether the run writes or gates. Every
per-project path convention — where build output lands, where a limit is
declared per package — falls out of that one relationship. A factory may
return a promise, so it can read a manifest before answering.

A project measured under a shared factory still needs no configuration file of
its own; a project that writes one replaces the shared answer entirely rather
than adding to it.

## Exclusions

`.gitignore` is already in force through discovery, so `exclude` and
`excludeFrom` are for files that are **kept** but that nobody wrote by hand —
lockfiles, vendored bundles, generated documentation:

| Option | Syntax | Use it for |
| ------ | ------ | ---------- |
| `exclude` | Globs | A handful of paths named inline |
| `excludeFrom` | Paths to gitignore-syntax files | A list a repository would rather keep in a file |

Reusing an existing ignore file is a trap worth knowing about: most are written
for one other tool's concerns. A `.prettierignore` that excludes all markdown
because a formatter doesn't touch it will erase every markdown metric if
codometer is pointed at the same file. A dedicated `.codometerignore` is
usually the right answer instead of reaching for a file another tool owns.

## Targets

A **target** is a named set of files matched by glob, with the analyses run
over it. The measured directory is always a target of its own, named
`codebase`; `targets` declares the others — most often build output that every
`.gitignore` excludes, and that therefore needs a target rather than an
exclusion to reach at all.

| Field | Required | Default | Meaning |
| ----- | -------- | ------- | ------- |
| `name` | yes | — | Unique name for this target |
| `include` | yes | — | Globs that add files; at least one must add rather than only remove |
| `exclude` | no | none | Globs that remove files |
| `analyses` | yes | — | `"language"`, `"size"`, or both |
| `compression` | no | `gzip` | `gzip`, `brotli`, or `none`, for `size` analysis |
| `directory` | no | `.` | Where this target's globs start, relative to the measured directory |

A `!` prefix in `include` removes files; every negation across the array forms
one set applied to the whole target, so reordering the array can never change
what it matches. `exclude` may not carry a `!` — it already removes, so there
is nothing left to negate there. Ignore files are **not** consulted for a
target, which is exactly what lets one match compiled output at all.

## Limits

A limit bounds how high one measured metric may go. Any metric can carry one —
a compressed size, a line count, a declared counter — and a metric with no
limit is measured and reported exactly as before, gated by nothing.

```ts
defaultTarget: "codebase",
limits: [
  { metric: "compiled.size", value: "8 KB" },
  { label: "Interfaces", metric: "typescript.interfaces", value: 500 },
  { metric: "linesOfCode", severity: "warn", value: 100_000 },
],
```

| Field | Required | Default | Meaning |
| ----- | -------- | ------- | ------- |
| `metric` | yes | — | Dotted path of the metric this bounds |
| `value` | yes | — | Ceiling, as a number or a string carrying a unit |
| `severity` | no | `fail` | `fail` stops the run on a breach; `warn` only reports it |
| `label` | no | the path | What the report calls this limit |

A metric is addressed as its target's name followed by its path within that
target. Setting `defaultTarget` lets an unprefixed path resolve to that
target's metric, but only where no target of a competing name exists — write
the target name in full wherever a target and a metric group could share one,
because **an ambiguous path is refused outright, never guessed at**. The same
refusal applies to a path naming no metric at all, or one from an analysis its
target never ran.

A string value's unit is decimal and its trailing `b` is required: `"8 KB"` is
8000 bytes, `"1 MB"` is 1000000, and `"8 K"` is refused rather than read as
anything. A target that matches no files only fails the run if a limit is
written against it — declaring the limit is what asserts the files should be
there.

**Never raise a limit's `value` to make a breach pass.** A configured limit is
a promise about the codebase's shape, and raising it on the change that broke
that promise erases the evidence the limit existed to keep. If a breach is a
real regression, reduce what is being measured instead — trim the metric down,
split the file, delete the dead code. If the limit itself was simply wrong for
what this metric should hold going forward, that is also a decision worth
making deliberately and explaining, not a number quietly bumped in the same
change that broke it. For everything else a breach could mean, reach for the
`codometer-triage` skill.

## Custom statistics

`statistics` counts a repository's own naming conventions — vocabulary no
built-in language analyzer has any way to know about:

```ts
statistics: [
  { label: "Service Files", patterns: ["**/*.service.ts"] },
  { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
  { color: "16a34a", label: "Migrations", patterns: ["**/migrations/*.sql"] },
],
```

Each entry renders as one badge, in configured order. `color` is a shields.io
hexadecimal triplet; an entry that omits it takes the next color from a
built-in palette per group, so a counter's color stays stable between runs.

A counter can also match **declarations** instead of files, by shape:

```ts
statistics: [
  { group: "typescript", label: "Static Methods", symbols: { kinds: ["method"], modifiers: ["static"] } },
],
```

`kinds` is one or more of `class`, `enum`, `function`, `getter`, `interface`,
`method`, `property`, `setter`; `modifiers` narrows to declarations carrying
every named modifier from `abstract`, `async`, `export`, `override`, `private`,
`protected`, `public`, `readonly`, `static`. Both are read literally from the
syntax — a class member is a `method`, everything else callable is a
`function` including an arrow, and a class field holding an arrow function is
a `property` carrying none of the field's own modifiers.

`patterns` on a symbol counter narrows **which files are searched** rather than
being what is counted, and an entry declaring neither `patterns` nor `symbols`
is rejected rather than reported as a permanent zero. `group` places the badge
after a named group's built-ins — `conventions` by default, or one of the
built-in language groups — and a name outside that set fails the configuration
rather than rendering nowhere.

## Output destinations

```ts
output: {
  json: { indentation: 2, path: "output/codometer.json" },
  markdown: { description: "Measured on every push.", path: "README.md" },
}
```

A markdown destination needs a `path`, a `write` function, or both — one naming
neither is rejected at load time. `render` and `write` are each independently
replaceable: `render` turns statistics into markdown text (handed the built-in
`renderBadges()` to extend rather than replace), and `write` decides which file
that text lands in and how, handed `anchors.syncAnchoredBlock()` for the marker
mechanics so a custom destination does not mean reimplementing the splice. A
`write` function returning `false` marks that destination stale, which is what
fails a `--check` run.
