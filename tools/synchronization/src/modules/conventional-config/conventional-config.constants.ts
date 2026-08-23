// ♟️ Constants

/** Skill files that contain type and scope markdown tables. */
export const SYNC_CONVENTIONAL_CONFIG_SKILL_FILES = [
  ".agents/skills/rename-branch/SKILL.md",
  ".agents/skills/commit-code/SKILL.md",
  ".agents/skills/checkout-branch/SKILL.md",
  ".agents/skills/create-pull-request/SKILL.md",
  ".github/skills/triage-submission/SKILL.md",
  ".github/copilot-instructions.md",
];

/** Issue template files that contain type and scope dropdowns. */
export const SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES = [
  ".github/ISSUE_TEMPLATE/issue.yml",
];

/** Commit types excluded from release rules presence validation. */
export const RELEASE_RULES_SPECIAL_TYPES = new Set(["revert"]);
