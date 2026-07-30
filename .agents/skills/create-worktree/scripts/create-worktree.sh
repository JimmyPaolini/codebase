#!/usr/bin/env bash

set -e

show_help() {
  cat <<'EOF'
Usage: create-worktree.sh <branch-name> [base-branch] [worktree-path]

Create or attach a git worktree after validating the branch name against this
repository's naming convention.

Arguments:
  <branch-name>   Required. Must match <type>/<scope>-<description>
  [base-branch]   Optional. Defaults to main when creating a new branch
  [worktree-path] Optional. Defaults to ../<repo-name>-worktrees/<sanitized-branch>

Examples:
  create-worktree.sh feat/lexico-user-auth
  create-worktree.sh fix/conformance-generator-path main
  create-worktree.sh docs/codebase-worktree-skill main ../sandbox/docs-worktree
EOF
}

branch_name="${1:-}"
base_branch="${2:-main}"
requested_path="${3:-}"

if [[ "$branch_name" == "-h" || "$branch_name" == "--help" || -z "$branch_name" ]]; then
  show_help
  exit 0
fi

workspace_root="$(git rev-parse --show-toplevel)"
repository_name="$(basename "$workspace_root")"
sanitized_branch_name="${branch_name//\//-}"
default_parent_directory="$(dirname "$workspace_root")/${repository_name}-worktrees"

if [[ -n "$requested_path" ]]; then
  target_path="$requested_path"
else
  target_path="$default_parent_directory/$sanitized_branch_name"
fi

cd "$workspace_root"

pnpm exec validate-branch-name -t "$branch_name"

if [[ -e "$target_path" ]]; then
  echo "Worktree path already exists: $target_path" >&2
  exit 1
fi

if git worktree list --porcelain | grep -Fqx "branch refs/heads/$branch_name"; then
  mkdir -p "$(dirname "$target_path")"
  git worktree add "$target_path" "$branch_name"
  echo "Attached existing branch '$branch_name' at '$target_path'"
  exit 0
fi

if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
  echo "Base branch not found locally: $base_branch" >&2
  exit 1
fi

mkdir -p "$(dirname "$target_path")"
git worktree add -b "$branch_name" "$target_path" "$base_branch"
echo "Created branch '$branch_name' from '$base_branch' at '$target_path'"
