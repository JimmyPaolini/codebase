# Superpowers Spec/Plan → GitHub Issues Conversion

This reference is tailored for converting outputs from:

- `superpowers:brainstorming` (spec documents)
- `superpowers:writing-plans` (implementation plans)

into a GitHub-native execution surface:

- parent issue with full spec content
- child task issues from plan tasks
- explicit parent/child (sub-issue) hierarchy
- explicit dependency links (`blocked-by`)
- consistent type/scope/status labels
- milestone grouping
- project tracking

> ⚠️ **Explicit-request gate:** Only perform this conversion when the user explicitly asks to create GitHub issues, milestones, projects, or issue relationships. Never do this automatically at the end of brainstorming or planning.

## Inputs and Source-of-Truth

Use these two artifacts as the canonical inputs:

1. **Spec** from brainstorming
   - default location: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
2. **Plan** from writing-plans
   - default location: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`

If the user does not want planning docs committed to the repo, copy the final spec text into the parent issue body and treat the parent issue as the durable source of truth.

## Mapping Model

### Parent issue (spec)

Create one parent coordination issue per initiative:

- title: `[<Initiative>] <brief migration/feature description>`
- body: **full spec content pasted in** — never link to local file paths
- include stable marker comment at the bottom of the body:

```markdown
<!-- stableKey: <initiative>-parent -->
```

- attach initiative-wide labels (scope + workflow, no type label needed)
- attach milestone
- all task issues become sub-issues of this parent

### Child issues (plan tasks)

Map each `### Task N: ...` section in the plan to one child issue:

- title: `[<Initiative>] Task N: <task title>`
- body: concise goal + key files/interfaces + stableKey
- stable marker at the bottom:

```markdown
<!-- stableKey: <initiative>-task-<n> -->
```

- labels: one conventional type + one or more scope labels + workflow labels
- assignees/milestone/project set consistently across all tasks

## Parsing Superpowers Plan Structure

`writing-plans` produces reliable sections to extract:

- `### Task N: ...` → issue title + stable ordering
- `**Files:**` → key file bullets in issue body
- `**Interfaces:**` → consumed/produced contracts in issue body
- `- Consumes: ...` → dependency hints for `blocked-by` links

### Dependency extraction rule

1. Scan each task's `Consumes:` line for explicit task references (for example `from Task 4`)
2. Build a dependency map: `task N blocked-by task M`
3. Convert each dependency into a `blocked-by` link after issues are created
4. Do not infer dependencies from parent-child hierarchy alone — they are separate semantics

## Parent/Child (Sub-Issue) Relationships

Sub-issues model **ownership**: a task belongs to this initiative.

### Creating sub-issue links via gh CLI

Sub-issue API requires integer issue IDs (not issue numbers). Fetch the ID with:

```bash
SUB_ID=$(gh api repos/<owner>/<repo>/issues/<number> --jq '.id')
```

Then attach:

```bash
gh api \
  -X POST \
  repos/<owner>/<repo>/issues/<parent-number>/sub_issues \
  --input - <<EOF
{"sub_issue_id": $SUB_ID}
EOF
```

> ⚠️ The `-f sub_issue_id=...` flag passes strings; the API requires an integer. Always use `--input -` with a JSON heredoc.

### Verifying

```bash
gh api repos/<owner>/<repo>/issues/<parent-number> --jq '.sub_issues_summary'
# → {"total": 14, "completed": 0, "percent_completed": 0}
```

## Blocking/Blocked-By (Dependency) Relationships

Dependencies model **execution order**: task N cannot start until task M is done.

### Creating dependency links via gh CLI

```bash
# Mark issue <number> as blocked by another issue (use integer ID, not issue number)
BLOCKING_ID=$(gh api repos/<owner>/<repo>/issues/<blocking-number> --jq '.id')

gh api \
  -X POST \
  repos/<owner>/<repo>/issues/<blocked-number>/dependencies/blocked_by \
  --input - <<EOF
{"issue_id": $BLOCKING_ID}
EOF
```

> ⚠️ The field name is `issue_id` (not `blocked_by_issue_id`). The `-f` flag fails with type errors; use `--input -` with a JSON heredoc.

### Verifying

The response includes `issue_dependencies_summary`:

```json
{"blocked_by": 2, "total_blocked_by": 2, "blocking": 0, "total_blocking": 0}
```

Or check a specific issue:

```bash
gh api repos/<owner>/<repo>/issues/<number>/dependencies/blocked_by 2>/dev/null
# Returns array of blocking issues (empty [] if none)
```

### Dependency graph pattern

Build the full dependency map before making API calls. Example for a 14-task plan:

