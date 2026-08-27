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
| [callidescope-trace](skills/callidescope-trace/SKILL.md) | Running `callidescope`, `depth`, or `breadth`, and reading what any of them printed — a stack, a spread row, a caller list |
| [callidescope-configuration](skills/callidescope-configuration/SKILL.md) | Telling a run what to do — the flags, and the `callidescope.config.ts` they read alongside |
| [callidescope-triage](skills/callidescope-triage/SKILL.md) | A depth or breadth gate failed, a committed report went stale, a spread or misplacement row needs acting on, or a run was refused |

That is conformetry's generate / configure / validate, codometer's measure /
configure / triage, and codependix's export / configure / triage, one more
time: run the tool, tell it what to enforce, act on what it said.

The line between the first two is what a run _says_ against what a run is
_told_. `depth <address>` and `breadth <address>` sit with the trace rather
than on their own, because reading one callable's callers and reading a whole
workspace's stacks are the same act of reading a call graph — and an agent
asking "what would this rename touch" is asking to read one, not to configure
anything. Every flag those commands accept is in the configuration skill
alongside the flags the workspace run accepts, since a flag is a way of telling
callidescope what to do whichever command carries it.

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
