import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { AgentSkillsCommand } from "../agent-skills/agent-skills.command";
import { ConformetryGeneratorsCommand } from "../conformetry-generators/conformetry-generators.command";
import { ConventionalConfigCommand } from "../conventional-config/conventional-config.command";
import { DevcontainerConfigurationCommand } from "../devcontainer-configuration/devcontainer-configuration.command";
import { LoggerService } from "../logger/logger.service";
import { PullRequestTemplateCommand } from "../pull-request-template/pull-request-template.command";

import { SynchronizationService } from "./synchronization.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
  SynchronizationResult,
} from "./synchronization.types";

/**
 * CLI command that runs every synchronization command in one process.
 *
 * The individual commands remain available for targeted use. This exists so a
 * single Nx target can drive all of them: each `nx run` rebuilds the project
 * graph, so five targets cost five graph builds where one costs one.
 */
@Command({
  description: "Run the synchronization command",
  name: "synchronization",
})
@Injectable()
export class SynchronizationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly agentSkillsCommand: AgentSkillsCommand,
    private readonly conformetryGeneratorsCommand: ConformetryGeneratorsCommand,
    private readonly conventionalConfigCommand: ConventionalConfigCommand,
    private readonly devcontainerConfigurationCommand: DevcontainerConfigurationCommand,
    private readonly logger: LoggerService,
    private readonly pullRequestTemplateCommand: PullRequestTemplateCommand,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(SynchronizationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The commands this aggregate drives, in a stable reporting order. */
  private getCommands(): SynchronizableCommand[] {
    return [
      this.agentSkillsCommand,
      this.conformetryGeneratorsCommand,
      this.conventionalConfigCommand,
      this.devcontainerConfigurationCommand,
      this.pullRequestTemplateCommand,
    ];
  }

  /** Logs a one-line-per-command summary of the run. */
  private reportResults(
    mode: SynchronizationMode,
    results: SynchronizationResult[],
  ): void {
    const failed = results.filter((result) => !result.succeeded);

    this.logger.log("");
    this.logger.log(`📋 Synchronization summary (${mode})`);
    for (const { label, succeeded } of results) {
      this.logger.log(`  ${succeeded ? "✅" : "❌"} ${label}`);
    }

    if (failed.length === 0) {
      this.logger.log(`✅ All ${results.length} synchronizations are in sync`);
      return;
    }

    this.logger.log(
      `❌ ${failed.length} of ${results.length} synchronizations are out of sync`,
    );
    this.logger.log(
      "💡 Run 'nx run synchronization:synchronize:write' to sync",
    );
  }

  // 🌎 Public Methods

  /** Runs every synchronization command, exiting once if any reported drift. */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:synchronize (or synchronization:synchronize:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /**
   * Runs every synchronization command and reports whether all succeeded.
   *
   * Commands run in sequence and every one runs even after an earlier failure,
   * so a single run surfaces all drift instead of only the first instance.
   * They are not parallelized: several write to AGENTS.md.
   */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    const results: SynchronizationResult[] = [];

    for (const command of this.getCommands()) {
      this.logger.log(`🔄 ${command.synchronizationLabel}`);
      results.push({
        label: command.synchronizationLabel,
        succeeded: await command.synchronize(mode),
      });
    }

    this.reportResults(mode, results);

    return results.every((result) => result.succeeded);
  }
}
