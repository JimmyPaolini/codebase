#!/bin/bash
#
# sessionStart hook — validates gh authentication.
#
#   - Silent when gh authentication is valid
#   - Injects the gh auth error + stop directive as additionalContext when
#     authentication is unavailable or insufficient
#

# ✅ Validation

ERROR=$(bash scripts/git/check-gh-authentication.sh 2>&1 || true)
[ -z "$ERROR" ] && exit 0

# 📋 Context

CONTEXT="$ERROR
🚨 GitHub authentication is required in this repository.

Action required:
1. Stop and do not continue this session until GitHub authentication is valid.
2. Confirm repository environment \"copilot\" has a valid \"GH_TOKEN\" (recommended).
3. Re-run workflow \".github/workflows/copilot-setup-steps.yml\" to bootstrap gh authentication.
4. Start a fresh cloud agent session after the workflow completes.
5. Re-run \"bash scripts/git/check-gh-authentication.sh\".
6. If project access still fails, verify token scopes include repository + Projects access."

printf '%s' "$CONTEXT" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d.toString()));
process.stdin.on('end', () => process.stdout.write(JSON.stringify({ additionalContext: chunks.join('') })));
"
