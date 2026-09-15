#!/bin/bash
#
# sessionStart hook — shares one Nx cache across every worktree of this repo.
#
#   - No-op in the main checkout (nothing to redirect it to)
#   - No-op once a worktree's .nx/cache and .nx/workspace-data already symlink
#     to the main checkout's
#   - Otherwise replaces both with symlinks into the main checkout and injects
#     a note as additionalContext
#
# Each worktree is its own Nx workspace root, so each gets its own gitignored
# .nx/cache and .nx/workspace-data by default — a cold cache per worktree, and
# nx.json's cacheDirectory does not help because it is a relative path. Both
# directories must move together: the cache directory holds a task's output
# files, but the workspace-data database is what records that a hash is
# cached at all, so symlinking only one leaves the other still recomputing.
#
# This does mean every worktree's own Nx daemon writes to that same database
# concurrently. Task outputs are content-addressed by hash, so two worktrees
# writing the same hash write identical bytes — not a conflict. The database
# is SQLite, which tolerates concurrent access but is not built for several
# independent daemons hammering it at once, so a `nx affected` run in more
# than one worktree at the exact same moment can hit a lock retry or drop a
# cache-hit record. Nx falls back to rerunning that task rather than
# corrupting anything.

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIRECTORY/../.." && pwd)"

command -v git >/dev/null 2>&1 || exit 0
cd "$REPOSITORY_ROOT" || exit 0

GIT_DIRECTORY="$(git rev-parse --git-dir 2>/dev/null)" || exit 0
GIT_COMMON_DIRECTORY="$(git rev-parse --git-common-dir 2>/dev/null)" || exit 0
ABSOLUTE_GIT_DIRECTORY="$(cd "$GIT_DIRECTORY" && pwd)"
ABSOLUTE_GIT_COMMON_DIRECTORY="$(cd "$GIT_COMMON_DIRECTORY" && pwd)"

# 🌳 Worktree detection

# The main checkout's own git-dir is its common-dir; a linked worktree's is a
# subdirectory of the common-dir's "worktrees" folder instead.
[ "$ABSOLUTE_GIT_DIRECTORY" = "$ABSOLUTE_GIT_COMMON_DIRECTORY" ] && exit 0

MAIN_CHECKOUT_ROOT="$(dirname "$ABSOLUTE_GIT_COMMON_DIRECTORY")"
[ "$MAIN_CHECKOUT_ROOT" = "$REPOSITORY_ROOT" ] && exit 0

# 🔗 Linking

LINKED_ANYTHING=false

for NAME in cache workspace-data; do
  TARGET="$MAIN_CHECKOUT_ROOT/.nx/$NAME"
  LINK="$REPOSITORY_ROOT/.nx/$NAME"

  mkdir -p "$TARGET" "$REPOSITORY_ROOT/.nx"

  [ -L "$LINK" ] && [ "$(readlink "$LINK")" = "$TARGET" ] && continue

  rm -rf "$LINK"
  ln -s "$TARGET" "$LINK"
  LINKED_ANYTHING=true
done

[ "$LINKED_ANYTHING" = false ] && exit 0

# 📋 Context

CONTEXT="🔗 Linked this worktree's .nx/cache and .nx/workspace-data to the main checkout's ($MAIN_CHECKOUT_ROOT), so Nx task results are shared across worktrees instead of rebuilt from scratch in each one.
⚠️  Every worktree's Nx daemon now writes to that same shared database concurrently. Running \`nx affected\` in several worktrees at the exact same moment can occasionally hit a SQLite lock retry or drop a cache-hit record — Nx just reruns that task, it does not corrupt the cache."

printf '%s' "$CONTEXT" | bash "$SCRIPT_DIRECTORY/emit-session-hook-context.sh"
