import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";
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
import {
  AGENT_SKILLS_TOC_END,
  AGENT_SKILLS_TOC_START,
  AGENTS_MD_FILE,
  CUSTOM_AGENTS_TOC_END,
  CUSTOM_AGENTS_TOC_START,
  PLAN_AGENT_CONFIGS,
  TRIAGE_AGENT_CONFIGS,
} from "./agent-skills.constants";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type {
  AgentFileSyncConfig,
  WriteSkillAgentFilesOptions,
} from "./agent-skills.types";

/**
 * CLI command that synchronizes all agent-skill artifacts.
 */
@Command({
  description: "Run the agent-skills command",
  name: "agent-skills",
})
@Injectable()
export class AgentSkillsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(AgentSkillsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "agent-skills";

  // 🔏 Private Methods

  /**
   * Validates the generated custom-agents AGENTS.md section.
   */
  private checkCustomAgentsTable(workspaceRoot: string): boolean {
    const agents = readCustomAgentsMetadata(workspaceRoot);
    const generatedList = renderCustomAgentsTable(agents);
    const { generatedContent } = readAgentsSection(
      workspaceRoot,
      CUSTOM_AGENTS_TOC_START,
      CUSTOM_AGENTS_TOC_END,
    );

    if (generatedList.trim() !== generatedContent.trim()) {
      this.logger.log(
        "📇 Detected an out-of-sync custom agents table in AGENTS.md",
        undefined,
        { count: agents.length, hint: "Run 'nx run synchronization:synchronize:write' to sync" },
      );
      return false;
    }

    this.logger.log(
      "📇 Verified the custom agents table",
      undefined,
      { count: agents.length },
    );
    return true;
  }

  /**
   * Validates one agent file against its source skill file.
   */
  private checkSingleSkillAgentFile(
    configuration: AgentFileSyncConfig,
    workspaceRoot: string,
  ): boolean {
    const skill = readSkillSourceFile(
      path.join(workspaceRoot, configuration.skillFile),
    );
    const agentPath = path.join(workspaceRoot, configuration.agentFile);

    let actualContent: string;
    try {
      actualContent = readFileSync(agentPath, "utf8");
    } catch {
      this.logger.log(`📄 Missing agent file ${configuration.agentFile}`);
      return false;
    }

    const expectedContent = generateAgentFile(skill, actualContent);
    if (expectedContent !== actualContent) {
      this.logger.log(
        `📄 Detected an out-of-sync agent file ${configuration.agentFile}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Validates a set of agent files against their source skill files.
   */
  private checkSkillAgentFiles(
    configurations: AgentFileSyncConfig[],
    workspaceRoot: string,
    successMessage: string,
    successCount: number,
  ): boolean {
    let allInSync = true;

    for (const configuration of configurations) {
      if (!this.checkSingleSkillAgentFile(configuration, workspaceRoot)) {
        allInSync = false;
      }
    }

    if (!allInSync) {
      this.logger.log("💡 Suggested a fix", undefined, { hint: "Run 'nx run synchronization:synchronize:write' to sync" });
      return false;
    }

    this.logger.log(successMessage, undefined, { count: successCount });
    return true;
  }

  /**
   * Validates the generated skills AGENTS.md section.
   */
  private checkSkillsTable(workspaceRoot: string): boolean {
    const skills = readSkillTableMetadata(workspaceRoot);
    const generatedTable = renderSkillTable(skills);
    const { generatedContent } = readAgentsSection(
      workspaceRoot,
      AGENT_SKILLS_TOC_START,
      AGENT_SKILLS_TOC_END,
    );

    if (generatedTable.trim() !== generatedContent.trim()) {
      this.logger.log(
        "📇 Detected an out-of-sync skills table in AGENTS.md",
        undefined,
        { count: skills.length, hint: "Run 'nx run synchronization:synchronize:write' to sync" },
      );
      return false;
    }

    this.logger.log(
      "📇 Verified the skills table",
      undefined,
      { count: skills.length },
    );
    return true;
  }

  /**
   * Runs all check-mode validations and reports whether every one passed.
   *
   * Each check runs even after an earlier one fails, so a single run surfaces
   * all drift rather than only the first instance.
   */
  private runCheckMode(workspaceRoot: string): boolean {
    const planInSync = this.checkSkillAgentFiles(
      PLAN_AGENT_CONFIGS,
      workspaceRoot,
      "📄 Verified the plan agent files",
      PLAN_AGENT_CONFIGS.length,
    );

    const triageInSync = this.checkSkillAgentFiles(
      TRIAGE_AGENT_CONFIGS,
      workspaceRoot,
      "📄 Verified the triage agent files",
      TRIAGE_AGENT_CONFIGS.length,
    );

    const customAgentsInSync = this.checkCustomAgentsTable(workspaceRoot);
    const skillsInSync = this.checkSkillsTable(workspaceRoot);

    return planInSync && triageInSync && customAgentsInSync && skillsInSync;
  }

  /**
   * Runs all write-mode synchronization operations.
   */
  private runWriteMode(workspaceRoot: string): void {
    this.writeSkillAgentFiles({
      configurations: PLAN_AGENT_CONFIGS,
      startMessage: "🔄 Syncing plan agent files from SKILL.md sources...",
      workspaceRoot,
    });

    this.writeSkillAgentFiles({
      configurations: TRIAGE_AGENT_CONFIGS,
      startMessage: "🔄 Syncing triage agent files from SKILL.md sources...",
      workspaceRoot,
    });

    this.writeCustomAgentsTable(workspaceRoot);
    this.writeSkillsTable(workspaceRoot);
  }

  /**
   * Writes the generated custom-agents AGENTS.md section.
   */
  private writeCustomAgentsTable(workspaceRoot: string): void {
    const agents = readCustomAgentsMetadata(workspaceRoot);
    const generatedList = renderCustomAgentsTable(agents);
    const { afterMarker, beforeMarker } = readAgentsSection(
      workspaceRoot,
      CUSTOM_AGENTS_TOC_START,
      CUSTOM_AGENTS_TOC_END,
    );

    this.logger.log("🔄 Generating custom agents table of contents...");
    writeFileSync(
      path.join(workspaceRoot, AGENTS_MD_FILE),
      `${beforeMarker}\n${generatedList}\n${afterMarker}`,
      "utf8",
    );

    this.logger.log("📇 Updated AGENTS.md", undefined, {
      count: agents.length,
    });
  }

  /**
   * Writes one agent file from its source skill file.
   */
  private writeSingleSkillAgentFile(
    configuration: AgentFileSyncConfig,
    workspaceRoot: string,
  ): void {
    const skill = readSkillSourceFile(
      path.join(workspaceRoot, configuration.skillFile),
    );
    const agentPath = path.join(workspaceRoot, configuration.agentFile);

    let existingAgentContent: string | undefined;
    try {
      existingAgentContent = readFileSync(agentPath, "utf8");
    } catch {
      existingAgentContent = undefined;
    }

    const content = generateAgentFile(skill, existingAgentContent);
    writeFileSync(agentPath, content, "utf8");
  }

  /**
   * Writes the generated skills AGENTS.md section.
   */
  private writeSkillsTable(workspaceRoot: string): void {
    const skills = readSkillTableMetadata(workspaceRoot);
    const generatedTable = renderSkillTable(skills);
    const { afterMarker, beforeMarker } = readAgentsSection(
      workspaceRoot,
      AGENT_SKILLS_TOC_START,
      AGENT_SKILLS_TOC_END,
    );

    this.logger.log("🔄 Generating skills table of contents...");
    writeFileSync(
      path.join(workspaceRoot, AGENTS_MD_FILE),
      `${beforeMarker}\n${generatedTable}\n${afterMarker}`,
      "utf8",
    );
    this.logger.log("📇 Updated AGENTS.md", undefined, { count: skills.length });
  }

  /**
   * Writes a set of agent files from their source skill files.
   */
  protected writeSkillAgentFiles(options: WriteSkillAgentFilesOptions): void {
    const {
      configurations,
      questionMeMode = false,
      startMessage,
      workspaceRoot,
    } = options;

    this.logger.log(startMessage);

    for (const configuration of configurations) {
      this.writeSingleSkillAgentFile(configuration, workspaceRoot);

      if (questionMeMode) {
        this.logger.log("📄 Updated question-me.agent.md");
      } else {
        this.logger.log(`📄 Synced ${configuration.agentFile}`);
      }
    }
  }

  // 🌎 Public Methods

  /**
   * Runs the consolidated agent-skills sync command in check or write mode.
   */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /**
   * Synchronizes agent-skill artifacts and reports success without exiting, so
   * the aggregate `synchronization` command can run every command and report
   * all drift at once.
   */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    await Promise.resolve();

    try {
      const workspaceRoot = process.cwd();

      if (mode === "check") {
        return this.runCheckMode(workspaceRoot);
      }

      this.runWriteMode(workspaceRoot);
      return true;
    } catch (error) {
      this.logger.error(
        `💥 Failed synchronizing agent skills`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
