# Archive Logs Workflow Run Filters Design

## Overview

Add optional workflow-run filters to the archive-logs tool so archive and delete operations can target a narrower set of GitHub Actions runs. The new filter model will support:

- `name` — workflow file name or workflow ID passed to GitHub's per-workflow runs endpoint
- `status`
- `event`
- `branch`
- `actor`

The filters must work for both archive and delete actions and must compose with the existing date-window rules.

## Goals

- Filter workflow runs server-side whenever GitHub supports it.
- Keep archive and delete behavior aligned by sharing the same filter model.
- Support combining filters with date windows.
- Avoid client-side post-filtering unless GitHub cannot express the filter.

## Non-Goals

- Filtering by the workflow run display title.
- Changing archive or delete retention semantics.
- Changing the workflow output format or archive layout.

## API Behavior

GitHub's repository-wide workflow-runs endpoint already supports:

- `actor`
- `branch`
- `event`
- `status`
- `created`
- `head_sha`
- `check_suite_id`
- `exclude_pull_requests`

For workflow-specific filtering, GitHub also supports the per-workflow runs endpoint:

`GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs`

For this feature, `name` means the workflow file name or workflow ID used in that endpoint, for example `archive-logs.yml`.

## Design

### Shared filter model

Introduce a shared `WorkflowRunFilters` type with optional properties:

- `name`
- `status`
- `event`
- `branch`
- `actor`

The archive and delete command option parsers will create this object and pass it into their services.

### URL construction

Add a shared helper for building the GitHub Actions runs URL from:

- repository slug
- filter object
- page number

Behavior:

- If `name` is present, use the per-workflow endpoint.
- Otherwise, use the repository-wide runs endpoint.
- Append any provided `status`, `event`, `branch`, and `actor` query parameters.

### Archive flow

The archive command keeps its existing date-window validation, then passes both the date window and the filter object to the archive service. The archive service uses the shared URL builder for pagination.

### Delete flow

The delete command keeps its existing date-window validation, then passes the filter object to the delete service. The delete service uses the same shared URL builder for pagination.

### Workflow dispatch inputs

Add matching workflow inputs for:

- `name`
- `status`
- `event`
- `branch`
- `actor`

The workflow should pass any supplied values through to the archive and delete commands.

## Validation Rules

- `name` is optional and only affects the API endpoint path.
- `status`, `event`, `branch`, and `actor` are optional and only affect query parameters.
- Filters may be combined with the archive date window and delete date window.
- Existing date validation remains unchanged.

## Error Handling

- Reject invalid `name` values only if GitHub rejects the resulting endpoint request.
- Preserve the existing CLI error behavior for missing date parameters or invalid RFC3339 values.
- Surface API failures directly from the command services.

## Testing

Add coverage for:

- command option parsing for the new filters
- URL building with and without `name`
- archive pagination with combined filters and date windows
- delete pagination with combined filters and date windows
- workflow dispatch wiring for the new inputs

## Open Questions

None. The `name` filter is intentionally defined as workflow file name / workflow ID, not display title.
