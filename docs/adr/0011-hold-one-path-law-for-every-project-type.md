# Hold one path law for every project type

`configuration/codebase-structure.json` is a single set of path and naming rules
applied to every project in the workspace, rather than a per-type ruleset. It
matches paths and has no access to Nx tags, so a per-type rule would mean
enumerating every project by name — a second source of truth that drifts from
the tags the moment a project is added.

The split is that **this file is the universal path and naming law** —
kebab-case folders, module file suffixes, entry-point names — and **conformetry
owns what a project of a given type must contain.** Per-type shape is already
enforced: `configuration/conformetry.config.ts` selects instances by tag
(`{ patterns: ["."], tags: ["framework:nest-commander"] }`), and
`conformetry-validate` gates them.

## Considered options

- **Split the file by project type.** Rejected: it cannot read tags, so every
  rule would have to name projects, and the list would go stale silently.
- **Exempt the files frameworks insist on.** Rejected. See below — exemptions
  accumulate and stop describing the tree truthfully.
- **One universal law, plus conformetry for per-type shape.** Chosen.

## Consequences

- **A file a framework insists on is relocated and configured, never
  exempted.** lexico's TanStack client entry and generated route tree both sit
  in `src/lib/` and are named in `vite.config.mts` as `client.entry` and
  `router.generatedRouteTree` — both resolved relative to `srcDirectory`, so a
  leading `src/` there writes to `src/src/`. The client entry is kept rather
  than deleted, even though TanStack supplies an identical virtual one, because
  it holds the workspace's only static `react-dom/client` import; without it
  every dependency check strips `react-dom` from the manifest and the catalog.
  `src/router.tsx` is the one that cannot move — TanStack resolves that entry
  with `required: true`. `@conformetry/nx`'s postinstall shim is `src/main.mjs`
  for the same reason in reverse: a `bin` has to stay a TypeScript-source entry
  point, so it takes an entry-point name and keeps its work in
  `modules/generator/`.
- **The Python entries are declared, not enforced.** Snake_case `*.py` and
  `*.ipynb` files and the `py.typed` marker are accepted at _any_ project's
  `src/` root, not only `affirmations`', and the same goes for the `python/`
  subfolder. Neither entry gates anything — ESLint lints no `.py` file in this
  workspace, so the rule never fires on one. They exist so the config describes
  the tree truthfully, and so the day a `.ts` lands beside them it is judged
  rather than rejected out of hand.
- **A rule `name` is not a plain regex**, which is the trap when editing this
  file. The plugin rewrites `.` to `\.` before compiling, so dots are written
  unescaped — a hand-escaped `\.` becomes "literal backslash, any character" and
  silently stops matching. `*` is a path wildcard rather than a quantifier, and
  `/\{([^}]+)\}/` is read as a regex-parameter reference, so **no brace may
  appear in a `name`**. A literal `{{placeholder}}`, as conformetry's template
  folders use, has to be declared in the top-level `regexParameters` map and
  referenced by name.
- **There is deliberately no `errors` file suffix.** An error class lives in the
  `*.constants.ts` file beside the code that throws it, which the Constant File
  Shape rule permits by whitelisting `class X extends Error`.
