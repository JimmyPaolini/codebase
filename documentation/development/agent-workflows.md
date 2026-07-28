# Agent Workflow Reference

Reference guidance for the repository's default superpowers workflow for
non-trivial features, refactors, and bugfixes.

## Required Sequence

1. Clarify the request. Start with
   [using-superpowers](../../.agents/skills/using-superpowers/SKILL.md).
   If the request is ambiguous or exploratory, follow it with
   [brainstorming](../../.agents/skills/brainstorming/SKILL.md).
2. Produce a spec or implementation plan. For design-heavy work, create a
   design spec at `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
   For execution planning, use
   [writing-plans](../../.agents/skills/writing-plans/SKILL.md) and save
   the plan to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.
3. Create an issue graph when the work spans multiple tasks. Use
   [upsert-issue](../../.agents/skills/upsert-issue/SKILL.md) to add a
   parent coordination issue, child issues for phases or tasks, and
   explicit `blocked-by` / `blocking` relationships.
4. Implement the plan. Use
   [subagent-driven-development](../../.agents/skills/subagent-driven-development/SKILL.md)
   when independent tasks and subagents are available. If that is not
   possible, use
   [executing-plans](../../.agents/skills/executing-plans/SKILL.md).
5. Follow test-driven development for implementation tasks. Write the
   failing test first, make it pass, then refactor. Finish by running the
   relevant checks with
   [validate-code](../../.agents/skills/validate-code/SKILL.md).

## Anti-Patterns

- Do not jump straight to implementation for a new feature without a spec,
  plan, or issue graph when the scope is non-trivial.
- Do not create one monolithic issue when the work has clear phases; split
  it into scoped issues with explicit relationships.
- Do not skip test-first behavior changes or final validation before
  declaring the work complete.

## Notes for Agents

- Keep [AGENTS.md](../../AGENTS.md) as a compact entrypoint for repository
  conventions.
- Use this document for the full workflow and skill selection guidance.
- Prefer these skills and this workflow over ad-hoc implementation when the
  task is non-trivial.
