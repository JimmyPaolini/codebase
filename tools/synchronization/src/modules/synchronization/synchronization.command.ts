import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { ConformetryGeneratorsCommand } from "../conformetry-generators/conformetry-generators.command";
import { ConventionalConfigCommand } from "../conventional-config/conventional-config.command";
import { DevcontainerConfigurationCommand } from "../devcontainer-configuration/devcontainer-configuration.command";
import { NestjsModuleGraphsCommand } from "../nestjs-module-graphs/nestjs-module-graphs.command";
import { NxProjectGraphsCommand } from "../nx-project-graphs/nx-project-graphs.command";
import { PullRequestTemplateCommand } from "../pull-request-template/pull-request-template.command";

import { SynchronizationKindsService } from "./synchronization-kinds.service";
import { SYNCHRONIZATION_KINDS } from "./synchronization.constants";
import { SynchronizationService } from "./synchronization.service";

import type {
  SynchronizableCommand,
  SynchronizationCommandOptions,
  SynchronizationKind,
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
    private readonly conformetryGeneratorsCommand: ConformetryGeneratorsCommand,
    private readonly conventionalConfigCommand: ConventionalConfigCommand,
    private readonly devcontainerConfigurationCommand: DevcontainerConfigurationCommand,
    private readonly logger: LoggerService,
    private readonly nestjsModuleGraphsCommand: NestjsModuleGraphsCommand,
    private readonly nxProjectGraphsCommand: NxProjectGraphsCommand,
    private readonly pullRequestTemplateCommand: PullRequestTemplateCommand,
    private readonly synchronizationKindsService: SynchronizationKindsService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(SynchronizationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The commands this aggregate drives, in a stable reporting order.
   *
   * Every one of them, whatever kind it is. Which of them a given run drives
   * is decided by the selected kinds, not by anything left out here.
   */
  private getCommands(): SynchronizableCommand[] {
    return [
      this.conformetryGeneratorsCommand,
      this.conventionalConfigCommand,
      this.devcontainerConfigurationCommand,
      this.nestjsModuleGraphsCommand,
      this.nxProjectGraphsCommand,
      this.pullRequestTemplateCommand,
    ];
  }

  /** Logs a one-line-per-command summary of the run. */
  private reportResults(
    mode: SynchronizationMode,
    results: SynchronizationResult[],
  ): void {
    const failed = results.filter((result) => !result.succeeded);

    this.logger.log("📋 Summarized the synchronization run", undefined, {
      failed: results.filter((result) => !result.succeeded).map((r) => r.label),
      mode,
      succeeded: results
        .filter((result) => result.succeeded)
        .map((r) => r.label),
    });

    if (failed.length === 0) {
      this.logger.log("🔗 Verified every synchronization", undefined, {
        count: results.length,
      });
      return;
    }

    this.logger.log("🔗 Detected out-of-sync synchronizations", undefined, {
      count: failed.length,
      hint: "Run 'nx run synchronization:synchronize:write' for a derivation, or ':publish' for a report",
      total: results.length,
    });
  }

  /**
   * The commands whose declared kind this run asked for.
   *
   * A selection matching nothing is a failure rather than a clean run: a
   * command line asking for a kind no command declares synchronized nothing,
   * and reporting that as success is how a gate stops gating without anybody
   * noticing.
   */
  private selectCommands(
    kinds: ReadonlySet<SynchronizationKind>,
  ): SynchronizableCommand[] {
    return this.getCommands().filter((command) =>
      kinds.has(command.synchronizationKind),
    );
  }

  // 🌎 Public Methods

  /**
   * Parses the kinds of synchronization this run drives.
   *
   * The parser runs only when `--kinds` carries a value, so anything reaching
   * it is a written set. A `--kinds` with no value never arrives here and is
   * refused later.
   */
  @Option({
    description: `Run only a comma-separated set drawn from ${SYNCHRONIZATION_KINDS.map((kind) => `"${kind}"`).join(" and ")}`,
    flags: "--kinds [kinds]",
  })
  public parseKinds(value: string): string {
    return value;
  }

  /** Runs the selected synchronizations, exiting once if any reported drift. */
  async run(
    passedParameters: string[],
    options?: SynchronizationCommandOptions,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:synchronize (or synchronization:synchronize:write)",
      });
    const { errors, kinds } = this.synchronizationKindsService.select(
      options?.kinds,
    );

    if (errors.length > 0) {
      this.logger.error("🚦 Rejected the command line", undefined, {
        reasons: errors,
      });
      process.exit(1);
    }

    if (!(await this.synchronize(mode, kinds))) {
      process.exit(1);
    }
  }

  /**
   * Runs the selected synchronizations and reports whether all succeeded.
   *
   * Commands run in sequence and every one runs even after an earlier failure,
   * so a single run surfaces all drift instead of only the first instance.
   * They are not parallelized: several write to AGENTS.md.
   *
   * Every kind by default, so a caller that has nothing to say about kinds
   * still drives the whole set.
   */
  async synchronize(
    mode: SynchronizationMode,
    kinds: ReadonlySet<SynchronizationKind> = new Set(SYNCHRONIZATION_KINDS),
  ): Promise<boolean> {
    const commands = this.selectCommands(kinds);
    const results: SynchronizationResult[] = [];

    if (commands.length === 0) {
      this.logger.error("🚦 Selected no synchronization at all", undefined, {
        kinds: [...kinds],
      });
      return false;
    }

    for (const command of commands) {
      this.logger.log(`🔄 Synchronizing ${command.synchronizationLabel}`);
      results.push({
        label: command.synchronizationLabel,
        succeeded: await command.synchronize(mode),
      });
    }

    this.reportResults(mode, results);

    return results.every((result) => result.succeeded);
  }
}
