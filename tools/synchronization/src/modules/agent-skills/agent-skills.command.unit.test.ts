import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import {
  generateAgentFile,
  readAgentsSection,
  readCustomAgentsMetadata,
  readSkillSourceFile,
  readSkillTableMetadata,
  renderCustomAgentsTable,
  renderSkillTable,
} from "./agent-skills-sync.utilities";
import { AgentSkillsCommand } from "./agent-skills.command";
import {
  AGENT_SKILLS_TOC_END,
  AGENT_SKILLS_TOC_START,
  CUSTOM_AGENTS_TOC_END,
  CUSTOM_AGENTS_TOC_START,
} from "./agent-skills.constants";

import type {
  AgentSkillMetadata,
  CustomAgentMetadata,
  SkillSourceMetadata,
  WriteSkillAgentFilesOptions,
} from "./agent-skills.types";

class TestableAgentSkillsCommand extends AgentSkillsCommand {
  // 🧪 Test Helpers

  public callWriteSkillAgentFiles(options: WriteSkillAgentFilesOptions): void {
    this.writeSkillAgentFiles(options);
  }
}

vi.mock("node:fs", () => ({
  readFileSync: vi.fn<(filePath: string) => string>(),
  writeFileSync: vi.fn<(filePath: string, content: string) => void>(),
}));

vi.mock("./agent-skills-sync.utilities", () => ({
  generateAgentFile:
    vi.fn<
      (skill: SkillSourceMetadata, existingAgentContent?: string) => string
    >(),
  readAgentsSection: vi.fn<
    (
      workspaceRoot: string,
      startMarker: string,
      endMarker: string,
    ) => {
      afterMarker: string;
      beforeMarker: string;
      generatedContent: string;
    }
  >(),
  readCustomAgentsMetadata:
    vi.fn<(workspaceRoot: string) => CustomAgentMetadata[]>(),
  readSkillSourceFile: vi.fn<(skillPath: string) => SkillSourceMetadata>(),
  readSkillTableMetadata:
    vi.fn<(workspaceRoot: string) => AgentSkillMetadata[]>(),
  renderCustomAgentsTable: vi.fn<(agents: CustomAgentMetadata[]) => string>(),
  renderSkillTable: vi.fn<(skills: AgentSkillMetadata[]) => string>(),
}));

