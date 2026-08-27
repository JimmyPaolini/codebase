# 🚦 Limits, including every refusal

A **limit** is how high one measured metric may go. The refusals are where
codometer is opinionated, and where a reader gets stuck, so each one has a
configuration of its own.

## Run it

```bash
codometer --directory examples/corpus --config examples/limits/fail.config.ts --check limits
```

Every configuration below runs the same way — swap the file name.

## What is here

| Example | Shows | Exit |
| ------- | ----- | ---- |
| [`unprefixed.config.ts`](unprefixed.config.ts) | a path with no target name binds to nothing | 1 |
| [`warn.config.ts`](warn.config.ts) | `severity: "warn"` prints and leaves the exit code alone | 0 |
| [`fail.config.ts`](fail.config.ts) | a `fail` beneath a `warn`; both reported, one gates | 1 |
| [`ambiguous.config.ts`](ambiguous.config.ts) | a path that reads two ways, refused naming both | 1 |
| [`unbound.config.ts`](unbound.config.ts) | a path naming nothing, and one naming an analysis never run | 1 |
| [`default-target.config.ts`](default-target.config.ts) | `defaultTarget` resolving an unprefixed path | 0 |
| [`units.config.ts`](units.config.ts) | `"8 KB"` is 8000 and `"1 MB"` is 1000000 | 1 |
| [`unreadable-unit.config.ts`](unreadable-unit.config.ts) | `"8 K"` refused rather than guessed at | 1 |
| [`empty-target-limited.config.ts`](empty-target-limited.config.ts) | an empty target with a limit fails | 1 |
| [`empty-target-unlimited.config.ts`](empty-target-unlimited.config.ts) | the same target without one passes | 0 |

## The stumble almost everyone hits first

[`unprefixed.config.ts`](unprefixed.config.ts)

**A path with no target name on the front binds to nothing** unless
`defaultTarget` names the target it belongs to — even when only one target was
measured and there is nothing it could be confused with:

```text
Cannot bind the limit written against "linesOfCode": nothing measured answers
to it. Measured targets: "codebase". Write the target's name in front of the
metric path, or configure a default target.
```

Write `codebase.linesOfCode`, or set `defaultTarget: "codebase"`.

## Ambiguity is refused, never resolved

Two things together make a path ambiguous: a target sharing a name with a metric
group, and a `defaultTarget` that makes the unprefixed path readable as the
default target's too.

```text
Cannot bind the limit written against "markdown.files": it could be the
"markdown" target's "files" metric, or the "codebase" target's "markdown.files"
metric. Write the target's name in front of the one it means.
```

Worth noticing: **dropping the `defaultTarget` removes the ambiguity**, because
the path then reads only as the target's. A `defaultTarget` added for
convenience can break a limit written before it.

The other side of the same coin is
[`default-target.config.ts`](default-target.config.ts): with
`defaultTarget: "codebase"` and a target called `typescript`,
`typescript.interfaces` is the **codebase's** six interfaces, because the
`typescript` target has no `interfaces` metric of its own to compete with it.
`typescript.files` under that same configuration is refused, because both
readings exist.

## Empty targets

A target that matched no files fails the run **if and only if** a limit is
written against it. Declaring a limit asserts the files are there, so an empty
match is a glob that stopped matching or a build that never ran:

```text
Target "Never Built" matched no files, and a limit is written against its
"size" metric. A limit says the files are there, so an empty match is a glob
that stopped matching or a build that never ran — not a measurement of zero.
```

A target nobody limited simply measured nothing, and the report says
`"empty": true` outright rather than leaving you to infer it from a size of
zero.

## Next

[documentation](../documentation/README.md), for the one limit that has no
metric path at all.
