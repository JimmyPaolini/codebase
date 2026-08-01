#!/usr/bin/env bash

set -e

commit_gpg_sign="$(git config --bool --get commit.gpgsign || true)"
if [[ "$commit_gpg_sign" != "true" ]]; then
  echo "❌ Git commit signing is required. Set commit.gpgsign=true before committing." >&2
  exit 1
fi

signing_key="$(git config --get user.signingkey || true)"
if [[ -z "$signing_key" ]]; then
  echo "❌ Git signing key is required. Set user.signingkey before committing." >&2
  exit 1
fi

if ! command -v gpg > /dev/null 2>&1; then
  echo "❌ gpg is required for commit signing but was not found in PATH." >&2
  exit 1
fi

if ! gpg --list-secret-keys --keyid-format=long "$signing_key" | grep -q '^sec'; then
  echo "❌ No GPG secret key found for user.signingkey=$signing_key." >&2
  exit 1
fi

if [[ "${SKIP_GPG_SIGNING_SMOKE_TEST:-}" == "true" ]]; then
  exit 0
fi

# The smoke test can trigger interactive pinentry prompts. Keep it enabled for
# local sessions, but skip it in CI/headless execution contexts.
if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
  exit 0
fi

tree_hash="$(git write-tree)"
test_commit_message='commit-signing-smoke-test'

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  parent_commit_hash="$(git rev-parse HEAD)"
  test_commit_hash="$(
    printf '%s' "$test_commit_message" | \
      git commit-tree "$tree_hash" -p "$parent_commit_hash" -S
  )"
else
  test_commit_hash="$(
    printf '%s' "$test_commit_message" | \
      git commit-tree "$tree_hash" -S
  )"
fi

if ! git verify-commit "$test_commit_hash" > /dev/null 2>&1; then
  echo '❌ Git commit signing smoke test failed (git commit-tree -S / git verify-commit).' >&2
  exit 1
fi
