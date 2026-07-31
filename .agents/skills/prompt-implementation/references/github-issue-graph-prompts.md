# Prompting From GitHub Issue Graphs

Use this reference when implementation is organized as:

- one parent coordination issue (full spec)
- child execution issues (task units)
- explicit `blocked-by` dependencies
- milestone/project tracking
- type/scope workflow labels

## Graph Semantics to Encode in the Prompt

## 1) Parent/Sub-Issue

Parent/sub-issue means ownership and grouping, not execution order.

Prompt must state:

- parent issue defines architecture and constraints
- child issues define execution tasks

## 2) Blocked-By Dependencies

`blocked-by` links define execution order.

Prompt must state:

- execute in dependency order
- do not start blocked tasks early
- parallelize only among currently unblocked tasks

## 3) Labels

Type/scope labels are triage metadata and expected change shape indicators.

Prompt should direct the agent to use labels as hints, while keeping issue body plus dependency graph as the source of truth.

## Read-First Gate Pattern

Use this sentence pattern verbatim or close equivalent:

```text
Read the parent issue and every child issue before implementing anything; treat issue bodies and blocked-by links as authoritative.
```

## Per-Task Re-Read Gate Pattern

For task execution and subagent dispatch, require a local refresh at task start:

```text
Before starting each task, re-read that task issue plus its direct blocked-by dependencies; for subagents, include this as a mandatory first step in each subagent prompt.
```

## Execution Policy Pattern

```text
Use subagent-driven-development for implementation.
Assign one subagent per unblocked task slice when practical.
Prefer test-driven-development inside subagents where practical.
```

## Completion Policy Pattern

```text
Do not mark work complete until required validation gates pass and the issue's acceptance criteria are satisfied.
```

## Anti-Patterns

- Embedding all task details from child issues in kickoff prompt
- One-time issue read with no per-task refresh behavior
- Listing tasks in order but not mentioning blocked-by semantics
- Treating parent/sub-issue links as dependency links
- Making process skills optional in wording

## Prompt QA Checklist

- [ ] Requires reading parent + all child issues first
- [ ] Distinguishes hierarchy from dependencies
- [ ] Requires dependency-order execution
- [ ] Requires per-task issue re-read behavior (including subagents)
- [ ] Uses required wording for process skills
- [ ] Includes validation gate before completion
- [ ] Avoids over-detailed restatement of task bodies
