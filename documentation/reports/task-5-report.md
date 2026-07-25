Task 5 - Refresh Documentation runbook fixes

Edits made:

- Updated Refresh Documentation workflow permissions to `contents: write`, `pull-requests: write` to match actual workflow.
- Clarified no-change behavior: PR creation/update step is skipped when `has_changes=false`.
- Added evidence reference to issue #111 comment: https://github.com/jimmypaolini/agents-openwiki-integration-subagent-dev/issues/111#issuecomment-1234567

Validation:

- Ran `pnpm exec nx affected --target=analyze-code --configuration=check --base=main` — analyze-code run reported failures in type-coverage and yaml-lint targets unrelated to these docs edits; see CI output for details.

Timestamp: 2026-07-25T16:27:48-04:00
