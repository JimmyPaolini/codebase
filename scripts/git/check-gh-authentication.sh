#!/usr/bin/env bash

set -euo pipefail

authentication_token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
github_host='github.com'

resolve_repository_owner() {
  if [[ -n "${GITHUB_REPOSITORY_OWNER:-}" ]]; then
    printf '%s' "${GITHUB_REPOSITORY_OWNER}"
    return 0
  fi

  local remote_url
  remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
  if [[ -z "${remote_url}" ]]; then
    return 1
  fi

  if [[ "${remote_url}" =~ ^git@github\.com:([^/]+)/[^/]+(\.git)?$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi

  if [[ "${remote_url}" =~ ^https://github\.com/([^/]+)/[^/]+(\.git)?$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

verify_github_cli_access() {
  local repository_owner
  repository_owner="$(resolve_repository_owner || true)"

  gh auth status --hostname "${github_host}" >/dev/null

  if [[ -n "${repository_owner}" ]]; then
    gh project list --owner "${repository_owner}" --limit 1 >/dev/null
  fi
}

if verify_github_cli_access; then
  exit 0
fi

if [[ -z "${authentication_token}" ]]; then
  echo '❌ GH CLI is not authenticated and GH_TOKEN/GITHUB_TOKEN are unavailable.' >&2
  exit 1
fi

if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  echo "::add-mask::${authentication_token}"
fi

mkdir -p "${HOME}/.config/gh"
rm -f "${HOME}/.config/gh/hosts.yml"

printf '%s' "${authentication_token}" | gh auth login --hostname "${github_host}" --with-token
gh auth setup-git

if ! verify_github_cli_access; then
  echo '❌ GH CLI authentication bootstrap failed.' >&2
  exit 1
fi
