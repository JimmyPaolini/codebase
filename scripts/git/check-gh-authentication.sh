#!/usr/bin/env bash

set -euo pipefail

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

if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]]; then
  echo '❌ GH CLI is not authenticated and GH_TOKEN/GITHUB_TOKEN are unavailable.' >&2
  exit 1
fi

authenticate_with_token() {
  local authentication_token="$1"

  # Return codes:
  # 0 => authenticated and verified
  # 1 => token login failed (fallback token may be attempted)
  # 2 => non-token setup failure (do not attempt fallback token)
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::add-mask::${authentication_token}"
  fi

  mkdir -p "${HOME}/.config/gh"
  rm -f "${HOME}/.config/gh/hosts.yml"

  if ! printf '%s' "${authentication_token}" | gh auth login --hostname "${github_host}" --with-token; then
    return 1
  fi

  if ! gh auth setup-git; then
    echo '❌ GH CLI authenticated but failed to configure git credential helper.' >&2
    return 2
  fi

  verify_github_cli_access
}

if [[ -n "${GH_TOKEN:-}" ]]; then
  authentication_status=0
  authenticate_with_token "${GH_TOKEN}" || authentication_status=$?

  if [[ "${authentication_status}" -eq 0 ]]; then
    exit 0
  fi

  if [[ "${authentication_status}" -eq 2 ]]; then
    exit 1
  fi
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  authentication_status=0
  authenticate_with_token "${GITHUB_TOKEN}" || authentication_status=$?

  if [[ "${authentication_status}" -eq 0 ]]; then
    exit 0
  fi

  if [[ "${authentication_status}" -eq 2 ]]; then
    exit 1
  fi
fi

echo '❌ GH CLI authentication bootstrap failed.' >&2
exit 1
