# 🕳️ Failure modes worth showing on purpose

Two things conformetry lets through. One is a design decision, the other is a
trap the documentation warns about — and both look like success, which is why
they are worth reproducing rather than describing.

## Run it

```bash
pnpm exec nx run conformetry-examples:failure-modes
```

```text
All checked files conform.
```

The instance conforms. It should not be comforting.

## 1. A placeholder nobody supplied is a silent hole

The template asks for `{{owner}}`:

```markdown
# {{namePascalCase}}

## Ownership

Owner: {{owner}}
```

Nothing supplies it. `owner` is not a declared input, and the instance group
carries no `substitutions` entry for it. **Mustache renders an unknown
placeholder as an empty string rather than leaving the token visible or
failing**, so:

- Generation writes `Owner:` followed by a single trailing space, and nothing
  else.
- Validation renders the template the same way and compares against `Owner:`,
  which matches. No finding.

See it for yourself:

```bash
pnpm exec nx run conformetry-cli:start -- generate --generator pitfalls --name silent-hole --no-interactive --directory tmp/conformetry-examples/failure-modes --config packages/conformetry-examples/examples/failure-modes/conformetry.config.ts
```

```text
  tmp/conformetry-examples/failure-modes/silent-hole/silent-hole.md
  tmp/conformetry-examples/failure-modes/silent-hole/silent-hole.service.ts
```

```bash
cat tmp/conformetry-examples/failure-modes/silent-hole/silent-hole.md
```

```text
# SilentHole

## Ownership

Owner:
```

The loop is closed and consistent, and the value nobody supplied is gone from
both ends of it. **Supply every placeholder a template uses** — as a declared
input for generation, and in the instance group's `substitutions` for
validation. [case-variants](../case-variants/README.md) is the example that does
supply them.

Worth noticing too: the generated file has a trailing space where the committed
instance does not, and the instance still conforms. The markdown comparison is
mdast structure, not text, so that difference is not a finding either.

## 2. A `TODO` comment is a prompt, not text to copy

The template's service file carries one:

```ts
// 🎯 Service

// TODO: say what this service is for
/** Runs the {{nameKebabCase}} work. */
export class {{namePascalCase}}Service {
```

**A template comment containing `TODO` is treated as a prompt rather than text
to copy, so any instance comment satisfies it.** The committed instance answers
it with something else entirely, and conforms:

```ts
// 🎯 Service

// Owned by whoever picks it up next.
/** Runs the silent-hole work. */
export class SilentHoleService {
```

This one is deliberate, and it is what makes a template able to say _write
something here_ without dictating what. `// 🎯 Service` in the same file is not
a `TODO`, so it is required verbatim — [drift-catalogue](../drift-catalogue/README.md)
shows what dropping it reports.

The comment still has to be **there**, though. Delete the instance's line
entirely and the file loses a requirement:

```text
  1. file: silent-hole.service.ts — 13/14 requirements met (92.9%)

     1. Missing comment /** Runs the silent-hole work. */
        Expected: `/** Runs the silent-hole work. */`
```

Note which comment is named: the remaining ones slide up into the slots the
template declared, and the last one is reported missing. The count and the order
are part of the comparison even when one entry's text is not.

## What to take from it

Conformetry measures an instance against a **rendered** template. Anything the
rendering itself loses — a placeholder nobody supplied, a `TODO` standing in
for prose — is invisible to the comparison by construction, because both sides lost
it identically. Reviewing the template and its inputs is not something
validation can do for you.

## Next

Back to the [package guide](../../README.md), or straight to
[AGENTS.md](../../AGENTS.md) if you arrived here from a conformance report.
