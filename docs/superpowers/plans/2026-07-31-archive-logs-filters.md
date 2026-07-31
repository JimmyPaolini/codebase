# Archive Logs Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional workflow-run filters to the archive-logs tool so archive and delete actions can target runs by workflow name, status, event, branch, and actor while still honoring the existing date windows.

**Architecture:** Centralize workflow-run URL construction in a shared helper, then thread one shared filter object through the archive and delete commands and services. `name` maps to GitHub's per-workflow runs endpoint, while the other filters become query parameters on either endpoint. The workflow dispatch job passes the same inputs through to both commands so the same filter semantics work in manual and scheduled runs.

**Tech Stack:** TypeScript, NestJS, nest-commander, Zod, GitHub Actions REST API, Nx, Vitest

## Global Constraints

- `name` is optional and only affects the API endpoint path.
- `status`, `event`, `branch`, and `actor` are optional and only affect query parameters.
- Filters may be combined with the archive date window and delete date window.
- Existing date validation remains unchanged.
- Filtering by the workflow run display title is out of scope.

---

### Task 1: Add shared workflow-run filters and URL building

**Files:**
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.types.ts`
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.constants.ts`
- Create: `tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.ts`
- Create: `tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.unit.test.ts`

**Interfaces:**
- Consumes: `WorkflowRun`, `WorkflowRunsResponse`, `ArchiveLogsOptions`, and the GitHub repository slug
- Produces: `WorkflowRunFilters`, `buildWorkflowRunsUrl()`, and an extended `workflowRunSchema` that includes the run `name`

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildWorkflowRunsUrl", () => {
  it("uses the repository-wide runs endpoint when no workflow name is provided", () => {});
  it("switches to the per-workflow endpoint when name is provided", () => {});
  it("appends status, event, branch, and actor query parameters", () => {});
});
```

- [ ] **Step 2: Run the new unit test file and confirm it fails**

Run: `pnpm exec vitest run tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.unit.test.ts`

Expected: fail because `buildWorkflowRunsUrl` does not exist yet.

- [ ] **Step 3: Implement the shared filter type and URL helper**

```ts
export interface WorkflowRunFilters {
  readonly name?: string;
  readonly status?: string;
  readonly event?: string;
  readonly branch?: string;
  readonly actor?: string;
}

export function buildWorkflowRunsUrl(
  githubRepository: string,
  pageNumber: number,
  filters?: WorkflowRunFilters,
): string {
  // build the correct endpoint and query string
}
```

- [ ] **Step 4: Extend the workflow-run schema and validate the helper**

Run: `pnpm exec vitest run tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.unit.test.ts`

Expected: pass, including coverage for `workflowRunSchema.name`.

- [ ] **Step 5: Commit**

```bash
git add tools/archive-logs/src/modules/archive-logs/archive-logs.types.ts tools/archive-logs/src/modules/archive-logs/archive-logs.constants.ts tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.ts tools/archive-logs/src/modules/archive-logs/workflow-runs.utilities.unit.test.ts
git commit -m "feat(deployments): add shared workflow run filters"
```

### Task 2: Wire filters into the archive command and service

**Files:**
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.command.ts`
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.command.unit.test.ts`
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.service.ts`
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.service.unit.test.ts`
- Modify: `tools/archive-logs/src/modules/archive-logs/archive-logs.constants.ts`

**Interfaces:**
- Consumes: `WorkflowRunFilters` and `buildWorkflowRunsUrl()`
- Produces: `ArchiveLogsOptions.filters`, command options for `--name`, `--status`, `--event`, `--branch`, and `--actor`, and archive pagination that uses the shared URL helper

- [ ] **Step 1: Write failing command and service tests**

```ts
describe("ArchiveLogsCommand", () => {
  it("passes workflow filters into the resolved archive options", () => {});
});

