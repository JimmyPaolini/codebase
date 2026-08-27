# @callidescope/agents

Agent skills for the [callidescope](../callidescope-cli) toolchain.

Callidescope traces call stacks across a TypeScript workspace — following calls
through injected dependencies — and flags the ones that got too deep. This
package documents that for coding agents, so an agent facing a failed depth
gate collapses the forwarding layer the report is pointing at instead of
raising the limit, and an agent scoping a rename asks the call graph who the
callers are instead of grepping for a class name.

## Installing

The skills describe the toolchain rather than any one workspace, so they work
in any repository that uses callidescope. Install them with the
[skills](https://github.com/vercel-labs/skills) CLI, naming the skills
directory explicitly:

```bash
npx skills add JimmyPaolini/codebase/packages/callidescope-agents/skills --skill '*'
```

Naming the directory matters. A bare repository reference searches this
repository's own agent skills directory first and would offer every skill it
holds, most of which are specific to this workspace.

## The skills

| Skill | Reach for it when |
| ----- | ----------------- |
| [callidescope-trace](skills/callidescope-trace/SKILL.md) | Running a trace, choosing a `--check` set, narrowing with `--directories`, picking a `--format`, or reading a printed stack |
| [callidescope-configure](skills/callidescope-configure/SKILL.md) | Writing a `callidescope.config.ts` — limits, entry points, exclusions, ignored callees, and output destinations |
| [callidescope-triage](skills/callidescope-triage/SKILL.md) | A depth or breadth gate failed, a committed report went stale, a spread or misplacement row needs acting on, or a run was refused |
| [callidescope-analysis](skills/callidescope-analysis/SKILL.md) | Deciding whether to extract, inline, move, or rename one callable, via `depth <address>` and `breadth <address>` |

The first three mirror conformetry's generate / configure / validate,
codometer's measure / configure / triage, and codependix's export / configure /
triage: run the tool, tell it what to enforce, act on what it said.

The fourth is callidescope's own. `depth` and `breadth` against a single
address answer questions — _what would this rename touch_, _where do I cut this
callable in two_ — that no `--check` ever asks, and that share no vocabulary
with running a trace. Since a skill's `description` is its entire trigger
surface, folding that into `callidescope-trace` would have meant it never fired
for the questions it answers.

## Why there are no bundled scripts

An installed skill is a copied directory with no manifest and no dependencies
beside it, so a script shipped inside one can import nothing but Node built-ins.
Capability an agent needs lives in `@callidescope/cli` instead, where it is
versioned and tested, and the skills name the command.

## Editing

The skills here are the source of truth. This repository consumes them the same
way it consumes any installed skill, through `skills-lock.json`, so a copy also
appears under the repository's agent skills directory — edit the copy in this
package, never that one.

## Validating

```bash
pnpm exec nx run callidescope-agents:lint-codebase --configuration=write
pnpm exec nx run callidescope-agents:lint-codebase --configuration=check
pnpm exec nx run callidescope-agents:test-coverage
```

Coverage is empty by nature here — there is no source to instrument — so the
corpus test in `testing/skills.unit.test.ts` is what protects the shipped
output.

## License

MIT — see [LICENSE](../../LICENSE).
