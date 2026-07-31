---
name: prompt-implementation
description: Use when preparing a kickoff prompt for a fresh coding agent to implement a feature from superpowers-generated specs/plans and GitHub issue graphs, especially when tasks are linked by parent/sub-issue and blocked-by dependencies.
---

# Prompt Implementation

Write a high-leverage kickoff prompt for a new coding agent session that will execute an already-approved implementation plan.

## When to Use This Skill

- The feature is already specified and planned (typically via `brainstorming` + `writing-plans`)
- The plan has been converted to GitHub issues (typically via `upsert-issues`)
- You need a fresh agent session to implement the work
- You want clear direction without over-prescribing implementation details

Do **not** use this skill to create specs or plans. Use it only for implementation kickoff prompts.

## Core Principle

The prompt should tell the coding agent **where to get truth** and **how to execute**, not restate every task detail.

Overly detailed prompts cause agents to skip reading source artifacts. The correct prompt requires reading those artifacts first.

## Required Inputs

- Repository owner and name
- Parent issue number (spec carrier)
- Child issue range or list (execution tasks)
- Confirmation of dependency links (`blocked-by`) and hierarchy (sub-issues)
- Required process skills (for example `using-superpowers`, `subagent-driven-development`, `test-driven-development`, `validate-code`)
- Issue-reading policy (`before-all`, `before-each-task`, or `both`; default `both`)
- Any hard constraints the implementation must not violate

## Prompt Shape

Use this order:

1. Mission sentence (one short paragraph)
2. Process requirements (skills and order)
3. Source-of-truth list (issues/project/milestone)
4. Read-first gate (must read parent + child issues before coding)
5. Execution policy (dependency order, subagents, TDD preference, issue-read gate)
6. Validation gate (quality checks before completion)
7. Start command (what to do first)

## Prompt Template

```text
You are starting implementation of <initiative> in <owner>/<repo>.

Before doing anything else, invoke using-superpowers to determine the required superpowers skills for this task.

Required execution approach:
- Use using-superpowers first to select required implementation skills.
- Use subagent-driven-development as the primary implementation workflow.
- Prefer test-driven-development inside subagents where practical.
- Use validate-code before declaring completion.

Source of truth:
- Parent issue: #<parent>
- Child issues: #<child-list>
- Milestone: <name>
- Project: <name>

Important:
- Read the parent issue and every child issue before implementing anything.
- Before each task (and for each task subagent), re-read that task issue and its direct dependency issues.
- Treat GitHub issues as authoritative requirements and sequencing.
- Implement in dependency order based on blocked-by links.
- Do not rely on this prompt for detailed task content.

Implementation constraints:
- <hard constraint 1>
- <hard constraint 2>

Expected behavior:
- Keep changes surgical and aligned with repository conventions.
- Run the smallest targeted checks per task, then required global validation.

Start by reading issue #<parent> and all child issues, summarizing the dependency graph, and proposing the first implementation slice.
```

## Authoring Rules

- Keep prompt short enough that reading the issues is still necessary
- Use explicit must/required language for process-critical behavior
- Avoid embedding full task-by-task implementation instructions
- Include dependency-order behavior explicitly
- Include a concrete first action sentence

## Quality Checklist

- [ ] Prompt explicitly requires `using-superpowers` first
- [ ] Prompt explicitly requires reading parent + child issues before coding
- [ ] Prompt mandates dependency-order execution from blocked-by links
- [ ] Prompt sets `subagent-driven-development` as default execution strategy
- [ ] Prompt requires per-task issue re-read behavior for task owners/subagents
- [ ] Prompt encourages `test-driven-development` inside subagents when practical
- [ ] Prompt requires `validate-code` before completion
- [ ] Prompt avoids restating full implementation details from issues

## References

- [`references/superpowers-spec-plan-prompts.md`](references/superpowers-spec-plan-prompts.md)
- [`references/github-issue-graph-prompts.md`](references/github-issue-graph-prompts.md)
- [`../upsert-issues/references/superpowers-spec-plan-conversion.md`](../upsert-issues/references/superpowers-spec-plan-conversion.md)
