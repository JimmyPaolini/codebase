// ♟️ Constants

import type { AgentFileSyncConfig } from "./agent-skills.types";

/** Directory containing all custom GitHub Copilot agent definition files. */
export const AGENTS_DIRECTORY = ".github/agents";

/** Root AGENTS.md file path. */
export const AGENTS_MD_FILE = "AGENTS.md";

/** Source-of-truth directory for repository skills. */
export const AGENT_SKILLS_DIRECTORY = ".agents/skills";

/**
 * Manifest of skills installed from other repositories.
 *
 * Its keys name every skill the `skills` CLI manages, which is how a skill
 * this repository authored is told apart from one it borrowed.
 */
export const INSTALLED_SKILLS_LOCK_FILE = "skills-lock.json";

/** Start marker for the custom agents table of contents in AGENTS.md. */
export const CUSTOM_AGENTS_TOC_START =
  "<!-- custom-agents-table-of-contents start -->";

/** End marker for the custom agents table of contents in AGENTS.md. */
export const CUSTOM_AGENTS_TOC_END =
  "<!-- custom-agents-table-of-contents end -->";

/** Start marker for the skill table of contents in AGENTS.md. */
export const AGENT_SKILLS_TOC_START =
  "<!-- agent-skills-table-of-contents start -->";

/** End marker for the skill table of contents in AGENTS.md. */
export const AGENT_SKILLS_TOC_END =
  "<!-- agent-skills-table-of-contents end -->";

/** Skill-to-agent mappings for plan-related agents. */
export const PLAN_AGENT_CONFIGS: AgentFileSyncConfig[] = [
  {
    agentFile: ".github/agents/explore-codebase.agent.md",
    skillFile: `${AGENT_SKILLS_DIRECTORY}/explore-codebase/SKILL.md`,
  },
];

/** Skill-to-agent mappings for triage agents. */
export const TRIAGE_AGENT_CONFIGS: AgentFileSyncConfig[] = [
  {
    agentFile: ".github/agents/triage-deployment.agent.md",
    skillFile: `${AGENT_SKILLS_DIRECTORY}/triage-deployment/SKILL.md`,
  },
  {
    agentFile: ".github/agents/triage-submission.agent.md",
    skillFile: `${AGENT_SKILLS_DIRECTORY}/triage-submission/SKILL.md`,
  },
];
