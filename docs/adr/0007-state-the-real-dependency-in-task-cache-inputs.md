# State the real dependency in task cache inputs

`nx.json`'s `shared-globals` reaches almost every lint target, directly or
through `default`, so whatever it names is an input to nearly every task in the
workspace. It once named `pnpm-lock.yaml`, `nx.json`, and
`.github/workflows/*.yml`. Those changed on 100, 53, and 86 of every 100 commits
to `main` respectively, and because a pull request is built from the merge
commit, every branch inherited that churn. Every task in the workspace re-hashed
on essentially every run, and 🧑‍💻 Lint Codebase never recorded a single cache
hit: it ran 475–520 tasks cold every time and took 5–9 minutes against a
12-minute limit. Nothing failed. The work was simply repeated.

We reduced `shared-globals` to `configuration/tsconfig.json` and made every
target name the dependency it actually has.

## Considered options

- **Leave it.** Rejected: nothing was broken, but the whole point of a task
  cache is not repeating work, and this configuration guaranteed it never
  stopped.
- **Drop `shared-globals` entirely.** Rejected: `configuration/tsconfig.json` is
  a genuine input to nearly every lint target, and it is low-churn. Removing it
  would trade over-invalidation for stale results.
- **Name the real dependency per target.** Chosen. Tool versions go in a
  per-target `{"externalDependencies": [...]}` entry, which hashes the resolved
  versions of exactly those packages — what `typecheck` had always done with
  `typescript`. Python targets need nothing, already declaring
  `{workspaceRoot}/pyproject.toml` and `{workspaceRoot}/uv.lock`. A target that
  genuinely depends on every dependency uses the `dependency-versions`
  namedInput, as `build` does, because a bundle really does change when any
  dependency does.

## Consequences

- **Nothing checks for this, and nothing can.** A run whose cache never hits is
  still a green run, so the only signal is the duration. Re-adding one
  high-churn glob to `shared-globals` silently undoes the entire arrangement,
  and no test will report it.
- **A tool added to a target's command must be added to that target's
  `externalDependencies` in the same change**, or upgrading it will replay a
  stale cached result. This is the cost of the trade: correctness now depends on
  a per-target list somebody has to maintain.
- **A task's own artifact must never be one of its inputs.** It would rewrite
  the hash it was just cached under and could never hit its own cache.
  `.eslintcache/` is excluded from `default` and from the `eslint` inputs for
  this reason, and each project's `codometer-report.json` is subtracted from its
  own.
- **A root-owned gate must declare `{workspaceRoot}` globs.** With
  `{projectRoot}` globs, a file added inside a project is not in the root
  project's file set, so the hash never changes and `nx affected` replays a
  green cached result with the violation present.
