import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import _ from "lodash";

import {
  AGENT_SKILLS_DIRECTORY,
  AGENTS_DIRECTORY,
  AGENTS_MD_FILE,
  INSTALLED_SKILLS_LOCK_FILE,
} from "./agent-skills.constants";

import type {
  AgentSkillMetadata,
  CustomAgentMetadata,
  ExistingAgentParts,
  SkillSourceMetadata,
} from "./agent-skills.types";

/**
 * Extracts markdown body after frontmatter.
 */
export function extractBody(content: string): string {
  const match = /^---\n[\s\S]*?\n---\n([\s\S]*)/.exec(content);
  return match?.[1] ?? "";
}

/**
 * Extracts frontmatter/body from an existing agent file.
 */
export function extractExistingAgentParts(
  content: string,
): ExistingAgentParts | undefined {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!match) {
    return undefined;
  }

  return {
    body: match[2] ?? "",
    frontmatter: match[1] ?? "",
  };
}

/**
 * Extracts frontmatter key/value pairs from markdown content.
 */
export function extractFrontmatter(content: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) {
    return {};
  }

  const frontmatter: Record<string, string> = {};
  const lines = String(match[1]).split("\n");

  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(":").trim();
    }
  }

  return frontmatter;
}

/**
 * Generates full agent file content from source skill metadata.
 */
export function generateAgentFile(
  skill: SkillSourceMetadata,
  existingAgentContent?: string,
): string {
  if (existingAgentContent) {
    const existingAgentParts = extractExistingAgentParts(existingAgentContent);
    if (existingAgentParts !== undefined) {
      let frontmatter = existingAgentParts.frontmatter;
      frontmatter = upsertFrontmatterLine(
        frontmatter,
        "description",
        skill.description,
      );
      frontmatter = upsertFrontmatterLine(frontmatter, "name", skill.name);
      frontmatter = upsertFrontmatterLine(
        frontmatter,
        "argument-hint",
        skill.argumentHint,
      );

      return `---\n${frontmatter}\n---\n${skill.body.trimEnd()}\n`;
    }
  }

  const frontmatter = [
    `description: ${skill.description}`,
    `name: ${skill.name}`,
    `argument-hint: ${skill.argumentHint}`,
  ].join("\n");

  return `---\n${frontmatter}\n---\n${skill.body.trimEnd()}\n`;
}

/**
 * Reads AGENTS.md and slices content around a marker-bounded section.
 */
export function readAgentsSection(
  workspaceRoot: string,
  startMarker: string,
  endMarker: string,
): { afterMarker: string; beforeMarker: string; generatedContent: string } {
  const agentsFile = path.join(workspaceRoot, AGENTS_MD_FILE);
  const content = readFileSync(agentsFile, "utf8");

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `Markers not found in AGENTS.md. Expected to find "${startMarker}" and "${endMarker}"`,
    );
  }

  const beforeMarker = content.slice(
    0,
    Math.max(0, startIndex + startMarker.length),
  );
  const afterMarker = content.slice(Math.max(0, endIndex));
  const generatedContent = content.slice(
    startIndex + startMarker.length,
    endIndex,
  );

  return { afterMarker, beforeMarker, generatedContent };
}

/**
 * Reads all custom agent files for AGENTS.md custom-agent table generation.
 */