```bash
get_id() {
  case $1 in
    131) echo 5033290189 ;; 132) echo 5033291026 ;; # etc.
  esac
}

add_blocked_by() {
  local issue_num=$1
  local blocker_num=$2
  local blocker_id=$(get_id $blocker_num)
  gh api -X POST repos/<owner>/<repo>/issues/$issue_num/dependencies/blocked_by \
    --input - <<EOF
{"issue_id": $blocker_id}
EOF
}

add_blocked_by 132 131   # Task 2 ← Task 1
add_blocked_by 134 132   # Task 4 ← Task 2
add_blocked_by 135 134   # Task 5 ← Task 4
# etc.
```

## Milestone Setup

A milestone groups all initiative issues under one named target with a progress bar.

### Creating the milestone

```bash
gh api \
  -X POST \
  repos/<owner>/<repo>/milestones \
  --input - <<'EOF'
{
  "title": "<Initiative Name>",
  "description": "<One-sentence description>",
  "state": "open"
}
EOF
```

The response includes `"number": 1` — use this number to assign issues.

### Assigning issues to the milestone

```bash
for num in 130 131 132 ...; do
  gh api \
    -X PATCH \
    repos/<owner>/<repo>/issues/$num \
    --input - <<EOF
{"milestone": 1}
EOF
done
```

Assign the parent issue and all child issues to the same milestone.

### Verifying

```bash
gh api repos/<owner>/<repo>/milestones/1 --jq '{title,open_issues,closed_issues}'
```

## Labels for Superpowers Conversion

Prefer conventional commit-compatible labels over generic issue-type labels.

- **Type label (exactly one, on each task issue):**
  - `type:feat`, `type:fix`, `type:build`, `type:refactor`, `type:chore`, `type:docs`, `type:ci`
  - Map from the expected commit prefix for that task
- **Scope label(s):**
  - `scope:<domain>` aligned with `configuration/conventional.config.cjs`
  - A task may carry more than one scope label
- **Workflow labels:**
  - `status:todo` / `status:in-progress` / `status:blocked`
  - `source:plan`

Avoid `area:*` labels when `scope:*` labels already carry the domain semantics. Avoid `type:task` / `type:epic` — use conventional type labels instead.

### Required labels to create before first run

```bash
for label in "type:feat" "type:fix" "type:build" "type:refactor" "type:chore" \
             "type:docs" "type:ci" "status:todo" "status:in-progress" \
             "status:blocked" "source:plan"; do
  gh label create "$label" --repo <owner>/<repo> --color "<hex>" 2>/dev/null || true
done
```

## Body Templates

### Parent issue (spec)

```markdown
<full spec content pasted verbatim here — no local file links>

<!-- stableKey: <initiative>-parent -->
```

### Task issue

```markdown
## Goal
<one-paragraph task goal>

## Key Files / Interfaces
- Create: `path/to/file.ts`
- Produces: `functionName(args): ReturnType`
- Consumes: output from Task <N>

<!-- stableKey: <initiative>-task-<n> -->
```

## Upsert and Idempotency Rules

On reruns:

1. Resolve existing issues by `stableKey` marker in title or body
2. Update body/labels/milestone in place; create only missing issues
3. Reconcile sub-issue links (safe to re-add; duplicates are ignored)
4. Reconcile dependency links (safe to re-add; duplicates are ignored)
5. Leave manually added issue comments untouched

## Validation Checklist

Before finishing conversion, verify all of the following:

- [ ] Parent issue exists and body contains full spec (not a local file link)
- [ ] Every plan task maps to exactly one child issue with a stable title prefix
- [ ] All child issues linked to parent as sub-issues
- [ ] All `blocked-by` dependency links applied and verified via `issue_dependencies_summary`
- [ ] Labels consistent: exactly one `type:*`, relevant `scope:*`, `status:todo`, `source:plan`
- [ ] Milestone created and applied to parent + all children
- [ ] (Optional) Project created, linked to repo, and all issues added

## Common Pitfalls

- **Local file links in issue bodies** — `docs/superpowers/specs/...` is not accessible on GitHub; paste full content instead
- **Using `-f` with integer API fields** — the `sub_issues` and `dependencies` APIs require integer JSON; always use `--input -` with a heredoc
- **Hierarchy ≠ dependency** — sub-issue links track ownership; `blocked-by` links track execution order; you need both
- **Generic labels alongside conventional labels** — avoid mixing `type:task`/`type:epic` with `type:feat`/`type:build` in the same initiative
- **Forgetting to remove stale labels** — when relabeling existing issues, explicitly remove old labels with `gh issue edit --remove-label`
- **Project not linked to repo** — a user-level project won't appear in the repo's Projects tab until you run `gh project link <number> --owner <owner> --repo <owner>/<repo>`
