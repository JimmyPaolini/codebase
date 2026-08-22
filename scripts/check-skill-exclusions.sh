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
# So the check has two halves. The first looks for a per-skill entry that is
# missing. The second looks for a wholesale `.agents/skills/` pattern outside the
# managed block, because re-adding one of those puts every per-skill entry back
# in place while quietly taking this repository's own 26 skills out of scope
# again — the missing-entry half would report nothing at all.
#
# `scripts/install-skills.sh` regenerates every one of these blocks from
# skills-lock.json on each install, so a missing-entry failure means a block was
# edited by hand or its marker comments were lost. It also refuses to write a
# skill name outside /^[a-z0-9-]+$/, so this check skips those names too rather
# than demanding entries the generator will never produce.

set -uo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"
cd "$REPOSITORY_ROOT" || exit 1

if [ ! -f skills-lock.json ]; then
  echo "🧩 No skills-lock.json, nothing to check"
  exit 0
fi

# Reports one "<file>\t<problem>" line per missing per-skill entry, and per
# wholesale `.agents/skills/` exclusion found outside the managed block.
MISSING=$(node -e '
const fs = require("fs");

// Must stay in step with the generator in scripts/install-skills.sh, which
// refuses to interpolate any other shape into five unescaped file formats. A
// skipped name has no entries to look for, so checking for them here would
// fail forever over a name the generator will never write.
const SKILL_NAME = /^[a-z0-9-]+$/;

const { skills = {} } = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
const names = Object.keys(skills).filter((name) => SKILL_NAME.test(name)).sort();

const START = "<!-- skill-exclusions-start -->";
const END = "<!-- skill-exclusions-end -->";

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

// A line inside the managed block, or one of its markers, is never a finding:
// the block is exactly the per-skill list this check wants to see.
function linesOutsideManagedBlock(contents) {
  const outside = [];
  let inside = false;
  for (const line of contents.split("\n")) {
    if (line.includes(START)) {
      inside = true;
      continue;
    }
    if (line.includes(END)) {
      inside = false;
      continue;
    }
    if (!inside) {
      outside.push(line);
    }
  }
  return outside;
}

// True for a pattern that excludes `.agents/skills/` as a whole rather than one
// named skill — `.agents/skills/`, `.agents/skills/**`, `**/.agents/skills/*`,
// and friends. Re-adding one of those silently stops the skills this
// repository owns from being checked, which is the whole reason the per-skill
// lists exist, and it does it without removing a single per-skill entry, so the
// missing-entry half of this check would never notice.
function isWholesalePattern(line) {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return false;
  }
  // Strip the list, quote, and attribute syntax the five formats wrap around a
  // pattern, leaving the pattern itself.
  const bare = trimmed
    .replace(/^-\s+/, "")
    .replace(/^!/, "")
    .replace(/[",]+$/, "")
    .replace(/^"/, "")
    .split(/\s+/)[0];
  const match = /(?:^|\/)\.agents\/skills(\/.*)?$/.exec(bare);
  if (match === null) {
    return false;
  }
  const remainder = (match[1] ?? "").replace(/^\//, "");
  return remainder === "" || /^\*{1,2}(\/\*{1,2})*$/.test(remainder);
}

// The root project.json narrows the spell-check and markdown-lint cache inputs
// with one negation per vendored skill, so editing a skill those tools already
// ignore does not invalidate them. Only the dangerous direction of drift is
// checked here. A vendored skill with no negation merely over-invalidates,
// which is harmless and was the behavior before the negations existed. A
// negation naming a skill that is no longer in the lockfile is the opposite:
// that skill is now one of ours, the tools do read it, and its edits would stop
// invalidating the cache — the stale-cache bug, in the direction that hides
// real findings.
function staleVendoredSkillInputs(names) {
  const path = "project.json";
  const { namedInputs = {} } = JSON.parse(fs.readFileSync(path, "utf8"));
  const declared = namedInputs["vendored-skills"] ?? [];
  const locked = new Set(names);
  const stale = [];
  for (const input of declared) {
    const match = /^!\{projectRoot\}\/\.agents\/skills\/([^/]+)\/\*\*$/.exec(input);
    if (match === null) {
      stale.push(`${path}\tremove the unrecognized vendored-skills input "${input}"`);
      continue;
    }
    if (!locked.has(match[1])) {
      stale.push(
        `${path}\tremove the stale vendored-skills input "${input}" — ${match[1]} is not in skills-lock.json, so it is one of ours and its edits must invalidate the cache`,
      );
    }
  }
  return stale;
}

const problems = staleVendoredSkillInputs(names);
for (const { path, entry } of files) {
  const contents = fs.readFileSync(path, "utf8");
  const lines = new Set(contents.split("\n").map((line) => line.trim()));
  for (const name of names) {
    if (!lines.has(entry(name))) {
      problems.push(`${path}\tadd the missing entry: ${entry(name)}`);
    }
  }
  for (const line of linesOutsideManagedBlock(contents)) {
    if (isWholesalePattern(line)) {
      problems.push(
        `${path}\tremove the wholesale exclusion "${line.trim()}" — it hides the skills this repository owns too`,
      );
    }
  }
}
process.stdout.write(problems.join("\n"));
' 2>&1)

if [ -n "$MISSING" ]; then
  echo "❌ The vendored-skill exclusions are wrong:"
  echo ""
  printf '%s\n' "$MISSING" | while IFS=$'\t' read -r file problem; do
    echo "   $file: $problem"
  done
  echo ""
  echo "💡 Regenerate the blocks with 'pnpm exec nx run codebase:install-skills',"
  echo "   or add the missing lines by hand. Installed skills must stay excluded"
  echo "   from prettier, codometer, Linguist, cspell, and markdownlint, so"
  echo "   upstream files are never reformatted, never counted as ours, never"
  echo "   attributed to this repository's languages, and never corrected to its"
  echo "   spelling and markdown conventions."
  echo ""
  echo "   The exclusions are listed one per skill on purpose. A wholesale"
  echo "   '.agents/skills/**' pattern would also exclude the 26 skills this"
  echo "   repository owns and maintains, which must keep being spell-checked,"
  echo "   markdown-linted, formatted, measured, and attributed like any other"
  echo "   documentation here. Exclude a vendored skill by name instead."
  exit 1
fi

echo "🧩 Every skill in skills-lock.json is excluded from prettier, codometer, Linguist, cspell, and markdownlint"
