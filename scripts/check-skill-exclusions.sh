#!/bin/bash

# Check that every skill in skills-lock.json is excluded from the tools that
# would otherwise measure, reformat, correct, or attribute it.
#
# Installed skills are committed so a fresh worktree has them, but they are
# owned upstream, so anything that reaches `.agents/` has to skip them:
#
#   - prettier scans `.`, so it would reformat upstream files
#   - codometer scans `--directory .`, so it would count them as ours
#   - GitHub Linguist reads every committed file, so it would attribute their
#     languages to this repository
#   - cspell reads `.agents/`, so it would demand upstream prose match this
#     repository's dictionaries and its ban on abbreviations
#   - markdownlint reads `.agents/`, so it would demand upstream markdown match
#     this repository's rule set
#
# Every other tool here scopes itself with explicit globs that never include
# `.agents/`, so none of them needs an entry.
#
# All five files list skills one per line rather than excluding
# `.agents/skills/` wholesale, so that this repository's own skills in the same
# directory keep being checked, measured, corrected, and attributed. That is what
# makes this check necessary: a skill added to the lockfile by `skills update` is
# committed, but stays invisible to all five until someone adds it. Nothing else
# would notice — the symptom is a silently reformatted upstream file, a badge that
# counts somebody else's code, a language bar dominated by a vendored bundle, or a
# spell-check failure over somebody else's British spelling.
#
# `scripts/install-skills.sh` regenerates every one of these blocks from
# skills-lock.json on each install, so a failure here means a block was edited by
# hand or its marker comments were lost.

set -uo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"
cd "$REPOSITORY_ROOT" || exit 1

if [ ! -f skills-lock.json ]; then
  echo "🧩 No skills-lock.json, nothing to check"
  exit 0
fi

# Reports one "<file>\t<skill>" line per skill missing from either ignore file.
MISSING=$(node -e '
const fs = require("fs");

const { skills = {} } = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
const names = Object.keys(skills).sort();

// Each file has its own syntax: prettier resolves ignore patterns relative to
// the ignore file, hence the **/ prefix; codometer matches from the root;
// .gitattributes pairs a pattern with the attribute Linguist reads; and cspell
// and markdownlint-cli2 each take a quoted list entry in their own
// configuration syntax. Must stay in step with the generator in
// scripts/install-skills.sh, which writes these same entries.
const files = [
  { path: "configuration/.prettierignore", entry: (name) => `**/.agents/skills/${name}/**` },
  { path: "configuration/.codometerignore", entry: (name) => `.agents/skills/${name}/` },
  { path: ".gitattributes", entry: (name) => `.agents/skills/${name}/** linguist-vendored` },
  { path: "configuration/cspell.config.yaml", entry: (name) => `- "**/.agents/skills/${name}/**"` },
  { path: "configuration/.markdownlint-cli2.jsonc", entry: (name) => `".agents/skills/${name}/**",` },
];

const problems = [];
for (const { path, entry } of files) {
  const lines = new Set(
    fs.readFileSync(path, "utf8").split("\n").map((line) => line.trim()),
  );
  for (const name of names) {
    if (!lines.has(entry(name))) {
      problems.push(`${path}\t${entry(name)}`);
    }
  }
}
process.stdout.write(problems.join("\n"));
' 2>&1)

if [ -n "$MISSING" ]; then
  echo "❌ Skills in skills-lock.json are not fully excluded:"
  echo ""
  printf '%s\n' "$MISSING" | while IFS=$'\t' read -r file entry; do
    echo "   $file needs: $entry"
  done
  echo ""
  echo "💡 Regenerate the blocks with 'pnpm exec nx run codebase:install-skills',"
  echo "   or add the missing lines by hand. Installed skills must stay excluded"
  echo "   from prettier, codometer, Linguist, cspell, and markdownlint, so"
  echo "   upstream files are never reformatted, never counted as ours, never"
  echo "   attributed to this repository's languages, and never corrected to its"
  echo "   spelling and markdown conventions."
  exit 1
fi

echo "🧩 Every skill in skills-lock.json is excluded from prettier, codometer, Linguist, cspell, and markdownlint"
