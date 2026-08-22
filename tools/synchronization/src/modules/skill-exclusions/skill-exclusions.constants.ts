// ♟️ Constants

import type { SkillExclusionFile } from "./skill-exclusions.types";

/** Comment opening the generated block, shared by all three files. */
export const BLOCK_START_MARKER = "# installed-skills-start";

/** Comment closing the generated block. */
export const BLOCK_END_MARKER = "# installed-skills-end";

/**
 * The files that must name every installed skill.
 *
 * Every other tool in the repository scopes itself with explicit globs that
 * never include `.agents/`, so these three are the whole list. Adding a fourth
 * means adding its markers to the file in the same change.
 */
export const SKILL_EXCLUSION_FILES: SkillExclusionFile[] = [
  {
    filePath: ".gitattributes",
    renderEntry: (skillName) =>
      `.agents/skills/${skillName}/** linguist-vendored`,
    tool: "Linguist",
  },
  {
    filePath: "configuration/.codometerignore",
    renderEntry: (skillName) => `.agents/skills/${skillName}/`,
    tool: "codometer",
  },
  {
    // Prettier resolves ignore patterns relative to the ignore file, hence the
    // leading `**/`.
    filePath: "configuration/.prettierignore",
    renderEntry: (skillName) => `**/.agents/skills/${skillName}/**`,
    tool: "prettier",
  },
];