describe("ArchiveLogsService", () => {
  it("loads filtered runs from the workflow-specific endpoint when name is set", () => {});
  it("keeps date-window pagination working with filters applied", () => {});
});
```

- [ ] **Step 2: Run the archive tests and confirm they fail**

Run: `pnpm exec nx run archive-logs:test`

Expected: fail because the archive command still ignores the new filter options.

- [ ] **Step 3: Implement archive command parsing and option resolution**

```ts
@Option({ flags: "--name <name>" })
parseName(value: string): string {
  return value;
}
```

Add matching parsers for `--status`, `--event`, `--branch`, and `--actor`, then include them in the resolved `filters` object.

- [ ] **Step 4: Thread the filters through archive pagination**

Update the archive service so `collectAndZip()` and its internal run-loading helper call `buildWorkflowRunsUrl()` with the same filter object.

- [ ] **Step 5: Run the archive test suite and static checks**

Run:

```bash
pnpm exec nx run archive-logs:test
pnpm exec nx run archive-logs:analyze-code --configuration=write
pnpm exec nx run archive-logs:analyze-code --configuration=check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tools/archive-logs/src/modules/archive-logs/archive-logs.command.ts tools/archive-logs/src/modules/archive-logs/archive-logs.command.unit.test.ts tools/archive-logs/src/modules/archive-logs/archive-logs.service.ts tools/archive-logs/src/modules/archive-logs/archive-logs.service.unit.test.ts tools/archive-logs/src/modules/archive-logs/archive-logs.constants.ts
git commit -m "feat(deployments): add archive log filters"
```

### Task 3: Wire filters into the delete command and service

**Files:**
- Modify: `tools/archive-logs/src/modules/delete-logs/delete-logs.command.ts`
- Modify: `tools/archive-logs/src/modules/delete-logs/delete-logs.command.unit.test.ts`
- Modify: `tools/archive-logs/src/modules/delete-logs/delete-logs.service.ts`
- Modify: `tools/archive-logs/src/modules/delete-logs/delete-logs.service.unit.test.ts`
- Modify: `tools/archive-logs/src/modules/delete-logs/delete-logs.constants.ts`

**Interfaces:**
- Consumes: `WorkflowRunFilters` and `buildWorkflowRunsUrl()`
- Produces: `DeleteLogsOptions.filters`, command options for `--name`, `--status`, `--event`, `--branch`, and `--actor`, and delete pagination that uses the shared URL helper

- [ ] **Step 1: Write failing command and service tests**

```ts
describe("DeleteLogsCommand", () => {
  it("passes workflow filters into the resolved delete options", () => {});
});

describe("DeleteLogsService", () => {
  it("loads filtered runs from the workflow-specific endpoint when name is set", () => {});
  it("keeps delete pagination working with filters applied", () => {});
});
```

- [ ] **Step 2: Run the delete tests and confirm they fail**

Run: `pnpm exec nx run archive-logs:test`

Expected: fail because the delete command still ignores the new filter options.

- [ ] **Step 3: Implement delete command parsing and option resolution**

Add the same five option parsers as the archive command and include the resolved filters in `DeleteLogsOptions`.

- [ ] **Step 4: Thread the filters through delete pagination**

Update `deleteRunsBeforeEnd()` and `deleteRunsInWindow()` so both use the shared URL helper with the optional filter object.

- [ ] **Step 5: Run the delete test suite and static checks**

Run:

```bash
pnpm exec nx run archive-logs:test
pnpm exec nx run archive-logs:analyze-code --configuration=write
pnpm exec nx run archive-logs:analyze-code --configuration=check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tools/archive-logs/src/modules/delete-logs/delete-logs.command.ts tools/archive-logs/src/modules/delete-logs/delete-logs.command.unit.test.ts tools/archive-logs/src/modules/delete-logs/delete-logs.service.ts tools/archive-logs/src/modules/delete-logs/delete-logs.service.unit.test.ts tools/archive-logs/src/modules/delete-logs/delete-logs.constants.ts
git commit -m "feat(deployments): add delete log filters"
```

### Task 4: Wire workflow dispatch inputs and verify the end-to-end path

**Files:**
- Modify: `.github/workflows/archive-logs.yml`
- Modify: `README.md` if the code statistics change during validation

**Interfaces:**
- Consumes: the archive and delete command filter flags
- Produces: workflow dispatch inputs for `name`, `status`, `event`, `branch`, and `actor` that feed both archive and delete actions

- [ ] **Step 1: Write a workflow test by inspection**

Open `.github/workflows/archive-logs.yml` and verify the dispatch inputs and `nx run` invocations are ready to carry the new filter flags into both actions.

- [ ] **Step 2: Update the workflow to pass the new inputs through**

Add `workflow_dispatch` inputs for `name`, `status`, `event`, `branch`, and `actor`, then append the matching CLI flags when invoking the archive and delete commands.

- [ ] **Step 3: Run repository-level validation**

Run:

```bash
pnpm exec nx run codebase:analyze-code --configuration=write
pnpm exec nx run codebase:analyze-code --configuration=check
```

Expected: pass with no workflow, lint, markdown, spell-check, or type coverage regressions.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/archive-logs.yml README.md
git commit -m "ci(deployments): add archive log workflow filters"
```
