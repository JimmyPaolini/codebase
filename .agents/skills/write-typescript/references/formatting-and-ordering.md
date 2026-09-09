# Formatting and ordering

Formatting is not a judgement call — `lint-codebase --configuration=write`
produces the canonical result. Write code in the shape below so the first pass
is a no-op.

## The formatter is `oxfmt`, not prettier

80-column print width, 2-space indent, double quotes, semicolons, trailing
commas everywhere, LF endings, one JSX attribute per line. Configured in
`configuration/oxfmt.config.ts`. `prettier` stays installed as a supplementary
formatter for manual or non-default use; it is not what a target runs.

```bash
nx run <project>:lint-codebase --configuration=write
```

## Import groups

`perfectionist/sort-imports` enforces the order, with exactly one blank line
between groups and natural alphabetical order inside each group:

1. builtin
2. external
3. internal (`@codebase/*`)
4. parent
5. sibling
6. index
7. type

## Alphabetical order is enforced broadly

Named imports and exports, object literals, object types, interfaces, enums,
union and intersection types, switch cases, class members, JSX props,
`Map`/`Set` entries, and top-level module declarations.

**Object literals partition on blank lines and comments**, so a blank line
starts a fresh sorted run. That is the escape hatch when a literal has a
meaningful order — group the members and let each group sort itself, rather than
reaching for a disable comment.

> ⚠️ **Warning:** `oxfmt` sorts object keys, and some object keys are
> order-sensitive. A package manifest's `exports` conditions are the known case:
> a `{ "types": …, "default": … }` map is reformatted with `default` first,
> which makes `types` unreachable. Never rely on the source order of an
> `exports` map surviving a format pass.

## Cross-project imports

- Use the **workspace package name**, never a relative path across projects —
  `import/no-relative-packages` is an error and `import/no-relative-parent-imports`
  warns.
- **Inside** a project, prefer relative paths over path aliases.

## Function parameters

At most **3** parameters; group extras into an options object. Constructors are
allowed 12, and functions in a `*.module.ts` are allowed 12, because a NestJS
module's factory signature is not something a caller types.

Enforced by `better-max-params/better-max-params`, not the core `max-params`
rule, which is turned off.

## JSDoc on public APIs

Public functions, classes, methods, interfaces, types, and enums must carry
JSDoc — **but only where it adds non-obvious context.** A comment restating the
signature is worse than no comment; see the `write-comments` skill for what
earns its place and for the `// <emoji> <Section name>` convention.
