#!/bin/bash
#
# sessionStart hook — validates git commit signing configuration.
#
#   - Silent when GPG signing is configured correctly
#   - Injects the signing error + stop directive as additionalContext when
#     commit signing is not configured
#

# ✅ Validation

if [[ -n "${GITHUB_ACTIONS:-}" || -n "${CI:-}" ]]; then
	ERROR=$(SKIP_GPG_SIGNING_SMOKE_TEST=true bash scripts/git/check-commit-signing-configuration.sh 2>&1 || true)
else
	ERROR=$(bash scripts/git/check-commit-signing-configuration.sh 2>&1 || true)
fi
[ -z "$ERROR" ] && exit 0

# 📋 Context

CONTEXT="$ERROR
🚨 Git commit signing is required in this repository.

Action required:
1. Stop and do not create commits until signing is configured.
2. Confirm repository environment \"copilot\" has secrets \"GPG_PRIVATE_KEY\" and \"GPG_PASSPHRASE\".
3. Re-run workflow \".github/workflows/copilot-setup-steps.yml\" so the GPG key is imported and signing is enabled.
4. Start a fresh cloud agent session after the workflow completes.
5. Re-run \"bash scripts/git/check-commit-signing-configuration.sh\".
6. If signatures still are not verified, add the matching public key to GitHub: Settings -> SSH and GPG keys."

printf '%s' "$CONTEXT" | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d.toString()));
process.stdin.on('end', () => process.stdout.write(JSON.stringify({ additionalContext: chunks.join('') })));
"
