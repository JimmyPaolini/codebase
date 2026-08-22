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
#   - All or nothing. The five exclusion files are staged beside their targets
#     and swapped in together, so a read-only file or a full disk cannot leave
#     four of them regenerated and the fifth stale.
#   - Honest about failure. A lockfile that cannot be read or parsed is
#     reported as such and never reported as "already restored"; a skill name
#     outside /^[a-z0-9-]+$/ is skipped by name rather than interpolated
#     unescaped into five different file formats.
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

# Rewrite the marker-delimited block in every exclusion file from the lockfile,
# printing the paths it actually changed. Each file gets the entry syntax its
# own tool reads, and only the lines between the markers are replaced.
#
# Names are checked against /^[a-z0-9-]+$/ before being interpolated, and the
# whole set of replacements is staged before any of them is swapped in, so a
# hostile name never corrupts a config and a failure never leaves the five
# files disagreeing with each other. Both reasons are spelled out in the node
# script below.
regenerate_skill_exclusions() {
  local changed status
  changed="$(node -e '
const fs = require("fs");

const LOCKFILE = "skills-lock.json";
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

// A name reaches five different file formats with no escaping, so only the
// conventional shape is written. A name holding a double quote would produce
// invalid JSON in .markdownlint-cli2.jsonc and a broken scalar in
// cspell.config.yaml; a name holding a space would split the .gitattributes
// pattern from its attribute; either one breaks markdown-lint and spell-check
// for the whole workspace on the next install. Escaping five syntaxes
// correctly is not worth it for a shape no source repository uses, so an
// out-of-convention name is skipped with a warning: a visibly missing
// exclusion beats a silently corrupted config.
const SKILL_NAME = /^[a-z0-9-]+$/;

function readUsableSkillNames() {
  let raw;
  try {
    raw = fs.readFileSync(LOCKFILE, "utf8");
  } catch (error) {
    throw new Error(`${LOCKFILE} could not be read: ${error.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${LOCKFILE} is not valid JSON: ${error.message}`);
  }
  const { skills = {} } = parsed ?? {};
  const usable = [];
  for (const name of Object.keys(skills).sort()) {
    if (SKILL_NAME.test(name)) {
      usable.push(name);
      continue;
    }
    process.stderr.write(
      `⚠️  Skipped the skill named ${JSON.stringify(name)} in ${LOCKFILE}: a skill name must match /^[a-z0-9-]+$/ to be written into an ignore file, a .gitattributes pattern, a JSONC list, and a YAML list without escaping\n`,
    );
  }
  return usable;
}

// Compute every replacement first. A file whose markers were edited away is
// reported and left alone rather than guessed at.
function planReplacements(names) {
  const pending = [];
  for (const { comment, entry, indent = "", path } of files) {
    const original = fs.readFileSync(path, "utf8");
    const startMarker = `${indent}${comment} ${START}`;
    const endMarker = `${indent}${comment} ${END}`;
    const startIndex = original.indexOf(startMarker);
    const endIndex = original.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      process.stderr.write(`⚠️  ${path} has no ${START} block, so its exclusions were left alone\n`);
      continue;
    }
    const block = names.map((name) => `${indent}${entry(name)}`).join("\n");
    const updated = `${original.slice(0, startIndex)}${startMarker}\n${block}\n${original.slice(endIndex)}`;
    if (updated !== original) {
      pending.push({ path, updated });
    }
  }
  return pending;
}

// Stage each replacement beside its target, then swap them all in. Writing in
// place would leave a truncated file behind on a failure part-way through, and
// writing the files one at a time would leave the five disagreeing when the
// third one failed. A rename inside a directory that already accepted the
// temporary file does not fail, so the set lands together or not at all, and
// the original mode rides along with it.
function applyReplacements(pending) {
  const staged = [];
  try {
    for (const { path, updated } of pending) {
      const { mode } = fs.statSync(path);
      const temporaryPath = `${path}.skill-exclusions-${process.pid}`;
      fs.writeFileSync(temporaryPath, updated, { mode });
      fs.chmodSync(temporaryPath, mode);
      staged.push({ path, temporaryPath });
    }
  } catch (error) {
    for (const { temporaryPath } of staged) {
      fs.rmSync(temporaryPath, { force: true });
    }
    throw new Error(`no exclusion file was changed: ${error.message}`);
  }
  for (const { path, temporaryPath } of staged) {
    fs.renameSync(temporaryPath, path);
  }
  return staged.map(({ path }) => path);
}

// One catch at the top so a failure reads as a sentence in the install log
// rather than a node stack trace in every pnpm install output.
try {
  process.stdout.write(applyReplacements(planReplacements(readUsableSkillNames())).join(", "));
} catch (error) {
  process.stderr.write(`⚠️  ${error.message}\n`);
  process.exit(1);
}
')"
  status=$?

  if [ "$status" -ne 0 ]; then
    echo "⚠️  Could not regenerate the vendored-skill exclusions from $LOCKFILE"
    echo "$RETRY_HINT"
    return 0
  fi

  if [ -n "$changed" ]; then
    echo "🧩 Regenerated the vendored-skill exclusions in $changed"
  fi
}

regenerate_skill_exclusions

# Locked skills whose SKILL.md is not on disk, space separated. Exits non-zero
# when the lockfile itself could not be read or parsed, so "nothing is missing"
# is never confused with "nothing could be read" — the old version swallowed
# both into an empty result and then reported success over a corrupt lockfile.
locked_skills_missing_from_disk() {
  node -e '
const fs = require("fs");
try {
  const parsed = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
  const { skills = {} } = parsed ?? {};
  const absent = Object.keys(skills).filter(
    (name) => !fs.existsSync(".agents/skills/" + name + "/SKILL.md"),
  );
  process.stdout.write(absent.join(" "));
} catch (error) {
  process.stderr.write(`⚠️  skills-lock.json could not be listed: ${error.message}\n`);
  process.exit(1);
}
'
}

if MISSING="$(locked_skills_missing_from_disk)"; then
  LOCKFILE_READABLE=true
else
  LOCKFILE_READABLE=false
  MISSING=""
fi

if [ "$LOCKFILE_READABLE" = false ]; then
  echo "⚠️  $LOCKFILE could not be read, so no skill was restored and none was verified"
  echo "$RETRY_HINT"
  exit 0
fi

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

if ! STILL_MISSING="$(locked_skills_missing_from_disk)"; then
  echo "⚠️  Restoration ran, but $LOCKFILE could not be re-read to confirm the result"
  echo "$RETRY_HINT"
  exit 0
fi
if [ -n "$STILL_MISSING" ]; then
  echo "⚠️  Skills still missing: $STILL_MISSING"
  echo "$RETRY_HINT"
  exit 0
fi

echo "✅ Restored every skill declared in $LOCKFILE"
