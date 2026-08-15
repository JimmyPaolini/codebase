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
export class AgentSkillsCommand extends CommandRunner {
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
        "❌ Custom agents table of contents in AGENTS.md is out of sync\n",
      );
      this.logger.log(`  Found ${agents.length} agents in .github/agents/`);
      this.logger.log("  Generated content doesn't match stored content");
      this.logger.log(
        "💡 Run 'pnpm exec nx run synchronization:start:agent-skills-write' to sync\n",
      );
      return false;
    }

    this.logger.log(
      `✅ Custom agents table of contents is in sync (${agents.length} ${agents.length === 1 ? "agent" : "agents"})`,
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
      this.logger.log(`❌ Agent file not found: ${configuration.agentFile}`);
      return false;
    }

    const expectedContent = generateAgentFile(skill, actualContent);
    if (expectedContent !== actualContent) {
      this.logger.log(`❌ Agent file out of sync: ${configuration.agentFile}`);
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
  ): boolean {
    let allInSync = true;

    for (const configuration of configurations) {
      if (!this.checkSingleSkillAgentFile(configuration, workspaceRoot)) {
        allInSync = false;
      }
    }

    if (!allInSync) {
      this.logger.log(
        "💡 Run 'pnpm exec nx run synchronization:start:agent-skills-write' to sync\n",
      );
      return false;
    }

    this.logger.log(successMessage);
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
        "❌ Skills table of contents in AGENTS.md is out of sync\n",
      );
      this.logger.log(`  Found ${skills.length} skills in .agents/skills/`);
      this.logger.log("  Generated content doesn't match stored content");
      this.logger.log(
        "💡 Run 'pnpm exec nx run synchronization:start:agent-skills-write' to sync\n",
      );
      return false;
    }

    this.logger.log(
      `✅ Skills table of contents is in sync (${skills.length} skills)`,
    );
    return true;
  }

  /**
   * Runs all check-mode validations.
   */
  private runCheckMode(workspaceRoot: string): void {
    const planInSync = this.checkSkillAgentFiles(
      PLAN_AGENT_CONFIGS,
      workspaceRoot,
      `✅ All ${PLAN_AGENT_CONFIGS.length} plan agent files are in sync`,
    );
    if (!planInSync) {
      process.exit(1);
    }

    const triageInSync = this.checkSkillAgentFiles(
      TRIAGE_AGENT_CONFIGS,
      workspaceRoot,
      `✅ All ${TRIAGE_AGENT_CONFIGS.length} triage agent files are in sync`,
    );
    if (!triageInSync) {
      process.exit(1);
    }

    if (!this.checkCustomAgentsTable(workspaceRoot)) {
      process.exit(1);
    }

    if (!this.checkSkillsTable(workspaceRoot)) {
      process.exit(1);
    }
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

    const agentWord = agents.length === 1 ? "agent" : "agents";
    this.logger.log(`✅ Updated AGENTS.md with ${agents.length} ${agentWord}`);
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
    this.logger.log(`✅ Updated AGENTS.md with ${skills.length} skills`);
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
        this.logger.log("✅ Updated question-me.agent.md");
      } else {
        this.logger.log(`✅ Synced ${configuration.agentFile}`);
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
    await Promise.resolve();
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    try {
      const workspaceRoot = process.cwd();

      if (mode === "check") {
        this.runCheckMode(workspaceRoot);
        return;
      }

      this.runWriteMode(workspaceRoot);
    } catch (error) {
      this.logger.error(
        `❌ Error: ${error instanceof Error ? error.message : error}`,
      );
      process.exit(1);
    }
  }
}