export function readCustomAgentsMetadata(
  workspaceRoot: string,
): CustomAgentMetadata[] {
  const agentsDirectory = path.join(workspaceRoot, AGENTS_DIRECTORY);
  const agents: CustomAgentMetadata[] = [];
  const entries = readdirSync(agentsDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() || !entry.name.endsWith(".agent.md")) {
      continue;
    }

    const agentPath = path.join(agentsDirectory, entry.name);

    try {
      const content = readFileSync(agentPath, "utf8");
      const frontmatter = extractFrontmatter(content);
      const nameStem = entry.name.replace(/\.agent\.md$/, "");
      const rawName = frontmatter["name"];
      const rawDescription = frontmatter["description"] ?? "";

      agents.push({
        description: rawDescription.replaceAll(/^["']|["']$/g, ""),
        fileName: entry.name,
        name: rawName ? rawName.replaceAll(/^["']|["']$/g, "") : nameStem,
      });
    } catch {
      continue;
    }
  }

  return _.sortBy(agents, (agent: CustomAgentMetadata) =>
    agent.name.toLowerCase(),
  );
}

/**
 * Reads the names of the skills installed from other repositories.
 *
 * Returns an empty set when there is no manifest, so a repository that
 * installs none lists everything it has.
 */
export function readInstalledSkillNames(workspaceRoot: string): Set<string> {
  try {
    const content = readFileSync(
      path.join(workspaceRoot, INSTALLED_SKILLS_LOCK_FILE),
      "utf8",
    );
    const manifest = JSON.parse(content) as {
      skills?: Record<string, unknown>;
    };

    return new Set(Object.keys(manifest.skills ?? {}));
  } catch {
    return new Set();
  }
}

/**
 * Parses a SKILL.md file into synchronized skill metadata.
 */
export function readSkillSourceFile(skillPath: string): SkillSourceMetadata {
  const content = readFileSync(skillPath, "utf8");
  const frontmatter = extractFrontmatter(content);
  const body = extractBody(content);

  return {
    argumentHint: frontmatter["argument-hint"] ?? "",
    body,
    description: frontmatter["description"] ?? "",
    name: frontmatter["name"] ?? "",
  };
}

/**
 * Reads the SKILL.md files this repository authored, for the AGENTS.md table.
 *
 * Skills installed from other repositories are left out. They are restored by
 * the `skills` CLI at whatever version their source holds now, so listing them
 * would make the table disagree with the working tree the moment an upstream
 * description changed — in continuous integration, on an unrelated change.
 */
export function readSkillTableMetadata(
  workspaceRoot: string,
): AgentSkillMetadata[] {
  const skillsDirectory = path.join(workspaceRoot, AGENT_SKILLS_DIRECTORY);
  const installedSkills = readInstalledSkillNames(workspaceRoot);
  const skills: AgentSkillMetadata[] = [];
  const entries = readdirSync(skillsDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      entry.name === "README.md" ||
      installedSkills.has(entry.name)
    ) {
      continue;
    }

    const skillPath = path.join(skillsDirectory, entry.name, "SKILL.md");
    try {
      const content = readFileSync(skillPath, "utf8");
      const frontmatter = extractFrontmatter(content);

      if (frontmatter["name"] && frontmatter["description"]) {
        skills.push({
          description: frontmatter["description"],
          filePath: `${AGENT_SKILLS_DIRECTORY}/${entry.name}/SKILL.md`,
          name: frontmatter["name"],
        });
      }
    } catch {
      continue;
    }
  }

  return _.sortBy(skills, (skill: AgentSkillMetadata) => skill.name);
}

/**
 * Renders custom agent metadata as markdown bullet rows.
 */
export function renderCustomAgentsTable(agents: CustomAgentMetadata[]): string {
  const rows = agents.map((agent) => {
    const filePath = `${AGENTS_DIRECTORY}/${agent.fileName}`;
    const link = `[${agent.name}](${filePath})`;
    return `- **${link}**: ${agent.description}`;
  });

  return rows.join("\n");
}

/**
 * Renders skill metadata as markdown bullet rows.
 */
export function renderSkillTable(skills: AgentSkillMetadata[]): string {
  const rows = skills.map((skill) => {
    const link = `[${skill.name}](${skill.filePath})`;
    return `- **${link}**: ${skill.description}`;
  });

  return rows.join("\n");
}

/**
 * Updates or appends a single frontmatter key while preserving unrelated fields.
 */
export function upsertFrontmatterLine(
  frontmatter: string,
  key: string,
  value: string,
): string {
  const lines = frontmatter.split("\n");
  const keyPattern = new RegExp(String.raw`^(\s*)${key}:\s*.*$`);
  const hasMatchingLine = lines.some((line) => keyPattern.test(line));

  if (!hasMatchingLine) {
    return [...lines, `${key}: ${value}`].join("\n");
  }

  return lines
    .map((line) => line.replace(keyPattern, `$1${key}: ${value}`))
    .join("\n");
}
