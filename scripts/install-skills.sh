#!/bin/bash

# Restore the skills declared in skills-lock.json into their gitignored
# .agents/skills/<name>/ folders, and regenerate the vendored-skill exclusion
# blocks that keep those skills out of the five tools whose scan reaches
# `.agents/`.
#
# Invoked from the root postinstall so every environment that installs node
# dependencies — local clones, devcontainers, CI jobs, Claude Code worktrees —
# ends up holding the skills that the Agent Workflow in AGENTS.md points at.
# Without this the skills are declared but absent, and every skill link in
# AGENTS.md dangles.
#
# The exclusion blocks are regenerated on every run, before the restoration
# shortcut, so a skill that `skills update` adds to the lockfile is excluded in
# the same install rather than staying exposed to those tools until someone
# notices. The generator owns only the region between its marker comments, so
# hand-written entries around it are never disturbed, and
# `nx run codebase:check-skill-exclusions` verifies the result.
#
# Three properties matter:
#
#   - Idempotent. Returns in milliseconds when every locked skill is already
#     present, rather than re-cloning every source repository, and rewrites an
#     exclusion file only when its managed block would actually change. Set
#     SKILLS_INSTALL_FORCE=1 to re-run anyway and repair a damaged skill.
#   - Leaves tracked files alone. `skills experimental_install` rewrites
#     skills-lock.json with whatever hash each source holds right now. Left in
#     place that would dirty the tree on every CI job and make
#     upgrade-dependencies.yml open an empty "upgrade" pull request on every
#     run, because it gates on `git diff --quiet`. Moving the pins forward is
#     the job of `skills update`, which that workflow already runs.
#   - Non-fatal. Skills are agent context, not a build input. A GitHub outage or
#     rate limit must not break `pnpm install` for everyone, so this always
#     exits 0 and prints the recovery command instead.
#
# Set SKIP_SKILLS_INSTALL=1 to opt out entirely.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 0
cd "$ROOT" || exit 0

LOCKFILE="skills-lock.json"
RETRY_HINT="💡 Retry with 'pnpm exec nx run codebase:install-skills'"

if [ -n "${SKIP_SKILLS_INSTALL:-}" ]; then
  echo "🤹 SKIP_SKILLS_INSTALL is set, leaving skills alone"
  exit 0
fi

if [ ! -f "$LOCKFILE" ]; then
  exit 0
fi

# Rewrite the marker-delimited block in every exclusion file from the lockfile,
# printing the paths it actually changed. Each file gets the entry syntax its
# own tool reads, and only the lines between the markers are replaced.
regenerate_skill_exclusions() {
  local changed
  changed="$(node -e '
const fs = require("fs");

const { skills = {} } = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
const names = Object.keys(skills).sort();

const START = "<!-- skill-exclusions-start -->";
const END = "<!-- skill-exclusions-end -->";

// prettier resolves ignore patterns relative to the ignore file, hence the **/
// prefix; codometer matches from the root; .gitattributes pairs a pattern with
// the attribute Linguist reads; cspell and markdownlint-cli2 take a list entry
// in their own configuration syntax, indented to sit inside it.
const files = [
  { path: ".gitattributes", comment: "#", entry: (name) => `.agents/skills/${name}/** linguist-vendored` },
  { path: "configuration/.codometerignore", comment: "#", entry: (name) => `.agents/skills/${name}/` },
  { path: "configuration/.markdownlint-cli2.jsonc", comment: "//", indent: "    ", entry: (name) => `".agents/skills/${name}/**",` },
  { path: "configuration/.prettierignore", comment: "#", entry: (name) => `**/.agents/skills/${name}/**` },
  { path: "configuration/cspell.config.yaml", comment: "#", indent: "  ", entry: (name) => `- "**/.agents/skills/${name}/**"` },
];

const changed = [];
for (const { comment, entry, indent = "", path } of files) {
  const original = fs.readFileSync(path, "utf8");
  const startMarker = `${indent}${comment} ${START}`;
  const endMarker = `${indent}${comment} ${END}`;
  const startIndex = original.indexOf(startMarker);
  const endIndex = original.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    console.error(`⚠️  ${path} has no ${START} block, so its exclusions were left alone`);
    continue;
  }
  const block = names.map((name) => `${indent}${entry(name)}`).join("\n");
  const updated = `${original.slice(0, startIndex)}${startMarker}\n${block}\n${original.slice(endIndex)}`;
  if (updated !== original) {
    fs.writeFileSync(path, updated);
    changed.push(path);
  }
}
process.stdout.write(changed.join(", "));
')" || {
    echo "⚠️  Could not regenerate the vendored-skill exclusions from $LOCKFILE"
    return 0
  }

  if [ -n "$changed" ]; then
    echo "🧩 Regenerated the vendored-skill exclusions in $changed"
  fi
}

regenerate_skill_exclusions

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

# Only worth restoring the lockfile if it started clean and we are in a work tree.
LOCKFILE_WAS_CLEAN=false
if git rev-parse --is-inside-work-tree &>/dev/null &&
  git diff --quiet -- "$LOCKFILE" &>/dev/null; then
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

STILL_MISSING="$(missing_skills)"
if [ -n "$STILL_MISSING" ]; then
  echo "⚠️  Skills still missing: $STILL_MISSING"
  echo "$RETRY_HINT"
  exit 0
fi

echo "✅ Restored every skill declared in $LOCKFILE"