describe(AgentSkillsCommand, () => {
  let command: AgentSkillsCommand;
  let logger: LoggerService;
  let synchronizationService: SynchronizationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AgentSkillsCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(AgentSkillsCommand);
    logger = await module.resolve(LoggerService);
    synchronizationService = await module.resolve(SynchronizationService);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(readSkillSourceFile).mockReturnValue({
      argumentHint: '"hint"',
      body: "# Body",
      description: '"description"',
      name: "question-me",
    });
    vi.mocked(generateAgentFile).mockReturnValue("generated-content\n");
    vi.mocked(readCustomAgentsMetadata).mockReturnValue([
      {
        description: "Question helper",
        fileName: "question-me.agent.md",
        name: "question-me",
      },
    ]);
    vi.mocked(renderCustomAgentsTable).mockReturnValue(
      "- **[question-me](.github/agents/question-me.agent.md)**: Question helper",
    );
    vi.mocked(readSkillTableMetadata).mockReturnValue([
      {
        description: "Question helper",
        filePath: ".agents/skills/question-me/SKILL.md",
        name: "question-me",
      },
    ]);
    vi.mocked(renderSkillTable).mockReturnValue(
      "- **[question-me](.agents/skills/question-me/SKILL.md)**: Question helper",
    );
    vi.mocked(readAgentsSection).mockImplementation(
      (_workspaceRoot: string, startMarker: string) => {
        if (startMarker === CUSTOM_AGENTS_TOC_START) {
          return {
            afterMarker: `${CUSTOM_AGENTS_TOC_END}\nfooter`,
            beforeMarker: `header\n${CUSTOM_AGENTS_TOC_START}`,
            generatedContent:
              "\n- **[question-me](.github/agents/question-me.agent.md)**: Question helper\n",
          };
        }

        if (startMarker === AGENT_SKILLS_TOC_START) {
          return {
            afterMarker: `${AGENT_SKILLS_TOC_END}\nfooter`,
            beforeMarker: `header\n${AGENT_SKILLS_TOC_START}`,
            generatedContent:
              "\n- **[question-me](.agents/skills/question-me/SKILL.md)**: Question helper\n",
          };
        }

        return {
          afterMarker: "",
          beforeMarker: "",
          generatedContent: "",
        };
      },
    );
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      if (typeof filePath !== "string") {
        throw new TypeError("Unexpected non-string read path");
      }

      if (filePath.endsWith(".agent.md")) {
        return "generated-content\n";
      }

      throw new Error(`Unexpected read path: ${filePath}`);
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        AgentSkillsCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("AgentSkillsCommand");
  });

  it("exits with error for invalid mode", async () => {
    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Rejected an unusable mode",
      undefined,
      expect.any(Object),
    );
  });

  it("runs check mode when all synchronized files are in sync", async () => {
    await command.run(["check"]);

    expect(logger.log).toHaveBeenCalledWith(
      "📄 Verified the plan agent files",
      undefined,
      expect.any(Object),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📄 Verified the triage agent files",
      undefined,
      expect.any(Object),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Verified the custom agents table",
      undefined,
      expect.any(Object),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Verified the skills table",
      undefined,
      expect.any(Object),
    );
  });

  it("exits in check mode when an agent file is out of sync", async () => {
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      if (typeof filePath !== "string") {
        throw new TypeError("Unexpected non-string read path");
      }

      if (filePath.endsWith("explore-codebase.agent.md")) {
        return "actual-content\n";
      }

      return "generated-content\n";
    });

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📄 Detected an out-of-sync agent file .github/agents/explore-codebase.agent.md",
    );
  });

  it("exits in check mode when an agent file is missing", async () => {
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      if (typeof filePath !== "string") {
        throw new TypeError("Unexpected non-string read path");
      }

      if (filePath.endsWith("explore-codebase.agent.md")) {
        throw new Error("File not found");
      }

      return "generated-content\n";
    });

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📄 Missing agent file .github/agents/explore-codebase.agent.md",
    );
  });

  it("exits in check mode when a plan agent file is out of sync", async () => {
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      if (typeof filePath !== "string") {
        throw new TypeError("Unexpected non-string read path");
      }

      if (filePath.endsWith("explore-internet.agent.md")) {
        return "actual-content\n";
      }

      return "generated-content\n";
    });

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📄 Detected an out-of-sync agent file .github/agents/explore-internet.agent.md",
    );
  });

  it("exits in check mode when a triage agent file is out of sync", async () => {
    vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
      if (typeof filePath !== "string") {
        throw new TypeError("Unexpected non-string read path");
      }

      if (filePath.endsWith("triage-deployment.agent.md")) {
        return "actual-content\n";
      }

      return "generated-content\n";
    });

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📄 Detected an out-of-sync agent file .github/agents/triage-deployment.agent.md",
    );
  });

  it("exits in check mode when custom agents table is out of sync", async () => {
    vi.mocked(readAgentsSection).mockImplementation(
      (_workspaceRoot: string, startMarker: string) => {
        if (startMarker === CUSTOM_AGENTS_TOC_START) {
          return {
            afterMarker: `${CUSTOM_AGENTS_TOC_END}\nfooter`,
            beforeMarker: `header\n${CUSTOM_AGENTS_TOC_START}`,
            generatedContent: "out-of-sync-content",
          };
        }

        return {
          afterMarker: `${AGENT_SKILLS_TOC_END}\nfooter`,
          beforeMarker: `header\n${AGENT_SKILLS_TOC_START}`,
          generatedContent:
            "\n- **[question-me](.agents/skills/question-me/SKILL.md)**: Question helper\n",
        };
      },
    );

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📇 Detected an out-of-sync custom agents table in AGENTS.md",
      undefined,
      expect.any(Object),
    );
  });

  it("exits in check mode when skills table is out of sync", async () => {
    vi.mocked(readAgentsSection).mockImplementation(
      (_workspaceRoot: string, startMarker: string) => {
        if (startMarker === CUSTOM_AGENTS_TOC_START) {
          return {
            afterMarker: `${CUSTOM_AGENTS_TOC_END}\nfooter`,
            beforeMarker: `header\n${CUSTOM_AGENTS_TOC_START}`,
            generatedContent:
              "\n- **[question-me](.github/agents/question-me.agent.md)**: Question helper\n",
          };
        }

        return {
          afterMarker: `${AGENT_SKILLS_TOC_END}\nfooter`,
          beforeMarker: `header\n${AGENT_SKILLS_TOC_START}`,
          generatedContent: "out-of-sync-content",
        };
      },
    );

    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.log).toHaveBeenCalledWith(
      "📇 Detected an out-of-sync skills table in AGENTS.md",
      undefined,
      expect.any(Object),
    );
  });

  it("runs write mode and updates agent and AGENTS files", async () => {
    vi.mocked(readCustomAgentsMetadata).mockReturnValue([
      {
        description: "Question helper",
        fileName: "question-me.agent.md",
        name: "question-me",
      },
      {
        description: "Plan helper",
        fileName: "create-plan.agent.md",
        name: "create-plan",
      },
    ]);

    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("missing existing file");
    });

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(6);
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(
        path.join(".github", "agents", "explore-codebase.agent.md"),
      ),
      "generated-content\n",
      "utf8",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📄 Synced .github/agents/explore-codebase.agent.md",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Updated AGENTS.md",
      undefined,
      expect.any(Object),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Updated AGENTS.md",
      undefined,
      expect.any(Object),
    );
  });

  it("logs question-me update output in question-me mode", () => {
    const testableCommand = new TestableAgentSkillsCommand(
      logger,
      synchronizationService,
    );

    testableCommand.callWriteSkillAgentFiles({
      configurations: [
        {
          agentFile: ".github/agents/question-me.agent.md",
          skillFile: ".agents/skills/brainstorming/SKILL.md",
        },
      ],
      questionMeMode: true,
      startMessage: "🔄 Syncing question-me agent file...",
      workspaceRoot: "/workspace",
    });

    expect(logger.log).toHaveBeenCalledWith("📄 Updated question-me.agent.md");
  });

  it("handles runtime errors by logging and exiting", async () => {
    vi.mocked(readSkillSourceFile).mockImplementation(() => {
      throw new Error("cannot read skill");
    });

    await expectProcessExitOne(async () => command.run(["write"]));

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing agent skills",
      expect.any(String),
    );
  });
});
