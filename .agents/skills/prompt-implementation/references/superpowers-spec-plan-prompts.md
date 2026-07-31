# Prompting From Superpowers Specs and Plans

Use this reference when writing implementation kickoff prompts from artifacts produced by:

- `superpowers:brainstorming` (design/spec)
- `superpowers:writing-plans` (implementation plan)

## Typical Artifact Structure

### Spec (`brainstorming` output)

Common sections include:

- Summary and approved decisions
- Architecture/package topology
- Runtime model and boundaries
- Error handling, testing strategy, acceptance criteria

### Plan (`writing-plans` output)

Common sections include:

- `### Task N: ...`
- `**Files:**` (create/modify targets)
- `**Interfaces:**` (consumes/produces)
- Step-by-step TDD workflow per task
- Task dependencies often hinted through `Consumes:` lines

## What the Kickoff Prompt Must Preserve

1. **Source hierarchy**
   - Parent issue/spec is authoritative for architecture and constraints
   - Child issues/plan tasks are authoritative for implementation sequencing

2. **Execution discipline**
   - Read-first behavior before coding
   - Per-task re-read behavior before each implementation slice (especially for subagents)
   - Dependency order before parallelization
   - Validation before completion

3. **Boundary integrity**
   - Keep package/runtime boundaries from the spec intact
   - Avoid "helpful" cross-boundary shortcuts not approved in the spec

## Prompt Compression Strategy

When converting spec+plan into a kickoff prompt, keep only:

- mission
- required process skills
- authoritative artifact pointers
- non-negotiable constraints
- execution/validation gates

Do not copy full task bodies into the prompt. That reduces issue-reading behavior and weakens the issue graph as source of truth.

## Suggested Constraint Block Pattern

```text
Implementation constraints:
- Preserve architecture boundaries from the parent issue.
- Follow child issue dependency order (`blocked-by`) before parallel work.
- Do not commit planning docs unless explicitly requested.
- Run required validation gates before completion.
```

## Common Failures and Fixes

| Failure | Why it happens | Fix in prompt |
| --- | --- | --- |
| Agent skips issue reading | Prompt contains enough detail to proceed blindly | Add explicit "read parent + all children first" gate |
| Agent executes out of order | Prompt omits dependency semantics | Require blocked-by order explicitly |
| Agent ignores process skills | Prompt mentions skills as optional | Use "required" language and explicit ordering |
| Agent reports done without validation | Prompt lacks completion gate | Require validate-code before completion |

## Minimal High-Signal Kickoff Example

```text
Before coding, invoke using-superpowers, then read issue #130 and child issues #131-#144.
Treat those issues as authoritative requirements.
Execute in blocked-by dependency order using subagent-driven-development.
Prefer test-driven-development inside subagents where practical.
Run validate-code before declaring completion.
Start by summarizing the dependency graph and proposing the first implementation slice.
```
