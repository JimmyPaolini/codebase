# Hold every conformetry language in one package

Conformetry's six Language packages become one, `conformetry-languages`, whose
modules are the Languages. The machinery that kept them separable — a registry
of package specifiers and export-name strings, a module loader, a
missing-package error, optional peer dependencies, and a static-import shim in
the Nx plugin — is removed rather than retained, and validation resolves
Languages through ordinary dependency injection.

**This forfeits install-time optionality, and that is the decision.** A consumer
validating only JSON now installs the TypeScript compiler and the markdown
parsers, because npm installs whole packages and no export shape changes that.

Paying that cost won on three grounds.

**Nobody was spending the optionality.** No conformetry package is published. Of
the two consumers in the workspace, the Nx plugin already imported all six
statically — a comment in its own shim explained that it had to, because Nx's
transpiler owns the module graph it compiled and a late-bound import escapes to
a resolver that cannot load workspace TypeScript sources — and the
command-line host reached whichever Languages a run's templates required. The
Fallback made the package a required dependency of every run regardless.

**The mechanism was justified in the code by a benefit it never delivered.** The
loading service documented on-demand loading as sparing a TypeScript-only
consumer "the Python bridge — which would otherwise demand a `python3` binary
on the machine". The bridge spawns the interpreter inside a method, never at
module scope, so importing that package on a machine without `python3` was
always harmless. The real cost avoided was install and load weight, not
interpreter availability.

**The separation cost more than it bought.** Reading or changing a Language
meant opening a whole package — its own manifest, project definition, lint
configuration, codometer configuration, two tsconfigs, a README, an AGENTS.md,
for as little as 135 lines of source. Adding a seventh Language meant creating
all of that again and registering it in six further places.

## Considered options

- **Subpath exports.** Publish one package but let a consumer import
  `@conformetry/languages/json` and pull in only that engine. Rejected: it
  defers nothing here. The Fallback means every run needs the text Language, so
  the package is resolved on every run whatever the entry point, and the
  extension set a run discovers is runtime data — a consumer cannot name its
  subpaths ahead of knowing which files exist. It would add six export maps and
  their `publishConfig` twins for no saving.
- **Keep the text Language as its own package, so the rest can stay optional
  peers.** The Fallback is the one engine every run needs; leaving it separate
  would preserve the optionality argument for the other five. Rejected: it
  leaves the consolidation at two packages instead of one and keeps the whole
  loading apparatus alive to serve five of six engines — the registry, the
  loader, the narrowing, and the error all survive to buy the same optionality
  nobody was spending. The cost of the mechanism is nearly all fixed; halving
  what it manages does not halve it.
- **Make the parsers optional peer dependencies of the new package.** Ship one
  package but leave `typescript`, `remark`, and the JSONC parser optional, so a
  JSON-only consumer installs none of them. Rejected: it trades a clear error
  for an obscure one. Today a missing Language is reported as "validating .py
  needs @conformetry/python, but it could not be loaded"; under optional peers
  the same situation surfaces as a raw module resolution failure from inside a
  parser, at the moment a file happens to be compared.

## Tree shaking is not a substitute, and no bundler is introduced

It is the obvious rebuttal — ship one package and let a bundler drop the
engines a consumer does not reach — and it does not work here, for two
independent reasons.

**Language selection is runtime data.** Which engine loads depends on the file
extensions a run discovers on disk, which no static analysis can know. There is
no reachability question a bundler could answer.

**NestJS module graphs hold hard references.** `@Module({ providers: [...] })`
records its provider classes in decorator metadata, so every Language class is
strongly referenced from the module that declares it whether or not any code
path calls it. Dead-code elimination has nothing to eliminate.

Migrating these packages to a bundled library build is separate work, and it
would not change either of those facts.

## Consequences

- **A consumer's install is larger.** The TypeScript compiler and the markdown
  parsers arrive with the package. Nothing is published today, so no consumer
  is paying it yet — which is exactly why this was the moment to decide.
- **Adding a Language is one module and one registry entry.** It was a whole
  package plus six registrations: a specifier registry, an optional peer block,
  the Nx plugin's shim, two `depConstraints` entries, a `codependix` rule, and
  three `ignoredDependencies` lists that existed only because no static import
  proved a dynamically-loaded package was used. All of that is gone.
- **The Jupyter Language's delegation stops being policed.** Its calls into the
  JSON, markdown, and Python Languages were cross-package edges that
  `@nx/enforce-module-boundaries` and `codependix` both judged. They are now
  intra-package imports that neither tool sees. This is accepted; call-stack
  tracing still reaches them, and restoring the guarantee would be a
  file-level import rule and its own change.
- **`ValidationService.validate` is synchronous.** Resolving the Languages was
  the only step that ever waited on anything.
- **Two toolchains now export same-named classes.** After the move, conformance
  and measurement each export a `JsonService`, `MarkdownService`,
  `PythonService`, `TypescriptService`, and `JupyterService`. Nothing imports
  both today; any file that ever needs both will require aliased imports.
- **Reversing this is a new decision, not a revert.** Subpath exports, a
  separate text package, and optional peer parsers were each weighed and
  rejected above. Revisiting one is an argument against this record rather
  than a gap in it.
