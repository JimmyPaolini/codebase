---
name: conformetry-generate
description: Scaffold code with a conformetry generator instead of writing it by hand. Use when adding a module, component, service, application, or package to a workspace that has a conformetry configuration; when deciding whether a generator exists for the shape you are about to create; when a generator run overwrote or misplaced files; or when a conformance run reports a file that a generator should have produced. Covers both the Nx plugin and the conformetry command-line host, whose input contracts differ.
license: MIT
---

# Generating with conformetry

Conformetry generators render a **template** — an ordinary folder of ordinary
files — into an **instance** on disk. The same template is then the standard the
instance is measured against, so generating is not a convenience. Code written
by hand in a shape a template already describes starts life failing conformance.

## Before you write a file by hand, check for a generator

A generator name you guess at is rejected, so read the registry rather than
inferring it:

```bash
conformetry templates
```

In an Nx workspace, the emitted plugin answers the same question:

```bash
nx list conformetry
```

Both read the live configuration, so they are correct for the workspace you are
in. Neither output is worth caching in a note — it changes as generators are
added.

## Generation overwrites, unconditionally

There is no existence check, no skip-if-exists, no merge, and no conflict
detection anywhere in the write path. Every file in the template is rendered and
written over whatever is there.

**Never point a generator at a path that already holds work you want.** To
change an existing instance, edit it. Regenerate only when you intend to discard
what is there, or when the instance is missing files a template requires and you
have read what will be replaced.

The Nx path writes through a `Tree`, so `--dry-run` is honest and shows exactly
what would land:

```bash
nx g conformetry:<generator> --name=<name> --project=<project> --dry-run
```

Do that first when you are unsure where output will go.

## The two entrypoints disagree about inputs

This is the single most confusing thing about generating, and it is not a bug:
the same generator behaves differently depending on how you invoke it.

| | Nx plugin | Command-line host |
| --- | --- | --- |
| Invocation | `nx g conformetry:<name>` | `conformetry generate --generator <name>` |
| Aliases | resolved | **not resolved — exact name only** |
| Inputs | **every declared input is required** | none is ever required |
| Missing input | refuses, or prompts | renders as an empty string |
| Default destination | resolved from the workspace | `generated/<generator-name>` |

The asymmetry has one cause: a template placeholder with no value renders as
empty rather than raising. The Nx path forbids that by requiring everything; the
command-line host permits it. So on the command-line host a run can succeed and
still produce a file with a hole in it, or a path with an empty segment.

**Pass every input explicitly on either path.** On the command-line host, check
the output rather than trusting the exit code.

Aliases are worth the same care. `nx g conformetry:nsm` works; `conformetry
generate --generator nsm` does not, because the command-line host looks
generators up by exact name. It lists the real names when you get one wrong.

## Where the output lands

On the Nx path the destination is resolved in this order, first match winning:

1. An explicit `--directory`.
2. No `project` input — treated as a new project, placed by its `type` input
   alongside projects of the same type.
3. A `module` input — placed in that existing module. Naming a module that does
   not exist is an error, not an invitation to create one.
4. The generator's own scoped directory, from the first tagged pattern in its
   instance groups.
5. The directory already holding the most instances of that generator.
6. The project root.

Steps 4 and 5 are why a generator usually needs no destination at all: it knows
where its own instances live. Reach for `--directory` when you are deliberately
placing something outside that convention.

On the command-line host only `--directory` applies, and its absence means
`generated/<generator-name>` — a scratch location, not your source tree. Always
pass `--directory` there when you mean to write into the workspace.

## Running without a person present

The command-line host prompts only when the session is interactive and `CI` is
unset. Force it off with `--no-interactive`, and expect a hard error naming any
required input you did not pass rather than a silent default.

## After generating

Two steps, both cheap, both catching a whole class of mistake:

1. **Check conformance** of what you just made. A generated instance conforms by
   construction, so a difference means the destination was wrong, an input was
   empty, or you overwrote something. See the `conformetry-validate` skill.
2. **Implement inside the generated files.** Do not build a parallel structure
   beside them. The template's section comments and declarations are the
   contract; adding to them is always allowed, removing them is what breaks.

## When a generator does not exist yet

Adding one is a configuration change, not a code change — see the
`conformetry-configure` skill. Two things bite immediately after: the emitted Nx
plugin has to be regenerated with `nx sync`, and every conformetry command
refuses to run while it is out of date rather than working from stale
definitions.
