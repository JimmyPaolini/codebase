import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractBody,
  extractExistingAgentParts,
  extractFrontmatter,
  generateAgentFile,
  readAgentsSection,
  readCustomAgentsMetadata,
  readInstalledSkillNames,
  readSkillSourceFile,
  readSkillTableMetadata,
  renderCustomAgentsTable,
  renderSkillTable,
  upsertFrontmatterLine,
} from "./agent-skills-sync.utilities";
import {
  AGENT_SKILLS_TOC_END,
  AGENT_SKILLS_TOC_START,
  AGENTS_DIRECTORY,
  CUSTOM_AGENTS_TOC_END,
  CUSTOM_AGENTS_TOC_START,
} from "./agent-skills.constants";

interface DirectoryEntryLike {
  isDirectory: () => boolean;
  name: string;
}

const fileContents = new Map<string, string>();
const directoryEntries = new Map<string, DirectoryEntryLike[]>();

const createDirectoryEntry = (
  name: string,
  isDirectory: boolean,
): DirectoryEntryLike => {
  return {
    isDirectory: () => isDirectory,
    name,
  };
};

vi.mock("node:fs", () => {
  return {
    readdirSync: vi.fn<(directoryPath: string) => DirectoryEntryLike[]>(
      (directoryPath: string) => {
        return directoryEntries.get(directoryPath) ?? [];
      },
    ),
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
  };
});

