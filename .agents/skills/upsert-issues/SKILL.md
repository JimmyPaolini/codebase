---
name: upsert-issues
description: Use when converting implementation plans into many linked GitHub issues, or when creating/updating issue hierarchies with parent-sub-issue and dependency relationships plus consistent metadata.
license: MIT
---

# Upsert GitHub Issue

Convert plans into linked issues and keep issue hierarchies consistent over repeated runs.

## Primary Objective

Turn plan documents from other superpowers skills into a reproducible issue graph:

- One parent coordination issue (optional but recommended)
- Multiple child execution issues
- Explicit dependency links (`blocking` and `blocked-by`)
- Stable metadata (labels, assignees, milestone, type, project fields)

This skill is designed for interoperability first: deterministic inputs, deterministic outputs, and idempotent updates.

## When to Use This Skill

- Converting a plan file into many linked GitHub issues
- Re-running issue generation after plan edits without duplicating work
- Upserting an existing issue set while preserving relationships
- Linking parent/sub-issue and dependency relationships from plan phases
- Applying repository metadata rules (labels, assignees, milestone, type, fields)
- Converting `brainstorming` specs + `writing-plans` plans into a parent spec issue and linked child execution issues

> ⚠️ **Explicit-request gate:** Do not perform any spec/plan-to-issue conversion automatically. Use this skill for superpowers handoff conversion only when the user explicitly asks to create/update GitHub issues, milestones, projects, or issue relationships.

## Interoperability Contract

When called by other skills, treat this as the canonical interface.

### Required inputs

- `owner`
- `repo`
- `plan_source` (path, URL, or pasted plan content)
- `execution_mode` (`create-only`, `upsert`, or `sync`)

### Optional inputs

- `parent_issue_number` (if omitted, create parent when needed)
- `default_labels`
- `assignees`
- `milestone`
- `issue_type`
- `project`
- `issue_fields`

### Required outputs

- Parent issue number and URL (if used)
- A task-to-issue mapping table
- Relationship summary: parent links + dependency links
- Assumptions and skipped metadata

## Plan-to-Issue Model

Normalize the plan into items with this shape before API calls:

```text
PlanItem {
  stableKey: string,
  title: string,
  body: string,
  labels: string[],
  assignees?: string[],
  milestone?: string,
  type?: string,
  parentKey?: string,
  blockedByKeys?: string[],
  blockingKeys?: string[]
}
```

`stableKey` must remain stable across reruns. Prefer an existing task id from the plan. Otherwise derive from phase + task title.

## Upsert Strategy

1. Parse plan into normalized `PlanItem` values.
2. Resolve existing issues by `stableKey` marker in title/body.
3. Create missing issues and update existing issues.
4. Apply hierarchy links (parent/sub-issue).
5. Apply dependency links (`blocked-by` and `blocking`).
6. Emit task-to-issue mapping output for downstream skills.

## Relationship Rules

- Parent hierarchy models ownership and tracking.
- Dependency links model execution order.
- Use both when both semantics exist.
- Do not infer dependency links from parent-child automatically.
- Never overwrite an existing different parent unless explicitly instructed.

## Upsert Rules

1. Decide whether this is a create or update flow first.
2. Normalize title and body before writing metadata.
3. Ensure every issue body includes the originating plan key (`stableKey`).
4. Apply labels, assignees, milestone, and type during the same upsert operation when possible.
5. Apply relationships immediately after the issue exists.
6. Prefer explicit assumptions when data is missing instead of leaving fields implicit.

## Upsert Decision

- Create: no issue number is supplied, or request says to open a new issue.
- Update: an issue number is supplied, or request says to modify an existing issue.
- Plan conversion: many issues derived from one plan; default to `upsert` mode.

## Canonical Workflow

1. Collect required inputs and resolve plan source.
2. Convert plan tasks/phases into normalized `PlanItem` values.
3. Ensure parent issue exists (if parent mode enabled).
4. Upsert each plan item:

- Create: `mcp_github_mcp_se_issue_write` with `method: "create"`
- Update: `mcp_github_mcp_se_issue_write` with `method: "update"` and `issue_number`

5. Apply hierarchy relationships:

- Use `mcp_github_mcp_se_sub_issue_write` with `method: "add"` to attach children.

6. Apply dependency relationships:

- Use dependency endpoints via `gh api` for `blocking` and `blocked-by` links.

7. Apply project/custom-field metadata:

- Use `issue_fields` in `mcp_github_mcp_se_issue_write` when available.

8. Produce a task-to-issue map so other skills can continue execution.

## Recommended Labels for Plan Conversion

Use labels that align with your conventional commit taxonomy and workflow metadata:

