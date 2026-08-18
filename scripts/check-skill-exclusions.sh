#!/bin/bash

# Check that every skill in skills-lock.json is excluded from the tools that
# would otherwise measure, reformat, or attribute it.
#
# Installed skills are committed so a fresh worktree has them, but they are
# owned upstream, so anything that reaches `.agents/` has to skip them:
#
#   - prettier scans `.`, so it would reformat upstream files
#   - codometer scans `--directory .`, so it would count them as ours
#   - GitHub Linguist reads every committed file, so it would attribute their
#     languages to this repository
#
# Every other tool here scopes itself with explicit globs that never include
# `.agents/`, so none of them needs an entry.
#
# All three files list skills one per line rather than excluding
# `.agents/skills/` wholesale, so that this repository's own skills in the same
# directory keep being checked, measured, and attributed. That is what makes this
# check necessary: a skill added to the lockfile by `skills update` is committed,
# but stays invisible to all three until someone adds it. Nothing else would
# notice — the symptom is a silently reformatted upstream file, a badge that
# counts somebody else's code, or a language bar dominated by a vendored bundle.

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
// the ignore file, hence the **/ prefix; codometer matches from the root; and
// .gitattributes pairs a pattern with the attribute Linguist reads.
const files = [
  { path: "configuration/.prettierignore", entry: (name) => `**/.agents/skills/${name}/**` },
  { path: "configuration/.codometerignore", entry: (name) => `.agents/skills/${name}/` },
  { path: ".gitattributes", entry: (name) => `.agents/skills/${name}/** linguist-vendored` },
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
  echo "💡 Add the missing lines, or regenerate each block from skills-lock.json."
  echo "   Installed skills must stay excluded from prettier, codometer, and"
  echo "   Linguist, so upstream files are never reformatted, never counted as"
  echo "   ours, and never attributed to this repository's languages."
  exit 1
fi

echo "🧩 Every skill in skills-lock.json is excluded from prettier, codometer, and Linguist"