describe("agent-skills-sync utilities", () => {
  beforeEach(() => {
    fileContents.clear();
    directoryEntries.clear();
    vi.clearAllMocks();
  });

  it("extracts body content after frontmatter", () => {
    const content = [
      "---",
      "name: skill-name",
      'description: "A description"',
      "---",
      "",
      "# Body",
      "content",
    ].join("\n");

    expect(extractBody(content)).toBe("\n# Body\ncontent");
  });

  it("returns empty body when frontmatter is missing", () => {
    expect(extractBody("# No frontmatter")).toBe("");
  });

  it("extracts frontmatter and body from an existing agent file", () => {
    const content = [
      "---",
      "name: old-name",
      "description: old-description",
      "---",
      "# Existing body",
    ].join("\n");

    expect(extractExistingAgentParts(content)).toStrictEqual({
      body: "# Existing body",
      frontmatter: "name: old-name\ndescription: old-description",
    });
  });

  it("returns undefined when existing agent content has no frontmatter", () => {
    expect(extractExistingAgentParts("# body only")).toBeUndefined();
  });

  it("parses frontmatter key value pairs", () => {
    const content = [
      "---",
      "name: test-skill",
      'description: "Description with : colon"',
      'argument-hint: "Hint"',
      "---",
      "# Body",
    ].join("\n");

    expect(extractFrontmatter(content)).toStrictEqual({
      "argument-hint": '"Hint"',
      description: '"Description with : colon"',
      name: "test-skill",
    });
  });

  it("ignores malformed frontmatter lines", () => {
    const content = [
      "---",
      "name: test-skill",
      "invalid-line-without-colon",
      "description: description",
      "---",
    ].join("\n");

    expect(extractFrontmatter(content)).toStrictEqual({
      description: "description",
      name: "test-skill",
    });
  });

  it("returns an empty object when frontmatter is not present", () => {
    expect(extractFrontmatter("# Body")).toStrictEqual({});
  });

  it("upserts existing frontmatter fields and preserves unrelated fields", () => {
    const frontmatter = [
      'description: "Old"',
      "name: old",
      "agents:",
      "  - explore-codebase",
    ].join("\n");

    const updated = upsertFrontmatterLine(frontmatter, "name", "new-name");

    expect(updated).toContain("name: new-name");
    expect(updated).toContain("agents:");
    expect(updated).toContain("  - explore-codebase");
  });

  it("appends a new frontmatter field when key is missing", () => {
    const frontmatter = "name: skill-name";

    expect(
      upsertFrontmatterLine(frontmatter, "argument-hint", '"Describe intent"'),
    ).toBe('name: skill-name\nargument-hint: "Describe intent"');
  });

  it("generates a new agent file when no existing content is provided", () => {
    const generated = generateAgentFile({
      argumentHint: '"Ask one question"',
      body: "# Body\ntext\n",
      description: '"Description"',
      name: "question-me",
    });

    expect(generated).toBe(
      [
        "---",
        'description: "Description"',
        "name: question-me",
        'argument-hint: "Ask one question"',
        "---",
        "# Body",
        "text",
        "",
      ].join("\n"),
    );
  });

  it("preserves unsynced frontmatter fields when regenerating an existing agent file", () => {
    const existingAgentContent = [
      "---",
      'description: "Old"',
      "name: old-name",
      'argument-hint: "Old hint"',
      "agents:",
      "  - explore-codebase",
      "tools:",
      "  - read",
      "---",
      "# Existing body",
      "details",
    ].join("\n");

    const generated = generateAgentFile(
      {
        argumentHint: '"New hint"',
        body: "# New body\ncontent\n",
        description: '"New description"',
        name: "new-name",
      },
      existingAgentContent,
    );

    expect(generated).toContain('description: "New description"');
    expect(generated).toContain("name: new-name");
    expect(generated).toContain('argument-hint: "New hint"');
    expect(generated).toContain("agents:");
    expect(generated).toContain("tools:");
    expect(generated).toContain("# New body");
  });

  it("falls back to a fresh template when existing content is not an agent document", () => {
    const generated = generateAgentFile(
      {
        argumentHint: '"New hint"',
        body: "# New body\n",
        description: '"New description"',
        name: "new-name",
      },
      "not-a-frontmatter-agent-file",
    );

    expect(generated).toContain('description: "New description"');
    expect(generated).toContain("name: new-name");
    expect(generated).toContain('argument-hint: "New hint"');
  });

  it("reads AGENTS.md content between markers", () => {
    const workspaceRoot = "/workspace";
    const agentsFile = path.join(workspaceRoot, "AGENTS.md");

    fileContents.set(
      agentsFile,
      [
        "header",
        CUSTOM_AGENTS_TOC_START,
        "- one",
        CUSTOM_AGENTS_TOC_END,
        "footer",
      ].join("\n"),
    );

    expect(
      readAgentsSection(
        workspaceRoot,
        CUSTOM_AGENTS_TOC_START,
        CUSTOM_AGENTS_TOC_END,
      ),
    ).toStrictEqual({
      afterMarker: `${CUSTOM_AGENTS_TOC_END}\nfooter`,
      beforeMarker: `header\n${CUSTOM_AGENTS_TOC_START}`,
      generatedContent: "\n- one\n",
    });
  });

  it("throws when AGENTS.md markers are missing", () => {
    const workspaceRoot = "/workspace";
    const agentsFile = path.join(workspaceRoot, "AGENTS.md");
    fileContents.set(agentsFile, "header\nfooter");

    expect(() =>
      readAgentsSection(
        workspaceRoot,
        CUSTOM_AGENTS_TOC_START,
        CUSTOM_AGENTS_TOC_END,
      ),
    ).toThrow("Markers not found in AGENTS.md. Expected to find");
  });

  it("reads and sorts custom agent metadata, skipping unreadable files", () => {
    const workspaceRoot = "/workspace";
    const agentsDirectory = path.join(workspaceRoot, AGENTS_DIRECTORY);

    directoryEntries.set(agentsDirectory, [
      createDirectoryEntry("notes.md", false),
      createDirectoryEntry("folder", true),
      createDirectoryEntry("zeta.agent.md", false),
      createDirectoryEntry("alpha.agent.md", false),
      createDirectoryEntry("broken.agent.md", false),
    ]);

    fileContents.set(
      path.join(agentsDirectory, "alpha.agent.md"),
      [
        "---",
        'name: "Alpha Agent"',
        'description: "Alpha description"',
        "---",
      ].join("\n"),
    );

    fileContents.set(
      path.join(agentsDirectory, "zeta.agent.md"),
      ["---", 'name: "zeta"', "---"].join("\n"),
    );

    expect(readCustomAgentsMetadata(workspaceRoot)).toStrictEqual([
      {
        description: "Alpha description",
        fileName: "alpha.agent.md",
        name: "Alpha Agent",
      },
      {
        description: "",
        fileName: "zeta.agent.md",
        name: "zeta",
      },
    ]);
  });

  it("falls back to the filename stem when custom agent frontmatter has no name", () => {
    const workspaceRoot = "/workspace";
    const agentsDirectory = path.join(workspaceRoot, AGENTS_DIRECTORY);

    directoryEntries.set(agentsDirectory, [
      createDirectoryEntry("missing-name.agent.md", false),
    ]);

    fileContents.set(
      path.join(agentsDirectory, "missing-name.agent.md"),
      ["---", "description: no name provided", "---"].join("\n"),
    );

    expect(readCustomAgentsMetadata(workspaceRoot)).toStrictEqual([
      {
        description: "no name provided",
        fileName: "missing-name.agent.md",
        name: "missing-name",
      },
    ]);
  });

  it("parses a skill source file", () => {
    const skillPath = "/workspace/.agents/skills/question-me/SKILL.md";

    fileContents.set(
      skillPath,
      [
        "---",
        "name: question-me",
        'description: "Description"',
        'argument-hint: "Hint"',
        "---",
        "# Body",
      ].join("\n"),
    );

    expect(readSkillSourceFile(skillPath)).toStrictEqual({
      argumentHint: '"Hint"',
      body: "# Body",
      description: '"Description"',
      name: "question-me",
    });
  });

  it("returns empty defaults for missing skill frontmatter fields", () => {
    const skillPath = "/workspace/.agents/skills/question-me/SKILL.md";

    fileContents.set(skillPath, ["---", "name: question-me", "---"].join("\n"));

    expect(readSkillSourceFile(skillPath)).toStrictEqual({
      argumentHint: "",
      body: "",
      description: "",
      name: "question-me",
    });
  });

  it("returns an empty name when skill frontmatter omits the name field", () => {
    const skillPath = "/workspace/.agents/skills/question-me/SKILL.md";

    fileContents.set(
      skillPath,
      ["---", "description: Just a description", "---"].join("\n"),
    );

    expect(readSkillSourceFile(skillPath)).toStrictEqual({
      argumentHint: "",
      body: "",
      description: "Just a description",
      name: "",
    });
  });

  it("reads and sorts skill table metadata, skipping invalid or unreadable files", () => {
    const workspaceRoot = "/workspace";
    const skillsDirectory = path.join(workspaceRoot, ".agents/skills");

    directoryEntries.set(skillsDirectory, [
      createDirectoryEntry("beta", true),
      createDirectoryEntry("README.md", true),
      createDirectoryEntry("alpha", true),
      createDirectoryEntry("missing", true),
      createDirectoryEntry("invalid", true),
      createDirectoryEntry("notes.md", false),
    ]);

    fileContents.set(
      path.join(skillsDirectory, "alpha", "SKILL.md"),
      ["---", "name: alpha", "description: alpha description", "---"].join(
        "\n",
      ),
    );
    fileContents.set(
      path.join(skillsDirectory, "beta", "SKILL.md"),
      ["---", "name: beta", "description: beta description", "---"].join("\n"),
    );
    fileContents.set(
      path.join(skillsDirectory, "invalid", "SKILL.md"),
      ["---", "name: invalid", "---"].join("\n"),
    );

    expect(readSkillTableMetadata(workspaceRoot)).toStrictEqual([
      {
        description: "alpha description",
        filePath: ".agents/skills/alpha/SKILL.md",
        name: "alpha",
      },
      {
        description: "beta description",
        filePath: ".agents/skills/beta/SKILL.md",
        name: "beta",
      },
    ]);
  });

  it("leaves out skills installed from other repositories", () => {
    const workspaceRoot = "/workspace";
    const skillsDirectory = path.join(workspaceRoot, ".agents", "skills");

    directoryEntries.set(skillsDirectory, [
      createDirectoryEntry("authored", true),
      createDirectoryEntry("borrowed", true),
    ]);
    fileContents.set(
      path.join(skillsDirectory, "authored", "SKILL.md"),
      ["---", "name: authored", "description: written here", "---"].join("\n"),
    );
    fileContents.set(
      path.join(skillsDirectory, "borrowed", "SKILL.md"),
      ["---", "name: borrowed", "description: written elsewhere", "---"].join(
        "\n",
      ),
    );
    fileContents.set(
      path.join(workspaceRoot, "skills-lock.json"),
      JSON.stringify({ skills: { borrowed: { source: "someone/skills" } } }),
    );

    // The borrowed skill is restored at whatever version its source holds now,
    // so the table would disagree with the tree the moment upstream changed.
    expect(readSkillTableMetadata(workspaceRoot)).toStrictEqual([
      {
        description: "written here",
        filePath: ".agents/skills/authored/SKILL.md",
        name: "authored",
      },
    ]);
  });

  it("reads the installed skill names from the manifest", () => {
    const workspaceRoot = "/workspace";

    fileContents.set(
      path.join(workspaceRoot, "skills-lock.json"),
      JSON.stringify({ skills: { one: {}, two: {} }, version: 1 }),
    );

    expect(readInstalledSkillNames(workspaceRoot)).toStrictEqual(
      new Set(["one", "two"]),
    );
  });

  it("treats a missing manifest as no installed skills", () => {
    expect(readInstalledSkillNames("/nowhere")).toStrictEqual(new Set());
  });

  it("treats a manifest without skills as no installed skills", () => {
    const workspaceRoot = "/workspace";

    fileContents.set(
      path.join(workspaceRoot, "skills-lock.json"),
      JSON.stringify({ version: 1 }),
    );

    expect(readInstalledSkillNames(workspaceRoot)).toStrictEqual(new Set());
  });

  it("renders custom agent table rows", () => {
    expect(
      renderCustomAgentsTable([
        {
          description: "Desc",
          fileName: "question-me.agent.md",
          name: "question-me",
        },
      ]),
    ).toBe("- **[question-me](.github/agents/question-me.agent.md)**: Desc");
  });

  it("renders skill table rows", () => {
    expect(
      renderSkillTable([
        {
          description: "Desc",
          filePath: ".agents/skills/question-me/SKILL.md",
          name: "question-me",
        },
      ]),
    ).toBe("- **[question-me](.agents/skills/question-me/SKILL.md)**: Desc");
  });

  it("reads the skills AGENTS.md section markers", () => {
    const workspaceRoot = "/workspace";
    const agentsFile = path.join(workspaceRoot, "AGENTS.md");

    fileContents.set(
      agentsFile,
      [
        "header",
        AGENT_SKILLS_TOC_START,
        "- row",
        AGENT_SKILLS_TOC_END,
        "footer",
      ].join("\n"),
    );

    const section = readAgentsSection(
      workspaceRoot,
      AGENT_SKILLS_TOC_START,
      AGENT_SKILLS_TOC_END,
    );

    expect(section.generatedContent.trim()).toBe("- row");
  });
});