- exactly one conventional type label (for example `type:feat`, `type:fix`, `type:build`, `type:refactor`, `type:chore`, `type:docs`, `type:ci`)
- one or more scope labels (for example `scope:conformetry`, `scope:configuration`)
- `status:todo` / `status:in-progress` / `status:blocked`
- `source:plan`
- `source:agent` (required on all issues created/updated by this skill)
- `source:superpowers` (also apply when inputs came from superpowers specs/plans)

When scope labels already encode the domain, avoid redundant `area:*` labels.

## Superpowers Conversion Reference

For `brainstorming` + `writing-plans` handoff workflows, use the dedicated reference:

- [`references/superpowers-spec-plan-conversion.md`](references/superpowers-spec-plan-conversion.md)

It defines:

- parent issue behavior (full spec body, stable key markers)
- task extraction from `### Task N` plan sections
- dependency extraction from `Consumes` lines
- conventional `type:*` + `scope:*` label strategy
- milestone + project integration and validation checklist

## Plan Mapping Output Format

Return this Markdown table after upsert. Other skills can parse it reliably.

```markdown
| plan_key       | issue_number | issue_url                              | parent_issue_number | blocked_by | blocking |
| -------------- | ------------ | -------------------------------------- | ------------------- | ---------- | -------- |
| phase-1-task-a | 123          | https://github.com/org/repo/issues/123 | 120                 | 118,119    | 130      |
```

## Tool Patterns

### Create or update an issue

```json
{
  "method": "create",
  "owner": "<owner>",
  "repo": "<repo>",
  "title": "<title>",
  "body": "<body>",
  "labels": ["<label-1>", "<label-2>"],
  "assignees": ["<username>"],
  "state": "open"
}
```

```json
{
  "method": "update",
  "owner": "<owner>",
  "repo": "<repo>",
  "issue_number": 123,
  "title": "<new title>",
  "body": "<new body>",
  "labels": ["bug", "priority:high"],
  "state": "open"
}
```

### Parent and sub-issue relationship

```json
{
  "method": "add",
  "owner": "<owner>",
  "repo": "<repo>",
  "issue_number": 100,
  "sub_issue_id": 456789,
  "replace_parent": false
}
```

### Blocking and blocked-by dependency relationship

Use `gh api` when dependency links must be explicit.

> ⚠️ The dependency API requires an **integer** issue ID (from `.id`, not `.number`), passed as JSON. Using `-f` passes strings and causes a type error.

```bash
# Fetch the integer ID of the blocking issue
BLOCKER_ID=$(gh api repos/<owner>/<repo>/issues/<blocker-number> --jq '.id')

# Mark issue 123 as blocked by that issue
gh api \
  -X POST \
  repos/<owner>/<repo>/issues/123/dependencies/blocked_by \
  --input - <<EOF
{"issue_id": $BLOCKER_ID}
EOF
```

Verify with the returned `issue_dependencies_summary.blocked_by` count.

### Optional custom field metadata

```json
{
  "method": "update",
  "owner": "<owner>",
  "repo": "<repo>",
  "issue_number": 123,
  "issue_fields": [
    { "field_name": "Priority", "field_option_name": "High" },
    { "field_name": "Target Date", "value": "2026-08-15" }
  ]
}
```

## Metadata Guidance

- Labels: keep focused; use one conventional `type:*` label, relevant `scope:*` labels, and workflow labels first.
- Assignees: use explicit usernames (`@me` only in CLI contexts).
- Milestone: set only if it affects delivery tracking.
- Issue type: set when repository uses issue types.
- Projects/fields: only set when repository or org supports them.

## Compatibility Guidance for Other Superpowers Skills

- `writing-plans` / `create-plan`: pass stable task identifiers in plan output.
- `execute-plan`: consume the task-to-issue map and update issue state as tasks complete.
- `update-plan`: on plan drift, rerun this skill in `upsert` mode to reconcile issues.
- `refresh-documentation`: include issue URLs from mapping output in plan docs.

If a caller cannot provide stable task ids, this skill should generate deterministic keys and report them in the mapping table.

## Output Expectations

- Return issue number and URL.
- Report create, update, or plan-conversion mode used.
- Report relationships added: parent/sub-issue, blocking, blocked-by.
- Report metadata applied: labels, assignees, milestone, type, fields.
- Return a task-to-issue mapping table for downstream skills.
- Report assumptions and skipped fields when unavailable.

## References

- GitHub CLI manual: https://cli.github.com/manual/gh_issue_create
- GitHub CLI manual: https://cli.github.com/manual/gh_issue_edit
- GitHub REST Issues API: https://docs.github.com/rest/issues/issues
- GitHub REST Issue dependencies API: https://docs.github.com/rest/issues/issue-dependencies
- Superpowers conversion reference: [`references/superpowers-spec-plan-conversion.md`](references/superpowers-spec-plan-conversion.md)
