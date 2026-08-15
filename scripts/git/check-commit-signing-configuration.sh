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

# The smoke test signs a throwaway commit object. It runs in CI too, so that a
# key whose passphrase the agent cannot supply fails here in seconds rather than
# minutes later, when semantic-release writes the release commit and the whole
# release silently does not ship.
#
# Interactive pinentry cannot work on a headless runner, so in CI gpg is routed
# through a loopback wrapper: it still uses a passphrase the agent has cached,
# but fails immediately instead of trying to prompt for one.
git_options=()

if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
  gpg_wrapper="$(mktemp)"
  trap 'rm -f "$gpg_wrapper"' EXIT
  cat > "$gpg_wrapper" << 'GPG_WRAPPER'
#!/usr/bin/env bash
exec gpg --batch --no-tty --pinentry-mode loopback "$@"
GPG_WRAPPER
  chmod +x "$gpg_wrapper"
  git_options+=(-c "gpg.program=$gpg_wrapper")
fi

tree_hash="$(git write-tree)"
test_commit_message='commit-signing-smoke-test'

parent_options=()
if git rev-parse --verify HEAD > /dev/null 2>&1; then
  parent_options+=(-p "$(git rev-parse HEAD)")
fi

# gpg's own stderr is left visible on purpose: it names the actual failure.
if ! test_commit_hash="$(
  printf '%s' "$test_commit_message" | \
    git "${git_options[@]}" commit-tree "$tree_hash" "${parent_options[@]}" -S
)"; then
  echo "❌ Git commit signing smoke test failed: gpg could not sign with user.signingkey=$signing_key." >&2
  echo '   Verify the GPG key and its passphrase match (GPG_PRIVATE_KEY / GPG_PASSPHRASE in CI).' >&2
  exit 1
fi

if ! git "${git_options[@]}" verify-commit "$test_commit_hash" > /dev/null 2>&1; then
  echo '❌ Git commit signing smoke test failed: the test signature did not verify.' >&2
  exit 1
fi
