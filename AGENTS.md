# Codebase Guidance

## Essential Commands

```bash
# Run tasks via Nx (always prefer this)
nx run <project>:<target>:<configuration>
nx run-many --target=lint-codebase --all
nx affected --target=vitest --base=main

# Install dependencies
pnpm add --filter <project> <package>
pnpm add -w <package>  # Workspace root

# Tools that run directly (not via Nx)
docker build --platform linux/amd64 -t myapp .
kubectl get pods
helm upgrade --install myrelease ./chart
```

## Agent Workflow

Use the [mattpocock/skills](https://github.com/mattpocock/skills) workflow for
non-trivial features, refactors, and bugfixes so the work is clarified,
specified, tracked, and implemented in a consistent way, with the
[obra/superpowers](https://github.com/obra/superpowers) skills supplying the
gates it leaves open — approval before the first line of code, a failing test
before the first line of implementation, and a root cause before the first
fix.

1. Sharpen the request first, running
   [brainstorming](.agents/skills/brainstorming/SKILL.md) and the grilling
   skills together. Brainstorming classifies the request — spike, bounded, or
   architectural — and holds the approval gate: no implementation skill, no
   code, nothing scaffolded until you have said what you intend and heard yes,
   however small the change. Around that gate, run
   [grill-with-docs](.agents/skills/grill-with-docs/SKILL.md) when the work
   needs a domain model or ADRs to come out of the conversation, or
   [grill-me](.agents/skills/grill-me/SKILL.md) for a plain interview. Where
   the two disagree on pacing, [grilling](.agents/skills/grilling/SKILL.md)
   wins: ask the whole frontier as one numbered round carrying a recommended
   answer per question, rather than brainstorming's one question per message.
   Unsure which skill fits? Ask
   [ask-matt](.agents/skills/ask-matt/SKILL.md).
2. Capture the outcome with [to-spec](.agents/skills/to-spec/SKILL.md), then
   split it with [to-tickets](.agents/skills/to-tickets/SKILL.md) when the work
   spans multiple tasks. Reach for
   [wayfinder](.agents/skills/wayfinder/SKILL.md) when the work is larger than
   one agent session can hold. This step is brainstorming's terminal state:
   ignore its hand-off to `writing-plans` and its `docs/superpowers/specs/`
   destination — that skill is not installed here, and a spec and its tickets
   belong where [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)
   says.
3. Hand the plan across the session boundary with
   [handoff](.agents/skills/handoff/SKILL.md) whenever the building will happen
   in a fresh session, which is the normal case for anything larger than a
   single ticket. The document it writes is the next agent's entire brief, so
   it is held to this repository's rules rather than the skill's defaults — see
   [Handoffs](#handoffs).
4. Move every ticket the work covers — the spec, the parent issue for the pull
   request, and the sub-issue for the commit — to `status:in-progress` before
   the first test, the way
   [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) describes.
   Then build with [implement](.agents/skills/implement/SKILL.md), which drives
   red-green-refactor through two TDD skills used in tandem, both read before
   the first test.
   [test-driven-development](.agents/skills/test-driven-development/SKILL.md)
   is the discipline — no production code without a failing test, and every
   test watched failing for the right reason before the code that passes it is
   written. [tdd](.agents/skills/tdd/SKILL.md) is what makes those tests worth
   keeping — seams confirmed with the user before a test is written, behavior
   asserted through public interfaces, and the tautological,
   implementation-coupled, and horizontally-sliced anti-patterns named. Where
   they disagree, `test-driven-development` owns the loop's strictness and
   `tdd` owns refactoring: it belongs to step 5's review rather than to the
   cycle. Its `npm test` invocations are `nx run <project>:vitest:<kind>` here
   — see [Testing](#testing). For a multi-task ticket set, orchestrate with
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
   — one fresh subagent per task — and use
   [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)
   when tasks are genuinely independent. Debug regressions with
   [systematic-debugging](.agents/skills/systematic-debugging/SKILL.md) and
   [diagnosing-bugs](.agents/skills/diagnosing-bugs/SKILL.md) in tandem, split
   the way the TDD pair is: systematic-debugging is the gate — no fix proposed
   until its root-cause phase is finished, however obvious the fix looks — and
   diagnosing-bugs is the method that gets you a root cause.
5. Ask for the review with
   [requesting-code-review](.agents/skills/requesting-code-review/SKILL.md) —
   a fresh subagent handed the base and head commits and what the work was
   meant to do, never this session's history — review with
   [code-review](.agents/skills/code-review/SKILL.md), and apply incoming
   feedback through
   [receiving-code-review](.agents/skills/receiving-code-review/SKILL.md)
   rather than agreeing on sight.
6. Finish with [validate-code](.agents/skills/validate-code/SKILL.md), gated by
   [verification-before-completion](.agents/skills/verification-before-completion/SKILL.md):
   never claim done without the command output that proves it.
7. Integrate with
   [finishing-a-development-branch](.agents/skills/finishing-a-development-branch/SKILL.md),
   which supplies the decision — merge, open a pull request, or leave the
   branch — and nothing else: this repository's own skills own the mechanics,
   so run [submit-changes](.agents/skills/submit-changes/SKILL.md) and the
   [commit-code](.agents/skills/commit-code/SKILL.md) and
   [create-pull-request](.agents/skills/create-pull-request/SKILL.md) skills it
   drives rather than that skill's git commands, and read its `npm test` step
   as `nx affected --target=vitest --base=main`. Decline its worktree cleanup
   when the harness created the worktree: the session is running inside it.

The codebase-native skills still own this repository's mechanics — branch
names, commits, pull requests, Nx targets, and validation. Prefer them over any
general-purpose equivalent, and see the [Skills](#skills) list for the full set.

### Handoffs

A planning session ends where an implementation session begins, and that seam
is where the workflow above is most easily lost: the next agent starts from a
document instead of from this conversation, and whatever the document does not
say, it invents. The handoff is also what makes an uninterrupted implementation
run legitimate — step 1's approval gate was passed in the planning session, and
this document is the next session's only record of that. Five repository rules
override the skill's generic defaults:

- **It goes on the spec ticket, not in a temporary directory.** The skill saves
  to the operating system's temporary directory, which the next session cannot
  be pointed at and the next reboot may empty. Post it as a comment on the spec
  issue instead, where
  [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) already keeps
  the spec and its tickets — the next session is then handed one link and reads
  the plan, the tickets, and the brief in one place.
- **It prescribes the workflow skills rather than suggesting them.** The skill
  asks for a "suggested skills" section, and a list of skills an agent may find
  useful is a list an agent skips — which is how the workflow above silently
  stops being used. Write a numbered "How to run this" section instead, naming
  each skill in the order it is called:
  [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) for the
  isolated workspace,
  [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
  to orchestrate the ticket set, then
  [implement](.agents/skills/implement/SKILL.md) and
  [tdd](.agents/skills/tdd/SKILL.md) inside each dispatched task, and steps 5
  through 7 above to finish each one.
- **It answers the two questions those skills otherwise stop and ask.**
  `subagent-driven-development` keys its workspace and its ledger off a **plan
  file path**, so a plan that lives on the issue tracker has to be exported to
  a local scratch file first — say so, or the session halts on its first step.
  And `tdd` will not write a test at a seam the user has not confirmed, so
  point it at the spec's Testing Decisions and say to treat those as the
  confirmation — otherwise a session told to run without interruption
  interrupts before its first test.
- **It says how the work is cut into pull requests.** One ticket per pull
  request, stacked with [gh-stack](.agents/skills/gh-stack/SKILL.md) so each
  one reviews as the increment it is rather than as a diff carrying its
  predecessors. Name each branch — or at least the type and scope every branch
  must take — rather than leaving the next session to derive them: a squashed
  title is the only thing semantic-release ever sees, so the ticket split the
  planning session already made is what decides
  [Release Significance](#release-significance).
- **It assigns a model and a thinking level per role.** Orchestrating a ticket
  set, implementing one ticket, and reviewing a diff are different problems and
  should not draw the same reasoning budget; the harness can set the model per
  subagent, so say what each role gets rather than leaving one setting to serve
  everything. No table of model names lives here on purpose — the right
  assignment moves with whichever models exist, and names written down in this
  file would be stale within a release or two.

## Projects

Every project lives in `applications/`, `packages/`, or `tools/`. Read the
current set rather than a list kept here — a hand-maintained list drifts, and
nothing would gate this one:

```bash
nx show projects
```

[`README.md`](README.md) carries the annotated table, one row per project, and
`nx run codebase:check-readme-projects` fails when it misses one.

**A commit scope is not a project.** The scope vocabulary is the closed set in
[Conventional Naming](#conventional-naming), and it collapses each toolchain to
a single name: every `callidescope-*`, `codependix-*`, `codometer-*`, and
`conformetry-*` package commits under `callidescope`, `codependix`, `codometer`,
and `conformetry` respectively. Deriving a scope from a directory name is how an
invented scope fails validation.

## IC-Suite

Four in-house toolchains measure this workspace and gate what they measure.
They share one shape, so learning one predicts the others: a command-line host,
a configuration package that resolves its rules, agent skills for the three
moments of using it — run it, tell it what to enforce, act on what it said —
and an examples package that demonstrates its behavior.

| Toolchain | Measures | Branch gate | Skills |
| --------- | -------- | ----------- | ------ |
| [callidescope](packages/callidescope-cli/README.md) | Call stacks through injected dependencies: depth, breadth, module spread | each project's `gate` | [trace](packages/callidescope-agents/skills/callidescope-trace/SKILL.md) · [configure](packages/callidescope-agents/skills/callidescope-configure/SKILL.md) · [triage](packages/callidescope-agents/skills/callidescope-triage/SKILL.md) |
| [codependix](packages/codependix-cli/README.md) | Dependency graphs: Nx neighborhood, NestJS modules, file-level imports | `codebase:codependix:check` | [export](packages/codependix-agents/skills/codependix-export/SKILL.md) · [configure](packages/codependix-agents/skills/codependix-configure/SKILL.md) · [triage](packages/codependix-agents/skills/codependix-triage/SKILL.md) · [navigate](packages/codependix-agents/skills/codependix-navigate/SKILL.md) |
| [codometer](packages/codometer-cli/README.md) | Code statistics: languages, conventions, comment blocks, compressed size | `codebase:codometer` and each project's `codometer` | [measure](packages/codometer-agents/skills/codometer-measure/SKILL.md) · [configure](packages/codometer-agents/skills/codometer-configure/SKILL.md) · [triage](packages/codometer-agents/skills/codometer-triage/SKILL.md) |
| conformetry | Generated code against the template that describes its shape | `conformetry-validate` | [generate](.agents/skills/conformetry-generate/SKILL.md) · [configure](.agents/skills/conformetry-configure/SKILL.md) · [validate](.agents/skills/conformetry-validate/SKILL.md) |

Every configuration field is documented in the toolchain's own configuration
package README; the skills above carry the flags and the triage paths.

### One rule for all four

- **Skills are authored in the `*-agents` packages** and installed back from
  `skills-lock.json` like any other vendored skill, so what this repository
  loads is exactly what another workspace gets. Edit the package, never the
  installed copy under `.agents/skills/` — `skills update` overwrites it.
- **Two things are gated, and they sit on opposite sides of a pull request.** A
  rule check (`--check limits`, `--check boundaries`, `--check breadth`) gates
  the branch, because a rule a change broke is what that change should fix; it
  reads no output destination and writes nothing, which is what makes it safe
  there. **Report freshness (`--check reports`) is gated by nothing here, on
  purpose** — a call graph or a dependency graph moves with the workspace, so
  freshness would fail every branch for being behind `main` rather than for
  anything it did. `write` publishes reports and README blocks on `main`.
- **Never raise a limit, loosen a rule, or hand-edit generated output to make a
  check pass.** Triage the finding: each toolchain's `triage` skill is the entry
  point, and every limit in the workspace was set from a measured run rather
  than chosen.
- **When a behavior needs to be seen rather than described, run it.** Each
  toolchain has an examples package whose `AGENTS.md` maps "the tool said X" to
  the example that reproduces X in about a second. **Several examples are
  deliberately broken — a breaching limit, a `tsconfig.json` the compiler
  cannot parse, a
  stack eight frames deep — and "fixing" one deletes the only place that
  behavior is demonstrated. Do not repair them.**
  [`docs/examples-package-standard.md`](docs/examples-package-standard.md)
  holds the shape all four share.

### Conformetry

Generators scaffold projects, modules, and components from **templates**;
conformance then measures the generated **instances** back against those
templates. The two are one workflow: code hand-written in a shape a template
already describes starts life failing conformance. **Generate rather than
hand-craft**, then check conformance — reach for a generator whenever creating a
new application, package, module, or component.

```bash
nx g conformetry:<generator> [options]
pnpm nx run-many --targets=conformetry-validate
```

The generator namespace is emitted from `configuration/conformetry.config.ts`
into the gitignored `.conformetry/` directory on `pnpm install`, so it is never
committed. If Nx reports it is not installed, run `pnpm install` again. No
project is called `conformetry` — the name means the generator namespace and
nothing else, and the command-line host is `conformetry-cli`.

This repository's generators, kept in step with the configuration by
`nx run synchronization:conformetry-generators`. `conformetry templates` prints
the same thing for any workspace:

<!-- conformetry-generators-table start -->
| Template | Description |
| -------- | ----------- |
| `jupyter-notebook-application` | A standalone Python application template with a Jupyter notebook entry point, pytest/pyright/ruff tooling, and a shared uv workspace venv |
| `nestjs-command-project` | A standalone NestJS CLI application template built on nest-commander, for a new command-line tool in applications/, packages/, or tools/ |
| `nestjs-graphql-application` | A standalone NestJS GraphQL API application template, for a new backend service exposing a GraphQL schema over HTTP |
| `nestjs-service-project` | A standalone NestJS library package template for internal workspace code shared across projects, with no CLI entry point or HTTP server |
| `nestjs-command-module` | A nest-commander command module template — command, module, constants, types, and unit test — for an existing NestJS command-line project |
| `nestjs-dataloader-module` | A GraphQL dataloader module template — dataloader, module, types, and unit test — for batching lookups inside an existing NestJS project |
| `nestjs-graphql-module` | A GraphQL module template — resolver, entities, args/input types, factories, constants, and unit test — for an existing NestJS project |
| `nestjs-service-file` | A service and unit test file template for an existing NestJS module, without the surrounding module files |
| `nestjs-service-module` | A plain service module template — module, service, constants, types, and unit test — for an existing NestJS project |
| `react-component` | A React component and test file template for an existing React project |
<!-- conformetry-generators-table end -->

### Callidescope

**Depth and breadth are gated per project**, by the `gate` target
`@callidescope/nx` infers onto every project holding a `tsconfig.json`. Each
gate traces its project together with that project's Nx dependencies and fails
on the findings that project **owns**, so a dependency's breach is that
dependency's own gate's business.

Most projects declare their own limits in a `callidescope.config.ts` at their
own root, and each writes only what it overrides — **inheritance is per limit**,
so `configuration/callidescope.config.ts` supplies whatever a project does not
name. Breadth is declared only where every callable at the project's widest
number is a closed enumeration — a switch over a union, a registry, a set of
formats — so a project whose widest callable is an ordinary sequential
orchestrator gates depth and nothing else. Read the set as a command rather than
a table, because no one file holds it:

```bash
nx run callidescope-cli:start -- limits --config configuration/callidescope.config.ts
```

A handful of traced roots carry no gate, and each one's `project.json` target
description records why — `affirmations` has no TypeScript program,
`callidescope-examples` exists to breach, `configuration/` and the fixture roots
are traced but are not Nx projects, and the workspace root is dropped by
`configuration/.callidescopeignore`. They are still traced and published by
`write` on `main`, so a regression in one still lands in the report; they only
stop failing a pull request.

### Codometer

Beyond the size limits in [Size Limits](#size-limits), codometer gates **comment
block length** — `comments: { maximumWords: 128 }` in
[`configuration/codometer.config.ts`](configuration/codometer.config.ts),
reaching every language it measures comments in. A block is the run of comment
lines a reader takes as one thought: a blank line ends one, a comment trailing a
value is never part of the block above it, and a `#!` shebang is never a comment
at all. It budgets **what a comment says, not how wide it is** — every linter
here already holds a line to 80 columns. When a block breaches, condense it or
move the detail into documentation. Shell is deliberately looser, because
`scripts/shell/` holds command references whose whole body is one comment block
documenting flags.

### Codependix

`--check boundaries` states the rules `@nx/enforce-module-boundaries`
structurally cannot: an implicit Nx edge with no import to flag, a NestJS module
edge the container resolved rather than a file declared, and a rule about the
shape of the graph rather than about one edge. The two do not overlap and
neither replaces the other — ESLint reports at the import site with a line
number, which a graph-level report cannot match. See
[Nx Boundaries](#nx-boundaries) and
[`packages/codependix-boundaries`](packages/codependix-boundaries).

It is deliberately **not** in `configuration/lint-staged.config.ts`: a
`--check boundaries` run builds a `ts.Program` per project and takes about
twenty seconds over the whole workspace, which is not a pre-commit hook anybody
keeps.

## Work Scope

- When coding or refactoring, focus on one project at a time, or for sufficiently large requests only one module/folder at a time.
- If a request spans multiple projects or scopes, complete the first project end-to-end before starting the next one.
- If the work is truly independent across projects, split it into separate subagents or separate passes so each agent stays project-scoped.
- Avoid mixing unrelated project changes in one context unless the task is explicitly orchestrating them.
- This also keeps a pull request's commits at one release significance: see [Release Significance](#release-significance) for why a branch that stays within one project or module rarely accumulates a commit more significant than the type its title was going to use.

## Code Quality

**Every coding agent MUST run the [validate-code skill](.agents/skills/validate-code/SKILL.md) before declaring any implementation task complete.** This is non-negotiable.

```bash
# Auto-fix all format, lint, and unused-code issues
pnpm exec nx affected --target=lint-codebase --configuration=write --base=main

# Verify no issues remain — all checks must pass
pnpm exec nx affected --target=lint-codebase --configuration=check --base=main
```

For new/untracked files not yet picked up by `nx affected`:

```bash
pnpm exec nx run <project>:lint-codebase --configuration=write
pnpm exec nx run <project>:lint-codebase --configuration=check
```

**Do not commit until both commands pass cleanly.** If they fail, use the [triage-submission skill](.agents/skills/triage-submission/SKILL.md) to diagnose and fix the errors.

**TypeScript type coverage rule:** For any touched TypeScript project that defines a `type-coverage` target, run both `typecheck` and `type-coverage` before declaring implementation complete. Passing `typecheck` alone is not sufficient when `type-coverage` is available.

**Never silence errors with disable comments or configuration changes.** Do not use `// eslint-disable`, `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `nocheck`, or similar suppression comments to work around lint or type errors. Do not loosen TypeScript `compilerOptions` (e.g. enabling `skipLibCheck`, disabling `strict` flags) or add ESLint `ignores`/`rules` overrides to suppress specific errors. Instead, triage the root cause and fix the code. Suppression is only permitted when the user explicitly requests it.

See the [validate-code skill](.agents/skills/validate-code/SKILL.md) for the full validation workflow and per-tool fix guidance.

### Task Cache Inputs

`nx.json`'s `shared-globals` reaches almost every lint target, directly or
through `default`, so whatever it names is an input to nearly every task in the
workspace. It holds `configuration/tsconfig.json` and nothing else, and that is
load-bearing rather than incidental.

**Never add a high-churn file to `shared-globals`.** It once named
`pnpm-lock.yaml`, `nx.json`, and `.github/workflows/*.yml`, and because a pull
request is built from the merge commit, every branch inherited their churn — so
every task in the workspace re-hashed on essentially every run and 🧑‍💻 Lint
Codebase never recorded a single cache hit. Nothing failed; the work was simply
repeated. **Nothing checks for this** — a run whose cache never hits is still a
green run, so the only signal is the duration, and re-adding one glob here
silently undoes the whole arrangement. See
[ADR 0007](docs/adr/0007-state-the-real-dependency-in-task-cache-inputs.md).

State the real dependency instead:

- **Tool versions** belong in a per-target `{"externalDependencies": [...]}`
  entry, which hashes the resolved versions of exactly those packages. This is
  what `typecheck` has always done with `typescript`; every lint target now
  names its own tools the same way. A tool added to a target's command must be
  added there too, or an upgrade of it will replay a stale cached result.
- **Python tools** need no entry: their targets already declare
  `{workspaceRoot}/pyproject.toml` and `{workspaceRoot}/uv.lock`.
- **Whole-lockfile sensitivity**, where a target genuinely depends on every
  dependency rather than a named few, is the `dependency-versions` namedInput.
  `build` uses it, because a bundle really does change when any dependency
  does. No lint target should need it.

**A task's own artifact must never be one of its inputs**, or it rewrites the
hash it was just cached under and can never hit its own cache. `.eslintcache/`
is excluded from `default` and from the `eslint` inputs for that reason, and a
project's `codometer-report.json` is subtracted from its own.

### Quality Tools

| Tool            | Description                                           | Config                                                          | Docs                                                                 |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `oxfmt`         | Formats TS/JS/JSON/MD files                           | `configuration/oxfmt.config.ts`                                 | [docs](https://oxc.rs/docs/guide/usage/formatter.html)               |
| `sqlfluff`      | Formats and lints SQL files                           | root `pyproject.toml`                                           | [docs](https://docs.sqlfluff.com/)                                   |
| `prettier`      | Supplementary formatter for manual or non-default use | `configuration/prettier.config.ts`                              | [docs](https://prettier.io/docs/)                                    |
| `eslint`        | Lints TS/JS and markdown with workspace rules         | project `eslint.config.ts`                                      | [docs](https://eslint.org/docs/latest/)                              |
| `oxlint`        | Fast TS/JS linting for workspace files                | `configuration/oxlint.config.ts`                                | [docs](https://oxc.rs/docs/guide/usage/linter.html)                  |
| `ruff`          | Formats and lints Python files                        | root `pyproject.toml`                                           | [docs](https://docs.astral.sh/ruff/)                                 |
| `tsc`           | Type-checks TypeScript                                | project `tsconfig.json`                                         | [docs](https://www.typescriptlang.org/docs/)                         |
| `type-coverage` | Enforces TypeScript type-coverage gates               | root `tsconfig.json`                                            | [docs](https://github.com/plantain-00/type-coverage)                 |
| `pyright`       | Performs static Python type checking                  | root `pyproject.toml`                                           | [docs](https://github.com/microsoft/pyright)                         |
| `ty`            | Performs additional Python type checking              | root `pyproject.toml`                                           | [docs](https://docs.astral.sh/ty/)                                   |
| `knip`          | Finds unused TS/JS files, exports, and dependencies   | `configuration/knip.config.ts`                                  | [docs](https://knip.dev/)                                            |
| `vulture`       | Finds unused Python code                              | `configuration/vulture_whitelist.py`                            | [docs](https://github.com/jendrikseipp/vulture)                      |
| `fallow`        | Analyzes dead code, duplication, and code health      | `configuration/fallow.config.jsonc`                             | [docs](https://docs.fallow.tools/)                                   |
| `jscpd`         | Detects duplicated code and copy-paste patterns       | `configuration/jscpd.config.json`                               | [docs](https://jscpd.dev/)                                           |
| `callidescope`  | Traces call stacks and flags ones that are too deep   | `configuration/callidescope.config.ts`, plus each project's own | [docs](packages/callidescope-cli/README.md), [skills](#callidescope) |
| `codependix`    | Exports dependency graphs and gates rules over them   | `configuration/codependix.config.ts`                            | [docs](packages/codependix-cli/README.md), [skills](#codependix)     |
| `cspell`        | Checks spelling across code and documentation         | `configuration/cspell.config.yaml`                              | [docs](https://cspell.org/)                                          |
| `markdownlint`  | Lints markdown files                                  | `configuration/.markdownlint-cli2.jsonc`                        | [docs](https://github.com/DavidAnson/markdownlint-cli2)              |
| `yamllint`      | Lints YAML files                                      | `configuration/yamllint.yaml`                                   | [docs](https://yamllint.readthedocs.io/)                             |

## Git Workflow

**Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.

**Do not run signing-check scripts manually in normal commit/push flows.** Husky already runs `scripts/git/check-commit-signing-configuration.sh` in pre-commit and `scripts/git/check-push-commit-signatures.sh` in pre-push.

**Never suppress lint or type errors** with disable comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `nocheck`) or by loosening configuration — triage and fix the code instead. Suppression is only permitted when the user explicitly requests it.

### Git Worktrees

Use [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) to create
or verify an isolated workspace. It prefers this harness's native worktree tool
over raw `git worktree add`, and falls back to `git worktree` when none exists.

Two repository rules override the skill's generic defaults:

- **The branch name is not free-form.** Derive or reuse a name matching
  `<type>/<scope>-<description>` from the [Conventional Naming](#conventional-naming)
  tables, and validate it with `pnpm exec validate-branch-name -t "<branch-name>"`
  before creating anything. See [checkout-branch](.agents/skills/checkout-branch/SKILL.md)
  for deriving one. The pre-push hook and the Validate Conventions workflow both
  reject a non-compliant branch, so an unvalidated worktree wastes the work.
- **If the branch already exists locally, attach a worktree to it** rather than
  creating a second branch.
- **Never run `git submodule update --init` for `applications/JimmyPaolini`.**
  `git worktree add` never checks out submodules — the git manual's own
  `WORKTREE` documentation calls submodule support "incomplete" and advises
  against multiple checkouts of a superproject — but this repository's
  submodule is deliberately left uninitialized everywhere, not only in
  worktrees: its real content is never checked out locally or in CI, and
  `package.json`'s `sherif.ignorePackage` already exempts it from workspace
  checks. A `git submodule status` `-` prefix here is expected, not broken.
  If `pnpm install` or `lint-codebase --write` rewrites the
  `applications/JimmyPaolini` entry out of `pnpm-lock.yaml`, that is the
  known spurious diff from an inconsistently-present placeholder
  `package.json` across checkouts — revert the lockfile rather than
  reconciling it, the same as any other worktree-only lockfile drift.

### Branch Names

Format: `<type>/<scope>-<description>` — all three parts required.

- **Type and scope** must be exact values from the [Conventional Naming](#conventional-naming) tables below. An invented scope fails validation even when the branch name reads well.
- **Description** is kebab-case matching `[a-z0-9-]+` — no uppercase, underscores, dots, or extra slashes.
- Validate before pushing: `pnpm exec validate-branch-name -t "<branch-name>"`. The pre-push hook and the Validate Conventions workflow both run it.

Examples: `feat/lexico-user-auth`, `fix/caelundas-timezone-bug`, `docs/codebase-architecture`

Only `main` is exempt from the convention. Automated prefixes are also accepted: `copilot/*`, `dependabot/*`, `jimmypaolini/copilot/*`, `renovate/*`.

### Commit Messages

Format: `<type>(<scope>): <gitmoji> <subject>` — single line only, max 128 chars.

- **Type and scope** must come from the [Conventional Naming](#conventional-naming) tables, both lowercase
- **Gitmoji required** as the first token of the subject line
- Subject: lowercase, present-imperative mood (`add`, not `added` or `adds`), no trailing period, never empty
- **Body and footer are forbidden**, with one exception: lines that are exactly `Co-authored-by: ...` trailers, in any casing — git and GitHub treat trailer keys case-insensitively, and the agents that write this one disagree on it. All other context goes in the subject or the PR description
- Never list multiple changes — summarize at a higher level or split into separate commits

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` · 🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

Examples:

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
chore(dependencies): ⬆️ upgrade react to v19
docs(codebase): 📝 update contributing guide
```

### Release Significance

This repository squash-merges with `PR_TITLE`, so **the PR title is the only thing semantic-release ever sees** — every individual commit on the branch is discarded the moment it is squashed. `release.config.cjs`'s `releaseRules` map each type to a bump level: `feat` is `minor`; `fix`, `perf`, `refactor`, `build`, and `revert` are `patch`; `docs`, `style`, `test`, `ci`, and `chore` are `none`; a breaking change (`!` after the scope, or a `BREAKING CHANGE:` footer) is `major` regardless of type.

The [pull-request-release-significance](tools/validation/src/modules/pull-request-release-significance/pull-request-release-significance.command.ts) check reads the branch's own commits and fails the pull request when the title's type is **less** release-significant than the most significant commit reachable from the branch, or when a commit uses a scope the title's scopes do not name. A title that understates its branch is not caught by anything else — `📝 Validate Pull Request Title` only checks that the title itself is well-formed.

**Practical effect for an agent:** pick the type and scope for the _branch as a whole_ before committing, and keep every commit on it at or below that significance.

- Committing a `feat` while the branch (and its eventual title) is `chore` or `ci` fails this check — either retitle the pull request as `feat`, or move that commit to its own branch.
- A branch that mixes `feat` and `fix` work is still fine — title it `feat`, since `feat` outranks `fix`. Mixing types is only a problem when a later commit is _more_ significant than the type already chosen.
- This is also why [Work Scope](#work-scope) asks for one project or module per pull request: the fewer concerns a branch carries, the less likely it accumulates a commit that outranks the title picked at the start.

### Pull Requests

PR title follows the same format as commit messages — `<type>(<scope>): <gitmoji> <subject>` — and is checked by the same commitlint configuration, so every commit-message rule above applies to it.

The PR description must contain all four section headings verbatim. Validate Conventions greps for each one and fails the PR when any is missing.

PR description template:

```markdown
## 🌰 Summary

<!-- Brief description of what this PR does (1-2 sentences) -->

## 📝 Details

- <!-- List of specific changes made -->

## 🧪 Testing

1. <!-- How to manually verify these changes work correctly -->

## 🔗 Related

- <!-- Link any relevant documentation or related resources like internal documentation, GitHub issues/pull requests -->
```

Labels and assignees must also agree with the title: exactly one `type:*` label matching the title's type, exactly the `scope:*` labels named by the title's scopes with no extras, at least one assignee, and exactly one `source:*` label (`source:agent` or `source:human`) declaring who opened the pull request — this one is not derived from the title. The `do-not-merge` label blocks the pull request while it is present.

The 🧑‍⚖️ Validate Conventions workflow creates any label missing from this vocabulary on `opened`/`reopened`, so a freshly opened pull request already has the labels it needs before the check runs. The vocabulary itself comes from `configuration/conventional.config.cjs`, never hard-coded elsewhere.

### Conventional Naming

#### Types

<!-- types-start -->

| Type | Description |
| ---- | ----------- |
| `feat` | A new feature or capability that adds value for users |
| `fix` | A bug fix that addresses a specific issue or problem |
| `docs` | Documentation, AGENTS.md, SKILL.md, README, and planning files |
| `test` | Adding or correcting unit, integration, or end-to-end tests |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `style` | Formatting, whitespace, or code structure changes with no semantic effect |
| `perf` | A code change that improves performance (caching, query optimization, etc.) |
| `chore` | Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.) |
| `ci` | GitHub Actions workflows, composite actions, and CI/CD scripts |
| `build` | Build system, Vite/Docker/Helm config, or external dependency integration |
| `revert` | Reverts a previous commit |

<!-- types-end -->

#### Scopes

<!-- scopes-start -->

| Scope | Description |
| ----- | ----------- |
| `affirmations` | Python Jupyter notebook application for LangGraph affirmation generation |
| `caelundas` | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris) |
| `configuration` | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.) |
| `conformetry` | Code generator templates and validation tests for generated instances |
| `dependencies` | Dependency version changes (upgrades, additions, removals via pnpm) |
| `deps` | Dependency version changes (upgrades, additions, removals via pnpm) |
| `deployments` | GitHub Actions workflows and CI/CD pipeline configuration |
| `documentation` | Markdown docs, skills, planning files, and AGENTS.md files |
| `infrastructure` | Helm charts, Terraform configs, and Kubernetes resources |
| `JimmyPaolini` | Static GitHub profile README project (markdown and assets) |
| `lexico` | TanStack Start SSR Latin dictionary web app with Supabase backend |
| `lexico-components` | Shared React/shadcn component library |
| `lexico-entities` | Shared TypeORM entities and GraphQL types |
| `lexico-ingestion` | Data ingestion scripts for Lexico |
| `meanderaw` | Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads |
| `sempientor` | Lexical gap discovery CLI that surveys English for morphological, phonotactic, and semantic gaps and coins words to fill them |
| `callidescope` | Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph |
| `codependix` | Dependency graph export CLI, the configuration package it reads, and the package that judges the graphs against declared rules |
| `codometer` | Code statistics measurement CLI, the configuration package it reads, and the packages that diff and render its pull request change report |
| `no-release` | Escape hatch: suppress semantic-release for any commit type |
| `release` | Version bumps and release commits generated by semantic-release |
| `reporting` | Pull request change report generation and the packages that diff and render it |
| `scripts` | Shell and TypeScript scripts in scripts/ (sync, setup, utilities) |
| `testing` | Vitest configuration, shared test utilities, and coverage setup |
| `synchronization` | Synchronization application and commands for automating workflows |
| `validation` | Validation CLI and the checks it runs, such as pull request metadata |

<!-- scopes-end -->

## Key Conventions

### Abbreviations

<!-- The rule below has to spell out the abbreviations it bans. cspell:ignore req, res -->

- **No Acronyms or Abbreviations**: Never use acronyms or abbreviations for variable names, function names, parameters, etc.
- Use explicit and unabbreviated names (e.g. `request` instead of `req`, `response` instead of `res`, `index` instead of `i`, `error` instead of `e`).
- **Exceptions**: Abbreviations are acceptable when avoiding language reserved word collisions (e.g., using `args` instead of `arguments`, `str` instead of `string`).
- Abbreviation rules are enforced by ESLint (`unicorn/prevent-abbreviations`) for TypeScript and JavaScript identifiers, and by CSpell (`flagWords`) for every other file type — Markdown, Python, SQL, YAML, JSON — plus comments and string literals.
- CSpell sees raw text, so external vocabulary that spells an abbreviation (Tailwind classes, JSDoc tags, TypeORM identifiers, POSIX paths) is carved out by a named pattern in `configuration/cspell.config.yaml`. For a one-off, add a `cspell:ignore <word>` comment to the file with a note explaining where the name comes from.

### File Naming

- **Kebab-case**: All file names must be lowercase with hyphens separating words (e.g., `my-file-name.ts`).
- **Always** prefer service files `*.service.ts` over `*.ts` or `*.utilities.ts` for NestJS service classes.
- Only use utilities files `*.utilities.ts` in cases where a top level function is needed, and only use them to invoke service class methods or to compose multiple service class methods together. Never use utilities files to implement business logic directly.

### Project Structure

Folder and file placement is a lint error, not a style preference. It is enforced by `eslint-plugin-project-structure` from `configuration/codebase-structure.json`.

<!-- The folder-name rule below has to spell out the names it bans. cspell:ignore ctx -->

- **Every folder is kebab-case** (`^[a-z0-9-]+$`). The abbreviated names `dir`, `err`, `req`, `res`, `utils`, `ctx`, and `app` are rejected outright as folder names.
- **Projects live in `applications/`, `packages/`, or `tools/`.** Adding a new file or folder at the workspace root requires adding it to `configuration/codebase-structure.json` in the same change, or lint fails.
- **Project subfolders are a fixed set**: `src/`, `testing/`, `scripts/`, `examples/`, `skills/`, `data/`, `coverage/`, `output/`, `public/`, `.vscode/`. `applications/`, `packages/`, and `tools/` themselves hold projects and nothing else — a file directly in one is a lint error.
- **`src/` subfolders are a fixed set**: `modules/`, `components/`, `lib/`, `routes/`, `hooks/`, `styles/`, `assets/`, `executors/`, `generators/`, and `python/` — the last is allowed at any `src/` root, though only `conformetry-languages` has one, for the Python bridge it ships inside a TypeScript package.
- **A `src/` root holds entry points and nothing else.** A file sitting directly in `src/` must be named `constants`, `index`, `main`, `repl`, or `router`, or be `main.module` or `main.utilities`, optionally with `.unit.test`, `.integration.test`, or `.end-to-end.test` before the extension. A `src/plugin.ts` entrypoint is forbidden. Anything else — a helper, a generated artifact, a `scratch.ts`, a stray `.json` — is a lint error: move it into the module that owns it under `src/modules/`, or into `src/lib/`.
- **The Python entries are declared, not enforced.** Snake_case `*.py` and `*.ipynb` files and the `py.typed` marker are accepted at _any_ project's `src/` root, not only `affirmations`', and the same goes for the `python/` subfolder. Neither entry gates anything: ESLint lints no `.py` file in this workspace, so the rule never fires on one. They are there so the config describes the tree truthfully — and so the day a `.ts` lands beside them, it is judged rather than rejected out of hand.
- **Files inside `src/modules/<module-name>/` must be `<kebab-name>.<suffix>.<extension>`** where suffix is one of `command`, `constants`, `module`, `service`, `types`, or `utilities`, optionally with `.unit.test`, `.integration.test`, or `.end-to-end.test` before the extension. A bare `<name>.ts` inside a module folder is invalid — pick a suffix. There is deliberately no `errors` suffix: an error class lives in the `*.constants.ts` file beside the code that throws it, which the **Constant File Shape** rule permits by whitelisting `class X extends Error`.
- **A file a framework insists on is relocated and configured, never exempted.** lexico's TanStack client entry and generated route tree both sit in `src/lib/` and are named in `vite.config.mts` as `client.entry` and `router.generatedRouteTree` — both resolved relative to `srcDirectory`, so a leading `src/` there writes to `src/src/`. The client entry is kept rather than deleted, even though TanStack supplies an identical virtual one, because it holds the workspace's only static `react-dom/client` import and without it every dependency check strips `react-dom` from the manifest and the catalog. `src/router.tsx` is the one that cannot move: TanStack resolves that entry with `required: true`. `@conformetry/nx`'s postinstall shim is `src/main.mjs` for the same reason in reverse — a `bin` has to stay a TypeScript-source entry point, so it takes an entry-point name and keeps its work in `modules/generator/`.
- **A module folder is a conformance instance**, so `src/modules/<name>/` is not a dumping ground for a single relocated file: a folder holding only a `*.constants.ts` matches three module templates equally well and fails as ambiguous, and one holding only a `*.utilities.ts` fails as unmatched. Put a relocated helper in the module that already owns its concern.
- **This file is deliberately not split by project type.** It matches paths and has no access to Nx tags, so a per-type rule would mean enumerating every project by name — a second source of truth that drifts from the tags the moment a project is added. Per-type shape is conformetry's job and is already enforced: `configuration/conformetry.config.ts` selects instances by tag (`{ patterns: ["."], tags: ["framework:nest-commander"] }`), and `conformetry-validate` gates them. The split is that **this file is the universal path and naming law** — kebab-case folders, module file suffixes, entry-point names — and **conformetry owns what a project of a given type must contain**.
- Scaffold with a conformetry generator rather than hand-building the tree; the generators already produce this layout.

Structure is judged in **one** ESLint pass, and it reaches markdown and HTML
paths as well as code — including generated pages like `openwiki/`, which are
excluded from the markdown _content_ rules but still have their paths judged.
Reach comes from the root `eslint` target's trailing `**/*.md`, a workspace-wide
glob rather than a list of directories on purpose: an enumerated list only
judges the directories somebody remembered to add. Without this an undeclared
markdown file — or a whole directory of them — passes lint silently. How that
single pass is assembled is
[ADR 0008](docs/adr/0008-judge-structure-in-one-eslint-pass.md).

One trap when changing any of this: **`projectStructure.cache.json` masks edits.** Delete it, and `.eslintcache/` beside it, before testing a change to `configuration/codebase-structure.json` — otherwise the edit appears to have no effect and the test proves nothing.

A second trap when editing `codebase-structure.json` itself: a rule `name` is **not** a plain regex. The plugin rewrites `.` to `\.` before compiling, so dots are written unescaped — a hand-escaped `\.` becomes "literal backslash, any character" and silently stops matching — `*` is a path wildcard rather than a quantifier, and `/\{([^}]+)\}/` is read as a regex-parameter reference, so **no brace may appear in a `name`**. A literal `{{placeholder}}`, as conformetry's template folders use, has to be declared in the top-level `regexParameters` map and referenced by name.

### Project Tags

Every project declares tags in its `project.json`: `type:*`, `language:*`, `framework:*`, `domain:*`, and `name:<project>`.

- **`language:typescript`** — applied to all TypeScript projects (caelundas, lexico, lexico-components, conformetry packages, codebase)
- **`language:python`** — applied to all Python projects (affirmations)

These tags enable conditional sub-target composition in composite targets (`format`, `lint`, `typecheck`, `test`). Python projects override the TS-default composite targets to compose Python sub-targets (`ruff-format`, `ruff-lint`, `pyright`, `pytest`) instead of TS ones.

See the [write-python skill](.agents/skills/write-python/SKILL.md) for the full Python tooling setup.

### Nx Boundaries

`@nx/enforce-module-boundaries` derives import rules from the tags above. Check these before adding a cross-project import — a violation fails `lint`, not `typecheck`, so it surfaces late.

- **`type:application` may only import `type:package` projects.** Applications never import other applications.
- **`type:package` may never import a `type:application`.**
- **`framework:react` may not import `framework:nestjs`.**
- **`domain:lexico` and `domain:caelundas` may never import each other.**
- **Conformetry packages form a strict layered graph** keyed on `name:conformetry-*` tags. `conformetry-core` is the leaf and depends on nothing; every other package declares exactly which siblings it may import. Read the `depConstraints` list in `configuration/eslint.config.ts` before wiring a new dependency between them.

These are import-statement rules, and `codependix --check boundaries` states
the ones they structurally cannot — an implicit Nx edge with no import to
flag, a NestJS module edge the container resolved rather than a file
declared, and a rule about the shape of the graph rather than about one edge.
The two do not overlap and neither replaces the other: ESLint reports at the
import site with a line number, which a graph-level report cannot match. See
[Codependix](#codependix) and
[`packages/codependix-boundaries`](packages/codependix-boundaries).

`@nx/dependency-checks` additionally requires that every imported package is declared in that project's own `package.json`. Add it with `pnpm add --filter <project> <package>` rather than editing `package.json` by hand.

### TypeScript

- **Strict mode enabled**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **Explicit return types** required for all functions
- **Type imports**: Use `import { type Foo } from './types'` (enforced by ESLint)
- **File extensions in imports**: Always include `.js` extensions for relative imports (required by NodeNext resolution)
- **No `any` types**: Use `unknown` or proper typing
- **No non-null assertions**: Never use `!` — use optional chaining or explicit guards
- **Readonly class properties**: Mark all never-mutated class properties as `readonly`
- **Exhaustive switches**: All switch statements on union types must handle every member
- **Async functions**: All functions returning `Promise` must use the `async` keyword
- **No floating promises**: Every Promise must be awaited or explicitly `void`-annotated
- **Consistent returns**: All code paths must uniformly return or not return a value
- **Curly braces**: Always use `{}` for `if`/`else`/`for`/`while` — no single-line forms
- **Early returns**: Remove `else` after a `return` — use guard clauses
- **Object shorthand**: Use `{ name }` instead of `{ name: name }`
- **Template literals**: Use `` `Hello ${name}` `` instead of `"Hello " + name`
- **Max 3 function parameters**: Group extras into an options object (constructors: 12)
- **JSDoc on public APIs**: Public functions, classes, methods, interfaces, types, and enums must have JSDoc — only when it adds non-obvious context
- **Section comments**: Use `// 🎯 Section name` (emoji + capitalized name). Never use dash lines or ASCII art dividers. See [write-comments skill](.agents/skills/write-comments/SKILL.md).
- **NestJS class file shape**: In `*.service.ts`, `*.command.ts`, `*.resolver.ts`, `*.dataloader.ts`, and `*.module.ts`, keep only imports and the class at top level. Move helper types/interfaces to `*.types.ts`, constants to `*.constants.ts`, and never use alias or type re-exports from class files.

See the [write-typescript skill](.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

### Size Limits

Hard ESLint errors on source files. Test files (`*.test.ts`, `testing/**`) and `*.config.*` files are exempt from all of them, so a large test file is fine and a large service file is not.

| Limit                                         | Max                                                |
| --------------------------------------------- | -------------------------------------------------- |
| Lines per file (`max-lines`)                  | 512                                                |
| Lines per function (`max-lines-per-function`) | 128                                                |
| Statements per function (`max-statements`)    | 16                                                 |
| Block nesting depth (`max-depth`)             | 4                                                  |
| Nested callbacks (`max-nested-callbacks`)     | 3                                                  |
| Classes per file (`max-classes-per-file`)     | 1                                                  |
| Function parameters (`better-max-params`)     | 3 — constructors 12, functions in `*.module.ts` 12 |
| Cyclomatic complexity                         | 8 (warning)                                        |
| Nested `describe` blocks                      | 3                                                  |

When a file nears 512 lines, split it along the module file suffixes (`*.types.ts`, `*.constants.ts`, another `*.service.ts`) instead of raising the limit. Never add a disable comment or edit the threshold to make a file fit.

**Comment blocks are capped at 128 words**, declared as
`comments: { maximumWords: 128 }` in
[`configuration/codometer.config.ts`](configuration/codometer.config.ts) and
enforced by codometer rather than by ESLint. It reaches **every language this
tool measures comments in** — Python, shell, TOML, YAML, CSS, HCL, SQL, and
TypeScript/JavaScript's non-JSDoc comments. A block is the run of comment
lines a reader takes as one thought: a blank line ends one, a comment
trailing a value is never part of the block above it, and a `#!` shebang is
never a comment at all. A breach names its file and line.

It budgets **what a comment says, not how wide it is** — every linter here
already holds a line to 80 columns, so a character budget would only restate
it. When a block breaches, condense it or move the detail into documentation.

`maximumCharacters`, `maximumLines`, and `maximumWords` are separate fields
rather than one `maximum` steered by a `unit`, because they are not
alternatives: a block can sit inside a line budget and outside a word one. A
field left out is not measured, and a block is reported once per declared
maximum. Nothing is defaulted to a number — a budget nobody wrote is one nobody
chose.

**Shell is deliberately looser at 256.** `scripts/shell/` holds command
references — grep, netstat — whose whole body is one comment block documenting
flags. That is a manual page, not a sprawling explanation, and condensing it
would delete the thing the file exists for. A language's `comments` block is
merged field by field over the top-level default, which is the same rule a
`documentation` kind's entry follows over `documentation`'s own maxima.

**JSDoc rides the same vocabulary.** `documentation` is the three maxima plus
`kinds`, and its measurements reach the report through the same channel, so a
JSDoc breach and a YAML one render identically and `kind` says which was
measured. This repository sets `comments` and leaves `documentation` unset:
gating this prose is not a reason to start gating every JSDoc comment against
the same budget.

**The budget is per block, never file-wide.** A block is one thought; a file
holding forty well-sized comments is not the same problem as one holding a
single essay, and a file-wide number cannot tell them apart. A `file` block can
be added beside the block maxima to measure a whole file's comments as well —
both are then reported — but this repository declares only the block ones.

Python, YAML, CSS, and TypeScript/JavaScript's non-JSDoc comments all read from
a real parser or tokenizer: `tokenize` inside the Python analysis subprocess,
the `yaml` package's CST, postcss's own parse, and the TypeScript compiler's
scanner. None of the four mistakes a comment marker inside a string literal for
a comment. Shell, TOML, SQL, and HCL use a line scanner instead — SQL's through
the same patterns `SqlService` already strips comments with — which cannot
tell the two apart, exactly as those analyzers' own `comments` counters
already cannot. CSS has only the one comment syntax; HCL is the one language
measured with three, `#`, `//`, and `/* */` alike.

Python's comments therefore depend on `uv` being present, the same way every
other Python metric already does: an unreachable interpreter leaves them
unmeasured rather than miscounted.

**The gate is `codebase:codometer`**, whose `check` runs `--check limits` over
the whole repository — the same shape as `codebase:codependix:check`, and the
shape `codebase:callidescope` used to have before depth gating moved to the
per-project `gate` target. It reads no output destination and writes nothing,
which is what makes it safe on a branch; `write` still publishes the README
badges on main. Report staleness is deliberately not checked, because every
branch would fail it for being behind rather than for anything it did.

It runs through the root project's `make-projects`, so 👷 Make Projects gates it
alongside every project's own `codometer`. It is **not** named in 🧑‍💻 Lint
Codebase the way `codependix` and callidescope's `gate` are, and the two of
those answer the same question two ways: `codependix` exists only on the root
project, so naming it costs one task, while `gate` fans out over every project
and is named there regardless, because it reads source and needs no build.
`codometer` is the one that does both — every project declares it, and each has
to compile before it can be measured — so naming it there would wait on every
build in the workspace. The root run is also the only one that reaches the
workflows under `.github/`, which belong to no project.

### Formatting and Ordering

Formatting is not a judgement call — `lint-codebase --configuration=write` produces the canonical result. Write code in the shape below so the first pass is a no-op.

- **`oxfmt` is the formatter** (not prettier): 80-column print width, 2-space indent, double quotes, semicolons, trailing commas everywhere, LF endings, one JSX attribute per line.
- **Import groups** (`perfectionist/sort-imports`): builtin → external → internal (`@codebase/*`) → parent → sibling → index → type, with exactly one blank line between groups and natural alphabetical order inside each group.
- **Alphabetical order is enforced** for named imports and exports, object literals, object types, interfaces, enums, union and intersection types, switch cases, class members, JSX props, `Map`/`Set` entries, and top-level module declarations. Object literals partition on blank lines and comments, so a blank line starts a fresh sorted run.
- **Cross-project imports use the workspace package name.** `import/no-relative-packages` is an error and `import/no-relative-parent-imports` warns; inside a project, prefer relative paths over path aliases.

### Testing

- **Unit** (`*.unit.test.ts`): Pure functions, mocked I/O, fast (< 100ms)
- **Integration** (`*.integration.test.ts`): Database/API, real I/O, moderate (1-2s)
- **End-to-end** (`*.end-to-end.test.ts`): Full workflows, real services, slow (30-60s)

```bash
nx run <project>:vitest:unit        # Fast feedback
nx run <project>:vitest:integration # Database validation
nx affected --target=vitest         # Only changed projects
```

Test files are named `*.<kind>.test.ts` and live beside the code they cover. Vitest lint rules also require `it` over `test`, `vi` over `vitest`, `describe.each`/`it.each` over hand-rolled loops, and no `.only`, `.skip`, or commented-out tests.

#### Coverage Gates

- **Test coverage: 96%** for branches, functions, lines, and statements (`configuration/vitest.config.ts`, v8 provider). New code needs tests in the same change to keep a project above the line.
- **Type coverage** is per project, declared as `typeCoverage.atLeast` in that project's `package.json` — most packages sit at 100 with `strict: true`. The workspace root is the exception: its 95 is a `--at-least` flag on the root `type-coverage` target in `project.json`, not a manifest field. Run `type-coverage` alongside `typecheck` for any touched project that defines the target; passing `typecheck` alone proves nothing about this gate.
- **Duplication**: not a gate, and no longer measured by anything scheduled. `jscpd` and `fallow-duplicates` both remain as targets to run by hand — `nx run codebase:jscpd` and `nx run codebase:fallow-duplicates` — and both are advisory: the `jscpd` target ends in `|| true`, and nothing in CI invokes either one. The 6% threshold in `configuration/jscpd.config.json` and `configuration/fallow.config.jsonc` is what those manual runs report against, not a bar a pull request has to clear. It sat at 5.9% when the last scheduled caller was removed. Extract a shared helper rather than copying a block because it is the better code, not because a check will stop you.
- **Bundle size** is per project, enforced by the `codometer` target, which builds first and measures the compiled output. Every project carries a `codometer.config.ts` that imports the shared configuration object from `configuration/codometer.config.ts` and spreads it, exactly the way its `eslint.config.ts` spreads the base config beside it. A project gating its compiled size declares that limit and its own build glob in its own file, spreading `compiledJavaScriptTarget` for everything the glob does not say; a project that emits nothing declares no target at all and is gated by nothing. `nx run codometer-cli:start -- configuration --limits` lists every limit the workspace declares and the file each is written in, which is how to read them as a set now that no one table holds them. `lexico` and `lexico-components` additionally override `targets`, because one measures four partitions of its build and the other a library bundle. Breaching one fails 👷 Make Projects, and the `## ⏲️ Codometer` section names the project. That section is rendered by `nx run codometer-cli:start -- changes` from the `codometer-report.json` each project's run leaves behind, diffed by `codometer-changes` and rendered by `codometer-output`.
- Lowering a threshold to make a change pass is not an option — fix the code.

See the [testing-strategy skill](.agents/skills/testing-strategy/SKILL.md) for patterns.

### Build Output and Publishing

**Every build writes into its own project's `dist/`** — `packages/logger/dist`,
`applications/caelundas/dist` — never a top-level `dist/`. That is what lets one
path be correct in both places a manifest is read: the workspace resolves a
package through its own directory, and a published tarball is that same
directory. `dist` is already in `.gitignore` and in the folder-structure rule's
`ignorePatterns`, so nothing has to be taught about it per project.

**`configuration/tsconfig.json` sets `declaration: true`**, so every build emits
`.d.ts` beside its `.js`. Nothing consumed declarations before they existed, so
turning this off again silently removes the types a published package ships.

**A package's `main`, `types`, and `exports` deliberately still point at
TypeScript sources**, and `publishConfig` carries the emitted paths beside them.
pnpm applies those overrides at publish time, so one manifest serves both
readers: the workspace and the Nx plugins load source, while a published
consumer gets `./dist/src/index.js` with declarations beside it. Verify a change
here by packing rather than by reading — run `pnpm pack` in the package and
inspect the tarball's `package.json`.

This split is not stylistic. **`@conformetry/nx` and `@callidescope/nx` are
registered in `nx.json`, and Nx loads them while it builds the project graph —
before any target can run.** Between them they pull in 18 workspace packages,
`@codebase/logger` included. Point any of those at built output and the graph
cannot load until they are built, and they cannot be built without the graph.
Only `publishConfig` escapes that circularity, which is why the real fields stay
on source.

Two further details worth knowing before changing this:

- **pnpm applies only a known set of `publishConfig` fields** — `main`, `types`,
  `exports`, and `bin` among them. `executors`, `generators`, and `nx` are not,
  so the two Nx plugins keep those at the top level and list the JSON files they
  name in `files`.
- **`files` must name `dist`.** With no explicit `files`, packing falls back to
  the ignore files, and `dist` is gitignored — the tarball would ship no build
  output at all.
- **A plugin entry's `resolvePluginService` must stay a static import.** A
  dynamic `import()` escapes the `@swc-node/register` require hook into Node's
  own ESM resolver, which cannot load this workspace's extensionless TypeScript
  sources, and `nx g` then fails with `Cannot find module
  './modules/plugin/plugin-context.utilities'`.
- **Do not try to shrink that plugin closure.** Trimming the entries'
  re-exports, or pointing `main`/`exports` at `dist/`, has been measured and
  buys nothing — and the latter actively breaks `oxfmt` (which reorders
  order-sensitive `exports` conditions), `fallow-dead-code`, and `vitest`. See
  [ADR 0009](docs/adr/0009-keep-manifest-fields-on-typescript-sources.md).

## Agent Context

`.agents/skills/` and this file are the single sources of truth. Every other agent entrypoint is a symlink to them, so edit the source and never the mirror:

| Symlink                           | Target           |
| --------------------------------- | ---------------- |
| `CLAUDE.md`                       | `AGENTS.md`      |
| `.claude/skills`                  | `.agents/skills` |
| `.github/copilot-instructions.md` | `AGENTS.md`      |
| `.github/skills`                  | `.agents/skills` |

### Session Hooks

Four checks run at the start of every agent session and inject their failure as
additional context, so the agent fixes the problem before writing any code. Both
harnesses run the same scripts under `scripts/git/`:

| Script                                  | Checks                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `validate-session-branch-name.sh`       | Branch follows `<type>/<scope>-<description>`; directs the agent to the rename-branch skill           |
| `validate-session-commit-signing.sh`    | `commit.gpgsign`, `user.signingkey`, and a GPG signing smoke test                                     |
| `validate-session-gh-authentication.sh` | The active `gh` account plus Projects access                                                          |
| `validate-session-skills.sh`            | Every skill declared in `skills-lock.json` is present; directs the agent to `codebase:install-skills` |

The skills check is a backstop. Now that every skill is committed, a checkout
holds them all and the check stays silent; it fires only when a skill folder is
genuinely absent — deleted locally, or newly added to `skills-lock.json` by
`skills update` and not yet materialized. It reports rather than restores,
because harnesses register skills when a session starts, so restoring from the
hook would still not expose them to the session already underway.

Each script is registered twice — once per harness — and both registrations point
at the same file:

| Harness        | Registration                                      |
| -------------- | ------------------------------------------------- |
| Claude Code    | `SessionStart` entries in `.claude/settings.json` |
| GitHub Copilot | `sessionStart` entries in `.github/hooks/*.json`  |

The two harnesses read different JSON shapes, so the scripts pipe their message
through `scripts/git/emit-session-hook-context.sh`, which emits
`hookSpecificOutput.additionalContext` when `CLAUDE_PROJECT_DIR` is set and a
top-level `additionalContext` otherwise. Remediation text also branches on
`CI`/`GITHUB_ACTIONS`: cloud agents are told to re-run
`copilot-setup-steps.yml`, local agents are given the `git config` and
`gh auth login` commands they can run themselves.

The signing smoke test never opens a pinentry, so a hook can fail but never hang:
CI signs through a `loopback` wrapper, and local agents sign through a `cancel`
wrapper that uses an already-cached passphrase and errors out in milliseconds
when there is none. A cancelled pinentry is reported as inconclusive rather than
as broken signing, because the following real commit prompts for the passphrase
normally.

The gh check reads the token the session will really send, which is not the one
a bare hook shell sees. A hook runs in a non-interactive shell that never sources
a shell profile, so `GH_TOKEN` and `GITHUB_TOKEN` are absent even when every
terminal in the session exports them, and `gh` silently falls back to its keyring
account — whose token is scoped for the browser login flow and carries no
`read:project`. Three things keep the check honest about which credential it is
judging:

- **It asks the login shell for the token** when neither variable is in the
  environment, fencing the value in markers so a profile that prints a banner
  cannot corrupt it. CI passes the token in explicitly and never asks.
- **`gh auth status` runs with `--active`**, because it otherwise tests every
  account in the keyring and fails when any one of them has a problem — including
  accounts no gh command in the session would ever use.
- **Only CI escalates to `gh auth login --with-token`.** That path deletes
  `~/.config/gh/hosts.yml` and rewrites the git credential helper, which is fine
  on a throwaway runner and destructive on a machine that already holds a working
  keyring account. Locally a bad token is reported, not repaired.

When adding a session check, add the script under `scripts/git/`, emit through
the shared emitter, and register it in both places.

### Instructions

Guidelines for creating custom instruction files, skills, agents, and prompts for GitHub Copilot. See [`.github/instructions/`](.github/instructions) for actual implementations:

- `agent-skills.instructions.md`: Structure and format for skill files
- `agents.instructions.md`: Building specialized agent workflows
- `instructions.instructions.md`: Writing context-specific guidance
- `prompt.instructions.md`: Designing reusable prompt templates

### Skills

Specialized domain knowledge for working on specific systems or patterns, in
[`.agents/skills/`](.agents/skills). Every agent is given the installed skills
directly, so they are not listed here — reading the directory is what tells you
which ones exist right now, including the ones installed from other
repositories.

Writing or editing one — in `.agents/skills/`, or in the four `*-agents`
packages this repository publishes — is its own task with its own two skills:
[writing-skills](.agents/skills/writing-skills/SKILL.md) for how a skill is
built and verified before it ships, and
[writing-for-agents](.agents/skills/writing-for-agents/SKILL.md) for the prose
inside it.

**Every skill is committed**, vendored ones included. They are checked in rather
than restored on demand for one reason: **a skill only becomes a slash command
if its file is on disk when the session starts.** Nothing runs between
`git worktree add` and an agent session, so a gitignored skill leaves
`/grill-with-docs` reporting `Unknown command` for the whole of that first
session. Committing them makes a fresh clone or worktree work with no setup step
at all.

`skills-lock.json` maps each skill to its source, and `skills update` rewrites
the lockfile and the skill folders together so upstream drift arrives as a
reviewable pull request rather than silently. `upgrade-dependencies.yml` runs it
weekly. Upstream licenses travel with the copies in
[`.agents/licenses/`](.agents/licenses), as MIT and Apache-2.0 both require.

```bash
pnpm exec skills update
```

`scripts/install-skills.sh` restores folders that are genuinely absent — after
`skills update` adds a lockfile entry, or when one has been deleted. It is
idempotent, never leaves tracked files dirty, and never fails an install,
because a missing skill is a broken agent workflow rather than a broken build:

```bash
pnpm exec nx run codebase:install-skills
```

Five things reach `.agents/` and so must skip the **vendored** skills while
still covering this repository's own: `prettier` scans `.`, `codometer` scans
`--directory .`, GitHub Linguist reads every committed file (one vendored skill
ships half a megabyte of bundled browser JavaScript that would otherwise
dominate the language bar), and `cspell` and `markdownlint` both reach
`.agents/` because this repository's own skills are documentation and are held
to the same standards as the rest of its prose. Correcting a vendored skill's
spelling or reflowing its tables would be a change this repository has no right
to make.

The exclusions are generated, not hand-maintained. Each file marks its block
with `installed-skills-start` and `installed-skills-end` comments in its own
syntax — `#` in `configuration/.prettierignore`,
`configuration/.codometerignore`, `configuration/cspell.config.yaml`, and
`.gitattributes`; `//` in `configuration/.markdownlint-cli2.jsonc` — and the
`skill-exclusions` synchronizer rewrites what sits between them from the
lockfile. It joins `lint-codebase` in the same `nx affected` invocation, so a
stale list fails there rather than silently:

```bash
pnpm exec nx run synchronization:skill-exclusions:write
```

Two details of that machinery matter before changing it:

- **A wholesale pattern defeats the whole arrangement**, and no check catches
  it. Re-adding `**/.agents/skills/**` outside a managed block leaves every
  per-skill entry in place while quietly taking this repository's own skills
  back out of scope, and the synchronizer reports nothing because its own block
  still matches the lockfile. **Exclude a vendored skill by name.**
- **The root `project.json` mirrors the exclusions as cache negations.** Its
  `vendored-skills` named input drops them from the `spell-check` and
  `markdown-lint` `inputs`, because a tool that ignores a file has no reason to
  rehash on it. That is a cache optimization rather than a correctness gate.

Every other tool scopes itself with explicit globs that never include
`.agents/`.

### Agent Skills Configuration

The [mattpocock/skills](https://github.com/mattpocock/skills) engineering skills
read their per-repository configuration from `docs/agents/`. Edit these files
directly; re-run `/setup-matt-pocock-skills` only to switch issue trackers or
start over.

| Concern       | Setting                                                                                                                          | Reference                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Issue tracker | GitHub Issues in `JimmyPaolini/codebase`, via the `gh` CLI — a spec, then one issue per pull request, then one per commit        | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage labels | The five canonical roles mapped onto this repository's `status:` label family                                                    | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Domain docs   | Single-context — one root `CONTEXT.md` plus root `docs/adr/`                                                                     | [`docs/agents/domain.md`](docs/agents/domain.md)               |

`CONTEXT.md` and `docs/adr/` are both populated now.
[domain-modeling](.agents/skills/domain-modeling/SKILL.md) grows them lazily, as
terms and decisions actually get resolved — so add to them when a decision
lands, rather than scaffolding ahead of the work.

### Agents

This repository keeps no custom agent definitions. The four it used to hold each
duplicated a skill in [`.agents/skills/`](.agents/skills) with nothing to keep
the copies in step, and they drifted. Every agent entrypoint is a symlink to that
one directory, so a skill is the only place a behavior needs to be written down.
Add a skill rather than reintroducing an agent file.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure
- **This workspace has no `test` target.** The `nx-*` skills are installed from
  [nrwl/nx](https://github.com/nrwl/nx) and their examples use the conventional
  `nx run-many -t test`, which fails here. Read `test` as `vitest` — or
  `pytest` for a `language:python` project — and see
  [Testing](#testing) for the real target names.

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
