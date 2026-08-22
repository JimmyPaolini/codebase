#!/bin/bash

# Restore the skills declared in skills-lock.json into their gitignored
# .agents/skills/<name>/ folders.
#
# Invoked from the root postinstall so every environment that installs node
# dependencies — local clones, devcontainers, CI jobs, Claude Code worktrees —
# ends up holding the skills that the Agent Workflow in AGENTS.md points at.
# Without this the skills are declared but absent, and every skill link in
# AGENTS.md dangles.
#
# Three properties matter:
#
#   - Idempotent. Returns in milliseconds when every locked skill is already
#     present, rather than re-cloning every source repository. Set
#     SKILLS_INSTALL_FORCE=1 to re-run anyway and repair a damaged skill.
#   - Leaves tracked files alone. `skills experimental_install` rewrites
#     skills-lock.json with whatever hash each source holds right now, and
#     rewrites every skill folder with whatever content its source holds right
#     now. Left in place either would dirty the tree on every CI job and make
#     upgrade-dependencies.yml open an empty "upgrade" pull request on every
#     run, because it gates on `git diff --quiet`. One absent folder is enough
#     to refresh every skill whose upstream has moved, so both the lockfile and
#     the folders are returned to the committed content here. Moving the pins
#     forward is the job of `skills update`, which that workflow already runs.
#   - Non-fatal. Skills are agent context, not a build input. A GitHub outage or
#     rate limit must not break `pnpm install` for everyone, so this always
#     exits 0 and prints the recovery command instead. Returning the folders to
#     the committed content also means an outage leaves a committed skill in
#     place rather than absent — git already holds it, so only an entry the
#     lockfile has gained but the repository has not yet committed can go
#     missing.
#
# Set SKIP_SKILLS_INSTALL=1 to opt out entirely.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 0
cd "$ROOT" || exit 0

LOCKFILE="skills-lock.json"
SKILLS_DIRECTORY=".agents/skills"
RETRY_HINT="💡 Retry with 'pnpm exec nx run codebase:install-skills'"

if [ -n "${SKIP_SKILLS_INSTALL:-}" ]; then
  echo "🤹 SKIP_SKILLS_INSTALL is set, leaving skills alone"
  exit 0
fi

if [ ! -f "$LOCKFILE" ]; then
  exit 0
fi

# Locked skills whose SKILL.md is not on disk, space separated.
missing_skills() {
  node -e '
const fs = require("fs");
const { skills = {} } = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
const absent = Object.keys(skills).filter(
  (name) => !fs.existsSync(".agents/skills/" + name + "/SKILL.md"),
);
process.stdout.write(absent.join(" "));
' 2>/dev/null
}

MISSING="$(missing_skills)"

if [ -z "$MISSING" ] && [ -z "${SKILLS_INSTALL_FORCE:-}" ]; then
  echo "🤹 Skills already restored from $LOCKFILE"
  exit 0
fi

if [ -n "$MISSING" ]; then
  echo "🤹 Restoring $(echo "$MISSING" | wc -w | tr -d ' ') missing skills from $LOCKFILE"
else
  echo "🤹 SKILLS_INSTALL_FORCE is set, re-restoring every skill in $LOCKFILE"
fi

# Resolve the CLI. node_modules/.bin is linked before the root postinstall runs,
# but fall back to pnpm exec rather than assuming it.
if [ -x "node_modules/.bin/skills" ]; then
  SKILLS_COMMAND=("node_modules/.bin/skills")
elif command -v pnpm &>/dev/null; then
  SKILLS_COMMAND=(pnpm exec skills)
else
  echo "⚠️  The skills CLI is unavailable, so skills declared in $LOCKFILE are missing"
  echo "$RETRY_HINT"
  exit 0
fi

in_work_tree() {
  git rev-parse --is-inside-work-tree &>/dev/null
}

# Only worth restoring the lockfile if it started clean and we are in a work tree.
LOCKFILE_WAS_CLEAN=false
if in_work_tree && git diff --quiet -- "$LOCKFILE" &>/dev/null; then
  LOCKFILE_WAS_CLEAN=true
fi

if ! "${SKILLS_COMMAND[@]}" experimental_install; then
  echo "⚠️  Skill restoration did not complete"
fi

if [ "$LOCKFILE_WAS_CLEAN" = true ] &&
  ! git diff --quiet -- "$LOCKFILE" &>/dev/null; then
  git checkout -- "$LOCKFILE" &>/dev/null &&
    echo "🤹 Reverted the hashes rewritten in $LOCKFILE; 'skills update' moves the pins"
fi

# Return the skill folders to the content this repository pins.
#
# Restoration rewrites every folder with whatever its source holds now, so one
# absent folder is enough to refresh every skill whose upstream has moved. A
# single checkout covers all of them, and its tracked-only scope is exactly the
# split wanted: a folder the lockfile has gained but the repository has not
# committed yet is all that was fetched, so it is untracked and survives.
#
# It also means a committed skill reappears when the fetch failed outright, since
# git already holds it. An edit to an installed copy does not survive, but
# restoration overwrote it before this point regardless — installed skills are
# owned upstream, so the source repository is where to edit them.
if in_work_tree && ! git diff --quiet -- "$SKILLS_DIRECTORY" &>/dev/null; then
  git checkout -- "$SKILLS_DIRECTORY" &>/dev/null &&
    echo "🤹 Returned the skill folders to the committed content"
fi

STILL_MISSING="$(missing_skills)"
if [ -n "$STILL_MISSING" ]; then
  echo "⚠️  Skills still missing: $STILL_MISSING"
  echo "$RETRY_HINT"
  exit 0
fi

echo "✅ Restored every skill declared in $LOCKFILE"
